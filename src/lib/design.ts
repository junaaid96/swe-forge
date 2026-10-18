/** System design attempts: structured sections, diagram, rubric, AI review. */
import { useSyncExternalStore } from 'react';

const KEY = 'forgeline:design:v1';

export type DesignSectionKey = 'requirements' | 'api' | 'dataModel' | 'scale' | 'architecture' | 'tradeoffs';

export const DESIGN_SECTIONS: Array<{ key: DesignSectionKey; label: string; hint: string }> = [
  { key: 'requirements', label: 'Requirements', hint: 'Functional + non-functional, clarified and quantified' },
  { key: 'api', label: 'API', hint: 'Endpoints, params, status codes, idempotency' },
  { key: 'dataModel', label: 'Data model', hint: 'Tables/collections, keys, indexes, sharding' },
  { key: 'scale', label: 'Scale estimates', hint: 'QPS, storage, bandwidth — with math' },
  { key: 'architecture', label: 'Architecture', hint: 'Components and data flow (diagram below)' },
  { key: 'tradeoffs', label: 'Trade-offs', hint: 'Alternatives rejected, what breaks at 10x' },
];

export interface DesignAttempt {
  sections: Record<DesignSectionKey, string>;
  mermaid: string;
  checks: string[];
  revealed: boolean;
  review: string;
  updatedAt: number;
}

export interface DesignState {
  version: 1;
  attempts: Record<string, DesignAttempt>;
}

export const MERMAID_STARTER = 'flowchart LR\n  Client --> API\n  API --> DB\n';

function emptyAttempt(): DesignAttempt {
  return { sections: { requirements: '', api: '', dataModel: '', scale: '', architecture: '', tradeoffs: '' }, mermaid: MERMAID_STARTER, checks: [], revealed: false, review: '', updatedAt: Date.now() };
}

function empty(): DesignState {
  return { version: 1, attempts: {} };
}

function load(): DesignState {
  try {
    if (typeof localStorage === 'undefined') return empty();
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<DesignState>;
    if (parsed?.version !== 1 || typeof parsed.attempts !== 'object') return empty();
    return { ...empty(), ...parsed };
  } catch {
    return empty();
  }
}

let state: DesignState;
try {
  state = load();
} catch {
  state = empty();
}
const listeners = new Set<() => void>();

function commit(next: DesignState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function attempt(s: DesignState, slug: string): DesignAttempt {
  return s.attempts[slug] ?? (s.attempts[slug] = emptyAttempt());
}

export const designStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => state,
  update(slug: string, patch: Partial<DesignAttempt>) {
    const next: DesignState = structuredClone(state);
    Object.assign(attempt(next, slug), patch, { updatedAt: Date.now() });
    commit(next);
  },
  setSection(slug: string, key: DesignSectionKey, value: string) {
    const next: DesignState = structuredClone(state);
    const a = attempt(next, slug);
    a.sections[key] = value;
    a.updatedAt = Date.now();
    commit(next);
  },
  toggleCheck(slug: string, id: string) {
    const next: DesignState = structuredClone(state);
    const a = attempt(next, slug);
    a.checks = a.checks.includes(id) ? a.checks.filter((c) => c !== id) : [...a.checks, id];
    a.updatedAt = Date.now();
    commit(next);
  },
  exportData: () => state,
  importData(d: DesignState) {
    if (d?.version !== 1) throw new Error('Not a Forgeline design file');
    commit({ ...empty(), ...d });
  },
  reset() {
    commit(empty());
  },
};

export function useDesign() {
  return useSyncExternalStore(designStore.subscribe, designStore.get, designStore.get);
}
