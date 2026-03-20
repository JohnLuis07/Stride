import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((event) => event.event_date >= formatDateKey(today))
      .slice(0, 5);
  }, [events, today]);

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

  if (loading) return <div className="auth-container">Loading calendar...</div>;

  return (
    <div className="dashboard-container" style={{ backgroundColor: '#f8fafc' }}>
      <div className="dashboard-main feature-main">
        <div className="editor-header feature-header">
          <div className="feature-header-copy">
            <button onClick={() => navigate('/dashboard')} className="dashboard-back-btn">
              Back to Dashboard
            </button>
            <div>
              <h1 className="profile-title">Smart Calendar</h1>
              <p className="feature-subtitle">Plan focused work, deadlines, and personal events in one place.</p>
            </div>
          </div>
          <div className="feature-header-chip">Selected: {new Date(selectedDate).toLocaleDateString()}</div>
        </div>

        <div className="feature-grid calendar-layout">
          <section className="feature-panel">
            <div className="calendar-toolbar">
              <button className="calendar-nav-btn" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}>
                Prev
              </button>
              <h2 className="calendar-month-title">{monthLabel(viewMonth)}</h2>
              <button className="calendar-nav-btn" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}>
                Next
              </button>
            </div>

            <div className="calendar-grid">
              {weekdayLabels.map((label) => (
                <div key={label} className="calendar-weekday">{label}</div>
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
                    className={`calendar-day ${isCurrentMonth ? '' : 'is-muted'} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedDate(dateKey)}
                  >
                    <span className="calendar-day-number">{date.getDate()}</span>
                    <div className="calendar-day-events">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span key={event.id} className="calendar-event-pill">
                          {event.title}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="feature-panel feature-panel-stack">
            <form onSubmit={handleSaveEvent} className="feature-form">
              <div className="feature-panel-heading">
                <h3>{editingEventId ? 'Edit Event' : 'Schedule Event'}</h3>
                <span>{new Date(selectedDate).toLocaleDateString()}</span>
              </div>

              <input
                className="feature-input"
                placeholder="Event title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
              <textarea
                className="feature-textarea"
                placeholder="Details"
                value={form.details}
                onChange={(e) => setForm((prev) => ({ ...prev, details: e.target.value }))}
              />
              <div className="feature-row">
                <input
                  className="feature-input"
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
                />
                <input
                  className="feature-input"
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
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
              <div className="feature-action-row">
                {editingEventId && (
                  <button type="button" className="secondary-action-btn" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="save-note-btn" disabled={saving}>
                  {saving ? 'Saving...' : editingEventId ? 'Update Event' : 'Add Event'}
                </button>
              </div>
            </form>

            <div className="feature-panel-section">
              <div className="feature-panel-heading">
                <h3>Agenda</h3>
                <span>{selectedEvents.length} items</span>
              </div>
              <div className="feature-list">
                {selectedEvents.length === 0 && <div className="empty-state">Nothing planned for this date.</div>}
                {selectedEvents.map((event) => (
                  <div key={event.id} className="feature-list-item">
                    <div>
                      <div className="feature-item-title">{event.title}</div>
                      <div className="feature-item-meta">
                        {[event.category, formatTimeLabel(event.start_time), event.end_time && `to ${formatTimeLabel(event.end_time)}`].filter(Boolean).join(' | ')}
                      </div>
                    </div>
                    <div className="item-action-row">
                      <button type="button" className="item-action-btn" onClick={() => handleEditEvent(event)}>
                        Edit
                      </button>
                      <button type="button" className="item-action-btn danger" onClick={() => handleDeleteEvent(event.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="feature-panel-section">
              <div className="feature-panel-heading">
                <h3>Upcoming</h3>
                <span>Next 5</span>
              </div>
              <div className="feature-list">
                {upcomingEvents.length === 0 && <div className="empty-state">Add events to build your schedule.</div>}
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="feature-list-item">
                    <div>
                      <div className="feature-item-title">{event.title}</div>
                      <div className="feature-item-meta">
                        {new Date(event.event_date).toLocaleDateString()} {event.start_time ? `| ${formatTimeLabel(event.start_time)}` : ''}
                      </div>
                    </div>
                    <div className="item-action-row">
                      <button type="button" className="item-action-btn" onClick={() => handleEditEvent(event)}>
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
