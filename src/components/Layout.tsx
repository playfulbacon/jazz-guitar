import { NavLink, Outlet, Link } from 'react-router-dom';
import { useEngineSettings } from '../audio/usePlayback';

export function Layout() {
  useEngineSettings();
  return (
    <div className="app">
      <nav className="nav">
        <Link to="/" className="nav-brand">
          <svg viewBox="0 0 64 64" aria-hidden>
            <rect width="64" height="64" rx="14" fill="#1d1916" />
            <g stroke="#e8b04b" strokeWidth="3" strokeLinecap="round">
              <line x1="14" y1="16" x2="50" y2="16" />
              <line x1="14" y1="26" x2="50" y2="26" />
              <line x1="14" y1="36" x2="50" y2="36" />
              <line x1="14" y1="46" x2="50" y2="46" />
            </g>
            <circle cx="24" cy="26" r="5" fill="#f4d58d" />
            <circle cx="40" cy="36" r="5" fill="#f4d58d" />
            <circle cx="32" cy="46" r="5" fill="#e8b04b" />
          </svg>
          <span>Jazz Guitar Trainer</span>
        </Link>
        <div className="nav-links">
          <NavLink to="/chords">Chords</NavLink>
          <NavLink to="/tunes">Tunes</NavLink>
          <NavLink to="/practice">Practice</NavLink>
          <NavLink to="/learn">Learn</NavLink>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
