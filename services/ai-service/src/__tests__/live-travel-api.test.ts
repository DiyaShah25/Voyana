/**
 * Third-Party External APIs Integration Test Suite
 * Tests /api/live and /api/external routes.
 * Covers: missing API key (401), external timeout (504), external 4xx/5xx (502),
 * malformed external response (502), query validation (400), and successful response (200).
 */

import request from 'supertest';
import { createApp } from '../app.js';
import { connectMongo, disconnectMongo } from '../db/mongo.js';

describe('Third-Party Live Travel API (/api/live & /api/external)', () => {
  const app = createApp();
  const originalFetch = global.fetch;

  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await disconnectMongo();
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    delete process.env.TRAVEL_API_KEY;
    delete process.env.OPENWEATHER_API_KEY;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // 1. Missing API Key
  it('returns 401 when API key is missing from environment and headers', async () => {
    const res = await request(app).get('/api/live/weather?city=Paris');
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('Missing API key');
  });

  it('accepts API key passed via X-API-Key header', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tempC: 18, condition: 'Partly Cloudy', humidity: 62 }),
    } as any);

    const res = await request(app)
      .get('/api/live/weather?city=Paris')
      .set('X-API-Key', 'test-api-key-12345');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.city).toBe('Paris');
    expect(res.body.data.tempC).toBe(18);
  });

  // 2. Query Validation Error (400)
  it('returns 400 when required city parameter is missing', async () => {
    const res = await request(app)
      .get('/api/live/weather')
      .set('X-API-Key', 'test-api-key-12345');

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('Validation Error');
  });

  // 3. External Service Timeout (504)
  it('returns 504 Gateway Timeout when external weather API times out', async () => {
    process.env.TRAVEL_API_KEY = 'test-travel-key';

    global.fetch = jest.fn().mockImplementationOnce(() => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });

    const res = await request(app).get('/api/live/weather?city=Tokyo');

    expect(res.status).toBe(504);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('Gateway Timeout');
    expect(res.body.message).toContain('timed out');
  });

  // 4. External Service 4xx/5xx (502 Bad Gateway)
  it('returns 502 Bad Gateway when external service returns 500 or 404', async () => {
    process.env.TRAVEL_API_KEY = 'test-travel-key';

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    } as any);

    const res = await request(app).get('/api/live/weather?city=Rome');

    expect(res.status).toBe(502);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('Bad Gateway');
    expect(res.body.message).toContain('HTTP 503');
  });

  // 5. Malformed External Response (502 Bad Gateway)
  it('returns 502 Bad Gateway when external API returns invalid JSON', async () => {
    process.env.TRAVEL_API_KEY = 'test-travel-key';

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Unexpected token < in JSON at position 0');
      },
    } as any);

    const res = await request(app).get('/api/live/weather?city=London');

    expect(res.status).toBe(502);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('Bad Gateway');
    expect(res.body.message).toContain('Failed to parse JSON');
  });

  it('returns 502 Bad Gateway when external API returns JSON missing expected fields', async () => {
    process.env.TRAVEL_API_KEY = 'test-travel-key';

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ wrongField: 123 }),
    } as any);

    const res = await request(app).get('/api/live/weather?city=London');

    expect(res.status).toBe(502);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('Bad Gateway');
    expect(res.body.message).toContain('Missing expected fields');
  });

  // 6. External Currency Rates Endpoint on /api/external
  it('fetches currency conversion rates through /api/external/rates', async () => {
    process.env.TRAVEL_API_KEY = 'test-travel-key';

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rate: 0.92, base: 'USD', target: 'EUR' }),
    } as any);

    const res = await request(app).get('/api/external/rates?base=USD&target=EUR');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.rate).toBe(0.92);
    expect(res.body.base).toBe('USD');
    expect(res.body.target).toBe('EUR');
  });
});

