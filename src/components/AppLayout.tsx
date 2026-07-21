import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { SearchBox } from './SearchBox';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      {open ? (
        <button
          type="button"
          className="backdrop"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="main">
        <header className="topbar">
          <div className="topbar-start">
            <button type="button" className="mobile-toggle" onClick={() => setOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>Menu</span>
            </button>
            <NavLink to="/" className="topbar-brand">
              <div className="brand-mark sm" aria-hidden>
                <span />
              </div>
              <strong>SWE Forge</strong>
            </NavLink>
          </div>
          <nav className="topbar-nav" aria-label="Primary">
            <NavLink to="/" end className={({ isActive }) => `pill-link ${isActive ? 'active' : ''}`}>
              Home
            </NavLink>
            <NavLink
              to="/topics/software-engineering"
              className={({ isActive }) =>
                `pill-link ${isActive || location.pathname.startsWith('/topics') ? 'active' : ''}`
              }
            >
              Topics
            </NavLink>
            <NavLink
              to="/scoreboard"
              className={({ isActive }) => `pill-link ${isActive ? 'active' : ''}`}
            >
              Scoreboard
            </NavLink>
          </nav>
          <SearchBox />
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
