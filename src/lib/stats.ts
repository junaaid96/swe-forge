import type { Card, Catalog, Topic } from './types';
import type { ProgressState } from './progress';
import { dayKey, isMastered } from './srs';

export interface TopicStats {
  slug: string;
  pagesRead: number;
  pagesTotal: number;
  readPct: number;
  cardsSeen: number;
  cardsMastered: number;
  cardsTotal: number;
  cardPct: number;
  quizPct: number | null;
  mockPct: number | null;
  mockQuestions: number;
  mastery: number; // 0..100
  started: boolean;
}

const CARD_TARGET = 25; // mastering this many cards counts as "fully practised"

export function mockByTopic(state: ProgressState) {
  const agg: Record<string, { score: number; n: number }> = {};
  for (const m of state.mocks) for (const a of m.answers) {
    const x = (agg[a.topic] ??= { score: 0, n: 0 });
    x.score += a.score;
    x.n += 1;
  }
  return agg;
}

export function topicStats(topic: Topic, state: ProgressState, mocks = mockByTopic(state)): TopicStats {
  const pagesTotal = topic.pages.length;
  const pagesRead = topic.pages.filter((p) => state.pages[p.key]?.readAt).length;
  let cardsSeen = 0;
  let cardsMastered = 0;
  for (const c of Object.values(state.cards)) {
    if (c.t !== topic.slug || c.reps + c.lapses === 0) continue;
    cardsSeen += 1;
    if (isMastered(c)) cardsMastered += 1;
  }
  const readPct = pagesTotal ? pagesRead / pagesTotal : 0;
  const cardDen = Math.min(topic.cardCount, CARD_TARGET);
  const cardPct = cardDen ? Math.min(1, cardsMastered / cardDen) : 0;
  const q = state.quiz[topic.slug];
  const quizPct = q && q.total ? q.best / q.total : null;
  const m = mocks[topic.slug];
  const mockPct = m && m.n ? m.score / m.n : null;

  const parts: Array<[number, number]> = [];
  if (pagesTotal) parts.push([readPct, 0.45]);
  if (cardDen) parts.push([cardPct, 0.3]);
  const tests = [quizPct, mockPct].filter((x): x is number => x !== null);
  if (tests.length) parts.push([tests.reduce((a, b) => a + b, 0) / tests.length, 0.25]);
  else if (topic.quizCount) parts.push([0, 0.25]);
  const wsum = parts.reduce((a, [, w]) => a + w, 0);
  let mastery = wsum ? parts.reduce((a, [v, w]) => a + v * w, 0) / wsum : 0;
  if (state.completed.includes(topic.slug)) mastery = Math.max(mastery, 0.9);

  return {
    slug: topic.slug,
    pagesRead,
    pagesTotal,
    readPct: Math.round(readPct * 100),
    cardsSeen,
    cardsMastered,
    cardsTotal: topic.cardCount,
    cardPct: Math.round(cardPct * 100),
    quizPct: quizPct === null ? null : Math.round(quizPct * 100),
    mockPct: mockPct === null ? null : Math.round(mockPct * 100),
    mockQuestions: m?.n ?? 0,
    mastery: Math.round(mastery * 100),
    started: pagesRead > 0 || cardsSeen > 0 || Boolean(q) || Boolean(m) || topic.pages.some((p) => state.pages[p.key]),
  };
}

export function allStats(catalog: Catalog, state: ProgressState) {
  const mocks = mockByTopic(state);
  return new Map(catalog.topics.map((t) => [t.slug, topicStats(t, state, mocks)]));
}

export function groupMastery(catalog: Catalog, stats: Map<string, TopicStats>) {
  return catalog.groups.map((g) => {
    const list = g.topics.map((s) => stats.get(s)).filter((x): x is TopicStats => Boolean(x));
    const value = list.length ? Math.round(list.reduce((a, s) => a + s.mastery, 0) / list.length) : 0;
    return { id: g.id, label: g.label, value };
  });
}

export function overall(catalog: Catalog, state: ProgressState) {
  const stats = allStats(catalog, state);
  const vals = [...stats.values()];
  const read = vals.reduce((a, s) => a + s.pagesRead, 0);
  const total = vals.reduce((a, s) => a + s.pagesTotal, 0) + (catalog.prepMap ? 1 : 0);
  const mastered = vals.reduce((a, s) => a + s.cardsMastered, 0);
  const mastery = vals.length ? Math.round(vals.reduce((a, s) => a + s.mastery, 0) / vals.length) : 0;
  return { stats, read: read + (catalog.prepMap && state.pages['prep-map']?.readAt ? 1 : 0), total, mastered, mastery };
}

