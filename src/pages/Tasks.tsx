import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setForm({ title: '', details: '', due_date: '', priority: 'Medium' });
  };

  if (loading) return <div className="auth-container">Loading tasks...</div>;

  return (
    <div className="dashboard-container" style={{ backgroundColor: '#f8fafc' }}>
      <div className="dashboard-main feature-main">
        <div className="editor-header feature-header">
          <div className="feature-header-copy">
            <button onClick={() => navigate('/dashboard')} className="dashboard-back-btn">
              Back to Dashboard
            </button>
            <div>
              <h1 className="profile-title">Task Manager</h1>
              <p className="feature-subtitle">Capture work, track momentum, and keep priorities visible.</p>
            </div>
          </div>
        </div>

        <div className="feature-stats">
          <div className="feature-stat-card"><span>Total</span><strong>{stats.total}</strong></div>
          <div className="feature-stat-card"><span>To Do</span><strong>{stats.todo}</strong></div>
          <div className="feature-stat-card"><span>In Progress</span><strong>{stats.doing}</strong></div>
          <div className="feature-stat-card"><span>Done</span><strong>{stats.done}</strong></div>
        </div>

        <div className="feature-grid tasks-layout">
          <section className="feature-panel">
            <form onSubmit={handleCreateTask} className="feature-form">
              <div className="feature-panel-heading">
                <h3>{editingTaskId ? 'Edit Task' : 'Create Task'}</h3>
              </div>
              <input
                className="feature-input"
                placeholder="Task title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
              <textarea
                className="feature-textarea"
                placeholder="Description"
                value={form.details}
                onChange={(e) => setForm((prev) => ({ ...prev, details: e.target.value }))}
              />
              <div className="feature-row">
                <input
                  className="feature-input"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                />
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
              <div className="feature-action-row">
                {editingTaskId && (
                  <button type="button" className="secondary-action-btn" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="save-note-btn" disabled={saving}>
                  {saving ? 'Saving...' : editingTaskId ? 'Update Task' : 'Add Task'}
                </button>
              </div>
            </form>
          </section>

          <section className="feature-panel feature-panel-stack">
            <div className="task-filter-row">
              {['all', 'todo', 'doing', 'done'].map((status) => (
                <button
                  key={status}
                  className={`task-filter-btn ${filter === status ? 'active' : ''}`}
                  onClick={() => setFilter(status)}
                >
                  {status === 'all' ? 'All' : status === 'todo' ? 'To Do' : status === 'doing' ? 'In Progress' : 'Done'}
                </button>
              ))}
            </div>

            <div className="feature-list">
              {filteredTasks.length === 0 && <div className="empty-state">No tasks in this view yet.</div>}
              {filteredTasks.map((task) => (
                <div key={task.id} className="task-card">
                  <div className="task-card-top">
                    <div>
                      <div className="feature-item-title">{task.title}</div>
                      <div className="feature-item-meta">
                        {[task.priority, task.due_date && `Due ${new Date(task.due_date).toLocaleDateString()}`].filter(Boolean).join(' • ')}
                      </div>
                    </div>
                    <div className="item-action-row">
                      <button type="button" className="item-action-btn" onClick={() => handleEditTask(task)}>
                        Edit
                      </button>
                      <button type="button" className="item-action-btn danger" onClick={() => handleDeleteTask(task.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                  {task.details && <p className="task-card-text">{task.details}</p>}
                  <div className="task-status-row">
                    {['todo', 'doing', 'done'].map((status) => (
                      <button
                        key={status}
                        className={`task-status-btn ${task.status === status ? 'active' : ''}`}
                        type="button"
                        onClick={() => handleStatusChange(task, status)}
                      >
                        {status === 'todo' ? 'To Do' : status === 'doing' ? 'In Progress' : 'Done'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Tasks;
