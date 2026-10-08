import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getSearchIndex, useCatalog } from '../lib/content';
import type { SearchEntry } from '../lib/types';
import { toggleTheme } from '../lib/theme';
import { IconSearch } from './Icons';

interface Result {
  id: string;
  url: string;
  title: string;
  sub: string;
  snippet?: string;
  kind: 'action' | 'topic' | 'page' | 'section';
  run?: () => void;
}

function tokens(q: string) {
  return q.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
}

function score(e: SearchEntry, toks: string[], phrase: string) {
  const t = e.t.toLowerCase();
  const s = e.s.toLowerCase();
  const x = e.x.toLowerCase();
  const tp = e.tp.toLowerCase();
  let total = 0;
  for (const tok of toks) {
    let hit = 0;
    if (s.includes(tok)) hit += 6;
    if (t.includes(tok)) hit += 4;
    if (tp.includes(tok)) hit += 2;
    if (x.includes(tok)) hit += 1;
    if (!hit) return 0;
    total += hit;
  }
  if (phrase.length > 2 && s.includes(phrase)) total += 10;
  if (phrase.length > 2 && s.startsWith(phrase)) total += 4;
  return total;
}

function snippet(text: string, toks: string[]) {
  const lower = text.toLowerCase();
  const idx = toks.map((t) => lower.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, idx - 50);
  return (start > 0 ? '…' : '') + text.slice(start, start + 160) + (start + 160 < text.length ? '…' : '');
}

function Highlight({ text, toks }: { text: string; toks: string[] }) {
  if (!toks.length) return <>{text}</>;
  const re = new RegExp(`(${toks.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return (
    <>
      {text.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>))}
    </>
  );
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [active, setActive] = useState(0);
  const { data: catalog } = useCatalog();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    getSearchIndex().then(setIndex).catch(() => setIndex([]));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const toks = useMemo(() => tokens(q), [q]);

  const results = useMemo<Result[]>(() => {
    const actions: Result[] = [
      { id: 'a-flash', url: '/flashcards', title: 'Review flashcards', sub: 'Spaced repetition', kind: 'action' },
      { id: 'a-mock', url: '/mock', title: 'Start a mock interview', sub: 'Timed, mixed questions', kind: 'action' },
      { id: 'a-skills', url: '/skills', title: 'Open skill map', sub: 'Progress & what to study next', kind: 'action' },
      { id: 'a-prep', url: '/prep-map', title: 'Topic-wise prep map', sub: 'Guide', kind: 'action' },
      { id: 'a-theme', url: '', title: 'Toggle light / dark theme', sub: 'Shortcut: T', kind: 'action', run: toggleTheme },
    ];
    if (!toks.length) return actions;
    const phrase = q.trim().toLowerCase();
    const out: Result[] = [];
    const matchAll = (hay: string) => toks.every((t) => hay.includes(t));
    for (const a of actions) if (matchAll(a.title.toLowerCase())) out.push(a);
    for (const t of catalog?.topics ?? []) {
      if (matchAll(`${t.title} ${t.tag} ${t.slug} ${t.blurb}`.toLowerCase())) out.push({ id: `t-${t.slug}`, url: `/topics/${t.slug}`, title: `${t.emoji} ${t.title}`, sub: `Topic · ${t.pages.length} pages`, kind: 'topic' });
      for (const p of t.pages) if (matchAll(p.title.toLowerCase())) out.push({ id: `p-${p.key}`, url: p.url, title: p.title, sub: `${t.title} · page`, kind: 'page' });
    }
    if (index) {
      const scored: Array<[number, SearchEntry]> = [];
      for (const e of index) {
        const sc = score(e, toks, phrase);
        if (sc) scored.push([sc, e]);
      }
      scored.sort((a, b) => b[0] - a[0]);
      for (const [, e] of scored.slice(0, 40)) {
        out.push({ id: `s-${e.u}#${e.a}`, url: e.a ? `${e.u}#${e.a}` : e.u, title: e.s || e.t, sub: e.s ? `${e.tp} · ${e.t}` : e.tp, snippet: snippet(e.x, toks), kind: 'section' });
      }
    }
    const seen = new Set<string>();
    return out.filter((r) => (seen.has(r.url + r.title) ? false : (seen.add(r.url + r.title), true))).slice(0, 50);
  }, [toks, q, catalog, index]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const go = (r: Result | undefined) => {
    if (!r) return;
    onClose();
    if (r.run) r.run();
    else navigate(r.url);
  };

  return createPortal(
    <div className="modal-overlay palette-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Search Forgeline">
        <div className="palette-input">
          <IconSearch />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search topics, notes, questions…"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(results.length - 1, a + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                go(results[active]);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="palette-results" id={listId} role="listbox" ref={listRef}>
          {results.length === 0 ? (
            <li className="palette-empty">{index ? `No results for “${q}”` : 'Loading search index…'}</li>
          ) : (
            results.map((r, i) => (
              <li
                key={r.id}
                id={`${listId}-${i}`}
                data-idx={i}
                role="option"
                aria-selected={i === active}
                className={`palette-item ${i === active ? 'active' : ''}`}
                onMouseMove={() => setActive(i)}
                onClick={() => go(r)}
              >
                <span className={`palette-kind kind-${r.kind}`}>{r.kind === 'section' ? 'Section' : r.kind === 'page' ? 'Page' : r.kind === 'topic' ? 'Topic' : 'Action'}</span>
                <span className="palette-main">
                  <strong>
                    <Highlight text={r.title} toks={toks} />
                  </strong>
                  <small>{r.sub}</small>
                  {r.snippet ? (
                    <span className="palette-snippet">
                      <Highlight text={r.snippet} toks={toks} />
                    </span>
                  ) : null}
                </span>
              </li>
            ))
          )}
        </ul>
        <div className="palette-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> open</span>
          <span><kbd>⌘</kbd><kbd>K</kbd> or <kbd>/</kbd> search anywhere</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
