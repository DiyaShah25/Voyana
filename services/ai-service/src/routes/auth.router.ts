import { toError } from '../utils/errors.js';
/**
 * Authentication & User Profile Router
 * Provides REST endpoints for user registration, login, profile management,
 * and collaborator lookups with persistent MongoDB storage.
 */

import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { UserModel } from '../db/models/user.model.js';
import { config } from '../config/env.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { verifyGoogleCredential } from '../services/google-auth.service.js';

export const authRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createToken(user: { id: string; email: string; role: string; name: string }): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

// A short-lived challenge binds Google's ID token to this browser's sign-in attempt.
const googleChallenges = new Map<string, number>();
authRouter.get('/google/config', (req, res) => {
  if (!config.googleClientId) { res.json({ enabled: false }); return; }
  const origin = req.get('origin');
  if (!origin || !config.frontendOrigins.includes(origin)) { res.status(403).json({ message: 'Sign-in origin is not allowed.' }); return; }
  const now = Date.now();
  for (const [nonce, expiry] of googleChallenges) if (expiry < now) googleChallenges.delete(nonce);
  if (googleChallenges.size >= 1000) { res.status(429).json({ message: 'Please retry sign-in shortly.' }); return; }
  const nonce = randomUUID();
  googleChallenges.set(nonce, now + 5 * 60000);
  const challenge = jwt.sign({ purpose: 'google-signin', nonce, origin }, config.jwtSecret, { expiresIn: '5m' });
  res.set('Cache-Control', 'no-store').json({ enabled: true, clientId: config.googleClientId, nonce, challenge });
});

authRouter.post('/google', async (req, res): Promise<void> => {
  if (!config.googleClientId) { res.status(503).json({ message: 'Google sign-in is awaiting app setup.' }); return; }
  const origin = req.get('origin');
  if (!origin || !config.frontendOrigins.includes(origin)) { res.status(403).json({ message: 'Sign-in origin is not allowed.' }); return; }
  const { credential, challenge } = req.body;
  if (typeof credential !== 'string' || credential.length > 16000 || typeof challenge !== 'string') { res.status(400).json({ message: 'Google credential and challenge are required.' }); return; }
  let nonce: string;
  let identity: Awaited<ReturnType<typeof verifyGoogleCredential>>;
  try {
    const claim = jwt.verify(challenge, config.jwtSecret);
    if (typeof claim === 'string' || claim.purpose !== 'google-signin' || claim.origin !== origin || typeof claim.nonce !== 'string' || (googleChallenges.get(claim.nonce) || 0) <= Date.now()) throw new Error('Expired challenge');
    nonce = claim.nonce;
    identity = await verifyGoogleCredential(credential, nonce);
    if (!googleChallenges.delete(nonce)) throw new Error('Used challenge');
  } catch { res.status(401).json({ message: 'Google sign-in could not be verified. Please try again.' }); return; }
  try {
    let user = await UserModel.findOne({ googleSub: identity.sub });
    if (!user) {
      user = await UserModel.findOne({ email: identity.email!.toLowerCase() });
      if (user) {
        const authoritative = identity.email!.toLowerCase().endsWith('@gmail.com') || Boolean(identity.hd);
        if (!authoritative || (user.googleSub && user.googleSub !== identity.sub)) { res.status(409).json({ message: 'Use email and password to sign in to this existing account.' }); return; }
        user.googleSub = identity.sub;
        await user.save();
      } else {
        user = await UserModel.create({ id: `usr-${randomUUID()}`, name: identity.name || identity.email!.split('@')[0], email: identity.email!.toLowerCase(), googleSub: identity.sub, passwordHash: randomUUID() + randomUUID(), avatarUrl: identity.picture, role: 'traveler' });
      }
    }
    res.json({ ok: true, message: 'Signed in with Google.', session: { token: createToken(user), user: user.toJSON(), expiresAt: Date.now() + 7 * 86400000 } });
  } catch { res.status(500).json({ message: 'Your Google account could not be saved. Please retry.' }); }
});

