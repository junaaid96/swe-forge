/**
 * Daily challenge: deterministic per day, biased toward the weakest topic.
 * A practice challenge when the Practice Lab has one, otherwise a study set
 * (topic flashcards + quiz). One skip per day. Completing it counts toward
 * the streak via the normal progress/practice stores.
 */
import { useSyncExternalStore } from 'react';
import type { Catalog, PracticeIndexEntry } from './types';
import { progress, type ProgressState } from './progress';
import { allStats } from './stats';
import type { PracticeState } from './practiceStore';
import { dayKey } from './srs';

const KEY = 'forgeline:daily:v1';

export type DailyKind = 'practice' | 'study';

export interface DailyState {
  version: 1;
  /** yyyy-mm-dd this challenge was picked for */
  date: string;
  kind: DailyKind;
  topic: string;
  /** challenge id for practice kind, '' for study kind */
  challengeId: string;
  skipped: boolean;
  /** manual completion, only used for the study kind (practice derives it) */
  done: boolean;
}

function empty(): DailyState {
  return { version: 1, date: '', kind: 'study', topic: '', challengeId: '', skipped: false, done: false };
}

function load(): DailyState {
  try {
    if (typeof localStorage === 'undefined') return empty();
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<DailyState>;
    if (parsed?.version !== 1) return empty();
    return { ...empty(), ...parsed };
  } catch {
    return empty();
  }
}

let state: DailyState;
try {
  state = load();
} catch {
  state = empty();
}
const listeners = new Set<() => void>();

function commit(next: DailyState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export const daily = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => state,
  setDay(pick: Pick<DailyState, 'date' | 'kind' | 'topic' | 'challengeId'>, skipped = false) {
    commit({ version: 1, ...pick, skipped, done: false });
  },
  markDone() {
    if (state.kind === 'study' && !state.done) {
      commit({ ...state, done: true });
      progress.touchStreak();
    }
  },
  exportData: () => state,
  importData(d: DailyState) {
    if (d?.version !== 1) throw new Error('Not a Forgeline daily file');
    commit({ ...empty(), ...d });
  },
  reset() {
    commit(empty());
  },
};

export function useDaily() {
  return useSyncExternalStore(daily.subscribe, daily.get, daily.get);
}

function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Weakest topic by mastery (ties break alphabetically, so it is stable). */
export function weakestTopic(catalog: Catalog, state: ProgressState, practice?: PracticeState): string {
  const stats = allStats(catalog, state, practice);
  let worst = '';
  let worstScore = Infinity;
  for (const t of catalog.topics) {
    const m = stats.get(t.slug)?.mastery ?? 0;
    if (m < worstScore || (m === worstScore && t.slug < worst)) {
      worstScore = m;
      worst = t.slug;
    }
  }
  return worst || catalog.topics[0]?.slug || '';
}

export interface DailyPick {
  kind: DailyKind;
  topic: string;
  challenge: PracticeIndexEntry | null;
}

/**
 * Deterministic pick for a date. Prefers an executable challenge in the
 * weakest topic, falls back to any executable challenge, then to a study set.
 */
export function pickDaily(date: string, topic: string, challenges: PracticeIndexEntry[] | undefined, salt = 0): DailyPick {
  const runnable = (challenges ?? []).filter((c) => c.runner !== 'none');
  const pool = runnable.filter((c) => c.topic === topic);
  const list = pool.length ? pool : runnable;
  if (!list.length) return { kind: 'study', topic, challenge: null };
  const idx = hash(`${date}:${topic}:${salt}`) % list.length;
  const challenge = list[idx];
  return { kind: 'practice', topic: challenge.topic, challenge };
}

export function todayKey() {
  return dayKey();
}
