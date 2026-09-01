import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.router.js';
import { chatRouter } from './routes/chat.router.js';

export function createApp(): Express {
  const app = express();

  // Middlewares
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Routes
  app.use('/', healthRouter);
  app.use('/ai', chatRouter);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Endpoint ${req.method} ${req.path} does not exist on AI Service.`,
    });
  });

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[AI Service Error]', err);
    const status = err?.statusCode || 500;
    res.status(status).json({
      error: status === 503 ? 'Service Unavailable' : 'Internal Server Error',
      message: err?.message || 'An unexpected error occurred.',
    });
  });

  return app;
}
