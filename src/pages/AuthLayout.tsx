import { type ReactNode } from 'react';
import { Compass, ArrowLeft, Star, ShieldCheck } from 'lucide-react';
import './auth.css';

interface AuthLayoutProps {
  route: string;
  children: ReactNode;
}

export function AuthLayout({ route, children }: AuthLayoutProps) {
  return (
    <div className="voyana-auth-screen">
      {/* Left Visual Column: Editorial Travel Storytelling */}
      <div className="auth-editorial-column">
        <div className="auth-editorial-bg" />
        <div className="auth-editorial-scrim" />

        <div className="auth-editorial-content">
          <a href="#/" className="auth-back-link">
            <ArrowLeft size={16} />
            <span>Back to Voyana</span>
          </a>

          <div className="auth-editorial-quote-box">
            <div className="auth-editorial-logo">
              <div className="auth-logo-badge">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.6" opacity="0.9" />
                  <ellipse cx="12" cy="12" rx="4.8" ry="9.5" stroke="currentColor" strokeWidth="1.4" opacity="0.8" />
                  <line x1="2.5" y1="12" x2="21.5" y2="12" stroke="currentColor" strokeWidth="1.4" opacity="0.8" />
                  <circle cx="12" cy="12" r="1.8" fill="#10b981" />
                </svg>
              </div>
              <div className="auth-brand-text-col">
                <span className="auth-logo-text">VOYANA</span>
                <span className="auth-submark-text">GLOBAL EXPEDITIONS</span>
              </div>
            </div>

            <h2 className="auth-quote-heading">
              "The world is a book and those who do not travel read only one page."
            </h2>
            <p className="auth-quote-author">— Saint Augustine</p>

            <div className="auth-proof-badge">
              <div className="proof-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <span className="proof-text">Trusted by 100,000+ global travelers</span>
            </div>
          </div>

          <div className="auth-editorial-footer">
            <div className="trust-indicator">
              <ShieldCheck size={15} className="text-emerald-400" />
              <span>Verified Global Identity & Safe Bookings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Column: Clean, Refined Authentication */}
      <div className="auth-form-column">
        <div className="auth-form-shell">
          <div className="auth-mobile-header">
            <a href="#/" className="auth-mobile-brand">
              <div className="auth-mobile-logo-badge">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.6" opacity="0.9" />
                  <ellipse cx="12" cy="12" rx="4.8" ry="9.5" stroke="currentColor" strokeWidth="1.4" opacity="0.8" />
                  <line x1="2.5" y1="12" x2="21.5" y2="12" stroke="currentColor" strokeWidth="1.4" opacity="0.8" />
                  <circle cx="12" cy="12" r="1.8" fill="#10b981" />
                </svg>
              </div>
              <span>VOYANA</span>
            </a>
          </div>

          <div className="auth-route-switch">
            <a
              href="#/login"
              className={`route-switch-tab ${route === 'login' ? 'active' : ''}`}
            >
              Sign In
            </a>
            <a
              href="#/signup"
              className={`route-switch-tab ${route === 'signup' ? 'active' : ''}`}
            >
              Create Account
            </a>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
