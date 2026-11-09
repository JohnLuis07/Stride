import { useSessionProfile } from '../Session';
import { LoadingContent } from '../components/WorkspaceLoading';
import type { Profile as UserProfile } from '../types';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import '../App.css';

interface CalendarEvent {
  source?: 'task' | 'goal';
  id: string;
  user_id: string;
  title: string;
  details: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (value: number) => value.toString().padStart(2, '0');

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const monthLabel = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

const formatTimeLabel = (value?: string | null) => {
  if (!value) return '';
  const [hours, minutes] = value.split(':').map(Number);
  const time = new Date();
  time.setHours(hours || 0, minutes || 0, 0, 0);
  return time.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
};

const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const [user, setUser] = useState<UserProfile | null>(useSessionProfile());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(formatDateKey(today));
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    details: '',
    start_time: '',
    end_time: '',
    category: 'Focus',
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

    const fetchEvents = async () => {
      const startOfMonth = formatDateKey(
        new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1),
      );
      const endOfMonth = formatDateKey(
        new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0),
      );

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('event_date', startOfMonth)
        .lte('event_date', endOfMonth)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (!error && data) {
        const [tasks, goals] = await Promise.all([
          supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .gte('due_date', startOfMonth)
            .lte('due_date', endOfMonth),
          supabase
            .from('goals')
            .select('*')
            .eq('user_id', user.id)
            .gte('target_date', startOfMonth)
            .lte('target_date', endOfMonth),
        ]);
        const linked = [
          ...(tasks.data || []).map((t) => ({
            ...t,
            id: 'task:' + t.id,
            source: 'task' as const,
            event_date: t.due_date,
            start_time: t.deadline_time,
            end_time: null,
            category: 'Task deadline',
          })),
          ...(goals.data || []).map((g) => ({
            ...g,
            id: 'goal:' + g.id,
            source: 'goal' as const,
            details: g.notes,
            event_date: g.target_date,
            start_time: g.deadline_time,
            end_time: null,
            category: 'Goal deadline',
          })),
        ];
        setEvents([...data, ...linked]);
      }
    };

    fetchEvents();
  }, [user, viewMonth]);

  const eventsByDate = useMemo(() => {
    return events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
      if (!acc[event.event_date]) acc[event.event_date] = [];
      acc[event.event_date].push(event);
      return acc;
    }, {});
  }, [events]);

  const selectedEvents = eventsByDate[selectedDate] || [];

  const monthDays = useMemo(() => {
    const start = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const end = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);
    const days: Date[] = [];
    const leading = start.getDay();

    for (let i = leading; i > 0; i -= 1) {
      days.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1 - i));
    }

    for (let day = 1; day <= end.getDate(); day += 1) {
      days.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
    }

    while (days.length % 7 !== 0) {
      days.push(
        new Date(
          viewMonth.getFullYear(),
          viewMonth.getMonth(),
          end.getDate() + (days.length % 7) + 1,
        ),
      );
    }

    return days;
  }, [viewMonth]);

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.title.trim()) return;

    setSaving(true);
    const payload = {
      user_id: user.id,
      title: form.title.trim(),
      details: form.details.trim() || null,
      event_date: selectedDate,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      category: form.category,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = editingEventId
      ? await supabase.from('calendar_events').update(payload).eq('id', editingEventId).select()
      : await supabase.from('calendar_events').insert([payload]).select();

    if (!error && data) {
      const nextEvent = data[0];
      setEvents((prev) =>
        [...prev.filter((event) => event.id !== nextEvent.id), nextEvent].sort((a, b) =>
          `${a.event_date}${a.start_time || ''}`.localeCompare(
            `${b.event_date}${b.start_time || ''}`,
          ),
        ),
      );
      setForm({ title: '', details: '', start_time: '', end_time: '', category: 'Focus' });
      setEditingEventId(null);
    }

    setSaving(false);
  };

  const handleDeleteEvent = async (id: string) => {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (!error) {
      setEvents((prev) => prev.filter((event) => event.id !== id));
      if (editingEventId === id) {
        setEditingEventId(null);
        setForm({ title: '', details: '', start_time: '', end_time: '', category: 'Focus' });
      }
    }
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedDate(event.event_date);
    setEditingEventId(event.id);
    setForm({
      title: event.title,
      details: event.details || '',
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      category: event.category || 'Focus',
    });
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setForm({ title: '', details: '', start_time: '', end_time: '', category: 'Focus' });
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
              <h1 className="page-title">Smart Calendar</h1>
              <p className="page-subtitle">
                Plan focused work, deadlines, and personal events in one place.
              </p>
            </header>

            <div className="calendar-layout">
              <section className="feature-panel" style={{ padding: '1.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem',
                  }}
                >
                  <button
                    className="btn-secondary"
                    style={{ padding: '0.5rem 1rem', fontWeight: '800', color: 'var(--text-h)' }}
                    onClick={() =>
                      setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
                    }
                  >
                    ← Prev
                  </button>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '1.25rem',
                      fontWeight: '900',
                      color: 'var(--text-h)',
                    }}
                  >
                    {monthLabel(viewMonth)}
                  </h2>
                  <button
                    className="btn-secondary"
                    style={{ padding: '0.5rem 1rem', fontWeight: '800', color: 'var(--text-h)' }}
                    onClick={() =>
                      setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
                    }
                  >
                    Next →
                  </button>
                </div>

                <div className="calendar-grid">
                  {weekdayLabels.map((label) => (
                    <div
                      key={label}
                      style={{
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: 'var(--text-h)',
                        textTransform: 'uppercase',
                        paddingBottom: '0.5rem',
                      }}
                    >
                      {label}
                    </div>
                  ))}
                  {monthDays.map((date) => {
                    const dateKey = formatDateKey(date);
                    const isCurrentMonth = date.getMonth() === viewMonth.getMonth();
                    const isToday = dateKey === formatDateKey(today);
                    const isSelected = dateKey === selectedDate;
                    const dayEvents = eventsByDate[dateKey] || [];

                    return (
                      <button
                        className="calendar-day"
                        aria-label={
                          date.toLocaleDateString(undefined, { dateStyle: 'full' }) +
                          ', ' +
                          dayEvents.length +
                          ' events'
                        }
                        aria-pressed={isSelected}
                        key={dateKey}
                        onClick={() => setSelectedDate(dateKey)}
                        style={{
                          aspectRatio: '1',
                          display: 'flex',
                          flexDirection: 'column',
                          padding: '0.5rem',
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--accent-bg)' : 'var(--sidebar-bg)',
                          borderColor: isSelected
                            ? 'var(--accent)'
                            : isToday
                              ? 'var(--accent-light)'
                              : 'var(--border)',
                          opacity: isCurrentMonth ? 1 : 0.6,
                          transition: 'all 0.2s',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: '700',
                            color: isToday ? 'var(--accent)' : 'var(--text-h)',
                          }}
                        >
                          {date.getDate()}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            overflow: 'hidden',
                            marginTop: '4px',
                          }}
                        >
                          {dayEvents.slice(0, 2).map((e) => (
                            <div
                              key={e.id}
                              style={{
                                height: '4px',
                                background: 'var(--accent)',
                                borderRadius: '2px',
                                opacity: 0.6,
                              }}
                            ></div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div
                              style={{
                                fontSize: '0.65rem',
                                color: 'var(--accent)',
                                fontWeight: '700',
                              }}
                            >
                              +{dayEvents.length - 2}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="feature-panel">
                  <h3 style={{ margin: '0 0 1.25rem 0', color: 'var(--text-h)' }}>
                    {editingEventId ? 'Edit Event' : 'Schedule Event'}
                  </h3>
                  <form
                    onSubmit={handleSaveEvent}
                    style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                  >
                    <input
                      className="feature-input"
                      placeholder="Event title"
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                      required
                    />
                    <textarea
                      className="feature-textarea"
                      placeholder="Details"
                      rows={2}
                      value={form.details}
                      onChange={(e) => setForm((prev) => ({ ...prev, details: e.target.value }))}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label>Start</label>
                        <input
                          type="time"
                          className="feature-input"
                          value={form.start_time}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, start_time: e.target.value }))
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>End</label>
                        <input
                          type="time"
                          className="feature-input"
                          value={form.end_time}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, end_time: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <select
                        className="feature-input"
                        value={form.category}
                        onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                      >
                        <option>Focus</option>
                        <option>Meeting</option>
                        <option>Personal</option>
                        <option>Deadline</option>
                      </select>
                    </div>
                    <button type="submit" className="btn-primary" disabled={saving}>
                      {saving ? 'Saving...' : editingEventId ? 'Update' : 'Add to Calendar'}
                    </button>
                    {editingEventId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text)',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </form>
                </div>

                <div className="feature-panel" style={{ padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-h)' }}>
                    Agenda for {new Date(selectedDate).toLocaleDateString()}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedEvents.length === 0 && (
                      <div className="empty-state" style={{ padding: '1rem' }}>
                        Free day!
                      </div>
                    )}
                    {selectedEvents.map((event) => (
                      <div
                        key={event.id}
                        style={{
                          padding: '1rem',
                          background: 'var(--bg)',
                          borderRadius: '12px',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: '700', color: 'var(--text-h)' }}>
                            {event.title}
                          </span>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() =>
                                event.source
                                  ? navigate(event.source === 'task' ? '/todo' : '/goals')
                                  : handleEditEvent(event)
                              }
                              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              ✏️
                            </button>
                            <button
                              disabled={!!event.source}
                              onClick={() => handleDeleteEvent(event.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--accent)',
                            fontWeight: '600',
                            marginTop: '0.25rem',
                          }}
                        >
                          {formatTimeLabel(event.start_time)}{' '}
                          {event.end_time && ` - ${formatTimeLabel(event.end_time)}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Calendar;
