/** Tools hub: search, categories, favorites, recent, grouped grid. */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TOOL_CATEGORIES, TOOLS, type ToolCategory } from '../tools/registry';
import { useToolPrefs } from '../tools/store';
import { IconCode, IconSearch, IconStar } from '../components/Icons';

function ToolCard({ slug, title, blurb, badge, fav, onFav }: {
  slug: string; title: string; blurb: string; badge?: string; fav: boolean; onFav: () => void;
}) {
  return (
    <div className="tool-card card">
      <Link to={`/tools/${slug}`} className="tool-card-main">
        <strong>{title}</strong>
        <span>{blurb}</span>
      </Link>
      <div className="tool-card-foot">
        {badge ? <span className="chip chip-accent">{badge}</span> : <span />}
        <button
          type="button"
          className={`icon-btn star-btn ${fav ? 'on' : ''}`}
          onClick={onFav}
          aria-label={fav ? `Remove ${title} from favorites` : `Add ${title} to favorites`}
          aria-pressed={fav}
          title={fav ? 'Remove from favorites' : 'Add to favorites'}
        >
          <IconStar />
        </button>
      </div>
    </div>
  );
}

export function ToolsPage() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<ToolCategory | 'All'>('All');
  const { favs, recent, toggleFav } = useToolPrefs();

  useEffect(() => {
    document.title = 'Developer Tools · Forgeline';
  }, []);

  const results = useMemo(() => {
    const toks = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return TOOLS.filter((t) => {
      if (cat !== 'All' && t.category !== cat) return false;
      if (!toks.length) return true;
      const hay = `${t.title} ${t.blurb} ${t.keywords}`.toLowerCase();
      return toks.every((tok) => hay.includes(tok));
    });
  }, [q, cat]);

  const favTools = TOOLS.filter((t) => favs.includes(t.slug));
  const recentTools = recent.map((s) => TOOLS.find((t) => t.slug === s)).filter((t) => t !== undefined);
  const searching = q.trim().length > 0 || cat !== 'All';

  const groups = useMemo(() => {
    const list = searching ? results : results;
    return TOOL_CATEGORIES.map((c) => ({ category: c, tools: list.filter((t) => t.category === c) })).filter((g) => g.tools.length);
  }, [results, searching]);

  return (
    <div className="page tools-page">
      <div className="page-head">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Tools</span>
        </nav>
        <h1>Developer tools</h1>
        <p className="lead">
          {TOOLS.length} utilities for everyday programming work — formatting, encoding, APIs, time,
          text and shipping. Everything runs <strong>locally in your browser</strong>; no sign-up, no uploads.
        </p>
      </div>

      <div className="tools-search">
        <IconSearch />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tools — try “jwt”, “cron”, “diff”…"
          aria-label="Search tools"
        />
        {q ? <button type="button" className="link-btn" onClick={() => setQ('')}>Clear</button> : <kbd>/</kbd>}
      </div>

      <div className="chips" role="group" aria-label="Filter by category">
        {(['All', ...TOOL_CATEGORIES] as const).map((c) => (
          <button key={c} type="button" className={`chip chip-toggle ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)} aria-pressed={cat === c}>
            {c}
          </button>
        ))}
      </div>

      {!searching && favTools.length > 0 ? (
        <section aria-labelledby="tools-fav">
          <h2 id="tools-fav">Favorites</h2>
          <div className="tools-grid">
            {favTools.map((t) => <ToolCard key={t.slug} {...t} fav onFav={() => toggleFav(t.slug)} />)}
          </div>
        </section>
      ) : null}

      {!searching && recentTools.length > 0 ? (
        <section aria-labelledby="tools-recent">
          <h2 id="tools-recent">Recently used</h2>
          <div className="chips">
            {recentTools.map((t) => (
              <Link key={t.slug} to={`/tools/${t.slug}`} className="chip chip-link">
                <IconCode width={14} height={14} /> {t.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {results.length === 0 ? (
        <p className="empty-state">No tools match “{q}”. Try fewer keywords or a different category.</p>
      ) : (
        groups.map((g) => (
          <section key={g.category} aria-labelledby={`tools-${g.category}`}>
            <div className="group-head">
              <h2 id={`tools-${g.category}`}>{g.category}</h2>
              <span className="muted small">{g.tools.length} tool{g.tools.length === 1 ? '' : 's'}</span>
            </div>
            <div className="tools-grid">
              {g.tools.map((t) => <ToolCard key={t.slug} {...t} fav={favs.includes(t.slug)} onFav={() => toggleFav(t.slug)} />)}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

export default ToolsPage;
