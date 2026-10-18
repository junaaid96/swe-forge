/** Sync orchestration: build local envelope, merge with remote, apply, push. */
import { customCards } from './customCards';
import { daily } from './daily';
import { designStore } from './design';
import { noteStore } from './notes';
import { practice } from './practiceStore';
import { progress } from './progress';
import { studyPlan } from './studyPlan';
import { PROVIDERS, SyncError, syncSettings, type SyncEnvelope } from './sync';
import { countEnvelope, mergeEnvelopes } from './syncMerge';

export function buildLocalEnvelope(): SyncEnvelope {
  return {
    app: 'forgeline',
    version: 1,
    updatedAt: Date.now(),
    deviceId: syncSettings.get().deviceId,
    progress: JSON.parse(progress.exportJson()) as SyncEnvelope['progress'],
    practice: practice.exportData(),
    daily: daily.exportData(),
    plan: studyPlan.exportData(),
    notes: noteStore.exportData(),
    customCards: customCards.exportData(),
    design: designStore.exportData(),
  };
}

export function applyEnvelope(e: SyncEnvelope) {
  progress.importJson(JSON.stringify(e.progress));
  practice.importData(e.practice);
  daily.importData(e.daily);
  studyPlan.importData(e.plan);
  noteStore.importData(e.notes);
  customCards.importData(e.customCards);
  designStore.importData(e.design);
}

function provider() {
  const p = PROVIDERS.find((x) => x.id === syncSettings.get().providerId);
  if (!p) throw new SyncError('schema', 'Pick a sync provider first.');
  return p;
}

/** First-time setup: push local state to a brand-new remote. */
export async function createRemote(): Promise<string> {
  const p = provider();
  const token = syncSettings.getToken();
  if (!token) throw new SyncError('auth', 'Paste a token first.');
  const { remoteId } = await p.create(token, buildLocalEnvelope());
  syncSettings.patch({ remoteId, lastSync: Date.now(), lastStatus: `Created ${p.label} ${remoteId.slice(0, 8)}…` });
  return remoteId;
}

/** Merge local + remote (per-record, no data loss) and push the result. */
export async function syncNow(): Promise<string> {
  const p = provider();
  const token = syncSettings.getToken();
  const remoteId = syncSettings.get().remoteId.trim();
  if (!token) throw new SyncError('auth', 'Paste a token first.');
  if (!remoteId) throw new SyncError('not-found', 'No remote yet — create one or paste a gist id.');
  const local = buildLocalEnvelope();
  const remote = await p.load(token, remoteId);
  const merged = mergeEnvelopes(local, remote);
  merged.updatedAt = Date.now();
  merged.deviceId = syncSettings.get().deviceId;
  applyEnvelope(merged);
  await p.save(token, remoteId, merged);
  const c = countEnvelope(merged);
  const msg = `Synced ${new Date(merged.updatedAt).toLocaleString()}: ${c.pages} pages, ${c.cards} cards, ${c.mocks} mocks, ${c.records} challenges, ${c.notes} notes.`;
  syncSettings.patch({ lastSync: merged.updatedAt, lastStatus: msg });
  return msg;
}
