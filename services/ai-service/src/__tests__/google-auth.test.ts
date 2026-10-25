import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { config } from '../config/env.js';
import { UserModel } from '../db/models/user.model.js';
import { verifyGoogleCredential } from '../services/google-auth.service.js';

jest.mock('../services/google-auth.service.js', () => ({ verifyGoogleCredential: jest.fn() }));
const verify = jest.mocked(verifyGoogleCredential);
const origin = 'http://localhost:5173';
const app = createApp();
const originalId = config.googleClientId;
const fakeUser = (role = 'traveler') => ({ id: 'usr-google-test', email: 'voyana.test@gmail.com', name: 'Google Tester', role, googleSub: 'google-subject-1', save: jest.fn().mockResolvedValue(undefined), toJSON: () => ({ id: 'usr-google-test', email: 'voyana.test@gmail.com', name: 'Google Tester', role }) });
async function challenge() {
  const result = await request(app).get('/api/auth/google/config').set('Origin', origin);
  expect(result.status).toBe(200);
  return result.body;
}

describe('Google sign-in session exchange', () => {
  beforeEach(() => { config.googleClientId = 'voyana-test.apps.googleusercontent.com'; verify.mockReset(); });
  afterEach(() => { jest.restoreAllMocks(); config.googleClientId = originalId; });

  it('reports missing provider setup without pretending to sign in', async () => {
    config.googleClientId = '';
    expect((await request(app).get('/api/auth/google/config')).body.enabled).toBe(false);
    expect((await request(app).post('/api/auth/google').send({ credential: 'fake' })).status).toBe(503);
  });
  it('rejects unregistered origins and malformed requests', async () => {
    expect((await request(app).get('/api/auth/google/config').set('Origin', 'https://other.example')).status).toBe(403);
    expect((await request(app).post('/api/auth/google').set('Origin', origin).send({})).status).toBe(400);
  });
  it('rejects expired, altered and failed Google credentials before database access', async () => {
    const find = jest.spyOn(UserModel, 'findOne');
    const expired = jwt.sign({ purpose: 'google-signin', nonce: 'unused', origin }, config.jwtSecret, { expiresIn: -1 });
    expect((await request(app).post('/api/auth/google').set('Origin', origin).send({ credential: 'fake', challenge: expired })).status).toBe(401);
    const fresh = await challenge();
    verify.mockRejectedValue(new Error('Invalid signature'));
    expect((await request(app).post('/api/auth/google').set('Origin', origin).send({ credential: 'fake', challenge: fresh.challenge })).status).toBe(401);
    expect(find).not.toHaveBeenCalled();
  });
  it('exchanges verified identity for a signed session and rejects challenge replay', async () => {
    const fresh = await challenge();
    verify.mockResolvedValue({ sub: 'google-subject-1', email: 'voyana.test@gmail.com', email_verified: true } as never);
    jest.spyOn(UserModel, 'findOne').mockResolvedValue(fakeUser() as never);
    const body = { credential: 'verified-google-credential', challenge: fresh.challenge, role: 'admin' };
    const result = await request(app).post('/api/auth/google').set('Origin', origin).send(body);
    expect(result.status).toBe(200);
    expect(verify).toHaveBeenCalledWith(body.credential, fresh.nonce);
    expect(result.body.session.user.role).toBe('traveler');
    expect(jwt.verify(result.body.session.token, config.jwtSecret)).toMatchObject({ sub: 'usr-google-test', role: 'traveler' });
    expect((await request(app).post('/api/auth/google').set('Origin', origin).send(body)).status).toBe(401);
  });
  it('preserves the existing organizer role instead of accepting a requested role', async () => {
    const fresh = await challenge();
    verify.mockResolvedValue({ sub: 'google-subject-1', email: 'voyana.test@gmail.com', email_verified: true } as never);
    jest.spyOn(UserModel, 'findOne').mockResolvedValue(fakeUser('organizer') as never);
    const result = await request(app).post('/api/auth/google').set('Origin', origin).send({ credential: 'verified', challenge: fresh.challenge, role: 'admin' });
    expect(result.body.session.user.role).toBe('organizer');
  });
  it('creates a new Google account as traveler with a stable Google subject', async () => {
    const fresh = await challenge();
    verify.mockResolvedValue({ sub: 'new-google-subject', email: 'new@gmail.com', email_verified: true, name: 'New Traveler' } as never);
    jest.spyOn(UserModel, 'findOne').mockResolvedValue(null);
    const create = jest.spyOn(UserModel, 'create').mockResolvedValue(fakeUser() as never);
    const result = await request(app).post('/api/auth/google').set('Origin', origin).send({ credential: 'verified', challenge: fresh.challenge });
    expect(result.status).toBe(200);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ googleSub: 'new-google-subject', role: 'traveler' }));
  });
  it('does not silently link a third-party email to an existing password account', async () => {
    const fresh = await challenge();
    verify.mockResolvedValue({ sub: 'new-subject', email: 'person@example.com', email_verified: true } as never);
    jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(null).mockResolvedValueOnce(fakeUser() as never);
    expect((await request(app).post('/api/auth/google').set('Origin', origin).send({ credential: 'verified', challenge: fresh.challenge })).status).toBe(409);
  });
});
