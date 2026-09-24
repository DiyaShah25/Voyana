import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import {
  EMAIL_PATTERN,
  MIN_PASSWORD_LENGTH,
  requestPasswordReset,
  confirmPasswordReset,
} from '@/services/authService';

type Step = 'request' | 'reset' | 'completed';

function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email.trim() || !EMAIL_PATTERN.test(email.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const result = await requestPasswordReset(email.trim());
    setLoading(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    setSuccessMsg(result.message);
    setStep('reset');
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await confirmPasswordReset(email.trim(), newPassword);
    setLoading(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    setStep('completed');
  };

  return (
    <div className="auth-card-body">
      <div className="auth-header-block">
        <div className="auth-icon-circle-badge">
          <KeyRound size={22} className="text-emerald-700" />
        </div>
        <h1 className="auth-main-title">
          {step === 'completed' ? 'Password updated' : step === 'reset' ? 'Create new password' : 'Reset your password'}
        </h1>
        <p className="auth-main-subtitle">
          {step === 'completed'
            ? 'Your credentials have been securely updated. You can now access your Voyana account.'
            : step === 'reset'
            ? `Enter your new secure password for ${email}.`
            : 'Enter the email associated with your account to receive password recovery instructions.'}
        </p>
      </div>

      {formError && (
        <div className="auth-alert-box error animate-fade-in" role="alert">
          <AlertCircle size={16} />
          <span>{formError}</span>
        </div>
      )}

      {step === 'completed' ? (
        <div className="auth-success-flow animate-fade-in">
          <div className="auth-alert-box success">
            <CheckCircle2 size={18} />
            <span>Password successfully changed. You can now sign in with your new password.</span>
          </div>

          <a href="#/login" className="btn-auth-submit mt-4 text-center">
            <span>Sign In to Voyana</span>
            <ArrowRight size={15} />
          </a>
        </div>
      ) : step === 'reset' ? (
        <form className="auth-actual-form" onSubmit={handleReset}>
          {successMsg && (
            <div className="auth-alert-box success animate-fade-in">
              <ShieldCheck size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="auth-input-group">
            <label className="auth-input-label" htmlFor="new-pass">New Password</label>
            <div className="auth-input-wrapper">
              <Lock size={17} className="auth-input-icon" />
              <input
                id="new-pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                disabled={loading}
                className="auth-text-field"
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label className="auth-input-label" htmlFor="confirm-new-pass">Confirm New Password</label>
            <div className="auth-input-wrapper">
              <Lock size={17} className="auth-input-icon" />
              <input
                id="confirm-new-pass"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                disabled={loading}
                className="auth-text-field"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-auth-submit">
            {loading ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                <span>Updating password…</span>
              </>
            ) : (
              <>
                <span>Set New Password</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      ) : (
        <form className="auth-actual-form" onSubmit={handleRequest} noValidate>
          <div className="auth-input-group">
            <label className="auth-input-label" htmlFor="reset-email">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail size={17} className="auth-input-icon" />
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                disabled={loading}
                className="auth-text-field"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-auth-submit">
            {loading ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                <span>Sending instructions…</span>
              </>
            ) : (
              <>
                <span>Send Reset Link</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <div className="auth-back-button-wrap">
            <a href="#/login" className="auth-text-back-link">
              <ArrowLeft size={14} />
              <span>Back to Sign In</span>
            </a>
          </div>
        </form>
      )}
    </div>
  );
}

export default ForgotPasswordPage;
