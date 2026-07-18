import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SearchResult } from '../data/types';
import { searchContent } from '../services/api';

export function SearchBox() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult>({ topics: [], interview: [] });

  useEffect(() => {
    if (!q.trim()) {
      setResults({ topics: [], interview: [] });
      return;
    }
    const handle = window.setTimeout(() => {
      void searchContent(q).then(setResults);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [q]);

  const hasResults = results.topics.length > 0 || results.interview.length > 0;

  return (
    <div className="search-box" onBlur={(e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
    }}>
      <input
        type="search"
        placeholder="Search lessons & interview…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        aria-label="Search"
      />
      {open && q.trim() && (
        <div className="search-results panel">
          {!hasResults ? (
            <div className="muted" style={{ padding: '0.75rem' }}>No matches</div>
          ) : (
            <>
              {results.topics.slice(0, 6).map((t) => (
                <Link key={t.slug} to={`/learn/${t.slug}`} onClick={() => setOpen(false)}>
                  {t.emoji} {t.title}
                  <small>Lesson</small>
                </Link>
              ))}
              {results.interview.slice(0, 6).map((item) => (
                <Link
                  key={`${item.sectionId}-${item.itemId}`}
                  to={`/interview/${item.sectionId}`}
                  onClick={() => setOpen(false)}
                >
                  {item.title}
                  <small>{item.sectionTitle}</small>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
