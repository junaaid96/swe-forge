/**
 * SQL practice runner. Classic Web Worker: sql.js is importScripts'd from
 * same-origin /vendor (never bundled, never CDN) and loads lazily on the
 * first SQL run. Each run gets a fresh in-memory database seeded from the
 * challenge; nothing persists, SQLite has no network or file I/O, and hangs
 * are handled by the main thread, which terminates and respawns this worker.
 */
import { deepEqual, errorMessage, formatValue } from '../lib/runner-shared';
import type { CaseResult } from '../lib/runners';
import type { SqlTestCase, SqlTestSpec } from '../lib/types';

declare function importScripts(...urls: string[]): void;
declare const initSqlJs:
  | ((opts: { locateFile: (file: string) => string }) => Promise<SqlJsModule>)
  | undefined;

export interface SqlResultSet {
  columns: string[];
  values: unknown[][];
}

export interface SqlDb {
  exec(sql: string): SqlResultSet[];
  prepare(sql: string): { getColumnNames(): string[]; free(): void };
  close(): void;
}

interface SqlJsModule {
  Database: new () => SqlDb;
}

export interface SqlRunRequest {
  id: number;
  code: string;
  seedSql: string;
  spec: SqlTestSpec;
  outputLimit: number;
}

export interface SqlRunResponse {
  id: number;
  ok: boolean;
  cases: CaseResult[];
  stdout: string;
  truncated: boolean;
  runtimeMs: number;
  error?: string;
}

const workerSelf = self as unknown as {
  onmessage: ((e: MessageEvent<SqlRunRequest>) => void) | null;
  postMessage: (msg: SqlRunResponse) => void;
};

let SQL: SqlJsModule | null = null;
let initError: string | null = null;

async function ensureInit(): Promise<SqlJsModule> {
  if (SQL) return SQL;
  if (initError) throw new Error(initError);
  try {
    importScripts('/vendor/sqljs/sql-wasm.js');
    if (typeof initSqlJs !== 'function') throw new Error('sql.js loader did not register.');
    SQL = await initSqlJs({ locateFile: (file: string) => `/vendor/sqljs/${file}` });
    return SQL;
  } catch (e) {
    initError = `The SQL runtime failed to load (${errorMessage(e)}). Check your connection and run again.`;
    throw new Error(initError);
  }
}

function stable(row: unknown): string {
  return JSON.stringify(row) ?? String(row);
}

function compareCase(actual: SqlResultSet, test: SqlTestCase): CaseResult {
  const show = { columns: actual.columns, rows: actual.values };
  if (test.expectedColumns && !deepEqual(actual.columns, test.expectedColumns)) {
    return {
      name: test.name,
      pass: false,
      expected: formatValue({ columns: test.expectedColumns, rows: test.expectedRows }),
      actual: formatValue(show),
      error: `Columns differ: got (${actual.columns.join(', ') || 'none'})`,
    };
  }
  const got = actual.values;
  const want = test.expectedRows;
  const ordered = test.orderInsensitive
    ? [got.map(stable).sort(), want.map(stable).sort()]
    : [got.map(stable), want.map(stable)];
  if (deepEqual(ordered[0], ordered[1])) return { name: test.name, pass: true };
  return {
    name: test.name,
    pass: false,
    expected: formatValue({ columns: test.expectedColumns ?? actual.columns, rows: want }),
    actual: formatValue(show),
  };
}

/** Row-producing statement at the start of the query or after a semicolon. */
const ROW_PRODUCING = /(^|;)\s*(SELECT|WITH|VALUES|TABLE|EXPLAIN|PRAGMA)\b/i;

function stripComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/**
 * sql.js exec() drops zero-row result sets, so recover the columns via
 * prepare() (exact for single-statement queries) and compare zero rows.
 */
function emptyActual(db: SqlDb, query: string): SqlResultSet {
  let columns: string[] = [];
  try {
    const stmt = db.prepare(query);
    try {
      columns = stmt.getColumnNames();
    } finally {
      stmt.free();
    }
  } catch {
    /* unrecoverable — compare rows only */
  }
  return { columns, values: [] };
}

/** Pure over a minimal db handle so Node can drive it against real sql.js. */
export function runSqlCases(db: SqlDb, query: string, spec: SqlTestSpec): { ok: boolean; cases: CaseResult[] } {
  let sets: SqlResultSet[];
  try {
    sets = db.exec(query);
  } catch (e) {
    const msg = errorMessage(e);
    return { ok: false, cases: spec.cases.map((c) => ({ name: c.name, pass: false, error: msg })) };
  }
  const actual = sets.length ? sets[sets.length - 1] : emptyResult(db, query);
  if (!actual) {
    return {
      ok: false,
      cases: spec.cases.map((c) => ({ name: c.name, pass: false, error: 'The query returned no result set. End with a SELECT.' })),
    };
  }
  const cases = spec.cases.map((c) => compareCase(actual, c));
  return { ok: cases.every((c) => c.pass), cases };
}

function emptyResult(db: SqlDb, query: string): SqlResultSet | null {
  if (!ROW_PRODUCING.test(stripComments(query))) return null;
  return emptyActual(db, query);
}

workerSelf.onmessage = (e: MessageEvent<SqlRunRequest>) => {
  void run(e.data);
};

async function run(req: SqlRunRequest) {
  const { id, code, seedSql, spec } = req;
  const respond = (r: Omit<SqlRunResponse, 'id'>) => workerSelf.postMessage({ ...r, id });

  const t0 = performance.now();
  const done = (r: Omit<SqlRunResponse, 'id' | 'stdout' | 'truncated' | 'runtimeMs'>) =>
    respond({ ...r, stdout: '', truncated: false, runtimeMs: Math.round((performance.now() - t0) * 10) / 10 });

  try {
    const sql = await ensureInit();
    const db = new sql.Database();
    try {
      try {
        db.exec(seedSql);
      } catch (e) {
        done({ ok: false, cases: [], error: `Seed data failed to load: ${errorMessage(e)}` });
        return;
      }
      done(runSqlCases(db, code, spec));
    } finally {
      try {
        db.close();
      } catch {
        /* already gone */
      }
    }
  } catch (err) {
    done({ ok: false, cases: [], error: errorMessage(err) });
  }
}
