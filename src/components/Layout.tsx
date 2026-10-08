import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CommandPalette } from './CommandPalette';
import { ShortcutsDialog } from './ShortcutsDialog';
import { Sidebar } from './Sidebar';
import { IconArrowUpRight, IconClose, IconCode, IconKeyboard, IconMenu, IconMoon, IconSearch, IconSun } from './Icons';
import { Logo } from './Logo';
import { toggleTheme, useTheme } from '../lib/theme';
import { isTyping } from '../lib/hotkeys';
import { useProgress } from '../lib/progress';
import { dueCount } from '../lib/stats';

export function PageFallback() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden /> Loading…
    </div>
  );
}

export function Layout() {
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const state = useProgress();
  const due = dueCount(state);
  const mainRef = useRef<HTMLElement>(null);
  const gPressed = useRef(0);

  useEffect(() => {
    setDrawer(false);
    if (!location.hash) window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e) || document.querySelector('.modal-overlay')) return;
      if (e.key === '/') {
        e.preventDefault();
        setPalette(true);
      } else if (e.key === 't' || e.key === 'T') toggleTheme();
      else if (e.key === '?') setHelp(true);
      else if (e.key === 'g') gPressed.current = Date.now();
      else if (e.key === 'h' && Date.now() - gPressed.current < 900) navigate('/');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  useEffect(() => {
    document.body.classList.toggle('no-scroll', drawer);
  }, [drawer]);

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <aside className={`sidebar ${drawer ? 'open' : ''}`} aria-label="Navigation">
        <button type="button" className="icon-btn drawer-close" onClick={() => setDrawer(false)} aria-label="Close menu">
          <IconClose />
        </button>
        <Sidebar onNavigate={() => setDrawer(false)} />
      </aside>
      {drawer ? <div className="drawer-backdrop" onClick={() => setDrawer(false)} aria-hidden /> : null}

      <div className="main-col">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer}>
            <IconMenu />
          </button>
          <Link to="/" className="topbar-brand" aria-label="Forgeline home">
            <Logo size={24} />
            <strong>Forgeline</strong>
          </Link>
          <button type="button" className="search-trigger" onClick={() => setPalette(true)} aria-label="Search (Ctrl or Command + K)">
            <IconSearch />
            <span>Search topics, notes, questions…</span>
            <kbd>⌘K</kbd>
          </button>
          <nav className="topbar-nav" aria-label="Practice">
            <NavLink to="/flashcards" className={({ isActive }) => `top-link ${isActive ? 'active' : ''}`}>
              Flashcards{due ? <span className="badge">{due}</span> : null}
            </NavLink>
            <NavLink to="/mock" className={({ isActive }) => `top-link ${isActive ? 'active' : ''}`}>
              Mock
            </NavLink>
            <NavLink to="/skills" className={({ isActive }) => `top-link ${isActive ? 'active' : ''}`}>
              Skill map
            </NavLink>
          </nav>
          <button type="button" className="icon-btn hide-sm" onClick={() => setHelp(true)} aria-label="Keyboard shortcuts">
            <IconKeyboard />
          </button>
          <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        </header>

        <main id="main" ref={mainRef} tabIndex={-1}>
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
        <footer className="site-foot">
          <span>Forgeline · notes are plain Markdown in <code>content/</code> · progress stays in your browser</span>
          <div className="site-foot-end">
            <button type="button" className="link-btn" onClick={() => setHelp(true)}>
              Keyboard shortcuts
            </button>
            <a
              href="https://junaidul.pro.bd/codejborg"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Developed by CodeJBorg — visit developer website"
              className="credit-pill"
            >
              <span className="credit-pill-icon">
                <IconCode width={14} height={14} strokeWidth={2.25} />
              </span>
              <span>Developed by</span>
              <span className="credit-pill-name">
                <span className="credit-pill-bracket">&lt;</span>CodeJBorg<span className="credit-pill-bracket"> /&gt;</span>
              </span>
              <span aria-hidden="true" className="credit-pill-cursor" />
              <IconArrowUpRight width={14} height={14} className="credit-pill-arrow" />
            </a>
          </div>
        </footer>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
      <ShortcutsDialog open={help} onClose={() => setHelp(false)} />
    </div>
  );
}
