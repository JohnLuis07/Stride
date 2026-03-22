import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../App.css';

interface Goal {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  target_value: number;
  current_value: number;
  unit: string | null;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

const Goals: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    notes: '',
    target_value: '100',
    unit: '%',
    target_date: '',
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

    const fetchGoals = async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setGoals(data);
      }
    };

    fetchGoals();
  }, [user]);

  const goalSummary = useMemo(() => {
    const completed = goals.filter((goal) => goal.current_value >= goal.target_value).length;
    const average = goals.length === 0
      ? 0
      : Math.round(
          goals.reduce((sum, goal) => sum + Math.min(100, (goal.current_value / goal.target_value) * 100), 0) / goals.length,
        );

    return { completed, average };
  }, [goals]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.title.trim()) return;

    setSaving(true);
    const payload = {
      user_id: user.id,
      title: form.title.trim(),
      notes: form.notes.trim() || null,
      target_value: Number(form.target_value) || 100,
      current_value: editingGoalId ? (goals.find(g => g.id === editingGoalId)?.current_value || 0) : 0,
      unit: form.unit.trim() || null,
      target_date: form.target_date || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = editingGoalId
      ? await supabase.from('goals').update(payload).eq('id', editingGoalId).select()
      : await supabase.from('goals').insert([payload]).select();

    if (!error && data) {
      const nextGoal = data[0];
      setGoals((prev) => [nextGoal, ...prev.filter((goal) => goal.id !== nextGoal.id)]);
      setForm({ title: '', notes: '', target_value: '100', unit: '%', target_date: '' });
      setEditingGoalId(null);
    }
    setSaving(false);
  };

  const updateProgress = async (goal: Goal, nextValue: number) => {
    const { data, error } = await supabase
      .from('goals')
      .update({ current_value: nextValue, updated_at: new Date().toISOString() })
      .eq('id', goal.id)
      .select();

    if (!error && data) {
      setGoals((prev) => prev.map((item) => (item.id === goal.id ? data[0] : item)));
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (!error) {
      setGoals((prev) => prev.filter((goal) => goal.id !== id));
      if (editingGoalId === id) {
        setEditingGoalId(null);
        setForm({ title: '', notes: '', target_value: '100', unit: '%', target_date: '' });
      }
    }
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setForm({
      title: goal.title,
      notes: goal.notes || '',
      target_value: String(goal.target_value),
      unit: goal.unit || '%',
      target_date: goal.target_date || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingGoalId(null);
    setForm({ title: '', notes: '', target_value: '100', unit: '%', target_date: '' });
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
          <h1 className="page-title">Goals</h1>
          <p className="page-subtitle">Track your long-term ambitions and daily progress.</p>
        </header>

        <div className="feature-stats">
          <div className="feature-stat-card"><span>Active</span><strong>{goals.length}</strong></div>
          <div className="feature-stat-card"><span>Finished</span><strong>{goalSummary.completed}</strong></div>
          <div className="feature-stat-card"><span>Avg. Momentum</span><strong>{goalSummary.average}%</strong></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '2rem', alignItems: 'start' }}>
          <section className="feature-panel">
            <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-h)' }}>{editingGoalId ? 'Edit Goal' : 'Set New Goal'}</h3>
            <form onSubmit={handleCreateGoal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input className="feature-input" placeholder="What is your goal?" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required />
              <textarea className="feature-textarea" placeholder="Why this matters..." rows={3} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group"><label>Target Value</label><input type="number" className="feature-input" value={form.target_value} onChange={(e) => setForm((prev) => ({ ...prev, target_value: e.target.value }))} /></div>
                <div className="form-group"><label>Unit (e.g. %, days)</label><input type="text" className="feature-input" value={form.unit} onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))} /></div>
              </div>
              <div className="form-group">
                <label>Target Date</label>
                <input type="date" className="feature-input" value={form.target_date} onChange={(e) => setForm((prev) => ({ ...prev, target_date: e.target.value }))} />
              </div>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editingGoalId ? 'Update Goal' : 'Start Goal'}</button>
              {editingGoalId && <button type="button" onClick={handleCancelEdit} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>}
            </form>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {goals.length === 0 && <div className="empty-state">No goals tracked yet. Start by setting your first target.</div>}
            {goals.map((goal) => {
              const progress = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
              return (
                <div key={goal.id} className="feature-panel" style={{ padding: '1.5rem', border: progress === 100 ? '2px solid #10b981' : '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-h)', fontSize: '1.25rem', fontWeight: '800' }}>{goal.title}</h4>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text)', display: 'flex', gap: '0.75rem' }}>
                        <span>🎯 {goal.current_value} / {goal.target_value} {goal.unit}</span>
                        {goal.target_date && <span>📅 Due {new Date(goal.target_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleEditGoal(goal)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✏️</button>
                      <button onClick={() => handleDeleteGoal(goal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>🗑️</button>
                    </div>
                  </div>
                  
                  {goal.notes && <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.95rem', color: 'var(--text)' }}>{goal.notes}</p>}
                  
                  <div style={{ background: 'var(--bg)', height: '12px', borderRadius: '10px', overflow: 'hidden', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#10b981' : 'var(--accent)', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', color: progress === 100 ? '#10b981' : 'var(--text-h)', fontSize: '0.9rem' }}>{progress}% Complete</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => updateProgress(goal, Math.max(0, goal.current_value - (goal.target_value / 10)))} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontWeight: '600' }}>-10%</button>
                      <button onClick={() => updateProgress(goal, Math.min(goal.target_value, goal.current_value + (goal.target_value / 10)))} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontWeight: '600' }}>+10%</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Goals;
