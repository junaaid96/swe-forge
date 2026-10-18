/** Learning-path step status, derived from existing progress — never tracked twice. */
import type { Path, PathStep } from './types';
import type { ProgressState } from './progress';
import { statusOf, type PracticeState } from './practiceStore';
import { isMastered } from './srs';

export type StepStatus = 'done' | 'active' | 'todo';

export const QUIZ_PASS_PCT = 60;
export const FLASHCARDS_DONE_COUNT = 5;

function topicCards(state: ProgressState, topic: string) {
  let seen = 0;
  let mastered = 0;
  for (const c of Object.values(state.cards)) {
    if (c.t !== topic || c.reps + c.lapses === 0) continue;
    seen += 1;
    if (isMastered(c)) mastered += 1;
  }
  return { seen, mastered };
}

export function stepStatus(step: PathStep, state: ProgressState, practice?: PracticeState): StepStatus {
  switch (step.type) {
    case 'guide':
    case 'interview':
      return step.keys.length && step.keys.every((k) => state.pages[k]?.readAt) ? 'done' : 'todo';
    case 'quiz': {
      const q = state.quiz[step.topic];
      if (!q || !q.total) return 'todo';
      return Math.round((q.best / q.total) * 100) >= QUIZ_PASS_PCT ? 'done' : 'active';
    }
    case 'flashcards': {
      const { seen, mastered } = topicCards(state, step.topic);
      if (mastered >= FLASHCARDS_DONE_COUNT) return 'done';
      return seen > 0 ? 'active' : 'todo';
    }
    case 'practice': {
      if (!practice) return 'todo';
      const st = statusOf(practice.records[step.ref]);
      if (st === 'solved' || st === 'solved-hints') return 'done';
      return st === 'attempted' ? 'active' : 'todo';
    }
  }
}

export interface PathProgress {
  done: number;
  total: number;
  pct: number;
  next: PathStep | undefined;
}

export function pathProgress(path: Path, state: ProgressState, practice?: PracticeState): PathProgress {
  const statuses = path.steps.map((s) => stepStatus(s, state, practice));
  const done = statuses.filter((s) => s === 'done').length;
  const nextIdx = statuses.findIndex((s) => s !== 'done');
  return { done, total: path.steps.length, pct: path.steps.length ? Math.round((done / path.steps.length) * 100) : 0, next: nextIdx >= 0 ? path.steps[nextIdx] : undefined };
}
