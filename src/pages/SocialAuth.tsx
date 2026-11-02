import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/services/apiClient";
import { loadGoogleIdentity } from "@/services/googleIdentity";

export interface SocialAuthProps {
  disabled?: boolean;
  onAuthSuccess?: () => void;
}
interface GoogleConfig {
  enabled: boolean;
  clientId?: string;
  nonce?: string;
  challenge?: string;
}

export function SocialAuth({
  disabled = false,
  onAuthSuccess,
}: SocialAuthProps) {
  const { signInWithGoogle } = useAuth();
  const host = useRef<HTMLDivElement>(null);
  const handlers = useRef({ signInWithGoogle, onAuthSuccess });
  handlers.current = { signInWithGoogle, onAuthSuccess };
  const [notice, setNotice] = useState("Loading Google sign-in…");
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    const node = host.current;
    if (node) node.replaceChildren();
    setCanRetry(false);
    setNotice("Loading Google sign-in…");
    void (async () => {
      try {
        const response = await apiRequest<GoogleConfig>(
          "/api/auth/google/config",
        );
        if (cancelled) return;
        if (!response.ok)
          throw new Error(
            response.error || "Google sign-in could not connect.",
          );
        const config = response.data;
        if (
          !config?.enabled ||
          !config.clientId ||
          !config.nonce ||
          !config.challenge
        ) {
          setNotice(
            "Google sign-in is awaiting app setup. Email sign-in is available below.",
          );
          return;
        }
        const google = await loadGoogleIdentity();
        if (cancelled || !node) return;
        google.initialize({
          client_id: config.clientId,
          nonce: config.nonce,
          auto_select: false,
          callback: async ({ credential }) => {
            if (cancelled) return;
            setBusy(true);
            setNotice("Verifying your Google account…");
            const result = await handlers.current.signInWithGoogle(
              credential,
              config.challenge!,
            );
            if (cancelled) return;
            setBusy(false);
            if (result.ok) {
              handlers.current.onAuthSuccess?.();
              window.location.hash = "/";
            } else {
              setNotice(result.message);
              setCanRetry(true);
            }
          },
        });
        let lastWidth = 0;
        const renderButton = () => {
          const width = Math.max(
            200,
            Math.min(400, Math.floor(node.clientWidth || 400)),
          );
          if (width === lastWidth) return;
          lastWidth = width;
          node.replaceChildren();
          google.renderButton(node, {
            theme: "outline",
            size: "large",
            text: "continue_with",
            width,
            shape: "pill",
            logo_alignment: "left",
          });
        };
        renderButton();
        observer = new ResizeObserver(renderButton);
        observer.observe(node);
        setNotice("");
      } catch (error) {
        if (!cancelled) {
          setNotice(
            error instanceof Error ? error.message : "Google sign-in failed.",
          );
          setCanRetry(true);
        }
      }
    })();
    return () => {
      cancelled = true;
      observer?.disconnect();
      if (node) node.replaceChildren();
    };
  }, [retry]);
  return (
    <section className="auth-google-panel" aria-label="Sign in with Google">
      <div className="auth-google-panel-top">
        <span className="auth-google-eyebrow">
          <Sparkles size={13} /> ONE ACCOUNT. EVERY JOURNEY.
        </span>
        <span className="auth-google-quick">Quick access</span>
      </div>
      <h2>Your next journey starts here.</h2>
      <p className="auth-google-description">
        Bring your Google account. We’ll take care of the rest.
      </p>
      <div className="auth-google-button-shell">
        <div
          ref={host}
          aria-label="Google sign-in"
          aria-busy={busy}
          style={{
            minHeight: 44,
            pointerEvents: disabled || busy ? "none" : "auto",
            opacity: disabled || busy ? 0.6 : 1,
          }}
        />
      </div>
      {notice && (
        <p role="status" className="auth-google-status">
          {notice}
        </p>
      )}
      {canRetry && (
        <button
          type="button"
          className="auth-social-btn"
          disabled={busy || disabled}
          onClick={() => setRetry((value) => value + 1)}
        >
          Retry Google sign-in
        </button>
      )}
      <p className="auth-google-privacy">
        <ShieldCheck size={14} /> Your password stays with Google.
      </p>
    </section>
  );
}
export default SocialAuth;
