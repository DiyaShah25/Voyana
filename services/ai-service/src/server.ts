/**
 * Server Entry Point
 * Bootstraps the Express app, connects to MongoDB Atlas, executes idempotent
 * seed/data migrations, and starts the HTTP server on configured port.
 */

import { createApp } from './app.js';
import { config } from './config/env.js';
import { connectMongo } from './db/mongo.js';
import { runDataMigration } from './services/migration.service.js';

async function bootstrap() {
  // Connect to database (gracefully falls back to in-memory if offline)
  const connected = await connectMongo();
  if (connected) {
    try {
      await runDataMigration();
    } catch (migErr: any) {
      console.warn('[Voyana Backend] Data migration notice:', migErr?.message || migErr);
    }
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[Voyana Backend] Running on port ${config.port} (env: ${config.nodeEnv}, provider: ${config.llmProvider})`);
    console.log(`[Voyana Backend] Health check: http://localhost:${config.port}/health`);
    console.log(`[Voyana Backend] API root:     http://localhost:${config.port}/api`);
    console.log(`[Voyana Backend] Chat endpoint: POST http://localhost:${config.port}/ai/chat`);
  });

  const handleShutdown = async () => {
    console.log('\n[Voyana Backend] Shutting down gracefully...');
    server.close(() => {
      console.log('[Voyana Backend] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
}

bootstrap().catch((err) => {
  console.error('[Voyana Backend] Bootstrap failed:', err);
  process.exit(1);
});
