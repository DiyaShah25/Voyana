import { LlmClient, LlmMessage, LlmOptions, LlmResponse } from './types.js';

export class MockLlmClient implements LlmClient {
  public readonly providerName = 'mock';

  async generate(messages: LlmMessage[], options?: LlmOptions): Promise<LlmResponse> {
    const startTime = Date.now();
    const userMessage = messages.find((m) => m.role === 'user')?.content.toLowerCase() || '';

    let content: string;
    let days: number[] = [1];
    let proposedChanges: Array<{ day: number; activity: string; rationale: string }> = [];

    if (userMessage.includes('pack') || userMessage.includes('hiking') || userMessage.includes('batur') || userMessage.includes('day 4')) {
      days = [4];
      content =
        'For Day 4 (Mount Batur Sunrise Trek), we recommend packing warm layers (temperatures drop to ~12°C at 03:00), sturdy hiking shoes with grip, headlamps, swimwear/towels for the Batur Natural Hot Spring recovery afterwards, and plenty of water.';
    } else if (userMessage.includes('budget') || userMessage.includes('cost') || userMessage.includes('expensive')) {
      days = [1, 2, 3, 4, 5, 6, 7];
      content =
        'Your total trip budget is $4,500 USD for 5 members (~$900 per person). Accommodation ($1,800) and Food ($1,100) are your largest categories. Day 4 (Mount Batur & Hot Springs, $345 total) and Day 6 (Nusa Penida Boat & Snorkeling, $320 total) are your highest activity expense days, but stay well within your allocated $800 activities budget.';
    } else if (userMessage.includes('food') || userMessage.includes('diet') || userMessage.includes('vegan') || userMessage.includes('vegetarian')) {
      days = [1, 3, 7];
      content =
        'All meals in the itinerary accommodate the group’s preferences: Diya (Vegetarian) and Sarah (Vegan) are well covered with the Ubud Cooking Class on Day 3 and Alchemy Ubud on Day 7. Rohan (Halal) and Elena (Pescatarian) will enjoy the Jimbaran Bay Seafood BBQ on Day 2.';
    } else if (userMessage.includes('change') || userMessage.includes('propose') || userMessage.includes('substitute') || userMessage.includes('replace')) {
      days = [5];
      content =
        'I noticed you might want more adventure on Day 5. While the current plan includes the Tegalalang Rice Terraces and Tirta Empul Temple, we could propose adding an ATV Quad Bike Jungle Tour before the afternoon relaxation session.';
      proposedChanges = [
        {
          day: 5,
          activity: 'Add 2-Hour Ubud ATV Quad Bike Jungle Adventure at 09:30',
          rationale: 'Satisfies adventure preferences for Alex and Rohan while keeping the evening sound healing intact.',
        },
      ];
    } else {
      days = [1, 2];
      content =
        'Welcome to Voyana! I am your AI travel companion for your 7-day Bali trip (Oct 10 - Oct 16, 2026). You have 5 members registered and an itinerary covering Seminyak, Uluwatu, Ubud, Mount Batur, and Nusa Penida. Feel free to ask about packing, daily schedules, member preferences, or budget breakdowns!';
    }

    const jsonPayload = {
      content,
      aiGenerated: true,
      citedContext: {
        days,
        topics: ['itinerary', 'recommendations'],
      },
      proposedChanges,
    };

    const latencyMs = Date.now() - startTime + 10; // realistic mock latency
    const serialized = JSON.stringify(jsonPayload);

    return {
      content: serialized,
      tokens: {
        promptTokens: 250,
        completionTokens: 85,
        totalTokens: 335,
      },
      latencyMs,
      provider: 'mock',
      model: 'mock-llama-3.3-70b-versatile',
    };
  }
}
