/**
 * Optional off-by-default sync (5.3). One-way friendship: the local stores
 * stay authoritative until the user presses Sync now, which merges with the
 * remote envelope and pushes the result back.
 *
 * Providers implement SyncProvider; the Gist provider ships first and a
 * self-hosted/Supabase provider can plug into the same interface later.
 * The sync token and AI keys are NEVER part of any synced payload.
 */
import { useSyncExternalStore } from 'react';
import type { CustomCardsState } from './customCards';
import type { DailyState } from './daily';
import type { DesignState } from './design';
import type { NotesState } from './notes';
import type { PracticeState } from './practiceStore';
import type { ProgressState } from './progress';
import type { StudyPlanState } from './studyPlan';

export interface SyncEnvelope {
  app: 'forgeline';
  version: 1;
  updatedAt: number;
  deviceId: string;
  progress: ProgressState;
  practice: PracticeState;
  daily: DailyState;
  plan: StudyPlanState;
  notes: NotesState;
  customCards: CustomCardsState;
  design: DesignState;
}

export const SYNC_FILE = 'forgeline-sync.json';

export interface SyncProvider {
  id: string;
  label: string;
  /** human setup instructions (short HTML-free lines) */
  setupHelp: string[];
  create(token: string, envelope: SyncEnvelope): Promise<{ remoteId: string }>;
  load(token: string, remoteId: string): Promise<SyncEnvelope>;
  save(token: string, remoteId: string, envelope: SyncEnvelope): Promise<void>;
}

export class SyncError extends Error {
  code: 'auth' | 'not-found' | 'network' | 'schema';
  constructor(code: SyncError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

async function gistFetch(path: string, token: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    });
  } catch {
    throw new SyncError('network', 'Could not reach api.github.com. Check your connection.');
  }
  if (res.status === 401 || res.status === 403) throw new SyncError('auth', 'GitHub rejected the token (401/403). It needs the "gist" scope.');
  if (res.status === 404) throw new SyncError('not-found', 'Gist not found. Check the gist id.');
  if (!res.ok) throw new SyncError('network', `GitHub sync failed (HTTP ${res.status}).`);
  return res.json();
}

function parseEnvelope(json: unknown, where: string): SyncEnvelope {
  const files = (json as { files?: Record<string, { content?: string }> })?.files;
  const raw = files?.[SYNC_FILE]?.content;
  if (!raw) throw new SyncError('schema', `That gist has no ${SYNC_FILE} file (${where}).`);
  let env: Partial<SyncEnvelope>;
  try {
    env = JSON.parse(raw) as Partial<SyncEnvelope>;
  } catch {
    throw new SyncError('schema', 'The sync file is not valid JSON.');
  }
  if (env?.app !== 'forgeline' || env?.version !== 1 || !env.progress || !env.practice) {
    throw new SyncError('schema', 'The sync file is not a Forgeline envelope (v1).');
  }
  return env as SyncEnvelope;
}

/** Private GitHub Gist storage. Needs a fine-grained PAT with the Gist scope. */
export const gistProvider: SyncProvider = {
  id: 'gist',
  label: 'GitHub Gist (private)',
  setupHelp: [
    'Create a fine-grained personal access token at github.com/settings/tokens (Gists: read + write).',
    'Paste it below — it stays in this browser and is never synced.',
    'Press “Create private gist”, or paste an existing gist id to join it.',
  ],
  async create(token, envelope) {
    const json = await gistFetch('/gists', token, {
      method: 'POST',
      body: JSON.stringify({ description: 'Forgeline sync (private)', public: false, files: { [SYNC_FILE]: { content: JSON.stringify(envelope) } } }),
    });
    return { remoteId: (json as { id: string }).id };
  },
  async load(token, remoteId) {
    return parseEnvelope(await gistFetch(`/gists/${encodeURIComponent(remoteId)}`, token), 'load');
  },
  async save(token, remoteId, envelope) {
    await gistFetch(`/gists/${encodeURIComponent(remoteId)}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ files: { [SYNC_FILE]: { content: JSON.stringify(envelope) } } }),
    });
  },
};

export const PROVIDERS: SyncProvider[] = [gistProvider];

// ---------------------------------------------------------------------------
// Settings (local only — never synced)
// ---------------------------------------------------------------------------

const KEY = 'forgeline:sync:v1';
const TOKEN_KEY = 'forgeline:sync:token';

export interface SyncSettings {
  version: 1;
  providerId: string | null;
  remoteId: string;
  deviceId: string;
  lastSync: number;
  lastStatus: string;
}

function deviceId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function empty(): SyncSettings {
  return { version: 1, providerId: null, remoteId: '', deviceId: deviceId(), lastSync: 0, lastStatus: '' };
}

function load(): SyncSettings {
  try {
    if (typeof localStorage === 'undefined') return empty();
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<SyncSettings>;
    if (parsed?.version !== 1) return empty();
    const s = { ...empty(), ...parsed };
    if (!s.deviceId) s.deviceId = deviceId();
    return s;
  } catch {
    return empty();
  }
}

let settings: SyncSettings;
try {
  settings = load();
} catch {
  settings = empty();
}
const listeners = new Set<() => void>();

function commit(next: SyncSettings) {
  settings = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export const syncSettings = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => settings,
  patch(p: Partial<SyncSettings>) {
    commit({ ...settings, ...p });
  },
  /** The token lives apart from settings so it can never ride along anywhere. */
  getToken(): string {
    try {
      return localStorage.getItem(TOKEN_KEY) ?? '';
    } catch {
      return '';
    }
  },
  setToken(t: string) {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  },
  reset() {
    commit(empty());
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export function useSyncSettings() {
  return useSyncExternalStore(syncSettings.subscribe, syncSettings.get, syncSettings.get);
}
