import { useState } from 'react';
import { Info } from 'lucide-react';
import { signInWithProvider, type OAuthProvider } from '@/services/authService';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.28a12 12 0 0 0 0 10.78l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.79l3.44-3.44A11.98 11.98 0 0 0 1.28 6.61l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.54c-.03-3.05 2.49-4.51 2.6-4.58-1.42-2.07-3.62-2.36-4.4-2.39-1.87-.19-3.65 1.1-4.6 1.1-.95 0-2.42-1.07-3.98-1.04-2.04.03-3.93 1.19-4.98 3.01-2.13 3.69-.55 9.15 1.53 12.14 1.01 1.47 2.22 3.11 3.8 3.05 1.53-.06 2.1-.98 3.95-.98 1.85 0 2.36.98 3.97.95 1.65-.03 2.69-1.49 3.69-2.96 1.16-1.7 1.64-3.34 1.66-3.43-.04-.02-3.19-1.22-3.24-4.87ZM14.02 3.6c.84-1.02 1.41-2.43 1.25-3.85-1.21.05-2.68.81-3.55 1.83-.78.9-1.46 2.35-1.28 3.73 1.35.11 2.74-.69 3.58-1.71Z" />
    </svg>
  );
}

export interface SocialAuthProps {
  disabled?: boolean;
  onAuthSuccess?: () => void;
}

export function SocialAuth({ disabled = false, onAuthSuccess }: SocialAuthProps) {
  const [notice, setNotice] = useState<string | null>(null);

  const handleProvider = async (provider: OAuthProvider) => {
    try {
      const result = await signInWithProvider(provider);
      if (result && !result.ok) {
        setNotice(result.message);
      } else {
        onAuthSuccess?.();
      }
    } catch {
      setNotice('Unable to connect with authentication provider.');
    }
  };

  return (
    <div className="auth-social-wrapper">
      <div className="auth-social-buttons">
        <button
          type="button"
          disabled={disabled}
          className="auth-social-btn"
          onClick={() => handleProvider('google')}
        >
          <GoogleIcon />
          <span>Continue with Google</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          className="auth-social-btn"
          onClick={() => handleProvider('apple')}
        >
          <AppleIcon />
          <span>Continue with Apple</span>
        </button>
      </div>

      {notice && (
        <div className="auth-social-notice animate-fade-in" role="status">
          <Info size={14} />
          <span>{notice}</span>
        </div>
      )}
    </div>
  );
}

export default SocialAuth;
