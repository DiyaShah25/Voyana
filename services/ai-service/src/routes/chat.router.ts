import { Router, Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chat.service.js';
import { ChatRequestSchema } from '../schemas/chat.schema.js';
import { ZodError } from 'zod';

export const chatRouter = Router();
const chatService = new ChatService();

chatRouter.post('/chat', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedRequest = ChatRequestSchema.parse(req.body);
    const response = await chatService.processChat(validatedRequest);
    res.status(200).json(response);
  } catch (err: any) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: 'Invalid request payload',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    if (err?.statusCode === 503) {
      res.status(503).json({
        error: 'AI Service Unavailable',
        message: err.message || 'Downstream LLM provider is temporarily rate limited or timed out. Please retry shortly.',
        retryAfterSeconds: 5,
      });
      return;
    }

    next(err);
  }
});
