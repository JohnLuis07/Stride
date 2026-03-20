import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Timer,
  CheckSquare,
  BookOpen,
  Zap,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/notes', icon: FileText, label: 'Notes' },
  { to: '/pomodoro', icon: Timer, label: 'Pomodoro' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/strategies', icon: BookOpen, label: 'Strategies' },
];

export function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-700">
        <Zap className="w-7 h-7 text-indigo-400" />
        <span className="text-xl font-bold tracking-tight">Stride</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">Deep Work. Every Day.</p>
      </div>
    </aside>
  );
}
