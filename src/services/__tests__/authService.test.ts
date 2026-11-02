import { describe, it, expect, beforeEach } from 'vitest';
import {
  signIn,
  signUp,
  signOut,
  restoreSession,
  rememberEmail,
  recallEmail,
  forgetEmail,
  getAllUsers,
} from '../authService';

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Validation & Credentials', () => {
    it('rejects signIn with empty email or invalid email format', async () => {
      const emptyRes = await signIn('', 'Password123!');
      expect(emptyRes.ok).toBe(false);
      expect(emptyRes.message).toBeDefined();

      const invalidEmailRes = await signIn('not-an-email', 'Password123!');
      expect(invalidEmailRes.ok).toBe(false);
      expect(invalidEmailRes.message).toBeDefined();
    });

    it('rejects signIn with empty or short password', async () => {
      const shortRes = await signIn('traveler@voyana.com', '123');
      expect(shortRes.ok).toBe(false);
      expect(shortRes.message).toBeDefined();
    });

    it('signs in successfully using demo seeded credentials in local fallback mode', async () => {
      const res = await signIn('traveler@voyana.com', 'VoyanaTravel123!');
      expect(res.ok).toBe(true);
      expect(res.session).toBeDefined();
      expect(res.session?.user.email).toBe('traveler@voyana.com');
      expect(res.session?.token).toBeDefined();

      // Verify session restored from localStorage
      const restored = restoreSession();
      expect(restored?.user.email).toBe('traveler@voyana.com');
    });

    it('rejects signIn with incorrect password', async () => {
      const res = await signIn('traveler@voyana.com', 'IncorrectPassword999!');
      expect(res.ok).toBe(false);
      expect(res.message.toLowerCase()).toContain('password');
    });

    it('registers a new user and persists profile in local fallback mode', async () => {
      const newEmail = `user.${Date.now()}@voyana.com`;
      const res = await signUp('New Traveler', newEmail, 'SecurePassword123!', 'traveler');

      expect(res.ok).toBe(true);
      expect(res.session?.user.name).toBe('New Traveler');
      expect(res.session?.user.email).toBe(newEmail);
    });

    it('rejects duplicate registration with same email', async () => {
      const existingEmail = 'traveler@voyana.com';
      const res = await signUp('Alex Morgan', existingEmail, 'SecurePassword123!', 'traveler');

      expect(res.ok).toBe(false);
      expect(res.message.toLowerCase()).toMatch(/already (registered|exists)/);
    });
  });

  describe('Session and Email memory', () => {
    it('signs out and purges active session', async () => {
      await signIn('traveler@voyana.com', 'VoyanaTravel123!');
      expect(restoreSession()).not.toBeNull();

      signOut();
      expect(restoreSession()).toBeNull();
    });

    it('remembers, recalls, and forgets user email', () => {
      rememberEmail('rememberme@voyana.com');
      expect(recallEmail()).toBe('rememberme@voyana.com');

      forgetEmail();
      expect(recallEmail()).toBeNull();
    });

    it('returns seed user list in offline mode', () => {
      const users = getAllUsers();
      expect(users.length).toBeGreaterThanOrEqual(3);
      expect(users.some((u) => u.email === 'admin@voyana.com')).toBe(true);
    });
  });
});
