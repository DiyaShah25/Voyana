import { Router, Request, Response } from 'express';
import { getMongoStatus } from '../db/mongo.js';
import { getLlmClient } from '../llm/client-factory.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  const provider = getLlmClient().providerName;
  const mongoStatus = getMongoStatus();

  res.status(200).json({
    status: 'ok',
    service: 'ai-service',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    dependencies: {
      database: {
        type: 'mongodb',
        status: mongoStatus,
      },
      llmProvider: {
        name: provider,
        status: 'ready',
      },
    },
  });
});
