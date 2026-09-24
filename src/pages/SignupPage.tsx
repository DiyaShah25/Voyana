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
  Compass,
  Users,
} from 'lucide-react';
import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types/auth.types';
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
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<UserRole>('traveler');
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
    if (!name.trim() || name.trim().length < 2) errors.name = 'Full name is required (minimum 2 characters).';
    if (!email.trim()) errors.email = 'Email address is required.';
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Please enter a valid email address.';
    if (!password) errors.password = 'Password is required.';
    else if (password.length < MIN_PASSWORD_LENGTH) errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
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
    const result = await signUp(name.trim(), email.trim(), password, role);
    if (!result.ok) {
      setStatus('error');
      setFormError(result.message);
      if (result.fieldErrors) {
        setFieldErrors((prev) => ({
          ...prev,
          name: result.fieldErrors?.name,
          email: result.fieldErrors?.email,
          password: result.fieldErrors?.password,
        }));
      }
      return;
    }
    setStatus('success');
    window.setTimeout(() => {
      window.location.hash = '/';
    }, 700);
  };

  const busy = status === 'loading';

  return (
    <div className="auth-card-body">
      <div className="auth-header-block">
        <h1 className="auth-main-title">Create your account</h1>
        <p className="auth-main-subtitle">
          Join Voyana to discover destinations, plan multi-stop journeys, and collaborate with travelers worldwide.
        </p>
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
          <span>Account created successfully! Welcome to Voyana…</span>
        </div>
      )}

      <form className="auth-actual-form" onSubmit={handleSubmit} noValidate>
        {/* Full Name */}
        <div className="auth-input-group">
          <label className="auth-input-label" htmlFor="signup-name">Full Name</label>
          <div className={`auth-input-wrapper ${fieldErrors.name ? 'error' : ''}`}>
            <User size={17} className="auth-input-icon" />
            <input
              id="signup-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError('name');
              }}
              placeholder="Alex Morgan"
              autoComplete="name"
              disabled={busy}
              className="auth-text-field"
            />
          </div>
          {fieldErrors.name && <span className="auth-field-error-msg">{fieldErrors.name}</span>}
        </div>

        {/* Email Address */}
        <div className="auth-input-group">
          <label className="auth-input-label" htmlFor="signup-email">Email Address</label>
          <div className={`auth-input-wrapper ${fieldErrors.email ? 'error' : ''}`}>
            <Mail size={17} className="auth-input-icon" />
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError('email');
              }}
              placeholder="you@domain.com"
              autoComplete="email"
              disabled={busy}
              className="auth-text-field"
            />
          </div>
          {fieldErrors.email && <span className="auth-field-error-msg">{fieldErrors.email}</span>}
        </div>

        {/* Role Selection */}
        <div className="auth-input-group">
          <label className="auth-input-label">Traveler Role</label>
          <div className="auth-role-selector">
            <button
              type="button"
              className={`auth-role-option ${role === 'traveler' ? 'active' : ''}`}
              onClick={() => setRole('traveler')}
            >
              <Compass size={15} />
              <div className="role-opt-info">
                <strong>Traveler</strong>
                <span>Personal trips, bookings & budget</span>
              </div>
            </button>
            <button
              type="button"
              className={`auth-role-option ${role === 'organizer' ? 'active' : ''}`}
              onClick={() => setRole('organizer')}
            >
              <Users size={15} />
              <div className="role-opt-info">
                <strong>Trip Organizer</strong>
                <span>Lead shared expeditions & group tools</span>
              </div>
            </button>
          </div>
        </div>

        {/* Password & Confirm Password */}
        <div className="auth-grid-two">
          <div className="auth-input-group">
            <label className="auth-input-label" htmlFor="signup-password">Password</label>
            <div className={`auth-input-wrapper ${fieldErrors.password ? 'error' : ''}`}>
              <Lock size={17} className="auth-input-icon" />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError('password');
                }}
                placeholder="At least 6 chars"
                autoComplete="new-password"
                disabled={busy}
                className="auth-text-field"
              />
              <button
                type="button"
                className="auth-password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="auth-input-group">
            <label className="auth-input-label" htmlFor="signup-confirm">Confirm Password</label>
            <div className={`auth-input-wrapper ${fieldErrors.confirm ? 'error' : ''}`}>
              <Lock size={17} className="auth-input-icon" />
              <input
                id="signup-confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  clearFieldError('confirm');
                }}
                placeholder="Re-enter password"
                autoComplete="new-password"
                disabled={busy}
                className="auth-text-field"
              />
              <button
                type="button"
                className="auth-password-toggle-btn"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        {fieldErrors.password && <span className="auth-field-error-msg">{fieldErrors.password}</span>}
        {fieldErrors.confirm && <span className="auth-field-error-msg">{fieldErrors.confirm}</span>}

        {/* Terms and Privacy Checkbox */}
        <div className="auth-terms-group">
          <label className="auth-checkbox-label">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                clearFieldError('terms');
              }}
              disabled={busy}
            />
            <span>
              I agree to the <a href="#/terms" className="auth-inline-link">Terms of Service</a> and{' '}
              <a href="#/privacy" className="auth-inline-link">Privacy Policy</a>.
            </span>
          </label>
        </div>
        {fieldErrors.terms && <span className="auth-field-error-msg">{fieldErrors.terms}</span>}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={busy || status === 'success'}
          className="btn-auth-submit"
        >
          {busy ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              <span>Creating account…</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Social Auth Divider */}
      <div className="auth-divider-line">
        <span>or sign up with</span>
      </div>

      <SocialAuth disabled={busy} onAuthSuccess={() => { window.location.hash = '/'; }} />

      <div className="auth-switch-footer">
        <span>Already have a Voyana account?</span>{' '}
        <a href="#/login" className="auth-switch-link">Sign In</a>
      </div>
    </div>
  );
}

export default SignupPage;
