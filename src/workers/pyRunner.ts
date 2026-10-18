/**
 * Python practice runner. Classic Web Worker: no DOM, no localStorage.
 * Pyodide is importScripts'd from same-origin /vendor (never bundled, never
 * CDN) and loads lazily on the first Python run. Stdlib only: the lockdown
 * snippet blocks `js`/`pyodide_js`/`micropip` imports so user code cannot
 * reach the network; output is capped; hangs are handled by the main thread,
 * which terminates and respawns this worker. No COOP/COEP needed.
 */
import { deepEqual, errorMessage, formatValue } from '../lib/runner-shared';
import type { CaseResult } from '../lib/runners';
import type { FnTestCase, FnTestSpec } from '../lib/types';

declare function importScripts(...urls: string[]): void;
declare const loadPyodide: ((opts: { indexURL: string }) => Promise<Pyodide>) | undefined;

interface Pyodide {
  runPython(code: string, options?: { globals?: unknown; filename?: string }): unknown;
  setStdout(options: { batched: (output: string) => void }): void;
  globals: { get(name: string): () => Record<string, unknown> & { destroy?: () => void } };
}

export interface PyRunRequest {
  id: number;
  code: string;
  spec: FnTestSpec;
  outputLimit: number;
}

export interface PyRunResponse {
  id: number;
  ok: boolean;
  cases: CaseResult[];
  stdout: string;
  truncated: boolean;
  runtimeMs: number;
  error?: string;
  errorLine?: number;
}

const workerSelf = self as unknown as {
  onmessage: ((e: MessageEvent<PyRunRequest>) => void) | null;
  postMessage: (msg: PyRunResponse) => void;
};

/** Re-applied before every run (user code could otherwise unhook it). Idempotent. */
export const PY_LOCKDOWN = `
import sys as _sys, importlib.abc as _abc
class _PlabBlocker(_abc.MetaPathFinder):
    def find_spec(self, name, path=None, target=None):
        if name.split('.')[0] in ('js', 'pyodide_js', 'micropip'):
            raise ImportError("module '%s' is blocked in the Practice Lab" % name)
        return None
if '_PlabBlocker' not in [type(_m).__name__ for _m in _sys.meta_path]:
    _sys.meta_path.insert(0, _PlabBlocker())
if '_plab_baseline' not in _sys.modules:
    _sys.modules['_plab_baseline'] = set(_sys.modules)
for _m in [m for m in _sys.modules if m.split('.')[0] in ('js', 'pyodide_js', 'micropip') and m not in _sys.modules['_plab_baseline']]:
    del _sys.modules[_m]
del _sys, _abc, _PlabBlocker
`.trim();

interface DriverCase {
  name: string;
  actual?: string;
  error?: string;
  line?: number | null;
}

/**
 * Structured driver: compiles + execs the user code under the <challenge>
 * filename, then runs every case, returning JSON. Return values cross the
 * boundary as JSON (sort_keys for determinism), so exotic types (sets,
 * inf/nan, custom classes) either normalize or fail loudly.
 */
export const PY_DRIVER = `
import json as _json, traceback as _tb
_plab_out = {'cases': []}
try:
    _plab_code = compile(_plab_user_code, '<challenge>', 'exec')
except SyntaxError as _e:
    _plab_out = {'fatal': 'SyntaxError: %s' % _e, 'line': _e.lineno}
else:
    try:
        exec(_plab_code, globals())
    except Exception as _e:
        _plab_frames = _tb.extract_tb(_e.__traceback__)
        _plab_user = [f for f in _plab_frames if f.filename == '<challenge>']
        _plab_out = {'fatal': '%s: %s' % (type(_e).__name__, _e),
                     'line': (_plab_user[-1].lineno if _plab_user else None)}
if 'fatal' not in _plab_out:
    if not callable(globals().get(_plab_fn)):
        _plab_out = {'fatal': 'No function named "%s" was defined. Check the name and try again.' % _plab_fn}
    else:
        for _plab_case in _json.loads(_plab_cases_json):
            _plab_r = {'name': _plab_case['name']}
            try:
                _plab_res = globals()[_plab_fn](*_json.loads(_plab_case['args_json']))
                _plab_r['actual'] = _json.dumps(_plab_res, default=str, sort_keys=True, allow_nan=False)
            except Exception as _e:
                _plab_frames = _tb.extract_tb(_e.__traceback__)
                _plab_user = [f for f in _plab_frames if f.filename == '<challenge>']
                _plab_r['error'] = '%s: %s' % (type(_e).__name__, _e)
                _plab_r['line'] = (_plab_user[-1].lineno if _plab_user else None)
            _plab_out['cases'].append(_plab_r)
_json.dumps(_plab_out)
`.trim();

