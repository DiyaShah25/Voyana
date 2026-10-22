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
      role: ['traveler', 'organizer', 'admin'].includes(role) ? role : 'traveler',
      preferences: {
        preferredCurrency: 'USD',
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
  } catch (err: any) {
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
  } catch (err: any) {
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
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to load user profile.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// Update Profile: PUT /profile
// ---------------------------------------------------------------------------
authRouter.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const updates = req.body;
    // Disallow altering security fields directly
    delete updates.passwordHash;
    delete updates.id;
    delete updates._id;

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
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to update profile.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// List Users (Collaborator lookup / directory): GET /users
// ---------------------------------------------------------------------------
authRouter.get('/users', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await UserModel.find({}, { passwordHash: 0 }).limit(50);
    res.status(200).json({ ok: true, users });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to list users.', error: err?.message });
  }
});