// ---------------------------------------------------------------------------
// Sign Up Endpoint: POST /signup
// ---------------------------------------------------------------------------
authRouter.post('/signup', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, role = 'traveler' } = req.body;

    // Input Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({
        ok: false,
        message: 'Full name is required (minimum 2 characters).',
        fieldErrors: { name: 'Full name is required' },
      });
      return;
    }

    const trimmedEmail = (email || '').trim().toLowerCase();
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      res.status(400).json({
        ok: false,
        message: 'A valid email address is required.',
        fieldErrors: { email: 'Valid email is required' },
      });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({
        ok: false,
        message: 'Password must be at least 8 characters long.',
        fieldErrors: { password: 'Password must be at least 8 characters' },
      });
      return;
    }

    // Check email uniqueness
    const existing = await UserModel.findOne({ email: trimmedEmail });
    if (existing) {
      res.status(409).json({
        ok: false,
        message: 'An account with this email address already exists. Please sign in.',
        fieldErrors: { email: 'Email already registered' },
      });
      return;
    }

    const userId = `usr-${randomUUID().slice(0, 8)}`;
    const user = new UserModel({
      id: userId,
      name: name.trim(),
      email: trimmedEmail,
      passwordHash: password, // Pre-save hook will hash this securely
      role: ['traveler', 'organizer'].includes(role) ? role : 'traveler',
      preferences: {
        preferredCurrency: 'INR',
        travelStyle: 'Cultural & Historic',
        emailNotifications: true,
        smsAlerts: false,
      },
    });

    await user.save();

    const token = createToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    res.status(201).json({
      ok: true,
      message: `Account created successfully. Welcome to Voyana, ${user.name}!`,
      session: {
        token,
        user: user.toJSON(),
        expiresAt: Date.now() + 7 * 86400 * 1000,
      },
    });
  } catch (caught) {
      const err = toError(caught);
    console.error('[Auth API] Signup error:', err);
    res.status(500).json({
      ok: false,
      message: 'Failed to create user account. Please try again.',
      error: err?.message,
    });
  }
});

// ---------------------------------------------------------------------------
// Sign In Endpoint: POST /login
// ---------------------------------------------------------------------------
authRouter.post('/login', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const trimmedEmail = (email || '').trim().toLowerCase();

    if (!trimmedEmail || !password) {
      res.status(400).json({
        ok: false,
        message: 'Email and password are required.',
      });
      return;
    }

    const user = await UserModel.findOne({ email: trimmedEmail });
    if (!user) {
      res.status(401).json({
        ok: false,
        message: 'No account found with this email. Please check your credentials.',
        fieldErrors: { email: 'Account not found' },
      });
      return;
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      res.status(401).json({
        ok: false,
        message: 'Incorrect password. Please try again.',
        fieldErrors: { password: 'Incorrect password' },
      });
      return;
    }

    const token = createToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    res.status(200).json({
      ok: true,
      message: `Welcome back, ${user.name.split(' ')[0]}!`,
      session: {
        token,
        user: user.toJSON(),
        expiresAt: Date.now() + 7 * 86400 * 1000,
      },
    });
  } catch (caught) {
      const err = toError(caught);
    console.error('[Auth API] Login error:', err);
    res.status(500).json({
      ok: false,
      message: 'Failed to authenticate user. Please try again.',
      error: err?.message,
    });
  }
});

// ---------------------------------------------------------------------------
// Get Current User: GET /me
// ---------------------------------------------------------------------------
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await UserModel.findOne({ id: req.user!.id });
    if (!user) {
      res.status(404).json({ ok: false, message: 'User not found.' });
      return;
    }
    res.status(200).json({ ok: true, user: user.toJSON() });
  } catch (caught) {
      const err = toError(caught);
    res.status(500).json({ ok: false, message: 'Failed to load user profile.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// Update Profile: PUT /profile
// ---------------------------------------------------------------------------
authRouter.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const updates: Record<string, unknown> = {};
    for (const key of ['name', 'avatarUrl', 'bio', 'phone', 'preferences']) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body.role !== undefined) {
      res.status(403).json({ ok: false, message: 'Account roles cannot be changed from a profile. Sign out to use a different account.' });
      return;
    }

    const user = await UserModel.findOneAndUpdate(
      { id: req.user!.id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({ ok: false, message: 'User not found.' });
      return;
    }

    res.status(200).json({
      ok: true,
      message: 'Profile updated successfully.',
      user: user.toJSON(),
    });
  } catch (caught) {
      const err = toError(caught);
    res.status(500).json({ ok: false, message: 'Failed to update profile.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// List Users (Collaborator lookup / directory): GET /users
// ---------------------------------------------------------------------------
authRouter.get('/users', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin') { res.status(403).json({ message: 'Administrator access required.' }); return; }
    const users = await UserModel.find({}, { passwordHash: 0 }).limit(50);
    res.status(200).json({ ok: true, users });
  } catch (caught) {
      const err = toError(caught);
    res.status(500).json({ ok: false, message: 'Failed to list users.', error: err?.message });
  }
});
