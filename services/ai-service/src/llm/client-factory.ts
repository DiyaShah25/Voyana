import { config } from '../config/env.js';
import { GroqLlmClient } from './groq-client.js';
import { MockLlmClient } from './mock-client.js';
import { LlmClient } from './types.js';

let cachedClient: LlmClient | null = null;

export function getLlmClient(): LlmClient {
  if (cachedClient) {
    return cachedClient;
  }

  if (config.llmProvider === 'groq' && config.groqApiKey) {
    try {
      cachedClient = new GroqLlmClient(config.groqApiKey, config.groqModel);
      console.log(`[LLM Factory] Initialized GroqLlmClient with model: ${config.groqModel}`);
      return cachedClient;
    } catch (err) {
      console.warn('[LLM Factory] Failed to initialize Groq client, falling back to MockLlmClient:', err);
    }
  }

  cachedClient = new MockLlmClient();
  console.log('[LLM Factory] Initialized MockLlmClient (deterministic local provider)');
  return cachedClient;
}

export function resetLlmClient(): void {
  cachedClient = null;
}
