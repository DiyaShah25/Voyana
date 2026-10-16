/**
 * Authentication Service
 * Handles sign-in, sign-up, sign-out, session management, password reset,
 * and social OAuth. Supports both Supabase backend and local localStorage
 * fallback with seeded demo users for role testing.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AuthResult,
  AuthSession,
  StoredUserRecord,
  UserProfile,
  UserRole,
} from '@/types/auth.types';

// Validation constants
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 6;

// LocalStorage keys for persistent state
const REMEMBER_KEY = 'voyana.rememberedEmail';
const USERS_STORAGE_KEY = 'voyana.auth_users_registry';
const SESSION_STORAGE_KEY = 'voyana.active_session';
const TOKEN_STORAGE_KEY = 'voyana.auth_token';

// --- Supabase Client Initialization ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch {
    supabase = null;
  }
}

// --- Seeded Demo Users (Admin, Organizer, Traveler) ---
const SEEDED_USERS: StoredUserRecord[] = [
  {
    id: 'usr-admin-01',
    name: 'Voyana Platform Admin',
    email: 'admin@voyana.com',
    role: 'admin',
    passwordHash: 'VoyanaAdmin123!',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    bio: 'Lead system administrator for Voyana global travel services.',
    phone: '+1 (555) 019-2834',
    preferences: {
      preferredCurrency: 'USD',
      travelStyle: 'Luxury & Wellness',
      homeAirport: 'JFK',
      emailNotifications: true,
      smsAlerts: true,
    },
    createdAt: '2026-01-10T08:00:00.000Z',
  },
  {
    id: 'usr-org-02',
    name: 'Elena Rostova',
    email: 'organizer@voyana.com',
    role: 'organizer',
    passwordHash: 'VoyanaOrg123!',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
    bio: 'Expedition organizer & multi-destination itinerary planner.',
    phone: '+1 (555) 438-9102',
    preferences: {
      preferredCurrency: 'EUR',
      travelStyle: 'Cultural & Historic',
      homeAirport: 'CDG',
      emailNotifications: true,
      smsAlerts: false,
    },
    createdAt: '2026-02-14T11:30:00.000Z',
  },
  {
    id: 'usr-traveler-03',
    name: 'Alex Morgan',
    email: 'traveler@voyana.com',
    role: 'traveler',
    passwordHash: 'VoyanaTravel123!',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    bio: 'Independent backpacker, photographer, and alpine enthusiast.',
    phone: '+1 (555) 782-3391',
    preferences: {
      preferredCurrency: 'USD',
      travelStyle: 'Adventure & Nature',
      homeAirport: 'SFO',
      emailNotifications: true,
      smsAlerts: true,
    },
    createdAt: '2026-03-01T15:00:00.000Z',
  },
];

// --- Internal Helpers ---

// Simulate network latency
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Load user registry from localStorage, seeding defaults if empty
function loadUserRegistry(): StoredUserRecord[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(SEEDED_USERS));
      return SEEDED_USERS;
    }
    const parsed = JSON.parse(raw) as StoredUserRecord[];
    const emails = new Set(parsed.map((u) => u.email.toLowerCase()));
    let updated = false;
    for (const seed of SEEDED_USERS) {
      if (!emails.has(seed.email.toLowerCase())) {
        parsed.push(seed);
        updated = true;
      }
    }
    if (updated) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return SEEDED_USERS;
  }
}

// Persist user registry to localStorage
function saveUserRegistry(users: StoredUserRecord[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save user registry:', err);
  }
}

// Strip password from a stored record to produce a safe profile
function sanitizeUser(record: StoredUserRecord): UserProfile {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...profile } = record;
  return profile;
}

// Generate a mock JWT-style token for local auth
function generateMockToken(userId: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: userId,
      iss: 'voyana.travel',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 7,
    })
  );
  const signature = btoa(`sig_${userId}_${Date.now()}`);
  return `${header}.${payload}.${signature}`;
}

// --- Sign In ---
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const trimmedEmail = email.trim().toLowerCase();

  // Input validation
  if (!trimmedEmail) {
    return { ok: false, message: 'Please enter your email address.', fieldErrors: { email: 'Email is required' } };
  }
  if (!EMAIL_PATTERN.test(trimmedEmail)) {
    return { ok: false, message: 'Please enter a valid email address.', fieldErrors: { email: 'Invalid email format' } };
  }
  if (!password) {
    return { ok: false, message: 'Please enter your password.', fieldErrors: { password: 'Password is required' } };
  }

  // Attempt Supabase authentication first
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      if (error || !data.user) {
        return { ok: false, message: error?.message || 'Invalid email or password.' };
      }
      const userProfile: UserProfile = {
        id: data.user.id,
        name: data.user.user_metadata?.full_name || trimmedEmail.split('@')[0],
        email: data.user.email || trimmedEmail,
        role: (data.user.user_metadata?.role as UserRole) || 'traveler',
        avatarUrl: data.user.user_metadata?.avatar_url,
        preferences: {
          preferredCurrency: 'USD',
          travelStyle: 'Cultural & Historic',
          emailNotifications: true,
          smsAlerts: false,
        },
        createdAt: data.user.created_at,
      };
      const session: AuthSession = {
        token: data.session?.access_token || generateMockToken(userProfile.id),
        user: userProfile,
        expiresAt: Date.now() + 7 * 86400 * 1000,
      };
      saveSession(session);
      return { ok: true, message: 'Welcome back!', session };
    } catch {
      // Fall through to local auth engine
    }
  }

  // Fallback: Local auth engine with localStorage
  await wait(300);
  const users = loadUserRegistry();
  const record = users.find((u) => u.email.toLowerCase() === trimmedEmail);

  if (!record) {
    return {
      ok: false,
      message: 'No account found with this email. Please check your credentials or create an account.',
      fieldErrors: { email: 'No account registered with this email' },
    };
  }

  if (record.passwordHash !== password) {
    return {
      ok: false,
      message: 'Incorrect password. Please try again.',
      fieldErrors: { password: 'Incorrect password' },
    };
  }

  const profile = sanitizeUser(record);
  const session: AuthSession = {
    token: generateMockToken(profile.id),
    user: profile,
    expiresAt: Date.now() + 7 * 86400 * 1000,
  };

  saveSession(session);
  return { ok: true, message: `Welcome back, ${profile.name.split(' ')[0]}!`, session };
}

// --- Sign Up ---
export async function signUp(
  name: string,
  email: string,
  password: string,
  role: UserRole = 'traveler'
): Promise<AuthResult> {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();

  // Input validation
  if (!trimmedName || trimmedName.length < 2) {
    return { ok: false, message: 'Please enter your full name.', fieldErrors: { name: 'Full name is required (min 2 chars)' } };
  }
  if (!trimmedEmail) {
    return { ok: false, message: 'Please enter your email address.', fieldErrors: { email: 'Email is required' } };
  }
  if (!EMAIL_PATTERN.test(trimmedEmail)) {
    return { ok: false, message: 'Please enter a valid email address.', fieldErrors: { email: 'Invalid email address format' } };
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      fieldErrors: { password: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
    };
  }

  // Attempt Supabase registration first
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { data: { full_name: trimmedName, role } },
      });
      if (error) {
        return { ok: false, message: error.message };
      }
      if (data.user) {
        const profile: UserProfile = {
          id: data.user.id,
          name: trimmedName,
          email: trimmedEmail,
          role,
          preferences: {
            preferredCurrency: 'USD',
            travelStyle: 'Cultural & Historic',
            emailNotifications: true,
            smsAlerts: false,
          },
          createdAt: new Date().toISOString(),
        };
        const session: AuthSession = {
          token: data.session?.access_token || generateMockToken(profile.id),
          user: profile,
          expiresAt: Date.now() + 7 * 86400 * 1000,
        };
        saveSession(session);
        return { ok: true, message: 'Account created! Welcome to Voyana.', session };
      }
    } catch {
      // Fall through to local store
    }
  }

  // Fallback: Local registry
  await wait(350);
  const users = loadUserRegistry();
  const existing = users.find((u) => u.email.toLowerCase() === trimmedEmail);

  if (existing) {
    return {
      ok: false,
      message: 'This email is already registered. Please sign in instead.',
      fieldErrors: { email: 'An account with this email already exists' },
    };
  }

  const newRecord: StoredUserRecord = {
    id: `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    name: trimmedName,
    email: trimmedEmail,
    role,
    passwordHash: password,
    avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`,
    bio: 'Explorer curating intentional global journeys with Voyana.',
    preferences: {
      preferredCurrency: 'USD',
      travelStyle: 'Cultural & Historic',
      emailNotifications: true,
      smsAlerts: false,
    },
    createdAt: new Date().toISOString(),
  };

  users.push(newRecord);
  saveUserRegistry(users);

  const profile = sanitizeUser(newRecord);
  const session: AuthSession = {
    token: generateMockToken(profile.id),
    user: profile,
    expiresAt: Date.now() + 7 * 86400 * 1000,
  };

  saveSession(session);
  return { ok: true, message: 'Account created! Welcome aboard.', session };
}

// --- Sign Out ---
export function signOut(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    if (supabase) {
      void supabase.auth.signOut();
    }
  } catch {
    /* storage unavailable */
  }
}

