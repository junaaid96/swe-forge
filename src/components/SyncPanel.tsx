import { useState } from 'react';
import { PROVIDERS, SyncError, syncSettings, useSyncSettings } from '../lib/sync';
import { createRemote, syncNow } from '../lib/syncRun';

/**
 * Optional sync settings. Off by default; the token and AI keys are never
 * synced — only study progress moves, merged per-record without data loss.
 */
export function SyncPanel() {
  const settings = useSyncSettings();
  const [token, setToken] = useState(() => syncSettings.getToken());
  const [remoteId, setRemoteId] = useState(settings.remoteId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const provider = PROVIDERS.find((p) => p.id === settings.providerId);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof SyncError ? e.message : 'Sync failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="sync-panel">
      <div className="field">
        <span className="field-label">Provider (off by default)</span>
        <select
          value={settings.providerId ?? ''}
          onChange={(e) => syncSettings.patch({ providerId: e.target.value || null })}
          aria-label="Sync provider"
          data-testid="sync-provider"
        >
          <option value="">Off — this browser only</option>
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      {provider ? (
        <>
          <ol className="muted small">
            {provider.setupHelp.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ol>
          <div className="field">
            <span className="field-label">Token (stored only in this browser, never synced)</span>
            <input
              type="password"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                syncSettings.setToken(e.target.value.trim());
              }}
              placeholder={provider.id === 'gist' ? 'github_pat_…' : 'token'}
              autoComplete="off"
              spellCheck={false}
              aria-label="Sync token"
              data-testid="sync-token"
            />
          </div>
          <div className="field">
            <span className="field-label">Remote id</span>
            <input
              type="text"
              value={remoteId}
              onChange={(e) => {
                setRemoteId(e.target.value);
                syncSettings.patch({ remoteId: e.target.value.trim() });
              }}
              placeholder={provider.id === 'gist' ? 'gist id' : 'remote id'}
              autoComplete="off"
              spellCheck={false}
              aria-label="Remote id"
              data-testid="sync-remote"
            />
          </div>
          <div className="row">
            <button type="button" className="btn btn-primary" disabled={busy || !token} onClick={() => run(syncNow)} data-testid="sync-now">
              {busy ? 'Syncing…' : 'Sync now'}
            </button>
            <button type="button" className="btn" disabled={busy || !token} onClick={() => run(async () => { await createRemote(); return ''; })} data-testid="sync-create">
              Create private gist
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy}
              onClick={() => {
                syncSettings.reset();
                setToken('');
                setRemoteId('');
                setError('');
              }}
            >
              Disconnect
            </button>
          </div>
          {settings.lastStatus ? (
            <p className="muted small" role="status" data-testid="sync-status">
              {settings.lastStatus}
            </p>
          ) : null}
          {error ? (
            <p className="tool-error" role="alert">
              {error}
            </p>
          ) : null}
          <p className="muted small">
            Merge: union of read pages and bookmarks, last-write-wins per flashcard, earliest solve kept. AI keys are never included. Anyone with the token can read
            the gist — treat it like a password.
          </p>
        </>
      ) : null}
    </div>
  );
}
