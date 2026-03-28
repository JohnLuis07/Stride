import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../App.css';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleSignOut = () => {
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  const enabledFeatures = user?.features && user.features.length > 0
    ? user.features
    : ['Notes', 'Calendar', 'Todo', 'Goals'];

  const featureCards = [
    { id: 'Notes', name: 'Notes', icon: '📝', path: '/notes', description: 'Write and organize your thoughts.' },
    { id: 'Calendar', name: 'Calendar', icon: '📅', path: '/calendar', description: 'Schedule and manage your time.' },
    { id: 'Todo', name: 'Tasks', icon: '✅', path: '/todo', description: 'Keep track of your to-dos.' },
    { id: 'Goals', name: 'Goals', icon: '🎯', path: '/goals', description: 'Set and achieve your milestones.' },
    { id: 'Focus', name: 'Focus', icon: '⏱️', path: '/focus', description: 'Master productivity with Pomodoro.' },
  ].filter(f => enabledFeatures.includes(f.id) || f.id === 'Focus');

  if (loading) return <div className="dashboard-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Loading Workspace...</div>;

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
          </svg>
          <h3>Stride.</h3>
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/dashboard" className={`sidebar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
             🏠 Overview
          </Link>
          {featureCards.map(feature => (
            <Link key={feature.id} to={feature.path} className={`sidebar-link ${location.pathname === feature.path ? 'active' : ''}`}>
              <span>{feature.icon}</span> {feature.name}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ padding: '0 0.5rem 0.5rem 0.5rem' }}>
            <div style={{ fontWeight: '700', color: 'var(--text-h)', fontSize: '0.95rem' }}>{user?.full_name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{user?.email}</div>
          </div>
          <Link to="/profile" className="sidebar-link" style={{ marginBottom: '0.5rem' }}>⚙️ Settings</Link>
          <button onClick={handleSignOut} className="btn-sign-out">
            Logout
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="page-header">
          <h1 className="page-title">Welcome back, {user?.full_name?.split(' ')[0]}!</h1>
          <p className="page-subtitle">Here's what's happening in your workspace today.</p>
        </header>

        <section className="feature-grid">
          {featureCards.map(feature => (
            <Link 
              key={feature.id} 
              to={feature.path}
              className="feature-item-card"
            >
              <div className="feature-icon-wrapper">{feature.icon}</div>
              <div className="feature-content">
                <h3>{feature.name}</h3>
                <p>{feature.description}</p>
              </div>
            </Link>
          ))}
          
          <Link 
            to="/profile"
            className="feature-item-card"
            style={{ borderStyle: 'dashed', backgroundColor: 'transparent' }}
          >
            <div className="feature-icon-wrapper">➕</div>
            <div className="feature-content">
              <h3>Customize</h3>
              <p>Add or remove features to fit your workflow.</p>
            </div>
          </Link>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
