import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../App.css';

interface Task {
  id: string;
  user_id: string;
  title: string;
  details: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState('all');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    details: '',
    due_date: '',
    priority: 'Medium',
  });

  useEffect(() => {
    const checkUser = async () => {
      const storedEmail = localStorage.getItem('userEmail');
      if (!storedEmail) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', storedEmail)
        .single();

      if (error || !data) {
        localStorage.removeItem('userEmail');
        navigate('/login');
      } else {
        setUser(data);
      }
      setLoading(false);
    };

    checkUser();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTasks(data);
      }
    };

    fetchTasks();
  }, [user]);

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter((task) => task.status === filter);
  }, [filter, tasks]);

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      todo: tasks.filter((task) => task.status === 'todo').length,
      doing: tasks.filter((task) => task.status === 'doing').length,
      done: tasks.filter((task) => task.status === 'done').length,
    };
  }, [tasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.title.trim()) return;

    setSaving(true);
    const payload = {
      user_id: user.id,
      title: form.title.trim(),
      details: form.details.trim() || null,
      due_date: form.due_date || null,
      priority: form.priority,
      status: 'todo',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = editingTaskId
      ? await supabase
          .from('tasks')
          .update({ ...payload, status: tasks.find((task) => task.id === editingTaskId)?.status || 'todo' })
          .eq('id', editingTaskId)
          .select()
      : await supabase.from('tasks').insert([payload]).select();
    if (!error && data) {
      const nextTask = data[0];
      setTasks((prev) => [nextTask, ...prev.filter((task) => task.id !== nextTask.id)]);
      setForm({ title: '', details: '', due_date: '', priority: 'Medium' });
      setEditingTaskId(null);
    }
    setSaving(false);
  };

  const handleStatusChange = async (task: Task, status: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', task.id)
      .select();

    if (!error && data) {
      setTasks((prev) => prev.map((item) => (item.id === task.id ? data[0] : item)));
    }
  };

  const handleDeleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      setTasks((prev) => prev.filter((task) => task.id !== id));
      if (editingTaskId === id) {
        setEditingTaskId(null);
        setForm({ title: '', details: '', due_date: '', priority: 'Medium' });
      }
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setForm({
      title: task.title,
      details: task.details || '',
      due_date: task.due_date || '',
      priority: task.priority,
    });
  };

  const handleSignOut = () => {
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  if (loading) return <div className="dashboard-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Loading Workspace...</div>;

  return (
    <div className="dashboard-container">
       <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
          </svg>
          <h3>Stride.</h3>
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/dashboard" className="sidebar-link">🏠 Overview</Link>
          <Link to="/notes" className={`sidebar-link ${location.pathname === '/notes' ? 'active' : ''}`}>📝 Notes</Link>
          <Link to="/calendar" className={`sidebar-link ${location.pathname === '/calendar' ? 'active' : ''}`}>📅 Calendar</Link>
          <Link to="/todo" className={`sidebar-link ${location.pathname === '/todo' ? 'active' : ''}`}>✅ Tasks</Link>
          <Link to="/goals" className={`sidebar-link ${location.pathname === '/goals' ? 'active' : ''}`}>🎯 Goals</Link>
        </nav>

        <div className="sidebar-footer">
          <div style={{ padding: '0.5rem' }}>
            <div style={{ fontWeight: '700', color: 'var(--text-h)', fontSize: '0.95rem' }}>{user?.full_name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{user?.email}</div>
          </div>
          <button onClick={handleSignOut} className="btn-sign-out">Logout</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="page-header">
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">Manage your to-dos and track your momentum.</p>
        </header>

        <div className="feature-stats">
          <div className="feature-stat-card"><span>Total</span><strong>{stats.total}</strong></div>
          <div className="feature-stat-card"><span>To Do</span><strong>{stats.todo}</strong></div>
          <div className="feature-stat-card"><span>Active</span><strong>{stats.doing}</strong></div>
          <div className="feature-stat-card"><span>Done</span><strong>{stats.done}</strong></div>
        </div>

        <div className="feature-layout-grid">
          <section className="feature-panel">
            <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-h)' }}>{editingTaskId ? 'Edit Task' : 'New Task'}</h3>
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                className="feature-input"
                placeholder="What needs to be done?"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
              <textarea
                className="feature-textarea"
                placeholder="Details (optional)"
                rows={3}
                value={form.details}
                onChange={(e) => setForm((prev) => ({ ...prev, details: e.target.value }))}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    className="feature-input"
                    value={form.due_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    className="feature-input"
                    value={form.priority}
                    onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14m-7-7v14"/>
                    </svg>
                    {editingTaskId ? 'Update Task' : 'Create Task'}
                  </>
                )}
              </button>
              {editingTaskId && (
                <button type="button" onClick={() => setEditingTaskId(null)} className="btn-ghost">
                  Cancel
                </button>
              )}
            </form>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--accent-bg)', padding: '0.4rem', borderRadius: '14px', width: 'fit-content' }}>
              {['all', 'todo', 'doing', 'done'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  style={{
                    padding: '0.5rem 1rem', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer',
                    background: filter === s ? 'white' : 'transparent',
                    color: filter === s ? 'var(--accent)' : 'var(--text)',
                    boxShadow: filter === s ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredTasks.length === 0 && <div className="empty-state">No tasks found.</div>}
              {filteredTasks.map((task) => (
                <div key={task.id} className="feature-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-h)', fontSize: '1.1rem' }}>{task.title}</h4>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text)', display: 'flex', gap: '0.75rem' }}>
                        <span style={{ color: task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#f59e0b' : 'var(--text)' }}>
                          ● {task.priority}
                        </span>
                        {task.due_date && <span>📅 {new Date(task.due_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleEditTask(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✏️</button>
                      <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>🗑️</button>
                    </div>
                  </div>
                  {task.details && <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>{task.details}</p>}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {['todo', 'doing', 'done'].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(task, s)}
                        style={{
                          padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', border: '1px solid var(--border)',
                          background: task.status === s ? 'var(--accent)' : 'white',
                          color: task.status === s ? 'white' : 'var(--text)',
                        }}
                      >
                        {s === 'todo' ? 'To Do' : s === 'doing' ? 'Active' : 'Done'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Tasks;
