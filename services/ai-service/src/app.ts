/**
 * Express Application Setup for Voyana Backend
 * Configures CORS, JSON parsing, routes mounting (AI chat, health, auth, trips,
 * bookings, budget, collaboration, packing, alerts, destinations), and error handling.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.router.js';
import { chatRouter } from './routes/chat.router.js';
import { apiRouter } from './routes/api.router.js';
import { authRouter } from './routes/auth.router.js';
import { tripsRouter } from './routes/trips.router.js';
import { bookingsRouter } from './routes/bookings.router.js';
import { budgetRouter } from './routes/budget.router.js';
import { collaborationRouter } from './routes/collaboration.router.js';
import { packingRouter } from './routes/packing.router.js';
import { alertsRouter } from './routes/alerts.router.js';
import { reviewsRouter } from './routes/reviews.router.js';
import { destinationsRouter } from './routes/destinations.router.js';
import { memoriesRouter } from './routes/memories.router.js';
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
  app.use('/api/trips', tripsRouter);
  app.use('/api/destinations', destinationsRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/budget', budgetRouter);
  app.use('/api/collaboration', collaborationRouter);
  app.use('/api/memories', memoriesRouter);
  app.use('/api/packing', packingRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/reviews', reviewsRouter);
  app.use('/api/data', apiRouter);

  // Data migration / seeding trigger endpoint
  app.post('/api/migrate', async (_req: Request, res: Response) => {
    try {
      const summary = await runDataMigration();
      res.status(200).json({ ok: true, message: 'Migration completed successfully.', summary });
    } catch (err: any) {
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
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Voyana Backend Error]', err);
    const status = err?.statusCode || 500;
    res.status(status).json({
      error: status === 503 ? 'Service Unavailable' : 'Internal Server Error',
      message: err?.message || 'An unexpected error occurred.',
    });
  });

  return app;
}
