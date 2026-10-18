/**
 * Custom deck: user-accepted AI-generated cards and highlight cards.
 * They join the SM-2 queue as concept (recall) or mcq cards, labelled
 * AI-generated. MCQs join mock/arena pools only with the opt-in toggle.
 */
import { useSyncExternalStore } from 'react';
import type { Card } from './types';

const KEY = 'forgeline:custom-cards:v1';

export type CustomKind = 'recall' | 'mcq';

export interface CustomCard {
  id: string;
  /** topic slug */
  t: string;
  kind: CustomKind;
  q: string;
  ans: string;
  opts?: string[];
  ci?: number;
  sourceUrl: string;
  sourceTitle: string;
  ai: boolean;
  createdAt: number;
}

export interface CustomCardsState {
  version: 1;
  cards: CustomCard[];
  includeMcqInSessions: boolean;
}

function empty(): CustomCardsState {
  return { version: 1, cards: [], includeMcqInSessions: false };
}

function load(): CustomCardsState {
  try {
    if (typeof localStorage === 'undefined') return empty();
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<CustomCardsState>;
    if (parsed?.version !== 1 || !Array.isArray(parsed.cards)) return empty();
    return { ...empty(), ...parsed };
  } catch {
    return empty();
  }
}

let state: CustomCardsState;
try {
  state = load();
} catch {
  state = empty();
}
const listeners = new Set<() => void>();

function commit(next: CustomCardsState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function customId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Normalised question text for duplicate detection. */
export function normQuestion(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

export interface NewCustomCard {
  t: string;
  kind: CustomKind;
  q: string;
  ans: string;
  opts?: string[];
  ci?: number;
  sourceUrl: string;
  sourceTitle: string;
  ai: boolean;
}

export const customCards = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => state,
  /** Adds cards, skipping ones that duplicate the bank or the deck. Returns the added ones. */
  add(items: NewCustomCard[], bank: Card[]): CustomCard[] {
    const seen = new Set(bank.map((c) => normQuestion(c.q)));
    for (const c of state.cards) seen.add(normQuestion(c.q));
    const added: CustomCard[] = [];
    for (const it of items) {
      const q = it.q.trim();
      const ans = it.ans.trim();
      if (!q || !ans || seen.has(normQuestion(q))) continue;
      seen.add(normQuestion(q));
      added.push({ ...it, q, ans, id: customId(), createdAt: Date.now() });
    }
    if (added.length) commit({ ...state, cards: [...added, ...state.cards] });
    return added;
  },
  remove(id: string) {
    commit({ ...state, cards: state.cards.filter((c) => c.id !== id) });
  },
  setIncludeMcq(on: boolean) {
    commit({ ...state, includeMcqInSessions: on });
  },
  exportData: () => state,
  importData(d: CustomCardsState) {
    if (d?.version !== 1) throw new Error('Not a Forgeline custom-cards file');
    commit({ ...empty(), ...d });
  },
  reset() {
    commit(empty());
  },
};

export function useCustomCards() {
  return useSyncExternalStore(customCards.subscribe, customCards.get, customCards.get);
}

/** Custom cards as plain Cards so the SM-2 queue needs no changes. */
export function customAsCards(list: CustomCard[]): Card[] {
  return list.map((c) => ({
    id: `custom:${c.id}`,
    t: c.t,
    src: c.kind === 'mcq' ? 'mcq' : 'concept',
    u: c.sourceUrl,
    ctx: `${c.sourceTitle} · ${c.ai ? 'AI-generated' : 'My card'}`,
    q: c.q,
    ans: c.ans,
    ...(c.kind === 'mcq' ? { opts: c.opts ?? [], ci: c.ci ?? 0 } : {}),
  }));
}
