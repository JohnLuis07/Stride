import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../App.css';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  const enabledFeatures = user?.features && user.features.length > 0 ? user.features : ['Notes'];

  const featureCards = [
    { id: 'Notes', name: 'Notes', icon: '📝', path: '/notes', description: 'Write and organize your thoughts.' },
    { id: 'Calendar', name: 'Calendar', icon: '📅', path: '/calendar', description: 'Schedule and manage your time.' },
    { id: 'Todo', name: 'Tasks', icon: '✅', path: '/todo', description: 'Keep track of your to-dos.' },
    { id: 'Goals', name: 'Goals', icon: '🎯', path: '/goals', description: 'Set and achieve your milestones.' },
  ].filter(f => enabledFeatures.includes(f.id));

  if (loading) return <div className="auth-container">Loading Workspace...</div>;

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <h3>STRIDE</h3>
        </div>
        
        <div className="notes-list">
          <div className="note-item active">
            <div className="note-item-title">Overview</div>
          </div>
          {featureCards.map(feature => (
            <Link key={feature.id} to={feature.path} className="sidebar-nav-link">
              <div className="note-item">
                <div className="note-item-title">{feature.name}</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="sidebar-footer">
          <div style={{ fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>{user?.full_name}</div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '1rem' }}>{user?.email}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link to="/profile" className="save-note-btn" style={{ backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', padding: '0.5rem', fontSize: '0.85rem', textDecoration: 'none', textAlign: 'center' }}>⚙️ Settings</Link>
            <button onClick={handleSignOut} className="btn-sign-out" style={{ width: '100%', justifyContent: 'space-between' }}>
              <span className="btn-sign-out-label">Logout</span>
              <span className="btn-sign-out-arrow" aria-hidden="true">{'>'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        <div className="editor-header">
          <h1 className="profile-title">Welcome back, {user?.full_name?.split(' ')[0]}!</h1>
        </div>
        <br></br>
        <div className="profile-content">
          <p className="section-desc">Quickly access your enabled features or manage them in your profile.</p>
          
          <div className="features-grid">
            {featureCards.map(feature => (
              <div 
                key={feature.id} 
                className="feature-card"
                onClick={() => navigate(feature.path)}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '2rem' }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{feature.icon}</div>
                <div className="feature-name" style={{ fontSize: '1.25rem' }}>{feature.name}</div>
                <div className="feature-desc" style={{ fontSize: '0.95rem' }}>{feature.description}</div>
              </div>
            ))}
            
            <div 
              className="feature-card"
              onClick={() => navigate('/profile')}
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '2rem', borderStyle: 'dashed' }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>➕</div>
              <div className="feature-name" style={{ fontSize: '1.25rem' }}>Add More</div>
              <div className="feature-desc" style={{ fontSize: '0.95rem' }}>Enable more features in your settings.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
