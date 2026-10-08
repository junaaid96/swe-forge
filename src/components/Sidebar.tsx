import { NavLink, useLocation } from 'react-router-dom';
import { useMemo, type ReactNode } from 'react';
import { useCatalog } from '../lib/content';
import { useProgress } from '../lib/progress';
import { allStats, dueCount, overall } from '../lib/stats';
import { IconBookmark, IconCards, IconCheck, IconHome, IconMap, IconRadar, IconTimer, IconFlame } from './Icons';
import { Logo } from './Logo';
import { Bar } from './Ring';

export function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const { data: catalog } = useCatalog();
  const state = useProgress();
  const { pathname } = useLocation();
  const stats = useMemo(() => (catalog ? allStats(catalog, state) : null), [catalog, state]);
  const totals = useMemo(() => (catalog ? overall(catalog, state) : null), [catalog, state]);
  const due = dueCount(state);
  const activeSlug = pathname.match(/^\/topics\/([^/]+)/)?.[1];

  const link = (to: string, label: string, icon: ReactNode, badge?: number, end = false) => (
    <NavLink to={to} end={end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`} onClick={onNavigate}>
      {icon}
      <span>{label}</span>
      {badge ? <span className="badge" aria-label={`${badge} due`}>{badge}</span> : null}
    </NavLink>
  );

  return (
    <div className="sidebar-inner">
      <NavLink to="/" className="brand" onClick={onNavigate} aria-label="Forgeline home">
        <Logo />
        <span>
          <strong>Forgeline</strong>
          <small>Software engineering, forged daily</small>
        </span>
      </NavLink>

      <nav aria-label="Main" className="side-section">
        {link('/', 'Home', <IconHome />, undefined, true)}
        {link('/prep-map', 'Prep map', <IconMap />)}
        {link('/flashcards', 'Flashcards', <IconCards />, due)}
        {link('/mock', 'Mock interview', <IconTimer />)}
        {link('/skills', 'Skill map', <IconRadar />)}
        {link('/bookmarks', 'Bookmarks', <IconBookmark />)}
      </nav>

      <nav aria-label="Topics" className="side-topics">
        {catalog?.groups.map((g) => (
          <div key={g.id} className="side-group">
            <p className="side-group-label">{g.label}</p>
            <ul>
              {g.topics.map((slug) => {
                const t = catalog.topics.find((x) => x.slug === slug);
                if (!t) return null;
                const s = stats?.get(slug);
                const open = activeSlug === slug;
                return (
                  <li key={slug}>
                    <NavLink
                      to={`/topics/${slug}`}
                      end
                      className={`side-topic ${open ? 'open' : ''}`}
                      style={{ ['--topic' as string]: t.accent }}
                      onClick={onNavigate}
                      aria-current={pathname === `/topics/${slug}` ? 'page' : undefined}
                    >
                      <span className="emoji" aria-hidden>
                        {t.emoji}
                      </span>
                      <span className="side-topic-title">{t.title}</span>
                      {s && s.mastery > 0 ? <span className="side-pct">{s.mastery}%</span> : null}
                    </NavLink>
                    {open && t.pages.length ? (
                      <ul className="side-pages">
                        {t.pages.map((p) => {
                          const read = Boolean(state.pages[p.key]?.readAt);
                          return (
                            <li key={p.key}>
                              <NavLink to={p.url} className={({ isActive }) => `side-page ${isActive ? 'active' : ''}`} onClick={onNavigate}>
                                <span className={`read-dot ${read ? 'read' : ''}`} aria-label={read ? 'Read' : 'Unread'}>
                                  {read ? <IconCheck width={10} height={10} strokeWidth={3} /> : null}
                                </span>
                                <span>{p.title}</span>
                              </NavLink>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {totals ? (
        <div className="side-foot">
          <div className="side-foot-row">
            <span>
              {totals.read}/{totals.total} pages read
            </span>
            <span className="streak" title="Study streak">
              <IconFlame width={14} height={14} /> {state.streak}d
            </span>
          </div>
          <Bar value={totals.total ? (totals.read / totals.total) * 100 : 0} label="Pages read" />
        </div>
      ) : null}
    </div>
  );
}
