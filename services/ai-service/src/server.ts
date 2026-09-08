import { createApp } from './app.js';
import { config } from './config/env.js';
import { connectMongo } from './db/mongo.js';

async function bootstrap() {
  // Connect to database (gracefully falls back to in-memory if offline)
  await connectMongo();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[Voyana AI Service] Running on port ${config.port} (env: ${config.nodeEnv}, provider: ${config.llmProvider})`);
    console.log(`[Voyana AI Service] Health check: http://localhost:${config.port}/health`);
    console.log(`[Voyana AI Service] Chat endpoint: POST http://localhost:${config.port}/ai/chat`);
  });

  const handleShutdown = async () => {
    console.log('\n[Voyana AI Service] Shutting down gracefully...');
    server.close(() => {
      console.log('[Voyana AI Service] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
}

bootstrap().catch((err) => {
  console.error('[Voyana AI Service] Bootstrap failed:', err);
  process.exit(1);
});
