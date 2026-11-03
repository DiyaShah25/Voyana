/**
 * Auth Middleware Unit Tests
 * Tests requireAuth and optionalAuth middleware with valid, expired, tampered and missing tokens.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { config } from '../config/env.js';

function makeMockRes(): Partial<Response> {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeMockNext(): NextFunction {
  return jest.fn();
}

const VALID_PAYLOAD = { sub: 'usr-test-01', email: 'test@voyana.com', role: 'traveler', name: 'Test User' };

describe('requireAuth middleware', () => {
  it('calls next() with valid JWT token', () => {
    const token = jwt.sign(VALID_PAYLOAD, config.jwtSecret, { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } } as AuthenticatedRequest;
    const res = makeMockRes() as Response;
    const next = makeMockNext();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user!.email).toBe('test@voyana.com');
    expect(req.user!.role).toBe('traveler');
  });

  it('returns 401 when Authorization header is missing', () => {
    const req = { headers: {} } as AuthenticatedRequest;
    const res = makeMockRes() as Response;
    const next = makeMockNext();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Unauthorized' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is expired', () => {
    const token = jwt.sign(VALID_PAYLOAD, config.jwtSecret, { expiresIn: '-1s' });
    const req = { headers: { authorization: `Bearer ${token}` } } as AuthenticatedRequest;
    const res = makeMockRes() as Response;
    const next = makeMockNext();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is tampered with wrong secret', () => {
    const token = jwt.sign(VALID_PAYLOAD, 'wrong-secret', { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } } as AuthenticatedRequest;
    const res = makeMockRes() as Response;
    const next = makeMockNext();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Bearer prefix is absent', () => {
    const token = jwt.sign(VALID_PAYLOAD, config.jwtSecret, { expiresIn: '1h' });
    const req = { headers: { authorization: token } } as AuthenticatedRequest;
    const res = makeMockRes() as Response;
    const next = makeMockNext();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts base64 mock token (frontend preview fallback)', () => {
    // Simulate the base64 mock token format used in frontend dev preview (from authService.ts)
    const mockPayload = { sub: 'usr-mock-01', iss: 'voyana.travel', email: 'mock@voyana.com', role: 'traveler', name: 'Mock User' };
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64');
    const payload = Buffer.from(JSON.stringify(mockPayload)).toString('base64');
    const token = `${header}.${payload}.fakesig`;

    const req = { headers: { authorization: `Bearer ${token}` } } as AuthenticatedRequest;
    const res = makeMockRes() as Response;
    const next = makeMockNext();

    requireAuth(req, res, next);

    // Should succeed via the base64 fallback path
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user!.id).toBe('usr-mock-01');
  });
});

describe('optionalAuth middleware', () => {
  it('attaches user when valid token provided', () => {
    const token = jwt.sign(VALID_PAYLOAD, config.jwtSecret, { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } } as AuthenticatedRequest;
    const res = makeMockRes() as Response;
    const next = makeMockNext();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user!.email).toBe('test@voyana.com');
  });

  it('calls next() without user when no Authorization header', () => {
    const req = { headers: {} } as AuthenticatedRequest;
    const res = makeMockRes() as Response;
    const next = makeMockNext();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });

  it('calls next() without user when token is invalid (does not block)', () => {
    const req = { headers: { authorization: 'Bearer invalid.token.value' } } as AuthenticatedRequest;
    const res = makeMockRes() as Response;
    const next = makeMockNext();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });
});

