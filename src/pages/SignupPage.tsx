import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  UserPlus,
} from 'lucide-react';
import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH, signUp } from '@/services/authService';
import SocialAuth from './SocialAuth';

type Status = 'idle' | 'loading' | 'error' | 'success';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  terms?: string;
}

function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const clearFieldError = (key: keyof FieldErrors) => {
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const validate = () => {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = 'Full name is required.';
    if (!email.trim()) errors.email = 'Email is required.';
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Please enter a valid email address.';
    if (!password) errors.password = 'Password is required.';
    else if (password.length < MIN_PASSWORD_LENGTH) errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (confirm !== password) errors.confirm = 'Passwords do not match.';
    if (!agreed) errors.terms = 'Please accept the Terms of Service to continue.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === 'loading' || status === 'success') return;
    setFormError(null);
    if (!validate()) return;

    setStatus('loading');
    const result = await signUp(name.trim(), email.trim(), password);
    if (!result.ok) {
      setStatus('error');
      setFormError(result.message);
      return;
    }
    setStatus('success');
    window.setTimeout(() => {
      window.location.hash = '/login';
    }, 1600);
  };

  const busy = status === 'loading';

  return (
    <div className="login-panel">
      <div className="login-brand">
        <div className="login-logo-container">
          <UserPlus className="login-logo" size={24} fill="none" strokeWidth={2.5} />
        </div>
        <h2 className="login-brand-name">VOYANA</h2>
        <span className="login-brand-tag">Join the adventure</span>
      </div>

      <h1 className="login-heading">Create Account <span className="login-sparkle">✨</span></h1>
      <p className="login-subheading">
        Start your adventure today and<br />
        explore amazing places.
      </p>

      {formError && (
        <div className="auth-alert auth-alert-error" role="alert">
          <AlertCircle size={16} />
          <span>{formError}</span>
        </div>
      )}
      {status === 'success' && (
        <div className="auth-alert auth-alert-success" role="status" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#86efac', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <CheckCircle2 size={16} />
          <span>Account created. Taking you to sign in…</span>
        </div>
      )}

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="login-field-group">
          <div className={`login-input-wrap ${fieldErrors.name ? 'has-error' : ''}`}>
            <User size={18} className="login-input-icon" aria-hidden="true" />
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              placeholder="Full Name"
              value={name}
              disabled={busy}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'signup-name-error' : undefined}
              onChange={(event) => { setName(event.target.value); clearFieldError('name'); }}
            />
          </div>
        </div>

        <div className="login-field-group">
          <div className={`login-input-wrap ${fieldErrors.email ? 'has-error' : ''}`}>
            <Mail size={18} className="login-input-icon" aria-hidden="true" />
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="Email Address"
              value={email}
              disabled={busy}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
              onChange={(event) => { setEmail(event.target.value); clearFieldError('email'); }}
            />
          </div>
        </div>

        <div className="login-field-group">
          <div className={`login-input-wrap ${fieldErrors.password ? 'has-error' : ''}`}>
            <Lock size={18} className="login-input-icon" aria-hidden="true" />
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Create Password"
              value={password}
              disabled={busy}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'signup-password-error' : undefined}
              onChange={(event) => { setPassword(event.target.value); clearFieldError('password'); }}
            />
            <button
              type="button"
              className="login-eye-button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="login-field-group">
          <div className={`login-input-wrap ${fieldErrors.confirm ? 'has-error' : ''}`}>
            <Lock size={18} className="login-input-icon" aria-hidden="true" />
            <input
              id="signup-confirm"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Confirm Password"
              value={confirm}
              disabled={busy}
              aria-invalid={Boolean(fieldErrors.confirm)}
              aria-describedby={fieldErrors.confirm ? 'signup-confirm-error' : undefined}
              onChange={(event) => { setConfirm(event.target.value); clearFieldError('confirm'); }}
            />
            <button
              type="button"
              className="login-eye-button"
              onClick={() => setShowConfirm((value) => !value)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
              aria-pressed={showConfirm}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="login-options-row" style={{ marginTop: '4px' }}>
          <label className="login-check">
            <input
              type="checkbox"
              checked={agreed}
              disabled={busy}
              aria-invalid={Boolean(fieldErrors.terms)}
              aria-describedby={fieldErrors.terms ? 'signup-terms-error' : undefined}
              onChange={(event) => { setAgreed(event.target.checked); clearFieldError('terms'); }}
            />
            <span className="login-check-box" aria-hidden="true">
              <CheckCircle2 size={12} className="login-check-mark" />
            </span>
            <span style={{ fontSize: '13px' }}>
              I agree to the <a className="login-forgot-link" href="#/terms">Terms</a> &{' '}
              <a className="login-forgot-link" href="#/privacy">Privacy</a>
            </span>
          </label>
        </div>

        <button type="submit" className={`login-submit-btn ${status === 'success' ? 'is-success' : ''} ${status === 'loading' ? 'is-loading' : ''}`} disabled={busy || status === 'success'} style={{ marginTop: '8px' }}>
          {status === 'loading' && <Loader2 size={18} className="auth-spinner" aria-hidden="true" />}
          {status === 'success' ? (
            'Welcome aboard!'
          ) : (
            <>
              <span>Sign Up</span>
              <ArrowRight size={18} className="login-submit-arrow" aria-hidden="true" />
              <div className="login-submit-sweep" aria-hidden="true"></div>
            </>
          )}
        </button>
      </form>

      <SocialAuth />

      <p className="login-footer-text">
        Already have an account? <a href="#/login">Sign In</a>
      </p>
    </div>
  );
}

export default SignupPage;
