import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../App.css';

const Profile: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['Notes', 'Calendar', 'Todo', 'Goals']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  
  const [lastSavedProfile, setLastSavedProfile] = useState<any>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  
  const navigate = useNavigate();

  const availableFeatures = [
    { id: 'Notes', name: 'Notes', icon: '📝', description: 'Rich text editing and organization' },
    { id: 'Calendar', name: 'Calendar', icon: '📅', description: 'Schedule and manage events' },
    { id: 'Todo', name: 'Tasks', icon: '✅', description: 'Track your daily to-do list' },
    { id: 'Goals', name: 'Goals', icon: '🎯', description: 'Set and monitor long-term goals' },
    { id: 'Focus', name: 'Focus', icon: '⏱️', description: 'Master productivity with Pomodoro' }
  ];

  const showToast = (type: 'error' | 'success', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 2500);
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
        setFullName(data.full_name || '');
        setEmail(data.email || '');
        const features = data.features || ['Notes', 'Calendar', 'Todo', 'Goals'];
        setSelectedFeatures(features);
        setLastSavedProfile({ fullName: data.full_name || '', email: data.email || '', features });
      }
      setLoading(false);
    };

    checkUser();
  }, [navigate]);

  const hasUnsavedChanges = () => {
    if (!lastSavedProfile) return false;
    return (
      fullName !== lastSavedProfile.fullName ||
      email !== lastSavedProfile.email ||
      JSON.stringify(selectedFeatures) !== JSON.stringify(lastSavedProfile.features)
    );
  };

  const handleActionWithWarning = (action: () => void) => {
    if (hasUnsavedChanges()) {
      setPendingAction(() => action);
      setShowWarning(true);
    } else {
      action();
    }
  };

  const confirmDiscard = () => {
    if (pendingAction) {
      pendingAction();
    }
    setShowWarning(false);
    setPendingAction(null);
  };

  const handleToggleFeature = (featureId: string) => {
    setSelectedFeatures(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId) 
        : [...prev, featureId]
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setToast(null);

    const { error } = await supabase
      .from('users')
      .update({
        full_name: fullName,
        email: email,
        features: selectedFeatures
      })
      .eq('id', user.id);

    if (error) {
      showToast('error', 'Error updating profile: ' + error.message);
    } else {
      showToast('success', 'Profile updated successfully');
      localStorage.setItem('userEmail', email);
      setUser((prev: any) => ({ ...prev, full_name: fullName, email, features: selectedFeatures }));
      setLastSavedProfile({ fullName, email, features: selectedFeatures });
    }
    setSaving(false);
  };

  const handleSignOut = () => {
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  if (loading) return <div className="dashboard-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Loading Profile...</div>;

  return (
    <div className="dashboard-container">
      {toast && (
        <div className="toast-stack">
          <div className={`toast-notification toast-${toast.type}`}>{toast.text}</div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarning && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-icon-wrapper">⚠️</div>
            <h3>Unsaved Changes</h3>
            <p>You have made changes that haven't been saved yet. Are you sure you want to discard them?</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowWarning(false)}>Go Back</button>
              <button className="btn-danger" onClick={confirmDiscard}>Discard</button>
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
          <div className="sidebar-divider" style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }}></div>
          {availableFeatures.filter(f => selectedFeatures.includes(f.id)).map(feature => (
            <Link key={feature.id} to={feature.id === 'Todo' ? '/todo' : `/${feature.id.toLowerCase()}`} className="sidebar-link">
              <span>{feature.icon}</span> {feature.name}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ padding: '0.5rem' }}>
            <div style={{ fontWeight: '700', color: 'var(--text-h)', fontSize: '0.95rem' }}>{user?.full_name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{user?.email}</div>
          </div>
          <button onClick={() => handleActionWithWarning(handleSignOut)} className="btn-sign-out">Logout</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="page-header">
          <button
            onClick={() => handleActionWithWarning(() => navigate('/dashboard'))}
            style={{ width: 'fit-content', background: 'none', border: 'none', color: 'var(--accent)', fontWeight: '700', cursor: 'pointer', padding: '0', marginBottom: '0.5rem' }}
          >
            ← Back to Dashboard
          </button>
          <h1 className="page-title">Profile Settings</h1>
          <p className="page-subtitle">Manage your personal information and workspace preferences.</p>
        </header>

        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <section className="feature-panel">
            <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-h)' }}>Personal Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  className="feature-input"
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  className="feature-input"
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>
            </div>
          </section>

          <section className="feature-panel">
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-h)' }}>Workspace Features</h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.95rem' }}>Enable or disable specific tools to customize your experience.</p>
            
            <div className="feature-grid">
              {availableFeatures.map(feature => (
                <div 
                  key={feature.id} 
                  className={`feature-item-card ${selectedFeatures.includes(feature.id) ? 'active-feature' : ''}`}
                  onClick={() => handleToggleFeature(feature.id)}
                  style={{ 
                    border: selectedFeatures.includes(feature.id) ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: selectedFeatures.includes(feature.id) ? 'var(--accent-bg)' : 'var(--bg)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div className="feature-icon-wrapper">{feature.icon}</div>
                    <div style={{ 
                      width: '24px', height: '24px', borderRadius: '50%', border: '2px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: selectedFeatures.includes(feature.id) ? 'var(--accent)' : 'transparent',
                      borderColor: selectedFeatures.includes(feature.id) ? 'var(--accent)' : 'var(--border)'
                    }}>
                      {selectedFeatures.includes(feature.id) && <span style={{ color: 'white', fontSize: '0.8rem' }}>✓</span>}
                    </div>
                  </div>
                  <h3>{feature.name}</h3>
                  <p>{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
             {hasUnsavedChanges() && <span style={{ alignSelf: 'center', fontSize: '0.9rem', color: 'var(--accent)', fontWeight: '600' }}>You have unsaved changes</span>}
             <button type="submit" className="btn-primary" style={{ padding: '1rem 2.5rem' }} disabled={saving}>
               {saving ? 'Saving...' : 'Save All Changes'}
             </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Profile;
