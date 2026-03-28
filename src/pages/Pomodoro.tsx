import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useFocus } from '../FocusContext';
import '../App.css';

const Pomodoro: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showWarning, setShowWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'mode' | 'tech', value: any } | null>(null);

  // Get shared state and actions from Context
  const { 
    technique, mode, timeLeft, isActive, sessionsCompleted,
    setIsActive, switchMode, changeTechnique, resetTimer 
  } = useFocus();

  const TECHNIQUES = {
    pomodoro: {
      name: 'Pomodoro',
      description: '25 min focus, 5 min break',
      modes: {
        work: { label: 'Focus', color: 'var(--accent)' },
        short: { label: 'Short Break', color: '#10b981' },
        long: { label: 'Long Break', color: '#3b82f6' },
      }
    },
    rule52: {
      name: '52/17 Rule',
      description: '52 min focus, 17 min break',
      modes: {
        work: { label: 'Deep Work', color: '#f59e0b' },
        short: { label: 'Break', color: '#10b981' },
        long: { label: 'Rest', color: '#3b82f6' },
      }
    },
    flowtime: {
      name: 'Flowtime',
      description: 'Extended focus for deep flow',
      modes: {
        work: { label: 'In Flow', color: '#8b5cf6' },
        short: { label: 'Quick Rest', color: '#10b981' },
        long: { label: 'Reset', color: '#3b82f6' },
      }
    }
  };

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

  const handleSwitchMode = (newMode: any) => {
    if (isActive) {
      setPendingAction({ type: 'mode', value: newMode });
      setShowWarning(true);
    } else {
      switchMode(newMode);
    }
  };

  const handleChangeTech = (newTech: any) => {
    if (technique === newTech) return;
    if (isActive) {
      setPendingAction({ type: 'tech', value: newTech });
      setShowWarning(true);
    } else {
      changeTechnique(newTech);
    }
  };

  const confirmAction = () => {
    if (pendingAction?.type === 'mode') switchMode(pendingAction.value);
    if (pendingAction?.type === 'tech') changeTechnique(pendingAction.value);
    setShowWarning(false);
    setPendingAction(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSignOut = () => {
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  const totalModeTime = {
    pomodoro: { work: 25*60, short: 5*60, long: 15*60 },
    rule52: { work: 52*60, short: 17*60, long: 30*60 },
    flowtime: { work: 90*60, short: 10*60, long: 25*60 }
  }[technique][mode];

  const currentConfig = TECHNIQUES[technique].modes[mode];
  const progress = ((totalModeTime - timeLeft) / totalModeTime) * 100;

  if (loading) return <div className="dashboard-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Loading Workspace...</div>;

  return (
    <div className="dashboard-container">
      {/* Custom Warning Modal */}
      {showWarning && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent)' }}>⏱️</div>
            <h3>Active Focus Session</h3>
            <p>Your timer is currently running. Switching will reset your progress. Do you want to continue?</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowWarning(false)}>Cancel</button>
              <button className="btn-primary" onClick={confirmAction} style={{ background: currentConfig.color }}>Reset & Switch</button>
            </div>
          </div>
        </div>
      )}

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
          <h1 className="page-title">Focus Mode</h1>
          <p className="page-subtitle">Choose your technique and master your momentum.</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <section className="feature-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '3rem', background: 'var(--bg)', padding: '0.5rem', borderRadius: '18px', width: 'fit-content', margin: '0 auto 3rem auto' }}>
                {(['work', 'short', 'long'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => handleSwitchMode(m)}
                    style={{
                      padding: '0.75rem 1.5rem', borderRadius: '14px', border: 'none', cursor: 'pointer', fontWeight: '800', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      background: mode === m ? 'var(--sidebar-bg)' : 'transparent',
                      color: mode === m ? currentConfig.color : 'var(--text)',
                      boxShadow: mode === m ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                      fontSize: '0.9rem'
                    }}
                  >
                    {TECHNIQUES[technique].modes[m].label}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative', width: '320px', height: '320px', margin: '0 auto 3.5rem auto' }}>
                <svg width="320" height="320" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="46" fill="none" stroke="var(--border)" strokeWidth="3" opacity="0.3" />
                  <circle
                    cx="50" cy="50" r="46" fill="none" stroke={currentConfig.color} strokeWidth="4"
                    strokeDasharray="289"
                    strokeDashoffset={289 - (289 * progress) / 100}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%' }}>
                  <div style={{ fontSize: '5.5rem', fontWeight: '950', color: 'var(--text-h)', letterSpacing: '-0.06em', lineHeight: '1' }}>
                    {formatTime(timeLeft)}
                  </div>
                  <div style={{ fontSize: '1rem', color: 'var(--text)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '0.5rem', opacity: 0.7 }}>
                    {mode === 'work' ? 'Stay Focused' : 'Taking a Break'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center' }}>
                <button
                  onClick={() => setIsActive(!isActive)}
                  className="btn-primary"
                  style={{ 
                    width: '200px', 
                    height: '60px',
                    fontSize: '1.2rem',
                    background: currentConfig.color, 
                    boxShadow: isActive ? 'none' : `0 12px 24px ${currentConfig.color}44`,
                    transform: isActive ? 'scale(0.98)' : 'none'
                  }}
                >
                  {isActive ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  )}
                  {isActive ? 'Pause' : 'Start Focus'}
                </button>
                <button
                  onClick={resetTimer}
                  className="btn-ghost"
                  style={{ width: '60px', height: '60px', padding: '0', borderRadius: '50%', border: '2px solid var(--border)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                </button>
              </div>
            </section>
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="feature-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1.25rem 0', color: 'var(--text-h)', fontSize: '1.1rem' }}>Study Technique</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(['pomodoro', 'rule52', 'flowtime'] as const).map((tech) => (
                  <button
                    key={tech}
                    onClick={() => handleChangeTech(tech)}
                    style={{
                      padding: '1.25rem', borderRadius: '16px', border: '2px solid', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                      borderColor: technique === tech ? 'var(--accent)' : 'var(--border)',
                      background: technique === tech ? 'var(--accent-bg)' : 'var(--bg)',
                    }}
                  >
                    <div style={{ fontWeight: '800', color: 'var(--text-h)', marginBottom: '0.25rem' }}>{TECHNIQUES[tech].name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text)', opacity: 0.8 }}>{TECHNIQUES[tech].description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="feature-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem', opacity: 0.6 }}>Streak</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '950', color: 'var(--text-h)' }}>{sessionsCompleted}</div>
              </div>
              <div style={{ width: '1px', background: 'var(--border)' }}></div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem', opacity: 0.6 }}>Daily Goal</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '950', color: 'var(--text-h)' }}>8</div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Pomodoro;
