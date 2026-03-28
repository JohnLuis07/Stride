import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../App.css';

interface CalendarEvent {
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
  const location = useLocation();
  const today = useMemo(() => new Date(), []);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
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
      const startOfMonth = formatDateKey(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1));
      const endOfMonth = formatDateKey(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0));

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('event_date', startOfMonth)
        .lte('event_date', endOfMonth)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (!error && data) {
        setEvents(data);
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
      days.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), end.getDate() + (days.length % 7) + 1));
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
          `${a.event_date}${a.start_time || ''}`.localeCompare(`${b.event_date}${b.start_time || ''}`),
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
          <Link to="/focus" className={`sidebar-link ${location.pathname === '/focus' ? 'active' : ''}`}>⏱️ Focus</Link>
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
          <h1 className="page-title">Smart Calendar</h1>
          <p className="page-subtitle">Plan focused work, deadlines, and personal events in one place.</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', height: '100%', alignItems: 'start' }}>
          <section className="feature-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontWeight: '800', color: 'var(--text-h)' }} onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}>
                ← Prev
              </button>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-h)' }}>{monthLabel(viewMonth)}</h2>
              <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontWeight: '800', color: 'var(--text-h)' }} onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}>
                Next →
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
              {weekdayLabels.map((label) => (
                <div key={label} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-h)', textTransform: 'uppercase', paddingBottom: '0.5rem' }}>{label}</div>
              ))}
              {monthDays.map((date) => {
                const dateKey = formatDateKey(date);
                const isCurrentMonth = date.getMonth() === viewMonth.getMonth();
                const isToday = dateKey === formatDateKey(today);
                const isSelected = dateKey === selectedDate;
                const dayEvents = eventsByDate[dateKey] || [];

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(dateKey)}
                    style={{
                      aspectRatio: '1', display: 'flex', flexDirection: 'column', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer',
                      background: isSelected ? 'var(--accent-bg)' : 'var(--sidebar-bg)',
                      borderColor: isSelected ? 'var(--accent)' : isToday ? 'var(--accent-light)' : 'var(--border)',
                      opacity: isCurrentMonth ? 1 : 0.6,
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: isToday ? 'var(--accent)' : 'var(--text-h)' }}>{date.getDate()}</span>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', marginTop: '4px' }}>
                      {dayEvents.slice(0, 2).map(e => (
                        <div key={e.id} style={{ height: '4px', background: 'var(--accent)', borderRadius: '2px', opacity: 0.6 }}></div>
                      ))}
                      {dayEvents.length > 2 && <div style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: '700' }}>+{dayEvents.length - 2}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="feature-panel">
              <h3 style={{ margin: '0 0 1.25rem 0', color: 'var(--text-h)' }}>{editingEventId ? 'Edit Event' : 'Schedule Event'}</h3>
              <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input className="feature-input" placeholder="Event title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required />
                <textarea className="feature-textarea" placeholder="Details" rows={2} value={form.details} onChange={(e) => setForm((prev) => ({ ...prev, details: e.target.value }))} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group"><label>Start</label><input type="time" className="feature-input" value={form.start_time} onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))} /></div>
                  <div className="form-group"><label>End</label><input type="time" className="feature-input" value={form.end_time} onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))} /></div>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select className="feature-input" value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}>
                    <option>Focus</option><option>Meeting</option><option>Personal</option><option>Deadline</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editingEventId ? 'Update' : 'Add to Calendar'}</button>
                {editingEventId && <button type="button" onClick={handleCancelEdit} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>}
              </form>
            </div>

            <div className="feature-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-h)' }}>Agenda for {new Date(selectedDate).toLocaleDateString()}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedEvents.length === 0 && <div className="empty-state" style={{ padding: '1rem' }}>Free day!</div>}
                {selectedEvents.map(event => (
                  <div key={event.id} style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text-h)' }}>{event.title}</span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleEditEvent(event)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                        <button onClick={() => handleDeleteEvent(event.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: '600', marginTop: '0.25rem' }}>
                      {formatTimeLabel(event.start_time)} {event.end_time && ` - ${formatTimeLabel(event.end_time)}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Calendar;
