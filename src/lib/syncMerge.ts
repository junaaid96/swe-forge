/**
 * Per-record merge for sync (5.3). Rules, per data kind:
 * - read pages / bookmarks / reviews / mocks / solves: union (nothing lost)
 * - SRS cards: last-write-wins per card by (last, due, reps)
 * - practice records: max counters, earliest solve, latest drafts
 * - settings-ish values: max / union
 * Deletes do not propagate (union resurrects) — the no-data-loss direction.
 */
import type { CustomCardsState } from './customCards';
import type { DailyState } from './daily';
import type { DesignAttempt, DesignState } from './design';
import type { Note, NotesState } from './notes';
import type { ChallengeRecord, PracticeState } from './practiceStore';
import type { MockResult, ProgressState } from './progress';
import type { StudyPlanState } from './studyPlan';
import type { CardState } from './srs';
import type { SyncEnvelope } from './sync';

function unionBy<T>(a: T[], b: T[], key: (x: T) => string): T[] {
  const map = new Map<string, T>();
  for (const x of [...a, ...b]) if (!map.has(key(x))) map.set(key(x), x);
  return [...map.values()];
}

// --- progress --------------------------------------------------------------

function mergeCard(a: CardState, b: CardState): CardState {
  if (a.last !== b.last) return a.last > b.last ? a : b;
  if (a.due !== b.due) return a.due > b.due ? a : b;
  if (a.reps !== b.reps) return a.reps > b.reps ? a : b;
  return a;
}

export function mergeProgress(a: ProgressState, b: ProgressState): ProgressState {
  const pages: ProgressState['pages'] = { ...a.pages };
  for (const [k, v] of Object.entries(b.pages)) {
    const cur = pages[k];
    pages[k] = !cur ? v : { visitedAt: Math.max(cur.visitedAt, v.visitedAt), readAt: Math.max(cur.readAt ?? 0, v.readAt ?? 0) || undefined };
  }
  const cards: ProgressState['cards'] = { ...a.cards };
  for (const [k, v] of Object.entries(b.cards)) cards[k] = cards[k] ? mergeCard(cards[k], v) : v;
  const quiz: ProgressState['quiz'] = { ...a.quiz };
  for (const [k, v] of Object.entries(b.quiz)) {
    const cur = quiz[k];
    if (!cur) quiz[k] = v;
    else quiz[k] = { best: Math.max(cur.best, v.best), total: Math.max(cur.total, v.total), attempts: Math.max(cur.attempts, v.attempts) };
  }
  const reviews: ProgressState['reviews'] = { ...a.reviews };
  for (const [k, v] of Object.entries(b.reviews)) reviews[k] = Math.max(reviews[k] ?? 0, v);
  const problems: ProgressState['problems'] = { ...a.problems };
  for (const [k, v] of Object.entries(b.problems ?? {})) problems[k] = [...new Set([...(problems[k] ?? []), ...v])];
  const streakSide = (b.lastStudyDate ?? '') !== (a.lastStudyDate ?? '') ? ((b.lastStudyDate ?? '') > (a.lastStudyDate ?? '') ? b : a) : a.streak >= b.streak ? a : b;
  return {
    version: 1,
    pages,
    bookmarks: [...new Set([...a.bookmarks, ...b.bookmarks])],
    lastPage: (b.lastPage?.at ?? 0) > (a.lastPage?.at ?? 0) ? b.lastPage : a.lastPage,
    quiz,
    problems,
    completed: [...new Set([...a.completed, ...b.completed])],
    cards,
    reviews,
    newCards: a.newCards.day === b.newCards.day ? { day: a.newCards.day, count: Math.max(a.newCards.count, b.newCards.count) } : a.newCards.day > b.newCards.day ? a.newCards : b.newCards,
    srs: { newPerDay: Math.max(a.srs.newPerDay, b.srs.newPerDay), topics: [...new Set([...a.srs.topics, ...b.srs.topics])], sources: [...new Set([...a.srs.sources, ...b.srs.sources])] },
    mocks: unionBy(a.mocks, b.mocks, (m: MockResult) => m.id).sort((x, y) => y.at - x.at).slice(0, 200),
    streak: streakSide.streak,
    lastStudyDate: streakSide.lastStudyDate,
  };
}

// --- practice --------------------------------------------------------------

