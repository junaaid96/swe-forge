import { useSyncExternalStore } from 'react';
import { dayKey, schedule, type CardState, type Grade } from './srs';

const KEY = 'forgeline:progress:v1';
const LEGACY_KEY = 'swe-forge-progress-v2';

export interface PageState {
  visitedAt: number;
  readAt?: number;
}

export interface MockAnswer {
  cardId: string;
  topic: string;
  q: string;
  url: string;
  score: number; // 0 | 0.5 | 1
}

export interface MockResult {
  id: string;
  at: number;
  topics: string[];
  durationSec: number;
  timeLimitSec: number;
  answers: MockAnswer[];
}

export interface ProgressState {
  version: 1;
  pages: Record<string, PageState>;
  bookmarks: string[];
  lastPage?: { key: string; url: string; title: string; at: number };
  quiz: Record<string, { best: number; total: number; attempts: number }>;
  problems: Record<string, string[]>;
  completed: string[];
  cards: Record<string, CardState>;
  reviews: Record<string, number>;
  newCards: { day: string; count: number };
  srs: { newPerDay: number; topics: string[]; sources: string[] };
  mocks: MockResult[];
  streak: number;
  lastStudyDate?: string;
}

function empty(): ProgressState {
  return {
    version: 1,
    pages: {},
    bookmarks: [],
    quiz: {},
    problems: {},
    completed: [],
    cards: {},
    reviews: {},
    newCards: { day: '', count: 0 },
    srs: { newPerDay: 15, topics: [], sources: ['interview', 'prep', 'mcq', 'concept'] },
    mocks: [],
    streak: 0,
  };
}

interface LegacyTopic {
  completed?: boolean;
  quizBest?: number;
  quizAttempts?: number;
  problemsSolved?: string[];
  interviewVisited?: string[];
  deepVisited?: string[];
}

/** Carry over progress from the old SWE Forge store so nobody loses their streak. */
function migrateLegacy(): ProgressState | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const old = JSON.parse(raw) as { topics?: Record<string, LegacyTopic>; streak?: number; lastStudyDate?: string };
    const s = empty();
    const now = Date.now();
    for (const [slug, t] of Object.entries(old.topics ?? {})) {
      if (t.completed) s.completed.push(slug);
      if (t.quizAttempts) s.quiz[slug] = { best: Math.round((t.quizBest ?? 0) / 10), total: 0, attempts: t.quizAttempts };
      if (t.problemsSolved?.length) s.problems[slug] = [...t.problemsSolved];
      for (const lvl of t.interviewVisited ?? []) s.pages[`${slug}/interview/${lvl}`] = { visitedAt: now };
      for (const tr of t.deepVisited ?? []) s.pages[`${slug}/deep/${tr}`] = { visitedAt: now };
    }
    s.streak = old.streak ?? 0;
    s.lastStudyDate = old.lastStudyDate;
    return s;
  } catch {
    return null;
  }
}

function load(): ProgressState {
  if (typeof localStorage === 'undefined') return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProgressState>;
      const base = empty();
      return { ...base, ...parsed, srs: { ...base.srs, ...(parsed.srs ?? {}) }, newCards: parsed.newCards ?? base.newCards };
    }
  } catch {
    /* fall through */
  }
  return migrateLegacy() ?? empty();
}

let state = load();
const listeners = new Set<() => void>();

function commit(next: ProgressState, study = true) {
  if (study) {
    const today = dayKey();
    if (next.lastStudyDate !== today) {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      next.streak = next.lastStudyDate === dayKey(y) ? next.streak + 1 : 1;
      next.lastStudyDate = today;
    }
  }
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or disabled — keep in memory */
  }
  listeners.forEach((l) => l());
}

function update(fn: (s: ProgressState) => void, study = true) {
  const next: ProgressState = structuredClone(state);
  fn(next);
  commit(next, study);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = load();
      listeners.forEach((l) => l());
    }
  });
}

export const progress = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => state,
  visit(key: string, url: string, title: string) {
    update((s) => {
      s.pages[key] = { ...s.pages[key], visitedAt: Date.now() };
      s.lastPage = { key, url, title, at: Date.now() };
    }, false);
  },
  setRead(key: string, read: boolean) {
    update((s) => {
      const p = s.pages[key] ?? { visitedAt: Date.now() };
      if (read) p.readAt = Date.now();
      else delete p.readAt;
      s.pages[key] = p;
    }, read);
  },
  toggleBookmark(key: string) {
    update((s) => {
      s.bookmarks = s.bookmarks.includes(key) ? s.bookmarks.filter((k) => k !== key) : [key, ...s.bookmarks];
    }, false);
  },
  recordQuiz(slug: string, correct: number, total: number) {
    update((s) => {
      const q = s.quiz[slug] ?? { best: 0, total, attempts: 0 };
      s.quiz[slug] = { best: Math.max(q.best, correct), total, attempts: q.attempts + 1 };
    });
  },
  toggleProblem(slug: string, id: string) {
    update((s) => {
      const list = s.problems[slug] ?? [];
      s.problems[slug] = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    });
  },
  toggleCompleted(slug: string) {
    update((s) => {
      s.completed = s.completed.includes(slug) ? s.completed.filter((x) => x !== slug) : [...s.completed, slug];
    });
  },
  reviewCard(id: string, topic: string, grade: Grade) {
    update((s) => {
      const today = dayKey();
      const isNew = !s.cards[id];
      s.cards[id] = schedule(s.cards[id], grade, topic, today);
      s.reviews[today] = (s.reviews[today] ?? 0) + 1;
      if (isNew) s.newCards = s.newCards.day === today ? { day: today, count: s.newCards.count + 1 } : { day: today, count: 1 };
    });
  },
  /** Put cards back into today's queue (e.g. questions missed in a mock interview). */
  dueToday(ids: Array<{ id: string; topic: string }>) {
    update((s) => {
      const today = dayKey();
      for (const { id, topic } of ids) {
        const c = s.cards[id];
        s.cards[id] = c ? { ...c, due: today } : { t: topic, ef: 2.5, reps: 0, interval: 0, due: today, lapses: 0, last: today };
      }
    }, false);
  },
  setSrs(patch: Partial<ProgressState['srs']>) {
    update((s) => {
      s.srs = { ...s.srs, ...patch };
    }, false);
  },
  saveMock(result: MockResult) {
    update((s) => {
      s.mocks = [result, ...s.mocks].slice(0, 50);
    });
  },
  exportJson: () => JSON.stringify(state, null, 2),
  importJson(json: string) {
    const parsed = JSON.parse(json) as ProgressState;
    if (parsed?.version !== 1) throw new Error('Not a Forgeline progress file');
    commit({ ...empty(), ...parsed }, false);
  },
  reset() {
    commit(empty(), false);
  },
};

export function useProgress() {
  return useSyncExternalStore(progress.subscribe, progress.get, progress.get);
}
