import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { config } from '../config/env.js';

describe('Authentication regression checks', () => {
  const app = createApp();

  it('rejects unsigned frontend mock sessions', async () => {
    const payload = Buffer.from(JSON.stringify({ sub: 'admin', role: 'admin' })).toString('base64');
    const result = await request(app).get('/api/auth/me').set('Authorization', `Bearer e30.${payload}.fake`);
    expect(result.status).toBe(401);
  });

  it('rejects expired signed sessions', async () => {
    const token = jwt.sign({ sub: 'test-user', role: 'traveler' }, config.jwtSecret, { expiresIn: -1 });
    const result = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(result.status).toBe(401);
  });

  it('rejects self-assigned administrator access before touching the database', async () => {
    const token = jwt.sign({ sub: 'test-user', role: 'traveler' }, config.jwtSecret);
    const result = await request(app).put('/api/auth/profile').set('Authorization', `Bearer ${token}`).send({ role: 'admin' });
    expect(result.status).toBe(403);
  });

  it('rejects unauthenticated database seeding', async () => {
    const result = await request(app).post('/api/migrate');
    expect(result.status).toBe(401);
  });
});
