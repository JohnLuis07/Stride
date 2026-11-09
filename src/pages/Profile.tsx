import { useSessionProfile } from '../Session';
import { LoadingContent } from '../components/WorkspaceLoading';
import type { Profile as UserProfile } from '../types';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Icon from '../components/Icon';
import Sidebar from '../components/Sidebar';
import '../App.css';

const Profile: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(useSessionProfile());
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    'Notes',
    'Calendar',
    'Todo',
    'Goals',
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const [lastSavedProfile, setLastSavedProfile] = useState<{
    fullName: string;
    email: string;
    features: string[];
  } | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const navigate = useNavigate();

  const availableFeatures = [
    { id: 'Notes', name: 'Notes', icon: '📝', description: 'Rich text editing and organization' },
    { id: 'Calendar', name: 'Calendar', icon: '📅', description: 'Schedule and manage events' },
    { id: 'Todo', name: 'Tasks', icon: '✅', description: 'Track your daily to-do list' },
    { id: 'Goals', name: 'Goals', icon: '🎯', description: 'Set and monitor long-term goals' },
    {
      id: 'Allowance',
      name: 'Budget & allowance',
      icon: '💳',
      description: 'Plan spending until payday',
    },
    { id: 'Focus', name: 'Focus', icon: '⏱️', description: 'Master productivity with Pomodoro' },
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
    setSelectedFeatures((prev) =>
      prev.includes(featureId) ? prev.filter((id) => id !== featureId) : [...prev, featureId],
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setToast(null);

    if (email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email });
      if (emailError) {
        showToast('error', emailError.message);
        setSaving(false);
        return;
      }
      showToast(
        'success',
        'Confirm the email change using the verification links sent to your inbox.',
      );
    }
    const { error } = await supabase
      .from('users')
      .update({
        full_name: fullName,
        email: user.email,
        features: selectedFeatures,
      })
      .eq('id', user.id);

    if (error) {
      showToast('error', 'Error updating profile: ' + error.message);
    } else {
      showToast('success', 'Profile updated successfully');
      localStorage.setItem('userEmail', user.email);
      setUser((prev) =>
        prev
          ? { ...prev, full_name: fullName, email: prev.email, features: selectedFeatures }
          : prev,
      );
      setLastSavedProfile({ fullName, email, features: selectedFeatures });
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

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
            <p>
              You have made changes that haven't been saved yet. Are you sure you want to discard
              them?
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowWarning(false)}>
                Go Back
              </button>
              <button className="btn-danger" onClick={confirmDiscard}>
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar
        user={user}
        onSignOut={() => handleActionWithWarning(handleSignOut)}
        beforeNavigate={handleActionWithWarning}
      />

      <main className="dashboard-main">
        {loading ? (
          <LoadingContent />
        ) : (
          <>
            <header className="page-header">
              <button
                onClick={() => handleActionWithWarning(() => navigate('/dashboard'))}
                style={{
                  width: 'fit-content',
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: '0',
                  marginBottom: '0.5rem',
                }}
              >
                ← Back to Dashboard
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={async () => {
                  if ('Notification' in window) {
                    const permission = await Notification.requestPermission();
                    showToast(
                      permission === 'granted' ? 'success' : 'error',
                      permission === 'granted'
                        ? 'Deadline notifications enabled while Stride is open.'
                        : 'Browser notifications were not enabled.',
                    );
                  }
                }}
              >
                Enable deadline notifications
              </button>
              <h1 className="page-title">Profile Settings</h1>
              <p className="page-subtitle">
                Manage your personal information and workspace preferences.
              </p>
            </header>

            <form
              onSubmit={handleSaveProfile}
              style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
            >
              <section className="feature-panel">
                <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-h)' }}>
                  Personal Information
                </h3>
                <div
                  className="profile-fields"
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}
                >
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
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-h)' }}>
                  Workspace Features
                </h3>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.95rem' }}>
                  Enable or disable specific tools to customize your experience.
                </p>

                <div className="feature-grid">
                  {availableFeatures.map((feature) => (
                    <div
                      key={feature.id}
                      className={`feature-item-card ${selectedFeatures.includes(feature.id) ? 'active-feature' : ''}`}
                      onClick={() => handleToggleFeature(feature.id)}
                      style={{
                        border: selectedFeatures.includes(feature.id)
                          ? '2px solid var(--accent)'
                          : '1px solid var(--border)',
                        background: selectedFeatures.includes(feature.id)
                          ? 'var(--accent-bg)'
                          : 'var(--bg)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '1rem',
                        }}
                      >
                        <div className="feature-icon-wrapper">
                          <Icon
                            name={
                              (
                                {
                                  Notes: 'notes',
                                  Calendar: 'calendar',
                                  Todo: 'tasks',
                                  Goals: 'goals',
                                  Allowance: 'allowance',
                                  Focus: 'focus',
                                } as Record<string, string>
                              )[feature.id]
                            }
                            size={23}
                          />
                        </div>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: '2px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: selectedFeatures.includes(feature.id)
                              ? 'var(--accent)'
                              : 'transparent',
                            borderColor: selectedFeatures.includes(feature.id)
                              ? 'var(--accent)'
                              : 'var(--border)',
                          }}
                        >
                          {selectedFeatures.includes(feature.id) && (
                            <span style={{ color: 'white', fontSize: '0.8rem' }}>✓</span>
                          )}
                        </div>
                      </div>
                      <h3>{feature.name}</h3>
                      <p>{feature.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                {hasUnsavedChanges() && (
                  <span
                    style={{
                      alignSelf: 'center',
                      fontSize: '0.9rem',
                      color: 'var(--accent)',
                      fontWeight: '600',
                    }}
                  >
                    You have unsaved changes
                  </span>
                )}
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '1rem 2.5rem' }}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save All Changes'}
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
};

export default Profile;