// ---------------------------------------------------------------------------
// Flashcard queue

export function dueCount(state: ProgressState, today = dayKey()) {
  return Object.values(state.cards).filter((c) => c.due <= today).length;
}

export function buildQueue(cards: Card[], state: ProgressState, today = dayKey()) {
  const { topics, sources, newPerDay } = state.srs;
  const inDeck = (c: Card) => (!topics.length || topics.includes(c.t)) && (!sources.length || sources.includes(c.src));
  const due: Card[] = [];
  const fresh: Card[] = [];
  for (const c of cards) {
    const s = state.cards[c.id];
    if (s) {
      if (s.due <= today) due.push(c);
    } else if (inDeck(c)) fresh.push(c);
  }
  due.sort((a, b) => (state.cards[a.id].due < state.cards[b.id].due ? -1 : 1));
  const introduced = state.newCards.day === today ? state.newCards.count : 0;
  const allowance = Math.max(0, newPerDay - introduced);
  // Interleave topics for new cards so a session isn't one long note.
  const byTopic = new Map<string, Card[]>();
  for (const c of fresh) (byTopic.get(c.t) ?? byTopic.set(c.t, []).get(c.t)!).push(c);
  const order = [...byTopic.values()];
  const picked: Card[] = [];
  for (let i = 0; picked.length < allowance && order.some((l) => l.length > i); i++) {
    for (const l of order) if (l[i] && picked.length < allowance) picked.push(l[i]);
  }
  return { due, fresh: picked, available: fresh.length };
}

// ---------------------------------------------------------------------------
// What to study next

export interface Suggestion {
  title: string;
  reason: string;
  url: string;
  kind: 'review' | 'weak' | 'continue' | 'next' | 'start' | 'mock';
}

export function suggestions(catalog: Catalog, state: ProgressState, limit = 3): Suggestion[] {
  const out: Suggestion[] = [];
  const seen = new Set<string>();
  const push = (s: Suggestion) => {
    if (seen.has(s.url) || out.length >= limit) return;
    seen.add(s.url);
    out.push(s);
  };
  const stats = allStats(catalog, state);
  const firstUnread = (t: Topic) => t.pages.find((p) => !state.pages[p.key]?.readAt) ?? t.pages[0];

  const due = dueCount(state);
  if (due) push({ kind: 'review', title: `Review ${due} due flashcard${due === 1 ? '' : 's'}`, reason: 'Spaced repetition works best when you clear the queue daily.', url: '/flashcards' });

  const weak = [...stats.values()].filter((s) => s.mockPct !== null && s.mockQuestions >= 2 && s.mockPct < 60).sort((a, b) => (a.mockPct ?? 0) - (b.mockPct ?? 0));
  for (const w of weak) {
    const t = catalog.topics.find((x) => x.slug === w.slug);
    const p = t && firstUnread(t);
    if (t && p) push({ kind: 'weak', title: `${t.emoji} ${t.title}: ${p.title}`, reason: `You scored ${w.mockPct}% on ${t.title} in mock interviews.`, url: p.url });
  }

  if (state.lastPage && !state.pages[state.lastPage.key]?.readAt) {
    push({ kind: 'continue', title: state.lastPage.title, reason: 'Pick up where you left off.', url: state.lastPage.url });
  }

  const inProgress = catalog.topics
    .map((t) => ({ t, s: stats.get(t.slug)! }))
    .filter(({ s }) => s.started && s.readPct < 100 && s.pagesTotal)
    .sort((a, b) => a.s.mastery - b.s.mastery);
  for (const { t } of inProgress) {
    const p = firstUnread(t);
    if (p) push({ kind: 'next', title: `${t.emoji} ${t.title}: ${p.title}`, reason: `Next unread page in a topic you've started (${stats.get(t.slug)!.mastery}% mastery).`, url: p.url });
  }

  if (catalog.prepMap && !state.pages['prep-map']?.readAt) {
    push({ kind: 'start', title: 'Skim the topic-wise prep map', reason: 'A one-page overview of what to know for every area.', url: '/prep-map' });
  }

  for (const g of catalog.groups) for (const slug of g.topics) {
    const t = catalog.topics.find((x) => x.slug === slug);
    if (t && t.pages.length && !stats.get(slug)!.started) {
      push({ kind: 'start', title: `Start ${t.emoji} ${t.title}`, reason: `Not started yet · ${g.label}.`, url: t.pages[0].url });
    }
  }

  if (!state.mocks.length) push({ kind: 'mock', title: 'Take a 10-minute mock interview', reason: 'Find your weak areas quickly.', url: '/mock' });
  return out;
}
