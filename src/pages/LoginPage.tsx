import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Plane,
} from 'lucide-react';
import {
  EMAIL_PATTERN,
  forgetEmail,
  recallEmail,
  rememberEmail,
  signIn,
} from '@/services/authService';
import SocialAuth from './SocialAuth';

type Status = 'idle' | 'loading' | 'error' | 'success';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    const saved = recallEmail();
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = 'Email is required.';
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Please enter a valid email address.';
    if (!password) errors.password = 'Password is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === 'loading' || status === 'success') return;
    setFormError(null);
    if (!validate()) return;

    setStatus('loading');
    const result = await signIn(email.trim(), password);
    if (!result.ok) {
      setStatus('error');
      setFormError(result.message);
      return;
    }

    if (remember) rememberEmail(email.trim());
    else forgetEmail();
    setStatus('success');
    window.setTimeout(() => {
      window.location.hash = '/';
    }, 1400);
  };

  const busy = status === 'loading';

  return (
    <div className="login-panel">
      <div className="login-brand">
        <div className="login-logo-container">
          <Plane className="login-logo" size={24} fill="currentColor" />
        </div>
        <h2 className="login-brand-name">VOYANA</h2>
        <span className="login-brand-tag">Let's explore the world</span>
      </div>

      <h1 className="login-heading">Welcome Back <span className="login-sparkle">✨</span></h1>
      <p className="login-subheading">
        Sign in to continue your journey<br />
        and explore amazing places.
      </p>

      {formError && (
        <div className="auth-alert auth-alert-error" role="alert">
          <AlertCircle size={16} />
          <span>{formError}</span>
        </div>
      )}

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="login-field-group">
          <div className={`login-input-wrap ${fieldErrors.email ? 'has-error' : ''}`}>
            <Mail size={18} className="login-input-icon" aria-hidden="true" />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="Email address"
              value={email}
              disabled={busy}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
            />
          </div>
        </div>

        <div className="login-field-group">
          <div className={`login-input-wrap ${fieldErrors.password ? 'has-error' : ''}`}>
            <Lock size={18} className="login-input-icon" aria-hidden="true" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              disabled={busy}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
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

        <div className="login-options-row">
          <label className="login-check">
            <input
              type="checkbox"
              checked={remember}
              disabled={busy}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span className="login-check-box" aria-hidden="true">
              <CheckCircle2 size={12} className="login-check-mark" />
            </span>
            <span>Remember me</span>
          </label>
          <a className="login-forgot-link" href="#/forgot-password">Forgot password?</a>
        </div>

        <button type="submit" className={`login-submit-btn ${status === 'success' ? 'is-success' : ''} ${status === 'loading' ? 'is-loading' : ''}`} disabled={busy || status === 'success'}>
          {status === 'loading' && <Loader2 size={18} className="auth-spinner" aria-hidden="true" />}
          {status === 'success' ? (
            'Welcome back!'
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight size={18} className="login-submit-arrow" aria-hidden="true" />
              <div className="login-submit-sweep" aria-hidden="true"></div>
            </>
          )}
        </button>
      </form>

      <SocialAuth />

      <p className="login-footer-text">
        Don't have an account? <a href="#/signup">Sign up</a>
      </p>
    </div>
  );
}

export default LoginPage;
