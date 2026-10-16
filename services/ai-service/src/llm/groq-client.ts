/**
 * Groq Cloud LLM Client Implementation
 * Connects to Groq cloud API utilizing high-speed Llama models,
 * enforces strict JSON response mode, and tracks latency and token consumption.
 */

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

  // Generate Completion with Timeout & JSON Mode Enforcement
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

    // Request Timeout Race
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Groq LLM request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
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
        provider: this.providerName,
        model,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const isTimeout = err?.message?.includes('timed out');
      const isRateLimit = err?.status === 429 || err?.message?.includes('rate limit');

      const customError: any = new Error(
        isTimeout
          ? `Groq LLM call timed out after ${timeoutMs}ms`
          : isRateLimit
          ? 'Groq rate limit exceeded. Please try again shortly.'
          : `Groq LLM generation failed: ${err?.message || err}`
      );
      customError.statusCode = isTimeout ? 504 : isRateLimit ? 429 : 503;
      customError.latencyMs = latencyMs;
      throw customError;
    }
  }
}
