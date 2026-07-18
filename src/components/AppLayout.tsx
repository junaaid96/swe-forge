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
        <div className="topbar">
          <button type="button" className="mobile-toggle" onClick={() => setOpen(true)}>
            Menu
          </button>
          <div className="topbar-nav">
            <NavLink to="/" end className={({ isActive }) => `pill-link ${isActive ? 'active' : ''}`}>
              Home
            </NavLink>
            <NavLink
              to="/learn/concurrency"
              className={({ isActive }) => `pill-link ${isActive ? 'active' : ''}`}
            >
              Learn
            </NavLink>
            <NavLink
              to="/interview"
              className={({ isActive }) => `pill-link ${isActive ? 'active' : ''}`}
            >
              Interview
            </NavLink>
            <NavLink
              to="/scoreboard"
              className={({ isActive }) => `pill-link ${isActive ? 'active' : ''}`}
            >
              Scoreboard
            </NavLink>
          </div>
          <SearchBox />
        </div>
        <Outlet />
      </div>
    </div>
  );
}
