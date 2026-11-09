import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { resolveProfile } from '../Session';
import Icon from '../components/Icon';
import BrandLogo from '../components/BrandLogo';
export default function Auth({ signup = false }: { signup?: boolean }) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'form' | 'verify' | 'recovery' | 'reset'>('form');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      if (stage === 'reset') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        await supabase.auth.signOut();
        setStage('form');
        setMessage('Password updated. Sign in to continue.');
        return;
      }
      if (stage === 'recovery') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setStage('verify');
        setMessage('Enter the recovery code from your email.');
        return;
      }
      if (stage === 'verify') {
        const recovery = sessionStorage.getItem('stride_recovery') === 'true';
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: code,
          type: recovery ? 'recovery' : 'signup',
        });
        if (error) throw error;
        if (recovery) {
          sessionStorage.removeItem('stride_recovery');
          setStage('reset');
          return;
        }
        await resolveProfile();
        navigate('/dashboard');
        return;
      }
      if (signup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        if (!data.session) {
          setStage('verify');
          setMessage('Check your email for a verification code.');
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await resolveProfile();
      navigate('/dashboard');
    });
  }
  const heading =
    stage === 'verify'
      ? 'Check your inbox'
      : stage === 'recovery'
        ? 'Forgot your password?'
        : stage === 'reset'
          ? 'A fresh start'
          : signup
            ? 'Start your next chapter'
            : 'Welcome back';
  const subtitle =
    stage === 'verify'
      ? 'Enter the verification code sent to your email.'
      : stage === 'recovery'
        ? 'We’ll send you a code to get back into your account.'
        : stage === 'reset'
          ? 'Choose a strong password for your workspace.'
          : signup
            ? 'A little more organized. A little more you.'
            : 'Sign in and pick up where you left off.';
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <Link to="/login" aria-label="Stride home">
          <BrandLogo size={46} wordmarkSize={36} />
        </Link>
        <p>Your day, in stride.</p>
      </div>
      <section className="auth-card" aria-labelledby="auth-heading">
        <header className="auth-header">
          <span className="auth-symbol" aria-hidden="true">
            <Icon name={stage === 'form' ? (signup ? 'plus' : 'overview') : 'check'} size={21} />
          </span>
          <h1 id="auth-heading">{heading}</h1>
          <p>{subtitle}</p>
        </header>
        <form className="auth-form" onSubmit={submit}>
          {stage === 'form' && signup && (
            <label htmlFor="full-name">
              Full name
              <input
                id="full-name"
                className="feature-input"
                autoComplete="name"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          )}
          {stage !== 'reset' && (
            <label htmlFor="email">
              Email address
              <input
                id="email"
                className="feature-input"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
          )}
          {(stage === 'form' || stage === 'reset') && (
            <div className="password-field">
              <div className="field-heading">
                <label htmlFor="password">Password</label>
                {!signup && stage === 'form' && (
                  <button
                    className="text-button"
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      sessionStorage.setItem('stride_recovery', 'true');
                      setStage('recovery');
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="password-input">
                <input
                  id="password"
                  className="feature-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={signup || stage === 'reset' ? 'new-password' : 'current-password'}
                  placeholder={signup ? 'Create a password' : 'Enter your password'}
                  minLength={signup || stage === 'reset' ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Icon name="eye" size={19} />
                </button>
              </div>
              {signup && <span className="field-hint">Use at least 8 characters.</span>}
            </div>
          )}
          {stage === 'verify' && (
            <label htmlFor="verification-code">
              Verification code
              <input
                id="verification-code"
                className="feature-input code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter your code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </label>
          )}
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
          <button className="btn-primary auth-submit" disabled={busy}>
            {busy
              ? 'Please wait…'
              : stage === 'verify'
                ? 'Verify email'
                : stage === 'recovery'
                  ? 'Send recovery code'
                  : stage === 'reset'
                    ? 'Update password'
                    : signup
                      ? 'Create account'
                      : 'Sign in'}
          </button>
        </form>
        {stage === 'form' && (
          <>
            <div className="auth-divider">
              <span>or continue with</span>
            </div>
            <button
              className="google-button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  sessionStorage.removeItem('stride_recovery');
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: location.origin + '/dashboard' },
                  });
                  if (error) throw error;
                })
              }
            >
              <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.6a4.8 4.8 0 0 1-2.1 3.1v2.6h3.4c2-1.8 3.1-4.5 3.1-7.7Z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.8 0 5.2-.9 6.9-2.5l-3.4-2.6c-.9.6-2.1 1-3.5 1a6 6 0 0 1-5.7-4.1H2.8v2.7A10.4 10.4 0 0 0 12 22Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.3 13.8a6.3 6.3 0 0 1 0-3.6V7.5H2.8a10.2 10.2 0 0 0 0 9l3.5-2.7Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 6.1c1.6 0 3 .6 4.1 1.6l3.1-3A10 10 0 0 0 12 2a10.4 10.4 0 0 0-9.2 5.5l3.5 2.7A6 6 0 0 1 12 6.1Z"
                />
              </svg>
              Google
            </button>
            <p className="auth-footer">
              {signup ? 'Already have an account?' : 'New to Stride?'}{' '}
              <Link
                to={signup ? '/login' : '/signup'}
                onClick={() => sessionStorage.removeItem('stride_recovery')}
              >
                {signup ? 'Sign in' : 'Create an account'}
              </Link>
            </p>
          </>
        )}
        {stage === 'verify' && (
          <button
            disabled={busy}
            className="text-button resend-button"
            onClick={() =>
              run(async () => {
                if (sessionStorage.getItem('stride_recovery') === 'true') {
                  const { error } = await supabase.auth.resetPasswordForEmail(email);
                  if (error) throw error;
                } else {
                  const { error } = await supabase.auth.resend({ type: 'signup', email });
                  if (error) throw error;
                }
                setMessage('A new code is on its way.');
              })
            }
          >
            Resend verification code
          </button>
        )}
        {stage !== 'form' && (
          <button
            className="text-button auth-back"
            disabled={busy}
            onClick={() => {
              setStage('form');
              setMessage('');
              sessionStorage.removeItem('stride_recovery');
            }}
          >
            Back to sign in
          </button>
        )}
      </section>
      <p className="auth-bottom">
        <span className="auth-bottom-dot" />A little progress, every day.
      </p>
    </main>
  );
}
