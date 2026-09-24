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
  Shield,
  Compass,
  Users,
} from 'lucide-react';
import {
  EMAIL_PATTERN,
  forgetEmail,
  recallEmail,
  rememberEmail,
} from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import SocialAuth from './SocialAuth';

type Status = 'idle' | 'loading' | 'error' | 'success';

function LoginPage() {
  const { signIn } = useAuth();
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
    if (!email.trim()) errors.email = 'Please enter your email.';
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Please enter a valid email address.';
    if (!password) errors.password = 'Please enter your password.';
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
      if (result.fieldErrors) {
        setFieldErrors((prev) => ({ ...prev, ...result.fieldErrors }));
      }
      return;
    }

    if (remember) rememberEmail(email.trim());
    else forgetEmail();
    setStatus('success');
    window.setTimeout(() => {
      window.location.hash = '/';
    }, 700);
  };

  // Quick Demo Autofill helper
  const handleQuickDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setFormError(null);
    setFieldErrors({});
  };

  const busy = status === 'loading';

  return (
    <div className="auth-card-body">
      <div className="auth-header-block">
        <h1 className="auth-main-title">Welcome back</h1>
        <p className="auth-main-subtitle">
          Sign in to access your curated trips, collaborative workspaces, and saved bookings.
        </p>
      </div>

      {/* Demo Credentials Quick Switcher */}
      <div className="auth-demo-chips-box">
        <span className="auth-demo-chips-label">Instant Demo Login:</span>
        <div className="auth-demo-chips-row">
          <button
            type="button"
            className="auth-demo-chip"
            onClick={() => handleQuickDemo('traveler@voyana.com', 'VoyanaTravel123!')}
            title="Alex Morgan (Traveler role)"
          >
            <Compass size={13} className="text-emerald-700" />
            <span>Traveler</span>
          </button>
          <button
            type="button"
            className="auth-demo-chip"
            onClick={() => handleQuickDemo('organizer@voyana.com', 'VoyanaOrg123!')}
            title="Elena Rostova (Organizer role)"
          >
            <Users size={13} className="text-indigo-600" />
            <span>Organizer</span>
          </button>
          <button
            type="button"
            className="auth-demo-chip"
            onClick={() => handleQuickDemo('admin@voyana.com', 'VoyanaAdmin123!')}
            title="Voyana Admin (Admin role)"
          >
            <Shield size={13} className="text-amber-600" />
            <span>Admin</span>
          </button>
        </div>
      </div>

      {formError && (
        <div className="auth-alert-box error animate-fade-in" role="alert">
          <AlertCircle size={16} />
          <span>{formError}</span>
        </div>
      )}

      {status === 'success' && (
        <div className="auth-alert-box success animate-fade-in" role="alert">
          <CheckCircle2 size={16} />
          <span>Signed in successfully! Redirecting to Voyana…</span>
        </div>
      )}

      <form className="auth-actual-form" onSubmit={handleSubmit} noValidate>
        {/* Email Field */}
        <div className="auth-input-group">
          <label className="auth-input-label" htmlFor="login-email">Email Address</label>
          <div className={`auth-input-wrapper ${fieldErrors.email ? 'error' : ''}`}>
            <Mail size={17} className="auth-input-icon" />
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="you@domain.com"
              autoComplete="email"
              disabled={busy}
              className="auth-text-field"
            />
          </div>
          {fieldErrors.email && <span className="auth-field-error-msg">{fieldErrors.email}</span>}
        </div>

        {/* Password Field */}
        <div className="auth-input-group">
          <div className="auth-label-row">
            <label className="auth-input-label" htmlFor="login-password">Password</label>
            <a href="#/forgot-password" className="auth-forgot-link">Forgot password?</a>
          </div>
          <div className={`auth-input-wrapper ${fieldErrors.password ? 'error' : ''}`}>
            <Lock size={17} className="auth-input-icon" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={busy}
              className="auth-text-field"
            />
            <button
              type="button"
              className="auth-password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.password && <span className="auth-field-error-msg">{fieldErrors.password}</span>}
        </div>

        {/* Remember me option */}
        <div className="auth-remember-row">
          <label className="auth-checkbox-label">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={busy}
            />
            <span>Remember my email on this device</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={busy || status === 'success'}
          className="btn-auth-submit"
        >
          {busy ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Social Auth Divider */}
      <div className="auth-divider-line">
        <span>or continue with</span>
      </div>

      <SocialAuth disabled={busy} onAuthSuccess={() => { window.location.hash = '/'; }} />

      <div className="auth-switch-footer">
        <span>Don't have a Voyana account?</span>{' '}
        <a href="#/signup" className="auth-switch-link">Create an account</a>
      </div>
    </div>
  );
}

export default LoginPage;
