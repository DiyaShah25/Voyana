import { useState, type ElementType } from 'react';
import { Info } from 'lucide-react';
import { signInWithProvider, type OAuthProvider } from '@/services/authService';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.28a12 12 0 0 0 0 10.78l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.79l3.44-3.44A11.98 11.98 0 0 0 1.28 6.61l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.54c-.03-3.05 2.49-4.51 2.6-4.58-1.42-2.07-3.62-2.36-4.4-2.39-1.87-.19-3.65 1.1-4.6 1.1-.95 0-2.42-1.07-3.98-1.04-2.04.03-3.93 1.19-4.98 3.01-2.13 3.69-.55 9.15 1.53 12.14 1.01 1.47 2.22 3.11 3.8 3.05 1.53-.06 2.1-.98 3.95-.98 1.85 0 2.36.98 3.97.95 1.65-.03 2.69-1.49 3.69-2.96 1.16-1.7 1.64-3.34 1.66-3.43-.04-.02-3.19-1.22-3.24-4.87ZM14.02 3.6c.84-1.02 1.41-2.43 1.25-3.85-1.21.05-2.68.81-3.55 1.83-.78.9-1.46 2.35-1.28 3.73 1.35.11 2.74-.69 3.58-1.71Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.95h-1.52c-1.49 0-1.95.93-1.95 1.88V12h3.33l-.53 3.47h-2.8v8.38A12 12 0 0 0 24 12Z" />
      <path fill="#fff" d="M16.67 15.47 17.2 12h-3.33V9.75c0-.95.46-1.88 1.95-1.88h1.52V4.92s-1.38-.23-2.69-.23c-2.74 0-4.53 1.66-4.53 4.67V12H7.08v3.47h3.04v8.38a12.1 12.1 0 0 0 3.76 0v-8.38h2.79Z" />
    </svg>
  );
}

const providers = [
  { id: 'google' as OAuthProvider, label: 'Continue with Google', icon: GoogleIcon },
];

function SocialAuth() {
  const [notice, setNotice] = useState<string | null>(null);

  const handleProvider = async (provider: OAuthProvider) => {
    const result = await signInWithProvider(provider);
    if (result && !result.ok) setNotice(result.message);
  };

  return (
    <div className="login-social-section">
      <div className="login-divider" role="separator">
        <span>OR</span>
      </div>
      <div className="login-social-row">
        {providers.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className="login-social-button" aria-label={label} onClick={() => handleProvider(id)}>
            <Icon />
          </button>
        ))}
      </div>
      {notice && (
        <p className="login-social-notice" role="status">
          <Info size={14} /> {notice}
        </p>
      )}
    </div>
  );
}

export default SocialAuth;
