import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../lib/content';
import { progress, useProgress } from '../lib/progress';
import { PageFallback } from '../components/Layout';

export function BookmarksPage() {
  const { data: catalog } = useCatalog();
  const state = useProgress();
  useEffect(() => {
    document.title = 'Bookmarks · Forgeline';
  }, []);
  const index = useMemo(() => {
    const m = new Map<string, { title: string; url: string; topic: string }>();
    if (catalog?.prepMap) m.set('prep-map', { title: catalog.prepMap.title, url: '/prep-map', topic: 'Guide' });
    for (const t of catalog?.topics ?? []) for (const p of t.pages) m.set(p.key, { title: p.title, url: p.url, topic: `${t.emoji} ${t.title}` });
    return m;
  }, [catalog]);
  if (!catalog) return <PageFallback />;
  const recent = Object.entries(state.pages)
    .filter(([k]) => index.has(k))
    .sort((a, b) => (b[1].readAt ?? b[1].visitedAt) - (a[1].readAt ?? a[1].visitedAt))
    .slice(0, 15);

  return (
    <div className="page narrow">
      <header className="page-head">
        <h1>Bookmarks</h1>
        <p className="muted">Press <kbd>B</kbd> on any page to bookmark it.</p>
      </header>
      {state.bookmarks.length ? (
        <ul className="page-list card">
          {state.bookmarks.map((k) => {
            const p = index.get(k);
            if (!p) return null;
            return (
              <li key={k}>
                <div className="page-row">
                  <span aria-hidden>★</span>
                  <Link to={p.url} className="page-row-main">
                    <strong>{p.title}</strong>
                    <small>{p.topic}</small>
                  </Link>
                  <button type="button" className="link-btn" onClick={() => progress.toggleBookmark(k)} aria-label={`Remove bookmark ${p.title}`}>
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="card pad muted">No bookmarks yet.</p>
      )}
      <h2>Recently opened</h2>
      {recent.length ? (
        <ul className="page-list card">
          {recent.map(([k, v]) => {
            const p = index.get(k)!;
            return (
              <li key={k}>
                <Link to={p.url} className="page-row">
                  <span className={`read-dot ${v.readAt ? 'read' : ''}`} aria-hidden />
                  <span className="page-row-main">
                    <strong>{p.title}</strong>
                    <small>{p.topic}</small>
                  </span>
                  <span className="page-row-meta">{new Date(v.readAt ?? v.visitedAt).toLocaleDateString()}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="card pad muted">Nothing opened yet.</p>
      )}
    </div>
  );
}

export default BookmarksPage;
