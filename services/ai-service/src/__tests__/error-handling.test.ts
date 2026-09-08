import express from 'express';
import request from 'supertest';
import { LlmClient, LlmMessage, LlmOptions, LlmResponse } from '../llm/types.js';
import { ChatService } from '../services/chat.service.js';
import { ChatRequestSchema } from '../schemas/chat.schema.js';
import { AiRequestService } from '../services/ai-request.service.js';

class FailingLlmClient implements LlmClient {
  constructor(
    public readonly providerName: string,
    private errorType: 'rate_limit' | 'timeout' | 'generic'
  ) {}

  async generate(_messages: LlmMessage[], _options?: LlmOptions): Promise<LlmResponse> {
    if (this.errorType === 'rate_limit') {
      const err: any = new Error('Groq LLM rate limit reached (429). Service temporarily unavailable.');
      err.statusCode = 503;
      throw err;
    }
    if (this.errorType === 'timeout') {
      const err: any = new Error('Groq LLM request timed out after 30000ms.');
      err.statusCode = 503;
      throw err;
    }
    throw new Error('Generic internal error');
  }
}

function createTestAppWithCustomClient(client: LlmClient) {
  const app = express();
  app.use(express.json());
  const chatService = new ChatService(client);

  app.post('/ai/chat', async (req, res, next) => {
    try {
      const validated = ChatRequestSchema.parse(req.body);
      const result = await chatService.processChat(validated);
      res.status(200).json(result);
    } catch (err: any) {
      if (err?.statusCode === 503) {
        res.status(503).json({
          error: 'AI Service Unavailable',
          message: err.message,
          retryAfterSeconds: 5,
        });
        return;
      }
      next(err);
    }
  });

  return app;
}

describe('Fault Injection & Error Resilience', () => {
  beforeEach(() => {
    AiRequestService.clearInMemoryLogs();
  });

  it('should return 503 when downstream LLM returns 429 rate limit', async () => {
    const app = createTestAppWithCustomClient(new FailingLlmClient('groq', 'rate_limit'));

    const response = await request(app)
      .post('/ai/chat')
      .send({ message: 'Hello' });

    expect(response.status).toBe(503);
    expect(response.body).toHaveProperty('error', 'AI Service Unavailable');
    expect(response.body.message).toContain('rate limit');

    // Telemetry should record the error
    const logs = AiRequestService.getInMemoryLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].outcome).toBe('error');
    expect(logs[0].errorMessage).toContain('rate limit');
  });

  it('should return 503 when downstream LLM request times out', async () => {
    const app = createTestAppWithCustomClient(new FailingLlmClient('groq', 'timeout'));

    const response = await request(app)
      .post('/ai/chat')
      .send({ message: 'Hello' });

    expect(response.status).toBe(503);
    expect(response.body).toHaveProperty('error', 'AI Service Unavailable');
    expect(response.body.message).toContain('timed out');

    // Telemetry should record the error
    const logs = AiRequestService.getInMemoryLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].outcome).toBe('error');
  });
});
