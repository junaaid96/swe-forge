#!/usr/bin/env -S npx tsx
/**
 * Practice Lab seed-content gate. For every file-based challenge:
 * structural checks (tests, hints, starters, solutions, prose sections)
 * plus executing EVERY reference solution against visible + hidden tests:
 * JS/TS in node:vm (sucrase for TS), Python in Pyodide, SQL in sql.js.
 * Fails the build (exit 1) on any mismatch. Run manually while authoring;
 * wired into `prebuild` (not `predev`, to keep dev startup fast).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { transform } from 'sucrase';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The worker modules only need `self` at import time (message plumbing is lazy).
// Delete it right after: module loaders probe the real global afterwards.
(globalThis as unknown as { self?: unknown }).self = {};
const { deepEqual, formatValue } = await import('../src/lib/runner-shared.ts');
const { PY_LOCKDOWN, PY_DRIVER } = await import('../src/workers/pyRunner.ts');
const { runSqlCases } = await import('../src/workers/sqlRunner.ts');
delete (globalThis as unknown as { self?: unknown }).self;

interface FnCase {
  name: string;
  args?: unknown[];
  expected?: unknown;
  throws?: string;
  expectedColumns?: string[];
  orderInsensitive?: boolean;
  seed?: string;
}
interface Challenge {
  id: string;
  topic: string;
  slug: string;
  title: string;
  difficulty: string;
  languages: string[];
  runner: 'js' | 'python' | 'sql' | 'none';
  learnLinks: unknown[];
  statement: string;
  examples: string;
  learn: string;
  hints: string[];
  starters: Record<string, string>;
  visibleTests: { kind: string; function?: string; cases: Array<FnCase & { expectedRows?: unknown[][] }> } | null;
  hiddenTests: { kind: string; function?: string; cases: Array<FnCase & { expectedRows?: unknown[][] }> } | null;
  seedSql: string;
  solution: { code: Record<string, string>; explanation: string };
  complexity: string;
  mistakes: string;
  source: string;
}

const failures: string[] = [];
const fail = (id: string, msg: string) => failures.push(`${id}: ${msg}`);
let checked = 0;
let executed = 0;

// ---------------------------------------------------------------------------
// JS/TS in node:vm (same call + deepEqual semantics as the worker)

async function checkFnCases(id: string, lang: string, fn: (...a: unknown[]) => unknown, spec: NonNullable<Challenge['visibleTests']>, label: string) {
  for (const c of spec.cases) {
    checked += 1;
    let got: unknown;
    try {
      got = await fn(...(c.args ?? []));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (c.throws === undefined || !msg.includes(c.throws)) fail(id, `${label}/${lang} case "${c.name}": threw ${msg}`);
      continue;
    }
    if (c.throws !== undefined) fail(id, `${label}/${lang} case "${c.name}": expected throw, got ${formatValue(got, 200)}`);
    else if (!deepEqual(got, c.expected)) fail(id, `${label}/${lang} case "${c.name}": expected ${formatValue(c.expected, 200)}, got ${formatValue(got, 200)}`);
  }
}

async function validateJs(ch: Challenge) {
  for (const [lang, code] of Object.entries(ch.solution.code)) {
    executed += 1;
    let js = code;
    try {
      if (lang === 'typescript') js = transform(code, { transforms: ['typescript'] }).code;
    } catch (e) {
      fail(ch.id, `${lang} solution does not transpile: ${e instanceof Error ? e.message : e}`);
      continue;
    }
    const ctx = vm.createContext({ console: { log() {}, info() {}, warn() {}, error() {}, debug() {} } });
    try {
      vm.runInContext(js, ctx, { filename: 'solution.js' });
    } catch (e) {
      fail(ch.id, `${lang} solution throws at load: ${e instanceof Error ? e.message : e}`);
      continue;
    }
    const wantFn = ch.visibleTests?.function;
    const fn = vm.runInContext(`typeof ${wantFn} === 'function' ? ${wantFn} : undefined`, ctx) as ((...a: unknown[]) => unknown) | undefined;
    if (!fn) {
      fail(ch.id, `${lang} solution defines no function "${wantFn}"`);
      continue;
    }
    await checkFnCases(ch.id, lang, fn, ch.visibleTests, 'visible');
    await checkFnCases(ch.id, lang, fn, ch.hiddenTests, 'hidden');
  }
}

// ---------------------------------------------------------------------------
// Python in Pyodide (same driver + lockdown as the worker)

let pyodide: {
  runPython(code: string, options?: { globals?: unknown; filename?: string }): unknown;
  globals: { get(name: string): () => { set(k: string, v: unknown): void; destroy(): void } };
} | null = null;

async function validatePython(ch: Challenge) {
  if (!pyodide) {
    const { loadPyodide } = await import('pyodide');
    pyodide = (await loadPyodide()) as typeof pyodide;
  }
  const py = pyodide;
  for (const [lang, code] of Object.entries(ch.solution.code)) {
    executed += 1;
    py.runPython(PY_LOCKDOWN);
    const ns = py.globals.get('dict')();
    try {
      const runCases = (spec: NonNullable<Challenge['visibleTests']>, label: string) => {
        ns.set('_plab_user_code', code);
        ns.set('_plab_fn', spec.function);
        ns.set('_plab_cases_json', JSON.stringify(spec.cases.map((c) => ({ name: c.name, args_json: JSON.stringify(c.args ?? []) }))));
        const out = JSON.parse(py.runPython(PY_DRIVER, { globals: ns, filename: '<driver>' }) as string) as {
          fatal?: string;
          line?: number | null;
          cases?: Array<{ name: string; actual?: string; error?: string; line?: number | null }>;
        };
        if (out.fatal) {
          fail(ch.id, `${label}/${lang}: ${out.fatal}${out.line ? ` (line ${out.line})` : ''}`);
          return;
        }
        for (const c of spec.cases) {
          checked += 1;
          const got = out.cases?.find((r) => r.name === c.name);
          if (!got) {
            fail(ch.id, `${label}/${lang} case "${c.name}": no result`);
            continue;
          }
          if (got.error !== undefined) {
            if (c.throws === undefined || !got.error.includes(c.throws)) fail(ch.id, `${label}/${lang} case "${c.name}": threw ${got.error}`);
          } else if (c.throws !== undefined) {
            fail(ch.id, `${label}/${lang} case "${c.name}": expected throw, got ${got.actual}`);
          } else if (!deepEqual(JSON.parse(got.actual ?? 'null'), c.expected)) {
            fail(ch.id, `${label}/${lang} case "${c.name}": expected ${formatValue(c.expected, 200)}, got ${got.actual}`);
          }
        }
      };
      runCases(ch.visibleTests, 'visible');
      runCases(ch.hiddenTests, 'hidden');
    } finally {
      ns.destroy();
    }
  }
}

// ---------------------------------------------------------------------------
// SQL in sql.js (the real runSqlCases)

let SQL: { Database: new () => { exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>; prepare(sql: string): { getColumnNames(): string[]; free(): void }; close(): void } } | null = null;

async function validateSql(ch: Challenge) {
  if (!SQL) {
    const initSqlJs = (await import('sql.js')).default as (opts: { locateFile: (f: string) => string }) => Promise<typeof SQL>;
    SQL = await initSqlJs({ locateFile: (f: string) => path.join(ROOT, 'node_modules', 'sql.js', 'dist', f) });
  }
  for (const [lang, code] of Object.entries(ch.solution.code)) {
    executed += 1;
    const createDb = () => new SQL.Database();
    for (const [label, spec] of [
      ['visible', ch.visibleTests],
      ['hidden', ch.hiddenTests],
    ] as const) {
      const res = runSqlCases(createDb, ch.seedSql, code, {
        kind: 'sql',
        cases: spec.cases.map((c) => ({ name: c.name, expectedColumns: c.expectedColumns, expectedRows: c.expectedRows ?? [], orderInsensitive: c.orderInsensitive, seed: c.seed })),
      });
      checked += spec.cases.length;
      for (const r of res.cases.filter((r) => !r.pass)) {
        fail(ch.id, `${label}/${lang} case "${r.name}": ${r.error ?? `expected ${r.expected}, got ${r.actual}`}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Structural checks

function validateStructure(ch: Challenge): boolean {
  let ok = true;
  const need = (cond: boolean, msg: string) => {
    if (!cond) {
      fail(ch.id, msg);
      ok = false;
    }
  };
  need(ch.hints.length === 3, `expected 3 hints, found ${ch.hints.length}`);
  need(ch.visibleTests !== null && ch.hiddenTests !== null, 'executable challenges need visible + hidden tests');
  const total = (ch.visibleTests?.cases.length ?? 0) + (ch.hiddenTests?.cases.length ?? 0);
  need(total >= 5, `expected at least 5 tests, found ${total}`);
  for (const l of ch.languages) {
    need(Boolean(ch.starters[l]?.trim()), `missing starter for "${l}"`);
    need(Boolean(ch.solution.code[l]?.trim()), `missing reference solution for "${l}"`);
  }
  need(ch.solution.explanation.trim().length >= 20, 'solution explanation too short');
  need(ch.complexity.trim().length >= 20, 'complexity notes too short');
  need(ch.mistakes.trim().length >= 20, 'common mistakes too short');
  need(ch.statement.trim().length >= 50, 'statement too short');
  need(ch.examples.trim().length >= 20, 'examples too short');
  need(ch.learn.trim().length >= 20, 'learn recap too short');
  need(ch.learnLinks.length >= 1, 'need at least one learnLink');
  if (ch.runner === 'sql') need(Boolean(ch.seedSql.trim()), 'sql challenges need seedSql');
  return ok;
}

// ---------------------------------------------------------------------------

const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'data', 'practice.json'), 'utf8')) as {
  challenges: Array<{ id: string; topic: string; slug: string; source: string }>;
};
const fileBased = index.challenges.filter((c) => c.source === 'practice');
if (!fileBased.length) {
  console.error('[validate:practice] no file-based challenges found — nothing to validate');
  process.exit(1);
}

for (const entry of fileBased) {
  const ch = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'data', 'pages', entry.topic, 'practice', `${entry.slug}.json`), 'utf8')) as Challenge;
  if (!validateStructure(ch)) continue;
  if (ch.runner === 'js') await validateJs(ch);
  else if (ch.runner === 'python') await validatePython(ch);
  else if (ch.runner === 'sql') await validateSql(ch);
  else fail(ch.id, `unknown runner "${ch.runner}"`);
}

if (failures.length) {
  console.error(`[validate:practice] ${failures.length} failure(s):\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`[validate:practice] ${fileBased.length} challenges · ${executed} solutions · ${checked} cases — all green`);
