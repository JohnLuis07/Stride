import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    { id: 'Notes', name: 'Notes & Documents', icon: '📝', description: 'Rich text editing and organization' },
    { id: 'Calendar', name: 'Smart Calendar', icon: '📅', description: 'Schedule and manage events' },
    { id: 'Todo', name: 'Task Manager', icon: '✅', description: 'Track your daily to-do list' },
    { id: 'Goals', name: 'Goal Tracking', icon: '🎯', description: 'Set and monitor long-term goals' }
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

  if (loading) return <div className="auth-container">Loading Profile...</div>;

  return (
    <div className="dashboard-container" style={{ backgroundColor: '#f9fafb' }}>
      {toast && (
        <div className="toast-stack">
          <div className={`toast-notification toast-${toast.type}`}>{toast.text}</div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarning && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-icon">!</div>
            <h3>Unsaved Changes</h3>
            <p>You have made changes that haven't been saved. If you leave now, these changes will be lost.</p>
            <div className="modal-actions">
              <button className="modal-btn btn-cancel" onClick={() => setShowWarning(false)}>Go Back</button>
              <button className="modal-btn btn-discard" onClick={confirmDiscard}>Discard Changes</button>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-main profile-page-main">
        <div className="profile-container-inner">
          <div className="editor-header" style={{ justifyContent: 'space-between', padding: '3rem 0', borderBottom: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button
                onClick={() => handleActionWithWarning(() => navigate('/dashboard'))}
                className="dashboard-back-btn"
              >
                Back to Dashboard
              </button>
              <h1 className="profile-title">Profile Settings</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button onClick={() => handleActionWithWarning(handleSignOut)} className="btn-sign-out">
                <span className="btn-sign-out-label">Logout</span>
                <span className="btn-sign-out-arrow" aria-hidden="true">{'>'}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="profile-form">
            <div className="profile-card">
              <div className="profile-section-header">
                <span className="profile-section-icon">👤</span>
                <h3>Personal Information</h3>
              </div>
              <div className="profile-input-grid">
                <div className="profile-input-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="profile-input-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
              </div>
            </div>

            <div className="profile-card">
              <div className="profile-section-header">
                <span className="profile-section-icon">🚀</span>
                <h3>Workspace Features</h3>
              </div>
              <p className="section-desc">Customize your workspace by enabling or disabling specific tools.</p>
              <div className="features-grid">
                {availableFeatures.map(feature => (
                  <div 
                    key={feature.id} 
                    className={`feature-card ${selectedFeatures.includes(feature.id) ? 'selected' : ''}`}
                    onClick={() => handleToggleFeature(feature.id)}
                  >
                    <div className="feature-checkbox">
                      {selectedFeatures.includes(feature.id) && '✓'}
                    </div>
                    <div className="feature-info">
                      <div className="feature-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{feature.icon}</span>
                        {feature.name}
                      </div>
                      <div className="feature-desc">{feature.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="profile-actions">
              <button type="submit" className="save-profile-btn" disabled={saving}>
                {saving ? 'Saving...' : 'Save All Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
