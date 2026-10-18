/** Practice Lab progress: versioned store, migrated from legacy solved state. */
import { useSyncExternalStore } from 'react';

const KEY = 'forgeline:practice:v1';
const LEGACY_PROGRESS_KEY = 'forgeline:progress:v1';

export type PracticeStatus = 'unsolved' | 'attempted' | 'solved' | 'solved-hints';

export interface ChallengeRecord {
  attempts: number;
  hintsUsed: number;
  /** wall-clock ms from first attempt to solve */
  timeMs: number;
  firstAttemptAt?: number;
  lastAttemptAt?: number;
  solvedAt?: number;
  gaveUp?: boolean;
  drafts: Record<string, string>;
  lastLanguage?: string;
}

export interface PracticeState {
  version: 1;
  records: Record<string, ChallengeRecord>;
  lastChallenge?: { id: string; url: string; title: string; at: number };
}

function emptyRecord(): ChallengeRecord {
  return { attempts: 0, hintsUsed: 0, timeMs: 0, drafts: {} };
}

function empty(): PracticeState {
  return { version: 1, records: {} };
}

export function statusOf(r?: ChallengeRecord): PracticeStatus {
  if (!r || (!r.attempts && !r.solvedAt)) return 'unsolved';
  if (r.solvedAt) return r.hintsUsed > 0 ? 'solved-hints' : 'solved';
  return 'attempted';
}

/** Carry over manually-marked legacy solutions so nobody loses solved state. */
function migrateLegacy(): PracticeState | null {
  try {
    const raw = localStorage.getItem(LEGACY_PROGRESS_KEY);
    if (!raw) return null;
    const old = JSON.parse(raw) as { problems?: Record<string, string[]> };
    const entries = Object.entries(old.problems ?? {});
    if (!entries.length) return null;
    const s = empty();
    const now = Date.now();
    for (const [slug, ids] of entries) {
      for (const pid of ids ?? []) {
        s.records[`${slug}/${pid}`] = { ...emptyRecord(), attempts: 1, firstAttemptAt: now, lastAttemptAt: now, solvedAt: now };
      }
    }
    return s;
  } catch {
    return null;
  }
}

function merge(parsed: Partial<PracticeState>): PracticeState {
  const base = empty();
  return { ...base, ...parsed };
}

function load(): PracticeState {
  try {
    if (typeof localStorage === 'undefined') return empty();
    const raw = localStorage.getItem(KEY);
    if (raw) return merge(JSON.parse(raw) as Partial<PracticeState>);
  } catch {
    /* storage blocked or corrupt — fall through */
  }
  try {
    return migrateLegacy() ?? empty();
  } catch {
    return empty();
  }
}

let state: PracticeState;
try {
  state = load();
} catch {
  state = empty();
}
const listeners = new Set<() => void>();

function commit(next: PracticeState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or disabled — keep in memory */
  }
  listeners.forEach((l) => l());
}

function update(fn: (s: PracticeState) => void) {
  const next: PracticeState = structuredClone(state);
  fn(next);
  commit(next);
}

function record(s: PracticeState, id: string): ChallengeRecord {
  return (s.records[id] ??= emptyRecord());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      try {
        state = load();
      } catch {
        state = empty();
      }
      listeners.forEach((l) => l());
    }
  });
}

export const practice = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => state,
  visit(id: string, url: string, title: string) {
    update((s) => {
      s.lastChallenge = { id, url, title, at: Date.now() };
    });
  },
  recordAttempt(id: string) {
    update((s) => {
      const r = record(s, id);
      const now = Date.now();
      r.attempts += 1;
      r.firstAttemptAt ??= now;
      r.lastAttemptAt = now;
    });
  },
  recordSolve(id: string) {
    update((s) => {
      const r = record(s, id);
      if (r.solvedAt) return;
      const now = Date.now();
      r.solvedAt = now;
      r.lastAttemptAt = now;
      if (r.firstAttemptAt) r.timeMs = now - r.firstAttemptAt;
    });
  },
  setHintsUsed(id: string, n: number) {
    update((s) => {
      const r = record(s, id);
      r.hintsUsed = Math.max(r.hintsUsed, n);
    });
  },
  recordGiveUp(id: string) {
    update((s) => {
      const r = record(s, id);
      r.gaveUp = true;
      const now = Date.now();
      r.firstAttemptAt ??= now;
      r.lastAttemptAt = now;
    });
  },
  saveDraft(id: string, language: string, code: string) {
    update((s) => {
      record(s, id).drafts[language] = code;
    });
  },
  clearDraft(id: string, language: string) {
    update((s) => {
      delete record(s, id).drafts[language];
    });
  },
  setLanguage(id: string, language: string) {
    update((s) => {
      record(s, id).lastLanguage = language;
    });
  },
  exportData: () => state,
  importData(data: PracticeState) {
    if (data?.version !== 1) throw new Error('Not a Forgeline practice file');
    commit(merge(data));
  },
  reset() {
    commit(empty());
  },
};

export function usePractice() {
  return useSyncExternalStore(practice.subscribe, practice.get, practice.get);
}