// --- Session Management ---

// Restore a previously saved session if it hasn't expired
export function restoreSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (Date.now() > session.expiresAt) {
      signOut();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

// Persist session data to localStorage
export function saveSession(session: AuthSession): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
  } catch {
    /* storage unavailable */
  }
}

// --- Profile Management ---

// Update a user's profile fields and sync active session
export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
  const users = loadUserRegistry();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return null;

  users[idx] = {
    ...users[idx],
    ...updates,
    preferences: {
      ...users[idx].preferences,
      ...(updates.preferences || {}),
    },
    updatedAt: new Date().toISOString(),
  };

  saveUserRegistry(users);

  const updatedProfile = sanitizeUser(users[idx]);

  // Sync active session if updating the current user
  const currentSession = restoreSession();
  if (currentSession && currentSession.user.id === userId) {
    currentSession.user = updatedProfile;
    saveSession(currentSession);
  }

  return updatedProfile;
}

// Switch user's active role (delegates to updateUserProfile)
export async function switchUserRole(userId: string, newRole: UserRole): Promise<UserProfile | null> {
  return updateUserProfile(userId, { role: newRole });
}

// Retrieve all registered users (admin utility)
export function getAllUsers(): UserProfile[] {
  const users = loadUserRegistry();
  return users.map(sanitizeUser);
}

