import { useSyncExternalStore } from 'react';
import { TOPIC_COMPLETE_BONUS, QUIZ_POINTS_PER_QUESTION } from '../data/categories';
import type { ProgressState, Topic, TopicProgress } from '../data/types';
import { getFallbackTopics } from '../services/api';

const STORAGE_KEY = 'swe-forge-progress-v1';

function knownTopics(): Topic[] {
  return getFallbackTopics();
}

function emptyTopic(): TopicProgress {
  return {
    completed: false,
    quizBest: 0,
    quizAttempts: 0,
    problemsSolved: [],
  };
}

function defaultState(): ProgressState {
  const topics: Record<string, TopicProgress> = {};
  for (const t of knownTopics()) topics[t.slug] = emptyTopic();
  return { topics, totalScore: 0, streak: 0 };
}

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as ProgressState;
    const base = defaultState();
    for (const slug of Object.keys(parsed.topics ?? {})) {
      base.topics[slug] = { ...emptyTopic(), ...parsed.topics[slug] };
    }
    for (const t of knownTopics()) {
      if (!base.topics[t.slug]) base.topics[t.slug] = emptyTopic();
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
  for (const t of knownTopics()) {
    const p = topics[t.slug] ?? emptyTopic();
    score += p.quizBest;
    for (const pid of p.problemsSolved) {
      const problem = t.problems.find((x) => x.id === pid);
      if (problem) score += problem.points;
    }
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
        completed: t.completed || correctCount === total,
      };
    });
    return best;
  },
  solveProblem(slug: string, problemId: string) {
    update((d) => {
      const t = d.topics[slug] ?? emptyTopic();
      if (t.problemsSolved.includes(problemId)) return;
      const problemsSolved = [...t.problemsSolved, problemId];
      const topic = knownTopics().find((x) => x.slug === slug);
      const allDone = topic
        ? problemsSolved.length >= topic.problems.length && t.quizBest > 0
        : false;
      d.topics[slug] = {
        ...t,
        problemsSolved,
        completed: t.completed || allDone,
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
  const topics = knownTopics();
  const total = topics.length;
  const completed = topics.filter((t) => state.topics[t.slug]?.completed).length;
  const quizzesTaken = topics.reduce((n, t) => n + (state.topics[t.slug]?.quizAttempts ?? 0), 0);
  const problemsSolved = topics.reduce(
    (n, t) => n + (state.topics[t.slug]?.problemsSolved.length ?? 0),
    0,
  );
  const totalProblems = topics.reduce((n, t) => n + t.problems.length, 0);
  return {
    total,
    completed,
    quizzesTaken,
    problemsSolved,
    totalProblems,
    pct: total ? Math.round((completed / total) * 100) : 0,
  };
}
