/**
 * ChatService Unit Tests
 * Tests system prompt rendering, fixture loading, and context construction.
 */

import { ChatService } from '../services/chat.service.js';
import { MockLlmClient } from '../llm/mock-client.js';

describe('ChatService Unit Tests', () => {
  let chatService: ChatService;

  beforeEach(() => {
    chatService = new ChatService(new MockLlmClient());
  });

  it('initializes with loaded fixture and default prompt version', () => {
    expect(chatService).toBeDefined();
    expect(ChatService.PROMPT_VERSION).toBe('chat.v1');
  });

  it('renders a system prompt incorporating trip context and requested destination', () => {
    const trip = {
      id: 'trip-test-01',
      title: 'Swiss Alps Tour',
      destination: 'Zermatt',
      startDate: '2026-12-05',
      endDate: '2026-12-10',
      totalBudget: 3500,
      currency: 'USD',
      members: [{ id: 'u1', name: 'Bhavika', role: 'creator' }],
      itineraryDays: [
        {
          day: 1,
          title: 'Arrival & Village Walk',
          activities: [
            {
              time: '14:00',
              title: 'Check-in to Alpine Chalet',
              category: 'accommodation',
            },
          ],
        },
      ],
    };

    const prompt = chatService.renderSystemPrompt(trip as any, 'Zermatt');
    expect(prompt).toContain('Zermatt');
    expect(prompt).toContain('3500');
  });

  it('processes a user query and returns a valid structured ChatResponse', async () => {
    const result = await chatService.processChat({
      message: 'What should we pack for Day 4 Mount Batur hike?',
      tripId: 'trip-bali-001',
      history: [],
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.aiGenerated).toBe(true);
    expect(result.citedContext).toBeDefined();
    expect(result.citedContext.days).toContain(4);
  });
});
