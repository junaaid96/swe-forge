import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { SearchResult } from '../data/types';
import { deepTrackLabel, interviewLevelLabel } from '../data/types';
import { searchContent } from '../services/api';

const empty: SearchResult = { topics: [], interview: [], deep: [] };

type FlatItem = {
  id: string;
  kind: 'topic' | 'interview' | 'deep';
  title: string;
  subtitle: string;
  to: string;
};

function flatten(results: SearchResult): FlatItem[] {
  const topics = results.topics.slice(0, 5).map((t) => ({
    id: `topic-${t.slug}`,
    kind: 'topic' as const,
    title: `${t.emoji} ${t.title}`,
    subtitle: t.tag,
    to: `/topics/${t.slug}`,
  }));

  const interview = results.interview.slice(0, 5).map((item) => ({
    id: `interview-${item.topicSlug}-${item.level}-${item.itemId}`,
    kind: 'interview' as const,
    title: item.title,
    subtitle: `${item.topicTitle} · Interview · ${interviewLevelLabel(item.level)}`,
    to: `/topics/${item.topicSlug}/interview/${item.level}`,
  }));

  const deep = results.deep.slice(0, 5).map((item) => ({
    id: `deep-${item.topicSlug}-${item.track}-${item.heading}`,
    kind: 'deep' as const,
    title: item.heading,
    subtitle: `${item.topicTitle} · Deep · ${deepTrackLabel(item.track)}`,
    to: `/topics/${item.topicSlug}/deep/${item.track}`,
  }));

  return [...topics, ...interview, ...deep];
}

function highlight(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

const QUICK_LINKS: FlatItem[] = [
  {
    id: 'quick-swe',
    kind: 'topic',
    title: 'Software Engineering',
    subtitle: 'Craft fundamentals',
    to: '/topics/software-engineering',
  },
  {
    id: 'quick-dsa',
    kind: 'topic',
    title: 'DSA',
    subtitle: 'Patterns & complexity',
    to: '/topics/dsa',
  },
  {
    id: 'quick-system',
    kind: 'topic',
    title: 'System Design',
    subtitle: 'Scale & trade-offs',
    to: '/topics/system-design',
  },
  {
    id: 'quick-score',
    kind: 'topic',
    title: 'Scoreboard',
    subtitle: 'Your progress',
    to: '/scoreboard',
  },
];

const KIND_LABEL = {
  topic: 'Topic',
  interview: 'Interview',
  deep: 'Deep',
} as const;

export function SearchBox() {
  const navigate = useNavigate();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult>(empty);
  const [active, setActive] = useState(0);

  const items = useMemo(() => {
    if (!q.trim()) return QUICK_LINKS;
    return flatten(results);
  }, [q, results]);

  const hasQuery = Boolean(q.trim());
  const emptyResults = hasQuery && !loading && items.length === 0;

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!q.trim()) {
      setResults(empty);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = window.setTimeout(() => {
      void searchContent(q)
        .then(setResults)
        .finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(handle);
  }, [q, open]);

  useEffect(() => {
    setActive(0);
  }, [q, results, open]);

  const close = () => {
    setOpen(false);
    setQ('');
    setResults(empty);
    setActive(0);
  };

  const go = (item: FlatItem) => {
    close();
    navigate(item.to);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(items[active] ?? items[0]);
    }
  };

  const grouped = useMemo(() => {
    if (!hasQuery) {
      return [{ label: 'Jump to', rows: items }];
    }
    const order: Array<FlatItem['kind']> = ['topic', 'interview', 'deep'];
    return order
      .map((kind) => ({
        label: KIND_LABEL[kind],
        rows: items.filter((i) => i.kind === kind),
      }))
      .filter((g) => g.rows.length > 0);
  }, [hasQuery, items]);

  let flatIndex = -1;

  const palette =
    open &&
    createPortal(
      <div
        className="search-overlay"
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div
          className="search-palette"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          onKeyDown={onKeyDown}
        >
          <div className="search-palette-bar">
            <span className="search-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <input
              ref={inputRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search topics, interview Qs, deep tracks…"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-activedescendant={items[active] ? `${listId}-${items[active].id}` : undefined}
              autoComplete="off"
              spellCheck={false}
            />
            {q ? (
              <button type="button" className="search-clear" onClick={() => setQ('')} aria-label="Clear">
                Clear
              </button>
            ) : null}
            <kbd className="search-kbd">esc</kbd>
          </div>

          <div className="search-palette-body" id={listId} role="listbox">
            {loading ? <div className="search-status">Searching…</div> : null}
            {emptyResults ? (
              <div className="search-status">
                No matches for <strong>{q.trim()}</strong>
              </div>
            ) : null}
            {!loading &&
              grouped.map((group) => (
                <div key={group.label} className="search-group">
                  <div className="search-group-label">{group.label}</div>
                  {group.rows.map((item) => {
                    flatIndex += 1;
                    const index = flatIndex;
                    const isActive = index === active;
                    return (
                      <button
                        key={item.id}
                        id={`${listId}-${item.id}`}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        className={`search-hit ${isActive ? 'active' : ''}`}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => go(item)}
                      >
                        <span className={`search-kind search-kind-${item.kind}`}>
                          {KIND_LABEL[item.kind]}
                        </span>
                        <span className="search-hit-text">
                          <strong>{highlight(item.title, q)}</strong>
                          <small>{item.subtitle}</small>
                        </span>
                        <span className="search-hit-enter" aria-hidden>
                          ↵
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
          </div>

          <div className="search-palette-foot">
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> navigate
            </span>
            <span>
              <kbd>↵</kbd> open
            </span>
            <span>
              <kbd>esc</kbd> close
            </span>
          </div>
        </div>
      </div>,
      document.body,
    );

  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <>
      <button
        type="button"
        className="search-trigger"
        onClick={() => setOpen(true)}
        aria-label="Open search"
      >
        <span className="search-icon" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <span className="search-trigger-label">Search the stacks…</span>
        <kbd className="search-kbd">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>
      {palette}
    </>
  );
}