let pyodide: Pyodide | null = null;
let initError: string | null = null;

async function ensureInit(): Promise<Pyodide> {
  if (pyodide) return pyodide;
  if (initError) throw new Error(initError);
  try {
    importScripts('/vendor/pyodide/pyodide.js');
    if (typeof loadPyodide !== 'function') throw new Error('Pyodide loader did not register.');
    pyodide = await loadPyodide({ indexURL: '/vendor/pyodide/' });
    return pyodide;
  } catch (e) {
    initError = `The Python runtime failed to load (${errorMessage(e)}). Check your connection and run again.`;
    throw new Error(initError);
  }
}

workerSelf.onmessage = (e: MessageEvent<PyRunRequest>) => {
  void run(e.data);
};

async function run(req: PyRunRequest) {
  const { id, code, spec, outputLimit } = req;
  const respond = (r: Omit<PyRunResponse, 'id'>) => workerSelf.postMessage({ ...r, id });

  let stdout = '';
  let truncated = false;
  const push = (s: string) => {
    if (truncated) return;
    const chunk = s.endsWith('\n') ? s.slice(0, -1) : s;
    if (stdout.length + chunk.length + 1 > outputLimit) {
      truncated = true;
      return;
    }
    stdout += (stdout ? '\n' : '') + chunk;
  };

  const t0 = performance.now();
  const done = (r: Omit<PyRunResponse, 'id' | 'stdout' | 'truncated' | 'runtimeMs'>) =>
    respond({ ...r, stdout, truncated, runtimeMs: Math.round((performance.now() - t0) * 10) / 10 });

  try {
    if (!/^[A-Za-z_]\w*$/.test(spec.function)) throw new Error(`Bad test spec: "${spec.function}" is not a function name.`);
    const py = await ensureInit();
    py.setStdout({ batched: push });
    py.runPython(PY_LOCKDOWN, { filename: '<lockdown>' });

    const dictCtor = py.globals.get('dict');
    const ns = dictCtor() as unknown as { set(k: string, v: unknown): void; destroy(): void };
    try {
      ns.set('_plab_user_code', code);
      ns.set('_plab_fn', spec.function);
      ns.set(
        '_plab_cases_json',
        JSON.stringify(spec.cases.map((c: FnTestCase) => ({ name: c.name, args_json: JSON.stringify(c.args ?? []) }))),
      );
      const raw = py.runPython(PY_DRIVER, { globals: ns, filename: '<driver>' }) as string;
      const out = JSON.parse(raw) as { fatal?: string; line?: number | null; cases?: DriverCase[] };
      if (out.fatal) {
        done({ ok: false, cases: [], error: out.fatal, ...(out.line ? { errorLine: out.line } : {}) });
        return;
      }
      const cases: CaseResult[] = [];
      let ok = true;
      for (const c of spec.cases) {
        const got = (out.cases ?? []).find((r) => r.name === c.name);
        if (!got) {
          ok = false;
          cases.push({ name: c.name, pass: false, error: 'No result returned for this case.' });
          continue;
        }
        if (got.error !== undefined) {
          if (c.throws !== undefined) {
            const pass = got.error.includes(c.throws);
            if (!pass) ok = false;
            cases.push(pass ? { name: c.name, pass } : { name: c.name, pass, expected: `throws /${c.throws}/`, actual: `threw: ${got.error}` });
          } else {
            ok = false;
            cases.push({ name: c.name, pass: false, error: got.error, ...(got.line ? { errorLine: got.line } : {}) });
          }
          continue;
        }
        if (c.throws !== undefined) {
          ok = false;
          cases.push({ name: c.name, pass: false, expected: `throws /${c.throws}/`, actual: formatValue(JSON.parse(got.actual ?? 'null')) });
          continue;
        }
        let actual: unknown;
        try {
          actual = JSON.parse(got.actual ?? 'null');
        } catch {
          ok = false;
          cases.push({ name: c.name, pass: false, error: `Unserializable return value: ${got.actual}` });
          continue;
        }
        const pass = deepEqual(actual, c.expected);
        if (!pass) ok = false;
        cases.push(pass ? { name: c.name, pass } : { name: c.name, pass, expected: formatValue(c.expected), actual: formatValue(actual) });
      }
      done({ ok, cases });
    } finally {
      try {
        ns.destroy();
      } catch {
        /* already gone */
      }
    }
  } catch (err) {
    done({ ok: false, cases: [], error: errorMessage(err) });
  }
}
