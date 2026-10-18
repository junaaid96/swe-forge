/** One interface for every Practice Lab runner: `Runner.run(code, testSpec, opts)`. */
import type { PracticeTestSpec } from './types';
import type { JsRunResponse } from '../workers/jsRunner';
import type { PyRunResponse } from '../workers/pyRunner';
import type { SqlRunResponse } from '../workers/sqlRunner';

export interface RunOpts {
  /** Kill the run after this long. Enforced by terminating the worker. */
  timeoutMs?: number;
  /** Cap on captured stdout in chars (default 20000). */
  outputLimit?: number;
  /** Editor language id, e.g. 'javascript' | 'typescript'. */
  language?: string;
  /** SQL seed statements; used only by the SQL runner. */
  seedSql?: string;
}

export interface CaseResult {
  name: string;
  pass: boolean;
  expected?: string;
  actual?: string;
  error?: string;
  errorLine?: number;
}

export interface RunResults {
  ok: boolean;
  cases: CaseResult[];
  stdout: string;
  truncated: boolean;
  runtimeMs: number;
  error?: string;
  errorLine?: number;
  timedOut?: boolean;
}

export interface Runner {
  readonly id: string;
  run(code: string, spec: PracticeTestSpec, opts?: RunOpts): Promise<RunResults>;
}

function failure(error: string, extra?: Partial<RunResults>): RunResults {
  return { ok: false, cases: [], stdout: '', truncated: false, runtimeMs: 0, error, ...extra };
}

// ---------------------------------------------------------------------------
// Worker-backed runners: a lazily created Worker per runner, terminated +
// respawned on timeout. Worker chunks load only when first constructed.

type WorkerResponse = JsRunResponse | PyRunResponse | SqlRunResponse;

interface WorkerRunnerDef {
  id: string;
  kinds: Array<'fn' | 'sql'>;
  makeWorker: () => Worker;
  defaultTimeoutMs: number;
  startError: string;
  toRequest: (id: number, code: string, spec: PracticeTestSpec, opts: RunOpts, outputLimit: number) => unknown;
}

function createWorkerRunner(def: WorkerRunnerDef): Runner {
  let worker: Worker | null = null;
  let seq = 0;
  const pending = new Map<number, (m: WorkerResponse) => void>();

  const killWorker = () => {
    try {
      worker?.terminate();
    } catch {
      /* already gone */
    }
    worker = null;
    pending.clear();
  };

  const getWorker = () => {
    if (!worker) {
      worker = def.makeWorker();
      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const cb = pending.get(e.data.id);
        if (cb) {
          pending.delete(e.data.id);
          cb(e.data);
        }
      };
      worker.onerror = () => killWorker();
    }
    return worker;
  };

  return {
    id: def.id,
    run(code: string, spec: PracticeTestSpec, opts: RunOpts = {}): Promise<RunResults> {
      if (!def.kinds.includes(spec.kind)) return Promise.resolve(failure(`The ${def.id} runner cannot run "${spec.kind}" tests.`));
      const timeoutMs = opts.timeoutMs ?? def.defaultTimeoutMs;
      const outputLimit = opts.outputLimit ?? 20000;
      return new Promise((resolve) => {
        const id = ++seq;
        let done = false;
        const timer = window.setTimeout(() => {
          if (done) return;
          done = true;
          pending.delete(id);
          killWorker(); // terminate; the next run respawns lazily
          resolve(failure(`Timed out after ${timeoutMs}ms — likely an infinite loop.`, { runtimeMs: timeoutMs, timedOut: true }));
        }, timeoutMs);
        pending.set(id, (m) => {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          resolve({ ...m, timedOut: false });
        });
        try {
          getWorker().postMessage(def.toRequest(id, code, spec, opts, outputLimit));
        } catch (e) {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          pending.delete(id);
          resolve(failure(e instanceof Error ? e.message : def.startError));
        }
      });
    },
  };
}

export const jsRunner: Runner = createWorkerRunner({
  id: 'js',
  kinds: ['fn'],
  makeWorker: () => new Worker(new URL('../workers/jsRunner.ts', import.meta.url), { type: 'module', name: 'forgeline-js-runner' }),
  defaultTimeoutMs: 5000,
  startError: 'Could not start the JS runner.',
  toRequest: (id, code, spec, opts, outputLimit) => ({ id, code, language: opts.language ?? 'javascript', spec, outputLimit }),
});

export const pythonRunner: Runner = createWorkerRunner({
  id: 'python',
  kinds: ['fn'],
  // Module worker: the runtime loads via dynamic import from /vendor, so the
  // chunk stays tiny and Pyodide never touches the bundler. Classic workers
  // are not supported by Pyodide (loadPyodide throws in them).
  makeWorker: () => new Worker(new URL('../workers/pyRunner.ts', import.meta.url), { type: 'module', name: 'forgeline-py-runner' }),
  // First run includes the one-time runtime load (~1-3s); later runs are fast.
  defaultTimeoutMs: 15000,
  startError: 'Could not start the Python runner.',
  toRequest: (id, code, spec, _opts, outputLimit) => ({ id, code, spec, outputLimit }),
});

export const sqlRunner: Runner = createWorkerRunner({
  id: 'sql',
  kinds: ['sql'],
  makeWorker: () => new Worker(new URL('../workers/sqlRunner.ts', import.meta.url), { type: 'classic', name: 'forgeline-sql-runner' }),
  defaultTimeoutMs: 10000,
  startError: 'Could not start the SQL runner.',
  toRequest: (id, code, spec, opts, outputLimit) => ({ id, code, seedSql: opts.seedSql ?? '', spec, outputLimit }),
});

// ---------------------------------------------------------------------------
// Registry. Unknown runners resolve null.

const registry = new Map<string, Runner>([
  ['js', jsRunner],
  ['python', pythonRunner],
  ['sql', sqlRunner],
]);

export function registerRunner(runner: Runner) {
  registry.set(runner.id, runner);
}

export function runnerFor(id: string): Runner | null {
  return registry.get(id) ?? null;
}

/**
 * Future hook for a self-hosted runner. Recognized but not implemented:
 * setting VITE_RUNNER_URL alone changes nothing yet.
 */
export function remoteRunnerUrl(): string {
  try {
    return import.meta.env?.VITE_RUNNER_URL ?? '';
  } catch {
    return '';
  }
}
