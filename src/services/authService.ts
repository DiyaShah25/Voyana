import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 6;

const REMEMBER_KEY = 'voyana.rememberedEmail';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export interface AuthResult {
  ok: boolean;
  message: string;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (supabase) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, message: 'Invalid email or password.' };
    return { ok: true, message: 'Welcome back!' };
  }
  // Preview mode: no Supabase credentials are configured, so authentication is
  // simulated with realistic latency and validation.
  await wait(1100);
  if (!EMAIL_PATTERN.test(email) || password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, message: 'Invalid email or password.' };
  }
  return { ok: true, message: 'Welcome back!' };
}

export async function signUp(name: string, email: string, password: string): Promise<AuthResult> {
  if (supabase) {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    if (error) return { ok: false, message: 'We could not create your account. Please try again.' };
    return { ok: true, message: 'Account created. Welcome aboard!' };
  }
  await wait(1200);
  if (!EMAIL_PATTERN.test(email) || password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, message: 'We could not create your account. Please try again.' };
  }
  return { ok: true, message: 'Account created. Welcome aboard!' };
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { ok: false, message: 'We could not send the reset link. Please try again.' };
    return { ok: true, message: 'Reset link sent. Check your inbox.' };
  }
  await wait(900);
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }
  return { ok: true, message: 'Reset link sent. Check your inbox.' };
}

export type OAuthProvider = 'google' | 'apple' | 'facebook';

export async function signInWithProvider(provider: OAuthProvider): Promise<AuthResult | null> {
  if (supabase) {
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) return { ok: false, message: 'Social sign-in failed. Please try again.' };
    return null; // The browser redirects to the provider.
  }
  return { ok: false, message: 'Social sign-in is not configured in this preview.' };
}

export function rememberEmail(email: string): void {
  try {
    localStorage.setItem(REMEMBER_KEY, email);
  } catch {
    /* storage unavailable */
  }
}

export function recallEmail(): string | null {
  try {
    return localStorage.getItem(REMEMBER_KEY);
  } catch {
    return null;
  }
}

export function forgetEmail(): void {
  try {
    localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* storage unavailable */
  }
}
