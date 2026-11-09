import { useSessionProfile } from '../Session';
import { LoadingContent } from '../components/WorkspaceLoading';
import type { Profile as UserProfile } from '../types';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import DeadlineStatus from '../components/DeadlineStatus';
import Sidebar from '../components/Sidebar';
import '../App.css';

interface Goal {
  deadline_time?: string;
  deadline_at?: string;
  completed_at?: string;
  completed_deadline_at?: string;
  reminder_sound?: boolean;
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
  const [user, setUser] = useState<UserProfile | null>(useSessionProfile());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [form, setForm] = useState({
    deadline_time: '',
    reminder_sound: true,
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
    const average =
      goals.length === 0
        ? 0
        : Math.round(
            goals.reduce(
              (sum, goal) => sum + Math.min(100, (goal.current_value / goal.target_value) * 100),
              0,
            ) / goals.length,
          );

    return { completed, average };
  }, [goals]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.title.trim()) return;

    setSaving(true);
    const payload = {
      user_id: user.id,
      deadline_time: form.deadline_time || null,
      deadline_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      reminder_sound: form.reminder_sound,
      title: form.title.trim(),
      notes: form.notes.trim() || null,
      target_value: Number(form.target_value) || 100,
      current_value: editingGoalId
        ? goals.find((g) => g.id === editingGoalId)?.current_value || 0
        : 0,
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
      setForm({
        deadline_time: '',
        reminder_sound: true,
        title: '',
        notes: '',
        target_value: '100',
        unit: '%',
        target_date: '',
      });
      setEditingGoalId(null);
    }
    setSaving(false);
  };

  const updateProgress = async (goal: Goal, nextValue: number) => {
    const { data, error } = await supabase
      .from('goals')
      .update({
        deadline_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        current_value: nextValue,
        updated_at: new Date().toISOString(),
      })
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
        setForm({
          deadline_time: '',
          reminder_sound: true,
          title: '',
          notes: '',
          target_value: '100',
          unit: '%',
          target_date: '',
        });
      }
    }
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setForm({
      deadline_time: goal.deadline_time || '',
      reminder_sound: goal.reminder_sound !== false,
      title: goal.title,
      notes: goal.notes || '',
      target_value: String(goal.target_value),
      unit: goal.unit || '%',
      target_date: goal.target_date || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingGoalId(null);
    setForm({
      deadline_time: '',
      reminder_sound: true,
      title: '',
      notes: '',
      target_value: '100',
      unit: '%',
      target_date: '',
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <Sidebar user={user} onSignOut={handleSignOut} />

      <main className="dashboard-main">
        {loading ? (
          <LoadingContent />
        ) : (
          <>
            <header className="page-header">
              <h1 className="page-title">Goals</h1>
              <p className="page-subtitle">Track your long-term ambitions and daily progress.</p>
            </header>

            <div className="feature-stats">
              <div className="feature-stat-card">
                <span>Active</span>
                <strong>{goals.length}</strong>
              </div>
              <div className="feature-stat-card">
                <span>Finished</span>
                <strong>{goalSummary.completed}</strong>
              </div>
              <div className="feature-stat-card">
                <span>Avg. Momentum</span>
                <strong>{goalSummary.average}%</strong>
              </div>
            </div>

            <div className="feature-layout-grid">
              <section className="feature-panel">
                <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-h)' }}>
                  {editingGoalId ? 'Edit Goal' : 'Set New Goal'}
                </h3>
                <form
                  onSubmit={handleCreateGoal}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                >
                  <input
                    className="feature-input"
                    placeholder="What is your goal?"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                  <textarea
                    className="feature-textarea"
                    placeholder="Why this matters..."
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Target Value</label>
                      <input
                        type="number"
                        className="feature-input"
                        value={form.target_value}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, target_value: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Unit (e.g. %, days)</label>
                      <input
                        type="text"
                        className="feature-input"
                        value={form.unit}
                        onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Target Date</label>
                    <input
                      type="date"
                      className="feature-input"
                      value={form.target_date}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, target_date: e.target.value }))
                      }
                    />
                  </div>
                  <label>
                    Deadline time (optional)
                    <input
                      className="feature-input"
                      type="time"
                      value={form.deadline_time}
                      onChange={(e) => setForm({ ...form, deadline_time: e.target.value })}
                    />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={form.reminder_sound}
                      onChange={(e) => setForm({ ...form, reminder_sound: e.target.checked })}
                    />{' '}
                    Play deadline reminder sound
                  </label>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? (
                      'Saving...'
                    ) : (
                      <>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 2v20M2 12h20" />
                        </svg>
                        {editingGoalId ? 'Update Goal' : 'Start Goal'}
                      </>
                    )}
                  </button>
                  {editingGoalId && (
                    <button type="button" onClick={handleCancelEdit} className="btn-ghost">
                      Cancel
                    </button>
                  )}
                </form>
              </section>

              <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {goals.length === 0 && (
                  <div className="empty-state">
                    No goals tracked yet. Start by setting your first target.
                  </div>
                )}
                {goals.map((goal) => {
                  const progress = Math.min(
                    100,
                    Math.round((goal.current_value / goal.target_value) * 100),
                  );
                  return (
                    <div
                      key={goal.id}
                      className="feature-panel"
                      style={{
                        padding: '1.5rem',
                        border: progress === 100 ? '2px solid #10b981' : '1px solid var(--border)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '1rem',
                        }}
                      >
                        <div>
                          <h4
                            style={{
                              margin: '0 0 0.25rem 0',
                              color: 'var(--text-h)',
                              fontSize: '1.25rem',
                              fontWeight: '800',
                            }}
                          >
                            {goal.title}
                          </h4>
                          <DeadlineStatus
                            record={goal}
                            complete={goal.current_value >= goal.target_value}
                          />
                          <div
                            style={{
                              fontSize: '0.85rem',
                              color: 'var(--text)',
                              display: 'flex',
                              gap: '0.75rem',
                            }}
                          >
                            <span>
                              🎯 {goal.current_value} / {goal.target_value} {goal.unit}
                            </span>
                            {goal.target_date && (
                              <span>📅 Due {new Date(goal.target_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleEditGoal(goal)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '1.2rem',
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '1.2rem',
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {goal.notes && (
                        <p
                          style={{
                            margin: '0 0 1.5rem 0',
                            fontSize: '0.95rem',
                            color: 'var(--text)',
                          }}
                        >
                          {goal.notes}
                        </p>
                      )}

                      <div
                        style={{
                          background: 'var(--bg)',
                          height: '12px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          marginBottom: '1rem',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div
                          style={{
                            width: `${progress}%`,
                            height: '100%',
                            background: progress === 100 ? '#10b981' : 'var(--accent)',
                            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                        ></div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: '700',
                            color: progress === 100 ? '#10b981' : 'var(--text-h)',
                            fontSize: '0.9rem',
                          }}
                        >
                          {progress}% Complete
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() =>
                              updateProgress(
                                goal,
                                Math.max(0, goal.current_value - goal.target_value / 10),
                              )
                            }
                            style={{
                              padding: '0.4rem 0.8rem',
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                              background: 'var(--sidebar-bg)',
                              cursor: 'pointer',
                              fontWeight: '600',
                            }}
                          >
                            -10%
                          </button>
                          <button
                            onClick={() =>
                              updateProgress(
                                goal,
                                Math.min(
                                  goal.target_value,
                                  goal.current_value + goal.target_value / 10,
                                ),
                              )
                            }
                            style={{
                              padding: '0.4rem 0.8rem',
                              borderRadius: '8px',
                              border: 'none',
                              background: 'var(--accent)',
                              color: 'white',
                              cursor: 'pointer',
                              fontWeight: '600',
                            }}
                          >
                            +10%
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Goals;
