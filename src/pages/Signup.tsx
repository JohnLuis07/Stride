import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../App.css';

const Signup: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const navigate = useNavigate();

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: "Passwords don't match!" });
      return;
    }

    setLoading(true);

    // Direct Database Insert (No Email Required)
    const { error } = await supabase
      .from('users')
      .insert([
        { 
          id: crypto.randomUUID(),
          email, 
          password,
          full_name: fullName 
        }
      ]);

    if (error) {
      // Check for specific database errors, e.g., duplicate email
      if (error.code === '23505') {
        setMessage({ type: 'error', text: 'Email already exists!' });
      } else {
        setMessage({ type: 'error', text: error.message });
      }
    } else {
      setMessage({ type: 'success', text: 'Account created! Redirecting to login...' });
      setTimeout(() => navigate('/login'), 2000);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="hero-blob blob-1"></div>
        <div className="hero-blob blob-2"></div>
        <div className="auth-hero-content">
          <h1>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
            Stride.
          </h1>
          <p>Join the next generation of professionals who are redefining productivity.</p>
          
          <div className="app-mockup">
            <div className="mockup-sidebar">
              <div className="mockup-circle"></div>
              <div className="mockup-item" style={{ width: '80%' }}></div>
              <div className="mockup-item" style={{ width: '60%' }}></div>
              <div className="mockup-item" style={{ width: '70%' }}></div>
            </div>
            <div className="mockup-main">
              <div className="mockup-header"></div>
              <div className="mockup-grid">
                <div className="mockup-card">
                  <div className="mockup-line" style={{ width: '40%', background: 'rgba(255,255,255,0.3)' }}></div>
                  <div className="mockup-line" style={{ width: '90%' }}></div>
                  <div className="mockup-line" style={{ width: '70%' }}></div>
                </div>
                <div className="mockup-card">
                  <div className="mockup-line" style={{ width: '40%', background: 'rgba(255,255,255,0.3)' }}></div>
                  <div className="mockup-line" style={{ width: '85%' }}></div>
                  <div className="mockup-line" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Create account</h2>
            <p>Start your 14-day free trial today.</p>
          </div>

          {message && (
            <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
              {message.type === 'error' ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="John Doe"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
            </div>
            
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <div className="social-auth">
            <button className="social-button" type="button" onClick={() => handleSocialLogin('google')}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84c-.21 1.12-.84 2.07-1.79 2.7l2.85 2.21c1.67-1.53 2.63-3.79 2.63-6.56z" fill="#4285F4" />
                <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.85-2.21c-.79.53-1.8.85-3.11.85-2.39 0-4.41-1.61-5.14-3.78H.95v2.33C2.43 15.89 5.5 18 9 18z" fill="#34A853" />
                <path d="M3.86 10.73c-.19-.53-.3-1.1-.3-1.73s.11-1.2.3-1.73V4.96H.95C.35 6.17 0 7.55 0 9s.35 2.83.95 4.04l2.91-2.31z" fill="#FBBC05" />
                <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0 5.5 0 2.43 2.11.95 5.04l2.91 2.31c.73-2.17 2.75-3.77 5.14-3.77z" fill="#EA4335" />
              </svg>
              Google
            </button>
            <button className="social-button" type="button" onClick={() => handleSocialLogin('github')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              GitHub
            </button>
          </div>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
