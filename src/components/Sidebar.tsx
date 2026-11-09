import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import type { Profile } from '../types';
import BrandLogo from './BrandLogo';
import Icon from './Icon';
const links = [
  { path: '/dashboard', label: 'Overview', icon: 'overview' },
  { path: '/todo', label: 'Tasks', icon: 'tasks' },
  { path: '/calendar', label: 'Calendar', icon: 'calendar' },
  { path: '/notes', label: 'Notes', icon: 'notes' },
  { path: '/goals', label: 'Goals', icon: 'goals' },
  { path: '/focus', label: 'Focus timer', icon: 'focus' },
];
export default function Sidebar({
  user,
  onSignOut,
  beforeNavigate,
  children,
}: {
  user: Profile | null;
  onSignOut: () => void;
  beforeNavigate?: (action: () => void) => void;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const items = [...links];
  if (user?.features?.includes('Allowance'))
    items.push({ path: '/allowance', label: 'Budget & allowance', icon: 'allowance' });
  if (user?.features?.includes('generatevids'))
    items.push({ path: '/videos', label: 'Video studio', icon: 'videos' });
  return (
    <aside className={'dashboard-sidebar ' + (open ? 'nav-open' : '')}>
      <div className="sidebar-header">
        <NavLink to="/dashboard" aria-label="Stride overview">
          <BrandLogo size={36} wordmarkSize={27} />
        </NavLink>
        <button
          className="icon-button mobile-menu"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          aria-controls="workspace-navigation"
        >
          <Icon name={open ? 'close' : 'menu'} />
        </button>
      </div>
      <div className="sidebar-body" id="workspace-navigation">
        <span className="nav-caption">WORKSPACE</span>
        <nav className="sidebar-nav" aria-label="Workspace">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 'sidebar-link ' + (isActive ? 'active' : '')}
              onClick={(e) => {
                if (beforeNavigate) {
                  e.preventDefault();
                  beforeNavigate(() => {
                    window.location.assign(item.path);
                  });
                }
                setOpen(false);
              }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        {children}
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon">
              <Icon name="check" size={16} />
            </span>
            <div>
              <strong>Small steps. Real progress.</strong>
              <p>Make a little room for what matters.</p>
            </div>
          </div>
          <NavLink
            to="/profile"
            className={({ isActive }) => 'sidebar-link ' + (isActive ? 'active' : '')}
          >
            <Icon name="settings" />
            <span>Profile & settings</span>
          </NavLink>
        </div>
        <div className="sidebar-footer">
          <span className="user-avatar">{user?.full_name?.slice(0, 1).toUpperCase() || 'S'}</span>
          <div className="user-info">
            <strong>{user?.full_name || 'Your workspace'}</strong>
            <span>{user?.email}</span>
          </div>
          <button
            className="icon-button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
