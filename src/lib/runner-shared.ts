/** Pure helpers shared by the code runners (also imported by the Web Worker). */

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  const ka = Object.keys(ra).filter((k) => ra[k] !== undefined);
  const kb = Object.keys(rb).filter((k) => rb[k] !== undefined);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.hasOwn(rb, k) && deepEqual(ra[k], rb[k]));
}

export function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}… (+${s.length - max} chars)` : s;
}

/** Stable one-value-per-line rendering for expected/actual diffs. */
export function formatValue(v: unknown, max = 2000): string {
  let s: string;
  if (typeof v === 'string') s = JSON.stringify(v);
  else if (typeof v === 'undefined') s = 'undefined';
  else if (typeof v === 'function') s = '[function]';
  else {
    try {
      s = JSON.stringify(v, null, 2) ?? String(v);
    } catch {
      s = String(v);
    }
  }
  return truncate(s, max);
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message || e.name;
  return String(e);
}

/**
 * Map a worker stack frame back to a user-code line. `lineOffset` is measured
 * at runtime (V8 adds the creation-site line). Best effort: V8 first, then
 * generic fallbacks; null when nothing parses or no offset was measured.
 */
export function parseErrorLine(stack: string | undefined, lineOffset: number | null): number | null {
  if (!stack || lineOffset === null) return null;
  const patterns = [/<anonymous>:(\d+):\d+/, /> Function:(\d+):\d+/, /line (\d+) > Function/];
  for (const re of patterns) {
    const m = stack.match(re);
    if (m) {
      const line = Number(m[1]) - lineOffset;
      return Number.isFinite(line) && line >= 1 ? line : null;
    }
  }
  return null;
}
