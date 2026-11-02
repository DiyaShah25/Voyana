import { placesRouter } from './routes/places.router.js';
import { ZodError } from 'zod';
import { journeysRouter } from './routes/journeys.router.js';
import { toError } from './utils/errors.js';
import { requireAuth, type AuthenticatedRequest } from './middleware/auth.middleware.js';
/**
 * Express Application Setup for Voyana Backend
 * Configures CORS, JSON parsing, routes mounting (AI chat, health, auth, trips,
 * bookings, budget, collaboration, packing, alerts, destinations, live/external), and error handling.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.router.js';
import { chatRouter } from './routes/chat.router.js';
import { authRouter } from './routes/auth.router.js';
import { paymentsRouter } from './routes/payments.router.js';
import { tripsRouter } from './routes/trips.router.js';
import { bookingsRouter } from './routes/bookings.router.js';
import { budgetRouter } from './routes/budget.router.js';
import { collaborationRouter } from './routes/collaboration.router.js';
import { packingRouter } from './routes/packing.router.js';
import { alertsRouter } from './routes/alerts.router.js';
import { reviewsRouter } from './routes/reviews.router.js';
import { destinationsRouter } from './routes/destinations.router.js';
import { memoriesRouter } from './routes/memories.router.js';
import { liveTravelRouter } from './routes/live-travel.router.js';
import { runDataMigration } from './services/migration.service.js';

export function createApp(): Express {
  const app = express();

  // Middlewares
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  // Health check routes
  app.use('/', healthRouter);
  app.use('/api', healthRouter);

  // AI Assistant routes (preserving existing /ai mount)
  app.use('/ai', chatRouter);
  app.use('/api/ai', chatRouter);

  // MongoDB Atlas REST API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/trips', requireAuth, tripsRouter);
  app.use('/api/journeys', requireAuth, journeysRouter);
  app.use('/api/destinations', destinationsRouter);
  app.use('/api/places', placesRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/budget', requireAuth, budgetRouter);
  app.use('/api/collaboration', requireAuth, collaborationRouter);
  app.use('/api/memories', requireAuth, memoriesRouter);
  app.use('/api/packing', requireAuth, packingRouter);
  app.use('/api/alerts', requireAuth, alertsRouter);
  app.use('/api/reviews', reviewsRouter);

  // External & Live Travel Integration Endpoints
  app.use('/api/live', liveTravelRouter);
  app.use('/api/external', liveTravelRouter);

  // Data migration / seeding trigger endpoint
  app.post('/api/migrate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'admin') { res.status(403).json({ ok: false, message: 'Administrator access required.' }); return; }
    try {
      const summary = await runDataMigration();
      res.status(200).json({ ok: true, message: 'Migration completed successfully.', summary });
    } catch (caught) {
      const err = toError(caught);
      res.status(500).json({ ok: false, message: 'Migration failed.', error: err?.message });
    }
  });

  // 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Endpoint ${req.method} ${req.path} does not exist on Voyana backend.`,
    });
  });

  // Global Error Handler
  app.use((caught: unknown, _req: Request, res: Response, _next: NextFunction) => {
    void _next; // Express identifies error middleware by its four-argument signature.
    const err = toError(caught);
    console.error('[Voyana Backend Error]', err);
    const status = caught instanceof ZodError ? 400 : err?.statusCode || 500;
    res.status(status).json({
      error: status === 503 ? 'Service Unavailable' : 'Internal Server Error',
      message: err?.message || 'An unexpected error occurred.',
    });
  });

  return app;
}
