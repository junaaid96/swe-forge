/** Declarative achievement badges, evaluated from existing progress. */
import type { Catalog } from './types';
import type { ProgressState } from './progress';
import type { PracticeState } from './practiceStore';
import type { TopicStats } from './stats';
import { isMastered } from './srs';

export interface BadgeContext {
  catalog: Catalog;
  state: ProgressState;
  practice?: PracticeState;
  stats: Map<string, TopicStats>;
  /** number of learning paths at 100% */
  pathsDone: number;
}

export interface BadgeRule {
  id: string;
  title: string;
  blurb: string;
  emoji: string;
  test: (ctx: BadgeContext) => boolean;
}

function masteredCount(state: ProgressState) {
  return Object.values(state.cards).filter(isMastered).length;
}

function solvedCount(practice?: PracticeState) {
  if (!practice) return 0;
  return Object.values(practice.records).filter((r) => r.solvedAt).length;
}

function bestMockPct(state: ProgressState) {
  let best = 0;
  for (const m of state.mocks) {
    if (!m.answers.length) continue;
    best = Math.max(best, m.answers.reduce((a, x) => a + x.score, 0) / m.answers.length);
  }
  return Math.round(best * 100);
}

function groupsCompleted(ctx: BadgeContext) {
  // A group is complete when every topic in it reaches 60% mastery.
  return ctx.catalog.groups.filter((g) => {
    const list = g.topics.map((s) => ctx.stats.get(s)).filter((x): x is TopicStats => Boolean(x));
    return list.length > 0 && list.every((s) => s.mastery >= 60);
  }).length;
}

export const BADGES: BadgeRule[] = [
  { id: 'streak-3', title: 'Warming up', blurb: '3-day study streak', emoji: '🔥', test: ({ state }) => state.streak >= 3 },
  { id: 'streak-7', title: 'On fire', blurb: '7-day study streak', emoji: '🔥', test: ({ state }) => state.streak >= 7 },
  { id: 'streak-30', title: 'Unstoppable', blurb: '30-day study streak', emoji: '🌋', test: ({ state }) => state.streak >= 30 },
  { id: 'cards-10', title: 'Memoriser', blurb: '10 cards mastered', emoji: '🧠', test: ({ state }) => masteredCount(state) >= 10 },
  { id: 'cards-50', title: 'Sponge', blurb: '50 cards mastered', emoji: '🧽', test: ({ state }) => masteredCount(state) >= 50 },
  { id: 'cards-100', title: 'Memory palace', blurb: '100 cards mastered', emoji: '🏰', test: ({ state }) => masteredCount(state) >= 100 },
  { id: 'mock-80', title: 'Interview-ready', blurb: 'Score 80%+ in a mock interview', emoji: '🎤', test: ({ state }) => bestMockPct(state) >= 80 },
  { id: 'mocks-5', title: 'Battle-tested', blurb: 'Complete 5 mock interviews', emoji: '⚔️', test: ({ state }) => state.mocks.length >= 5 },
  { id: 'practice-1', title: 'First blood', blurb: 'Solve a Practice Lab challenge', emoji: '💻', test: ({ practice }) => solvedCount(practice) >= 1 },
  { id: 'practice-10', title: 'Problem solver', blurb: 'Solve 10 Practice Lab challenges', emoji: '🏆', test: ({ practice }) => solvedCount(practice) >= 10 },
  { id: 'group-1', title: 'Specialist', blurb: 'Complete a topic group (60%+ everywhere)', emoji: '🎯', test: (ctx) => groupsCompleted(ctx) >= 1 },
  { id: 'path-1', title: 'Pathfinder', blurb: 'Finish a learning path', emoji: '🗺️', test: ({ pathsDone }) => pathsDone >= 1 },
];

export interface BadgeResult {
  rule: BadgeRule;
  earned: boolean;
}

export function evaluateBadges(ctx: BadgeContext): BadgeResult[] {
  return BADGES.map((rule) => {
    try {
      return { rule, earned: rule.test(ctx) };
    } catch {
      return { rule, earned: false };
    }
  });
}
