export interface GoogleIdentity {
  initialize(options: { client_id: string; nonce: string; auto_select: boolean; callback: (result: { credential: string }) => void }): void;
  renderButton(element: HTMLElement, options: { theme: string; size: string; text: string; width: number; shape?: string; logo_alignment?: string }): void;
  disableAutoSelect(): void;
}
type GoogleWindow = Window & { google?: { accounts: { id: GoogleIdentity } } };
let loading: Promise<GoogleIdentity> | undefined;

export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  const current = (window as GoogleWindow).google?.accounts.id;
  if (current) return Promise.resolve(current);
  if (!loading) loading = new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script');
    const timer = window.setTimeout(() => { script.remove(); reject(new Error('Google sign-in took too long to load. Please retry.')); }, 15000);
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => { window.clearTimeout(timer); const api = (window as GoogleWindow).google?.accounts.id; if (api) resolve(api); else reject(new Error('Google sign-in could not load.')); };
    script.onerror = () => { window.clearTimeout(timer); script.remove(); reject(new Error('Could not connect to Google. Check your connection and retry.')); };
    document.head.appendChild(script);
  }).catch(error => { loading = undefined; throw error; });
  return loading;
}
