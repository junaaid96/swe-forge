import { useSyncExternalStore } from 'react';
import { QUIZ_POINTS_PER_QUESTION, TOPIC_COMPLETE_BONUS } from '../data/types';
import type { ProgressState, TopicProgress } from '../data/types';
import { getFallbackTopicSummaries } from '../services/api';

const STORAGE_KEY = 'swe-forge-progress-v2';

function knownSlugs(): string[] {
  return getFallbackTopicSummaries().map((t) => t.slug);
}

function emptyTopic(): TopicProgress {
  return {
    completed: false,
    quizBest: 0,
    quizAttempts: 0,
    problemsSolved: [],
    interviewVisited: [],
    deepVisited: [],
  };
}

function defaultState(): ProgressState {
  const topics: Record<string, TopicProgress> = {};
  for (const slug of knownSlugs()) topics[slug] = emptyTopic();
  return { topics, totalScore: 0, streak: 0 };
}

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as ProgressState;
    const base = defaultState();
    for (const slug of Object.keys(parsed.topics ?? {})) {
      base.topics[slug] = {
        ...emptyTopic(),
        ...parsed.topics[slug],
        interviewVisited: parsed.topics[slug]?.interviewVisited ?? [],
        deepVisited: parsed.topics[slug]?.deepVisited ?? [],
        problemsSolved: parsed.topics[slug]?.problemsSolved ?? [],
      };
    }
    for (const slug of knownSlugs()) {
      if (!base.topics[slug]) base.topics[slug] = emptyTopic();
    }
    base.totalScore = parsed.totalScore ?? 0;
    base.streak = parsed.streak ?? 0;
    base.lastStudyDate = parsed.lastStudyDate;
    return base;
  } catch {
    return defaultState();
  }
}

let state = typeof window !== 'undefined' ? load() : defaultState();
const listeners = new Set<() => void>();

function emit() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function touchStreak(next: ProgressState) {
  const today = todayKey();
  if (next.lastStudyDate === today) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);
  next.streak = next.lastStudyDate === yKey ? next.streak + 1 : 1;
  next.lastStudyDate = today;
}

function recomputeScore(topics: Record<string, TopicProgress>): number {
  let score = 0;
  for (const slug of Object.keys(topics)) {
    const p = topics[slug] ?? emptyTopic();
    score += p.quizBest;
    score += p.problemsSolved.length * 15;
    score += (p.interviewVisited?.length ?? 0) * 2;
    score += (p.deepVisited?.length ?? 0) * 2;
    if (p.completed) score += TOPIC_COMPLETE_BONUS;
  }
  return score;
}

function update(mutator: (draft: ProgressState) => void) {
  const draft: ProgressState = {
    ...state,
    topics: { ...state.topics },
  };
  for (const key of Object.keys(draft.topics)) {
    draft.topics[key] = {
      ...draft.topics[key],
      problemsSolved: [...draft.topics[key].problemsSolved],
      interviewVisited: [...(draft.topics[key].interviewVisited ?? [])],
      deepVisited: [...(draft.topics[key].deepVisited ?? [])],
    };
  }
  mutator(draft);
  touchStreak(draft);
  draft.totalScore = recomputeScore(draft.topics);
  state = draft;
  emit();
}

export const progressStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return state;
  },
  markVisited(slug: string) {
    update((d) => {
      const t = d.topics[slug] ?? emptyTopic();
      d.topics[slug] = { ...t, lastVisited: new Date().toISOString() };
    });
  },
  markInterviewVisited(slug: string, level: string) {
    update((d) => {
      const t = d.topics[slug] ?? emptyTopic();
      const interviewVisited = t.interviewVisited.includes(level)
        ? t.interviewVisited
        : [...t.interviewVisited, level];
      d.topics[slug] = { ...t, interviewVisited, lastVisited: new Date().toISOString() };
    });
  },
  markDeepVisited(slug: string, track: string) {
    update((d) => {
      const t = d.topics[slug] ?? emptyTopic();
      const deepVisited = t.deepVisited.includes(track)
        ? t.deepVisited
        : [...t.deepVisited, track];
      d.topics[slug] = { ...t, deepVisited, lastVisited: new Date().toISOString() };
    });
  },
  markCompleted(slug: string) {
    update((d) => {
      const t = d.topics[slug] ?? emptyTopic();
      d.topics[slug] = { ...t, completed: true };
    });
  },
  recordQuiz(slug: string, correctCount: number, total: number) {
    const earned = correctCount * QUIZ_POINTS_PER_QUESTION;
    let best = earned;
    update((d) => {
      const t = d.topics[slug] ?? emptyTopic();
      const quizBest = Math.max(t.quizBest, earned);
      best = quizBest;
      d.topics[slug] = {
        ...t,
        quizBest,
        quizAttempts: t.quizAttempts + 1,
        completed: t.completed || (total > 0 && correctCount === total),
      };
    });
    return best;
  },
  solveProblem(slug: string, problemId: string) {
    update((d) => {
      const t = d.topics[slug] ?? emptyTopic();
      if (t.problemsSolved.includes(problemId)) return;
      d.topics[slug] = {
        ...t,
        problemsSolved: [...t.problemsSolved, problemId],
      };
    });
  },
  reset() {
    state = defaultState();
    emit();
  },
};

export function useProgress() {
  return useSyncExternalStore(progressStore.subscribe, progressStore.getSnapshot, defaultState);
}

export function getTopicProgress(state: ProgressState, slug: string): TopicProgress {
  return state.topics[slug] ?? emptyTopic();
}

export function getCompletionStats(state: ProgressState) {
  const slugs = knownSlugs();
  const total = slugs.length || Object.keys(state.topics).length;
  const completed = slugs.filter((slug) => state.topics[slug]?.completed).length;
  const quizzesTaken = Object.values(state.topics).reduce((n, t) => n + (t.quizAttempts ?? 0), 0);
  const problemsSolved = Object.values(state.topics).reduce(
    (n, t) => n + (t.problemsSolved?.length ?? 0),
    0,
  );
  return {
    total,
    completed,
    quizzesTaken,
    problemsSolved,
    totalProblems: problemsSolved,
    pct: total ? Math.round((completed / total) * 100) : 0,
  };
}
