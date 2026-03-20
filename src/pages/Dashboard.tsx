import { Link } from 'react-router-dom';
import { FileText, Timer, CheckSquare, BookOpen, TrendingUp, Zap } from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { useTasks } from '../hooks/useTasks';

export function Dashboard() {
  const { notes } = useNotes();
  const { tasks } = useTasks();

  const completedTasks = tasks.filter((t) => t.completed).length;
  const pendingTasks = tasks.filter((t) => !t.completed).length;

  const pomodoroSessions = JSON.parse(localStorage.getItem('pomodoro-sessions') || '[]');
  const todaysSessions = pomodoroSessions.filter((s: { completedAt?: string }) => {
    if (!s.completedAt) return false;
    const d = new Date(s.completedAt);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  }).length;

  const stats = [
    { label: 'Notes', value: notes.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: "Today's Focus", value: `${todaysSessions} sessions`, icon: Timer, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Tasks Done', value: completedTasks, icon: CheckSquare, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Pending Tasks', value: pendingTasks, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const quickLinks = [
    { to: '/notes', icon: FileText, label: 'New Note', desc: 'Capture your thoughts', color: 'bg-blue-600 hover:bg-blue-700' },
    { to: '/pomodoro', icon: Timer, label: 'Start Focus', desc: 'Begin a Pomodoro session', color: 'bg-purple-600 hover:bg-purple-700' },
    { to: '/tasks', icon: CheckSquare, label: 'Add Task', desc: 'Track your work', color: 'bg-green-600 hover:bg-green-700' },
    { to: '/strategies', icon: BookOpen, label: 'Study Tips', desc: 'Learn proven techniques', color: 'bg-orange-600 hover:bg-orange-700' },
  ];

  const recentNotes = notes.slice(0, 3);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        </div>
        <p className="text-slate-500">Welcome back! Ready for another focused session?</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickLinks.map(({ to, icon: Icon, label, desc, color }) => (
            <Link
              key={to}
              to={to}
              className={`${color} text-white rounded-xl p-4 flex flex-col gap-2 transition-colors shadow-sm`}
            >
              <Icon className="w-6 h-6" />
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs opacity-80">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Notes */}
      {recentNotes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Notes</h2>
            <Link to="/notes" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentNotes.map((note) => (
              <Link
                key={note.id}
                to="/notes"
                className={`border rounded-xl p-4 hover:shadow-md transition-shadow ${note.color}`}
              >
                <h3 className="font-semibold text-slate-800 mb-1 truncate">{note.title}</h3>
                <p className="text-sm text-slate-500 line-clamp-2">{note.content || 'No content yet...'}</p>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {note.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs bg-white/60 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {recentNotes.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">Start Your Journey</h3>
          <p className="text-slate-500 mb-4">Create your first note or start a Pomodoro session.</p>
          <div className="flex justify-center gap-3">
            <Link to="/notes" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              Create Note
            </Link>
            <Link to="/pomodoro" className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
              Start Timer
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
