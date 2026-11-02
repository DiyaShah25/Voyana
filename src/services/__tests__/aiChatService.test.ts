import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendChatMessage } from '../aiChatService';

describe('aiChatService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uses remote AI service response when fetch succeeds', async () => {
    const remoteResponse = {
      content: 'Here is your 5-day itinerary for Tokyo.',
      citedContext: { days: [1, 2], categories: ['Culture'] },
      proposedChanges: [{ type: 'add_activity', title: 'Visit Senso-ji' }],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => remoteResponse,
    } as any);

    const result = await sendChatMessage({
      message: 'Show me Tokyo itinerary',
      destination: 'Tokyo',
    });

    expect(result.content).toBe(remoteResponse.content);
    expect(result.aiGenerated).toBe(true);
    expect(result.role).toBe('assistant');
    expect(result.citedContext?.days).toEqual([1, 2]);
  });

  it('falls back to local contextual engine when remote backend fails or times out', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Connection timed out'));

    const result = await sendChatMessage({
      message: 'Can you recommend places to visit?',
      destination: 'Tokyo',
    });

    expect(result).toBeDefined();
    expect(result.content).toContain('Top AI Destination Recommendations');
    expect(result.aiGenerated).toBe(true);
    expect(result.role).toBe('assistant');
  });

  it('provides weather & packing advice in offline fallback mode', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));

    const result = await sendChatMessage({
      message: 'What should we pack for the weather?',
      destination: 'Paris',
    });

    expect(result.content).toContain('Packing');
  });

  it('provides budget optimization tips in offline fallback mode', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));

    const result = await sendChatMessage({
      message: 'How can we save budget?',
      destination: 'Rome',
      context: {
        budgetTotal: 2500,
        budgetSpent: 1800,
      },
    });

    expect(result.content).toContain('Budget');
  });
});