// --- Password Reset ---

// Request a password reset email
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !EMAIL_PATTERN.test(trimmed)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  if (supabase) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed);
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: 'Reset link sent. Check your inbox.' };
    } catch {
      /* fallback */
    }
  }

  await wait(400);
  const users = loadUserRegistry();
  const exists = users.some((u) => u.email.toLowerCase() === trimmed);
  if (!exists) {
    // Generic message to prevent email enumeration
    return { ok: true, message: 'If an account exists for this email, password reset instructions have been dispatched.' };
  }

  return { ok: true, message: 'Password reset instructions have been sent to your email.' };
}

// Confirm password reset with a new password
export async function confirmPasswordReset(email: string, newPassword: string): Promise<AuthResult> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const users = loadUserRegistry();
  const idx = users.findIndex((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (idx === -1) {
    return { ok: false, message: 'Account not found.' };
  }

  users[idx].passwordHash = newPassword;
  users[idx].updatedAt = new Date().toISOString();
  saveUserRegistry(users);

  return { ok: true, message: 'Password updated successfully. You may now sign in.' };
}

// --- Social / OAuth Sign-In ---

export type OAuthProvider = 'google' | 'apple';

// Initiate sign-in via a third-party provider
export async function signInWithProvider(provider: OAuthProvider): Promise<AuthResult | null> {
  if (supabase) {
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) return { ok: false, message: 'Social sign-in failed. Please try again.' };
    return null; // Browser redirect handles the rest
  }
  // Simulate social sign-in with demo traveler account
  await wait(500);
  const alex = SEEDED_USERS[2];
  const profile = sanitizeUser(alex);
  const session: AuthSession = {
    token: generateMockToken(profile.id),
    user: profile,
    expiresAt: Date.now() + 7 * 86400 * 1000,
  };
  saveSession(session);
  return { ok: true, message: `Connected with ${provider === 'google' ? 'Google' : 'Apple'}. Welcome back!`, session };
}

// --- Remember Me Helpers ---

// Save email for "Remember Me" checkbox
export function rememberEmail(email: string): void {
  try {
    localStorage.setItem(REMEMBER_KEY, email);
  } catch {
    /* storage unavailable */
  }
}

// Recall a previously remembered email
export function recallEmail(): string | null {
  try {
    return localStorage.getItem(REMEMBER_KEY);
  } catch {
    return null;
  }
}

// Clear remembered email
export function forgetEmail(): void {
  try {
    localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* storage unavailable */
  }
}
