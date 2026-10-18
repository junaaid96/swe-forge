/**
 * JS/TS practice runner. Runs untrusted user code inside a module Web Worker:
 * no DOM, no localStorage, no document. Network-capable globals are
 * neutralized below (best effort — see SANDBOX.md notes in the workspace),
 * output is capped, and a timeout is enforced by the main thread, which
 * terminates and respawns this worker.
 */
import { deepEqual, errorMessage, formatValue, parseErrorLine } from '../lib/runner-shared';
import type { CaseResult } from '../lib/runners';
import type { FnTestSpec } from '../lib/types';

export interface JsRunRequest {
  id: number;
  code: string;
  language: string;
  spec: FnTestSpec;
  outputLimit: number;
}

export interface JsRunResponse {
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
  onmessage: ((e: MessageEvent<JsRunRequest>) => void) | null;
  postMessage: (msg: JsRunResponse) => void;
};

// Neutralize network-capable globals. Belt and suspenders with the lexical
// shadowing in the factory below: user code calling fetch()/WebSocket/etc.
// fails fast instead of leaking anywhere.
{
  const g = globalThis as unknown as Record<string, unknown>;
  for (const k of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'Worker', 'SharedWorker']) {
    try {
      if (k in g) g[k] = undefined;
    } catch {
      /* non-configurable — the factory shadow still applies */
    }
  }
  try {
    const nav = g.navigator as Record<string, unknown> | undefined;
    if (nav && typeof nav.sendBeacon === 'function') nav.sendBeacon = () => false;
  } catch {
    /* ignore */
  }
}

const VISIBLE_CONSOLE = ['log', 'info', 'warn', 'error', 'debug'] as const;

const FN_PARAMS = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'Worker', 'SharedWorker'];
const compile = (body: string) => new Function(...FN_PARAMS, body);

/**
 * Lines to subtract from a reported frame to get the user-code line. Measured
 * at runtime through the same call site (V8 adds the creation-site line, which
 * shifts with every build), so it stays correct after minification.
 */
function measureLineOffset(): number | null {
  try {
    compile('"use strict";\nthrow new Error("__forgeline_probe__");')();
  } catch (e) {
    const m = (e as Error)?.stack?.match(/<anonymous>:(\d+):\d+/);
    if (m) return Number(m[1]) - 1; // probe body line 2 == user line 1
  }
  return null;
}
const LINE_OFFSET = measureLineOffset();

workerSelf.onmessage = (e: MessageEvent<JsRunRequest>) => {
  void run(e.data);
};

async function run(req: JsRunRequest) {
  const { id, code, language, spec, outputLimit } = req;
  const respond = (r: Omit<JsRunResponse, 'id'>) => workerSelf.postMessage({ ...r, id });

  let stdout = '';
  let truncated = false;
  const push = (s: string) => {
    if (truncated) return;
    if (stdout.length + s.length + 1 > outputLimit) {
      truncated = true;
      return;
    }
    stdout += (stdout ? '\n' : '') + s;
  };
  const capture = (...args: unknown[]) => push(args.map((a) => (typeof a === 'string' ? a : formatValue(a, 2000))).join(' '));

  const originals = new Map<string, unknown>();
  for (const k of VISIBLE_CONSOLE) {
    originals.set(k, console[k]);
    console[k] = capture as never;
  }

  const t0 = performance.now();
  try {
    if (!/^[A-Za-z_$][\w$]*$/.test(spec.function)) throw new Error(`Bad test spec: "${spec.function}" is not a function name.`);
    let js = code;
    if (language === 'typescript') {
      const { transform } = await import('sucrase');
      js = transform(code, { transforms: ['typescript'] }).code;
    }
    // Lexically shadow network globals with undefined params so even
    // `self.fetch` / bare `fetch` fail inside user code.
    const factory = compile(`"use strict";\n${js}\n;return (typeof ${spec.function} === 'function' ? ${spec.function} : undefined);`);
    const fn = factory(undefined, undefined, undefined, undefined, undefined, undefined) as ((...args: unknown[]) => unknown) | undefined;
    if (!fn) throw new Error(`No function named "${spec.function}" was defined. Check the name and try again.`);

    const cases: CaseResult[] = [];
    let ok = true;
    for (const c of spec.cases) {
      try {
        const got = await fn(...(c.args ?? []));
        if (c.throws !== undefined) {
          ok = false;
          cases.push({ name: c.name, pass: false, expected: `throws /${c.throws}/`, actual: formatValue(got) });
        } else {
          const pass = deepEqual(got, c.expected);
          if (!pass) ok = false;
          cases.push(pass ? { name: c.name, pass } : { name: c.name, pass, expected: formatValue(c.expected), actual: formatValue(got) });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (c.throws !== undefined) {
          const pass = msg.includes(c.throws);
          if (!pass) ok = false;
          cases.push(pass ? { name: c.name, pass } : { name: c.name, pass, expected: `throws /${c.throws}/`, actual: `threw: ${msg}` });
        } else {
          ok = false;
          const line = err instanceof Error ? parseErrorLine(err.stack, LINE_OFFSET) : null;
          cases.push({ name: c.name, pass: false, error: msg, ...(line ? { errorLine: line } : {}) });
        }
      }
    }
    respond({ ok, cases, stdout, truncated, runtimeMs: Math.round((performance.now() - t0) * 10) / 10 });
  } catch (err) {
    const line = err instanceof Error ? parseErrorLine(err.stack, LINE_OFFSET) : null;
    respond({
      ok: false,
      cases: [],
      stdout,
      truncated,
      runtimeMs: Math.round((performance.now() - t0) * 10) / 10,
      error: errorMessage(err),
      ...(line ? { errorLine: line } : {}),
    });
  } finally {
    for (const [k, v] of originals) console[k as (typeof VISIBLE_CONSOLE)[number]] = v as never;
  }
}
