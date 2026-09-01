import Groq from 'groq-sdk';
import { LlmClient, LlmMessage, LlmOptions, LlmResponse } from './types.js';

export class GroqLlmClient implements LlmClient {
  public readonly providerName = 'groq';
  private client: Groq;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel = 'llama-3.3-70b-versatile') {
    if (!apiKey) {
      throw new Error('Groq API Key is required for GroqLlmClient');
    }
    this.client = new Groq({ apiKey });
    this.defaultModel = defaultModel;
  }

  async generate(messages: LlmMessage[], options?: LlmOptions): Promise<LlmResponse> {
    const startTime = Date.now();
    const model = options?.model || this.defaultModel;
    const timeoutMs = options?.timeoutMs || 30000;

    const groqMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const apiCallPromise = this.client.chat.completions.create({
      model,
      messages: groqMessages as any,
      temperature: options?.temperature ?? 0.3,
      max_completion_tokens: options?.maxTokens ?? 1024,
      response_format: { type: 'json_object' },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Groq LLM request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      // Ensure timer doesn't prevent Node from exiting
      if (typeof timer.unref === 'function') {
        timer.unref();
      }
    });

    try {
      const completion = await Promise.race([apiCallPromise, timeoutPromise]);
      const latencyMs = Date.now() - startTime;
      const content = completion.choices[0]?.message?.content || '{}';

      const promptTokens = completion.usage?.prompt_tokens || 0;
      const completionTokens = completion.usage?.completion_tokens || 0;
      const totalTokens = completion.usage?.total_tokens || promptTokens + completionTokens;

      return {
        content,
        tokens: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
        latencyMs,
        provider: 'groq',
        model,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      // Check for rate limit 429 or timeout
      const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('rate limit');
      const isTimeout = error?.message?.includes('timed out');

      if (isRateLimit) {
        const err: any = new Error('Groq LLM rate limit reached (429). Service temporarily unavailable.');
        err.statusCode = 503;
        err.latencyMs = latencyMs;
        err.provider = 'groq';
        throw err;
      }

      if (isTimeout) {
        const err: any = new Error(`Groq LLM request timed out after ${timeoutMs}ms.`);
        err.statusCode = 503;
        err.latencyMs = latencyMs;
        err.provider = 'groq';
        throw err;
      }

      // Default upstream failure mapped to 503
      const err: any = new Error(`Groq LLM provider error: ${error?.message || 'Unknown error'}`);
      err.statusCode = 503;
      err.latencyMs = latencyMs;
      err.provider = 'groq';
      throw err;
    }
  }
}
