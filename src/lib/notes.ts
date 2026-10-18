/**
 * Notes and highlights. Anchored by heading id + a text-quote selector
 * (quote + prefix/suffix context). When content changes and the quote can
 * no longer be found, the highlight is flagged orphaned — never deleted.
 */
import { useSyncExternalStore } from 'react';

const KEY = 'forgeline:notes:v1';

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink'];

export interface Note {
  id: string;
  pageKey: string;
  pageUrl: string;
  pageTitle: string;
  topic: string;
  /** nearest heading id above the selection (null when unknown) */
  headingId: string | null;
  /** exact selected text, capped */
  quote: string;
  /** ~40 chars of context on each side for re-anchoring */
  prefix: string;
  suffix: string;
  color: HighlightColor;
  note: string;
  cardId?: string;
  orphaned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface NotesState {
  version: 1;
  notes: Note[];
}

export const QUOTE_LIMIT = 1000;

function empty(): NotesState {
  return { version: 1, notes: [] };
}

function load(): NotesState {
  try {
    if (typeof localStorage === 'undefined') return empty();
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<NotesState>;
    if (parsed?.version !== 1 || !Array.isArray(parsed.notes)) return empty();
    return { ...empty(), ...parsed };
  } catch {
    return empty();
  }
}

let state: NotesState;
try {
  state = load();
} catch {
  state = empty();
}
const listeners = new Set<() => void>();

function commit(next: NotesState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function noteId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface NewNote {
  pageKey: string;
  pageUrl: string;
  pageTitle: string;
  topic: string;
  headingId: string | null;
  quote: string;
  prefix: string;
  suffix: string;
  color: HighlightColor;
  note: string;
  cardId?: string;
}

export const noteStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => state,
  add(n: NewNote): Note {
    const note: Note = {
      ...n,
      quote: n.quote.slice(0, QUOTE_LIMIT),
      id: noteId(),
      orphaned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    commit({ ...state, notes: [note, ...state.notes] });
    return note;
  },
  update(id: string, patch: Partial<Pick<Note, 'color' | 'note' | 'cardId' | 'orphaned'>>) {
    commit({ ...state, notes: state.notes.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x)) });
  },
  remove(id: string) {
    commit({ ...state, notes: state.notes.filter((x) => x.id !== id) });
  },
  exportData: () => state,
  importData(d: NotesState) {
    if (d?.version !== 1) throw new Error('Not a Forgeline notes file');
    commit({ ...empty(), ...d });
  },
  reset() {
    commit(empty());
  },
};

export function useNotes() {
  return useSyncExternalStore(noteStore.subscribe, noteStore.get, noteStore.get);
}

export function notesForPage(pageKey: string): Note[] {
  return state.notes.filter((n) => n.pageKey === pageKey);
}
