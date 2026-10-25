import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useTheme } from '../theme/useTheme.js';
import { SparkleIcon, SunIcon, MoonIcon } from './icons.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <SparkleIcon aria-hidden="true" />
        EventSage
      </Link>
      <div className="nav-links">
        <button
          type="button"
          className="btn icon-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        {user ? (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Dashboard
            </NavLink>
            <button className="btn secondary" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Log in
            </NavLink>
            <Link className="btn" to="/signup">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
