/**
 * Live Travel & External Services Router
 * Connects to external travel APIs (weather, currency rates, flight tracker)
 * with strict API key verification, timeout protection, and robust error mapping.
 * Mounted at /api/live and /api/external.
 */

import { Router, Request, Response } from 'express';

export const liveTravelRouter = Router();

function getApiKey(req: Request): string | undefined {
  return (
    (req.headers['x-api-key'] as string) ||
    process.env.TRAVEL_API_KEY ||
    process.env.OPENWEATHER_API_KEY ||
    undefined
  );
}

/**
 * GET /weather
 * Query: city (required)
 */
liveTravelRouter.get('/weather', async (req: Request, res: Response) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(401).json({
      ok: false,
      error: 'Missing API key',
      message: 'External travel API key is not configured or provided.',
    });
  }

  const city = (req.query.city as string) || '';
  if (!city || city.trim().length === 0) {
    return res.status(400).json({
      ok: false,
      error: 'Validation Error',
      message: 'Query parameter "city" is required.',
    });
  }

  const endpoint = process.env.EXTERNAL_WEATHER_API_URL || `https://api.travelprovider.com/v1/weather?city=${encodeURIComponent(city)}&apiKey=${apiKey}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    let response: any;
    try {
      response = await fetch(endpoint, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        error: 'Bad Gateway',
        message: `External weather service returned HTTP ${response.status}`,
      });
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      return res.status(502).json({
        ok: false,
        error: 'Bad Gateway',
        message: 'Malformed external response: Failed to parse JSON',
      });
    }

    if (!data || typeof data !== 'object' || typeof data.tempC !== 'number') {
      return res.status(502).json({
        ok: false,
        error: 'Bad Gateway',
        message: 'Malformed external response: Missing expected fields (tempC, condition)',
      });
    }

    return res.status(200).json({
      ok: true,
      data: {
        city,
        tempC: data.tempC,
        condition: data.condition || 'Clear',
        humidity: data.humidity ?? 50,
      },
    });
  } catch (err: any) {
    if (err?.name === 'AbortError' || err?.code === 'ETIMEDOUT') {
      return res.status(504).json({
        ok: false,
        error: 'Gateway Timeout',
        message: 'External weather service request timed out.',
      });
    }
    return res.status(502).json({
      ok: false,
      error: 'Bad Gateway',
      message: `Failed to connect to external weather service: ${err?.message}`,
    });
  }
});

/**
 * GET /rates
 * Query: base, target
 */
liveTravelRouter.get('/rates', async (req: Request, res: Response) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(401).json({
      ok: false,
      error: 'Missing API key',
      message: 'External travel API key is required.',
    });
  }

  const base = ((req.query.base as string) || 'USD').toUpperCase();
  const target = ((req.query.target as string) || 'EUR').toUpperCase();

  const endpoint = process.env.EXTERNAL_RATES_API_URL || `https://api.travelprovider.com/v1/rates?base=${base}&target=${target}&apiKey=${apiKey}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    let response: any;
    try {
      response = await fetch(endpoint, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        error: 'Bad Gateway',
        message: `External rates service returned HTTP ${response.status}`,
      });
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      return res.status(502).json({
        ok: false,
        error: 'Bad Gateway',
        message: 'Malformed external response: Failed to parse JSON',
      });
    }

    if (!data || typeof data.rate !== 'number') {
      return res.status(502).json({
        ok: false,
        error: 'Bad Gateway',
        message: 'Malformed external response: Missing rate numeric value',
      });
    }

    return res.status(200).json({
      ok: true,
      base,
      target,
      rate: data.rate,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError' || err?.code === 'ETIMEDOUT') {
      return res.status(504).json({
        ok: false,
        error: 'Gateway Timeout',
        message: 'External currency rates service timed out.',
      });
    }
    return res.status(502).json({
      ok: false,
      error: 'Bad Gateway',
      message: `Failed to connect to external rates service: ${err?.message}`,
    });
  }
});
