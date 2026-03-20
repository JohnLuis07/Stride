import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      current_value: 0,
      unit: form.unit.trim() || null,
      target_date: form.target_date || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = editingGoalId
      ? await supabase
          .from('goals')
          .update({
            ...payload,
            current_value: goals.find((goal) => goal.id === editingGoalId)?.current_value || 0,
          })
          .eq('id', editingGoalId)
          .select()
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

  if (loading) return <div className="auth-container">Loading goals...</div>;

  return (
    <div className="dashboard-container" style={{ backgroundColor: '#f8fafc' }}>
      <div className="dashboard-main feature-main">
        <div className="editor-header feature-header">
          <div className="feature-header-copy">
            <button onClick={() => navigate('/dashboard')} className="dashboard-back-btn">
              Back to Dashboard
            </button>
            <div>
              <h1 className="profile-title">Goal Tracking</h1>
              <p className="feature-subtitle">Break larger goals into measurable progress and stay honest about momentum.</p>
            </div>
          </div>
        </div>

        <div className="feature-stats">
          <div className="feature-stat-card"><span>Active Goals</span><strong>{goals.length}</strong></div>
          <div className="feature-stat-card"><span>Completed</span><strong>{goalSummary.completed}</strong></div>
          <div className="feature-stat-card"><span>Average Progress</span><strong>{goalSummary.average}%</strong></div>
        </div>

        <div className="feature-grid goals-layout">
          <section className="feature-panel">
            <form onSubmit={handleCreateGoal} className="feature-form">
              <div className="feature-panel-heading">
                <h3>{editingGoalId ? 'Edit Goal' : 'New Goal'}</h3>
              </div>
              <input
                className="feature-input"
                placeholder="Goal title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
              <textarea
                className="feature-textarea"
                placeholder="Why this goal matters"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
              <div className="feature-row">
                <input
                  className="feature-input"
                  type="number"
                  min="1"
                  value={form.target_value}
                  onChange={(e) => setForm((prev) => ({ ...prev, target_value: e.target.value }))}
                />
                <input
                  className="feature-input"
                  placeholder="Unit"
                  value={form.unit}
                  onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                />
              </div>
              <input
                className="feature-input"
                type="date"
                value={form.target_date}
                onChange={(e) => setForm((prev) => ({ ...prev, target_date: e.target.value }))}
              />
              <div className="feature-action-row">
                {editingGoalId && (
                  <button type="button" className="secondary-action-btn" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="save-note-btn" disabled={saving}>
                  {saving ? 'Saving...' : editingGoalId ? 'Update Goal' : 'Create Goal'}
                </button>
              </div>
            </form>
          </section>

          <section className="feature-panel feature-panel-stack">
            <div className="feature-list">
              {goals.length === 0 && <div className="empty-state">No goals yet. Start with one measurable target.</div>}
              {goals.map((goal) => {
                const progress = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));

                return (
                  <div key={goal.id} className="goal-card">
                    <div className="task-card-top">
                      <div>
                        <div className="feature-item-title">{goal.title}</div>
                        <div className="feature-item-meta">
                          {goal.current_value}/{goal.target_value} {goal.unit || ''}
                          {goal.target_date ? ` • Due ${new Date(goal.target_date).toLocaleDateString()}` : ''}
                        </div>
                      </div>
                      <div className="item-action-row">
                        <button type="button" className="item-action-btn" onClick={() => handleEditGoal(goal)}>
                          Edit
                        </button>
                        <button type="button" className="item-action-btn danger" onClick={() => handleDeleteGoal(goal.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                    {goal.notes && <p className="task-card-text">{goal.notes}</p>}
                    <div className="goal-progress-track">
                      <div className="goal-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="goal-progress-row">
                      <span>{progress}% complete</span>
                      <div className="goal-progress-actions">
                        <button type="button" className="task-status-btn" onClick={() => updateProgress(goal, Math.max(0, goal.current_value - Math.max(1, goal.target_value / 10)))}>
                          -10%
                        </button>
                        <button type="button" className="task-status-btn active" onClick={() => updateProgress(goal, Math.min(goal.target_value, goal.current_value + Math.max(1, goal.target_value / 10)))}>
                          +10%
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Goals;
