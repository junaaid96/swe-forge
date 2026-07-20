import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SearchResult } from '../data/types';
import { searchContent } from '../services/api';

const empty: SearchResult = { topics: [], interview: [], deep: [] };

export function SearchBox() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult>(empty);

  useEffect(() => {
    if (!q.trim()) {
      setResults(empty);
      return;
    }
    const handle = window.setTimeout(() => {
      void searchContent(q).then(setResults);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [q]);

  const hasResults =
    results.topics.length > 0 || results.interview.length > 0 || results.deep.length > 0;

  return (
    <div
      className="search-box"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <input
        type="search"
        placeholder="Search topics, interview, deep…"
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
            <div className="muted" style={{ padding: '0.75rem' }}>
              No matches
            </div>
          ) : (
            <>
              {results.topics.slice(0, 5).map((t) => (
                <Link key={t.slug} to={`/topics/${t.slug}`} onClick={() => setOpen(false)}>
                  {t.emoji} {t.title}
                  <small>Topic</small>
                </Link>
              ))}
              {results.interview.slice(0, 5).map((item) => (
                <Link
                  key={`${item.topicSlug}-${item.level}-${item.itemId}`}
                  to={`/topics/${item.topicSlug}/interview/${item.level}`}
                  onClick={() => setOpen(false)}
                >
                  {item.title}
                  <small>
                    {item.topicTitle} · Interview · {item.level}
                  </small>
                </Link>
              ))}
              {results.deep.slice(0, 5).map((item) => (
                <Link
                  key={`${item.topicSlug}-${item.track}-${item.heading}`}
                  to={`/topics/${item.topicSlug}/deep/${item.track}`}
                  onClick={() => setOpen(false)}
                >
                  {item.heading}
                  <small>
                    {item.topicTitle} · Deep · {item.track}
                  </small>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
