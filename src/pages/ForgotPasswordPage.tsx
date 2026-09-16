import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
} from 'lucide-react';
import { EMAIL_PATTERN, requestPasswordReset } from '@/services/authService';

type Status = 'idle' | 'loading' | 'error' | 'success';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === 'loading') return;
    setFormError(null);

    if (!email.trim()) {
      setFieldError('Email is required.');
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setFieldError('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    const result = await requestPasswordReset(email.trim());
    if (!result.ok) {
      setStatus('error');
      setFormError(result.message);
      return;
    }
    setStatus('success');
  };

  const busy = status === 'loading';

  return (
    <div className="auth-stagger">
      <div className="auth-icon-badge" aria-hidden="true">
        <KeyRound size={22} strokeWidth={2} />
      </div>
      <h1 className="auth-heading">Reset your password</h1>
      <p className="auth-subheading">
        Enter the email linked to your account and we will send you a reset link.
      </p>

      {formError && (
        <div className="auth-alert auth-alert-error" role="alert">
          <AlertCircle size={16} />
          <span>{formError}</span>
        </div>
      )}

      {status === 'success' ? (
        <div className="auth-alert auth-alert-success" role="status">
          <CheckCircle2 size={16} />
          <span>Reset link sent. Check your inbox and follow the instructions.</span>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="forgot-email">Email</label>
            <div className={`auth-input-wrap ${fieldError ? 'has-error' : ''}`}>
              <Mail size={17} aria-hidden="true" />
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                disabled={busy}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? 'forgot-email-error' : undefined}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldError(null);
                }}
              />
            </div>
            {fieldError && <p className="auth-field-error" id="forgot-email-error">{fieldError}</p>}
          </div>

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={18} className="auth-spinner" aria-hidden="true" /> Sending link…
              </>
            ) : (
              <>
                Send Reset Link <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      )}

      <p className="auth-switch">
        <a href="#/login" className="auth-back-link">
          <ArrowLeft size={15} aria-hidden="true" /> Back to Sign In
        </a>
      </p>
    </div>
  );
}

export default ForgotPasswordPage;
