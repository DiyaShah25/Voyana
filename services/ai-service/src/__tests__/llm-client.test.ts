/**
 * LLM Client Factory & Mock Provider Unit Tests
 * Tests client creation, mock LLM deterministic completions, and fallback handling.
 */

import { getLlmClient, resetLlmClient } from '../llm/client-factory.js';
import { MockLlmClient } from '../llm/mock-client.js';

describe('LLM Client Factory & MockLlmClient', () => {
  beforeEach(() => {
    resetLlmClient();
  });

  it('instantiates MockLlmClient in test environment', () => {
    const client = getLlmClient();
    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(MockLlmClient);
    expect(client.providerName).toBe('mock');
  });

  it('generates a deterministic chat response citing days and context', async () => {
    const client = new MockLlmClient();
    const response = await client.generate([
      { role: 'system', content: 'You are Voyana AI, the intelligent travel assistant.' },
      { role: 'user', content: 'What should we pack for Day 4 Mount Batur hike?' },
    ], { jsonMode: true });

    expect(response).toBeDefined();
    expect(response.content).toBeDefined();
    expect(typeof response.content).toBe('string');
    expect(response.tokens.totalTokens).toBeGreaterThan(0);
    expect(response.provider).toBe('mock');

    const parsed = JSON.parse(response.content);
    expect(parsed.aiGenerated).toBe(true);
    expect(parsed.citedContext.days).toContain(4);
    expect(parsed.content.toLowerCase()).toContain('mount batur');
  });

  it('handles empty message array gracefully with default welcome content', async () => {
    const client = new MockLlmClient();
    const response = await client.generate([], { jsonMode: true });

    expect(response).toBeDefined();
    expect(response.content).toBeDefined();

    const parsed = JSON.parse(response.content);
    expect(parsed.content).toContain('Welcome to Voyana');
    expect(parsed.aiGenerated).toBe(true);
  });
});