function mergeRecord(a: ChallengeRecord, b: ChallengeRecord): ChallengeRecord {
  const latest = (b.lastAttemptAt ?? 0) >= (a.lastAttemptAt ?? 0) ? b : a;
  const drafts: Record<string, string> = { ...a.drafts };
  for (const [lang, code] of Object.entries(b.drafts)) {
    if (!drafts[lang] || drafts[lang] === code) drafts[lang] = code;
    else if (latest === b) drafts[lang] = code;
  }
  const solved = [a.solvedAt, b.solvedAt].filter((x): x is number => typeof x === 'number');
  return {
    attempts: Math.max(a.attempts, b.attempts),
    hintsUsed: Math.max(a.hintsUsed, b.hintsUsed),
    timeMs: Math.max(a.timeMs, b.timeMs),
    firstAttemptAt: Math.min(a.firstAttemptAt ?? Infinity, b.firstAttemptAt ?? Infinity),
    lastAttemptAt: Math.max(a.lastAttemptAt ?? 0, b.lastAttemptAt ?? 0) || undefined,
    solvedAt: solved.length ? Math.min(...solved) : undefined,
    gaveUp: a.gaveUp || b.gaveUp || undefined,
    drafts,
    lastLanguage: latest.lastLanguage ?? a.lastLanguage ?? b.lastLanguage,
  };
}

export function mergePractice(a: PracticeState, b: PracticeState): PracticeState {
  const records: PracticeState['records'] = { ...a.records };
  for (const [k, v] of Object.entries(b.records)) records[k] = records[k] ? mergeRecord(records[k], v) : v;
  return {
    version: 1,
    records,
    lastChallenge: (b.lastChallenge?.at ?? 0) > (a.lastChallenge?.at ?? 0) ? b.lastChallenge : a.lastChallenge,
  };
}

// --- small stores ----------------------------------------------------------

export function mergeDaily(a: DailyState, b: DailyState): DailyState {
  if (a.date === b.date) return { ...a, done: a.done || b.done, skipped: a.skipped || b.skipped };
  return a.date > b.date ? a : b;
}

export function mergePlan(a: StudyPlanState, b: StudyPlanState): StudyPlanState {
  const win = (b.createdAt ?? '') >= (a.createdAt ?? '') ? b : a;
  return { ...win, checks: [...new Set([...a.checks, ...b.checks])] };
}

export function mergeNotes(a: NotesState, b: NotesState): NotesState {
  const map = new Map<string, Note>();
  for (const n of a.notes) map.set(n.id, n);
  for (const n of b.notes) {
    const cur = map.get(n.id);
    map.set(n.id, cur && cur.updatedAt >= n.updatedAt ? cur : n);
  }
  return { version: 1, notes: [...map.values()].sort((x, y) => y.updatedAt - x.updatedAt) };
}

export function mergeCustomCards(a: CustomCardsState, b: CustomCardsState): CustomCardsState {
  return { version: 1, cards: unionBy(a.cards, b.cards, (c) => c.id), includeMcqInSessions: a.includeMcqInSessions || b.includeMcqInSessions };
}

export function mergeDesign(a: DesignState, b: DesignState): DesignState {
  const attempts: DesignState['attempts'] = {};
  for (const slug of new Set([...Object.keys(a.attempts), ...Object.keys(b.attempts)])) {
    const x = a.attempts[slug];
    const y = b.attempts[slug];
    if (!x) attempts[slug] = y;
    else if (!y) attempts[slug] = x;
    else {
      const win: DesignAttempt = y.updatedAt >= x.updatedAt ? y : x;
      attempts[slug] = { ...win, checks: [...new Set([...x.checks, ...y.checks])] };
    }
  }
  return { version: 1, attempts };
}

// --- envelope --------------------------------------------------------------

export function mergeEnvelopes(a: SyncEnvelope, b: SyncEnvelope): SyncEnvelope {
  return {
    app: 'forgeline',
    version: 1,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
    deviceId: a.deviceId,
    progress: mergeProgress(a.progress, b.progress),
    practice: mergePractice(a.practice, b.practice),
    daily: mergeDaily(a.daily, b.daily),
    plan: mergePlan(a.plan, b.plan),
    notes: mergeNotes(a.notes, b.notes),
    customCards: mergeCustomCards(a.customCards, b.customCards),
    design: mergeDesign(a.design, b.design),
  };
}

export interface MergeCounts {
  pages: number;
  cards: number;
  mocks: number;
  records: number;
  notes: number;
}

export function countEnvelope(e: SyncEnvelope): MergeCounts {
  return {
    pages: Object.values(e.progress.pages).filter((p) => p.readAt).length,
    cards: Object.keys(e.progress.cards).length,
    mocks: e.progress.mocks.length,
    records: Object.keys(e.practice.records).length,
    notes: e.notes.notes.length,
  };
}
