import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../lib/content';
import { noteStore, useNotes } from '../lib/notes';

export function NotesPage() {
  const { data: catalog } = useCatalog();
  const { notes } = useNotes();
  const [topic, setTopic] = useState('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    document.title = 'Notes · Forgeline';
  }, []);

  const topics = useMemo(() => {
    const ids = [...new Set(notes.map((n) => n.topic))].sort();
    return ids.map((id) => ({ id, title: catalog?.topics.find((t) => t.slug === id)?.title ?? id }));
  }, [notes, catalog]);

  const filtered = notes.filter(
    (n) =>
      (!topic || n.topic === topic) &&
      (!q.trim() || `${n.quote} ${n.note} ${n.pageTitle}`.toLowerCase().includes(q.trim().toLowerCase())),
  );

  const exportMd = () => {
    const byPage = new Map<string, typeof notes>();
    for (const n of filtered) {
      const list = byPage.get(n.pageKey) ?? [];
      list.push(n);
      byPage.set(n.pageKey, list);
    }
    let md = '# Forgeline notes\n\n';
    for (const [key, list] of byPage) {
      md += `## ${list[0].pageTitle}\n\nSource: https://swe-forge.vercel.app${list[0].pageUrl} (${key})\n\n`;
      for (const n of list) {
        md += `> ${n.quote.replace(/\n/g, '\n> ')}${n.orphaned ? '\n>\n> *(orphaned: the source text changed)*' : ''}\n\n`;
        if (n.note.trim()) md += `${n.note.trim()}\n\n`;
      }
    }
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'forgeline-notes.md';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="page" data-testid="notes-page">
      <header className="page-head">
        <p className="eyebrow">Your margin</p>
        <h1>Notes & highlights</h1>
        <p className="lead">
          {notes.length} saved. Select text on any reader page to highlight it. Highlights whose source text changed are kept and flagged orphaned.
        </p>
      </header>

      <div className="field-row">
        <label className="field">
          <span className="field-label">Search</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search quotes and notes…" data-testid="notes-search" />
        </label>
        <label className="field">
          <span className="field-label">Topic</span>
          <select value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="notes-topic">
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span className="field-label">&nbsp;</span>
          <button type="button" className="btn" onClick={exportMd} disabled={!filtered.length} data-testid="notes-export">
            Export Markdown
          </button>
        </div>
      </div>

      {filtered.length ? (
        <ul className="notes-list">
          {filtered.map((n) => (
            <li key={n.id} className="card pad note-item" data-testid="note-item">
              <div className="note-head">
                <span className={`hl-dot hl-${n.color}`} aria-hidden />
                <Link to={n.pageUrl} className="small">
                  {n.pageTitle}
                </Link>
                {n.orphaned ? <span className="chip chip-bad">Orphaned</span> : null}
                <span className="muted small">{new Date(n.updatedAt).toISOString().slice(0, 10)}</span>
              </div>
              <blockquote className="hl-quote">{n.quote}</blockquote>
              {editing === n.id ? (
                <div className="field">
                  <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} aria-label="Note text" data-testid="note-edit-input" />
                  <div className="row">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        noteStore.update(n.id, { note: draft.trim() });
                        setEditing(null);
                      }}
                    >
                      Save
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : n.note ? (
                <p>{n.note}</p>
              ) : null}
              <div className="row">
                {editing !== n.id ? (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      setEditing(n.id);
                      setDraft(n.note);
                    }}
                  >
                    {n.note ? 'Edit note' : 'Add note'}
                  </button>
                ) : null}
                <button type="button" className="btn btn-sm btn-danger" onClick={() => noteStore.remove(n.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-state">{notes.length ? 'Nothing matches these filters.' : 'No highlights yet — select text on any guide to start.'}</p>
      )}
    </div>
  );
}

export default NotesPage;
