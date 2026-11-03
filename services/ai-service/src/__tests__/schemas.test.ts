/**
 * Backend Zod Schemas Unit Tests
 * Tests validation schemas for chat requests and trip planning.
 * Covers boundary cases, missing fields, invalid formats, and negative values.
 */

import { ChatRequestSchema, ChatResponseSchema } from '../schemas/chat.schema.js';
import { TripSchema } from '../schemas/trip.schema.js';

describe('Chat Request Schema (Zod)', () => {
  it('accepts a valid message with tripId and destination', () => {
    const valid = {
      message: 'What should we pack for Day 4 Mount Batur hike?',
      tripId: 'trip-bali-001',
      destination: 'Bali',
      history: [],
    };

    const result = ChatRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts a message without optional fields and populates defaults', () => {
    const valid = {
      message: 'Where is the best pasta in Rome?',
    };

    const result = ChatRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tripId).toBe('trip-bali-001');
      expect(result.data.history).toEqual([]);
    }
  });

  it('rejects missing message', () => {
    const invalid = {
      tripId: 'trip-001',
    };

    const result = ChatRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects empty message string', () => {
    const invalid = {
      message: '',
    };

    const result = ChatRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('accepts conversation history with valid roles', () => {
    const valid = {
      message: 'What about day 5?',
      history: [
        { role: 'user', content: 'Tell me about Bali.' },
        { role: 'assistant', content: 'Bali is a tropical paradise.' },
      ],
    };

    const result = ChatRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects invalid history role', () => {
    const invalid = {
      message: 'Test message',
      history: [
        { role: 'unknown_role', content: 'Some content' },
      ],
    };

    const result = ChatRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('Chat Response Schema (Zod)', () => {
  it('validates a conformant AI chat response', () => {
    const sample = {
      content: 'Here are the packing recommendations for Mount Batur.',
      aiGenerated: true,
      citedContext: {
        days: [4],
        topics: ['hiking', 'packing'],
      },
      proposedChanges: [],
    };

    const result = ChatResponseSchema.safeParse(sample);
    expect(result.success).toBe(true);
  });

  it('rejects non-positive day references', () => {
    const invalid = {
      content: 'Response',
      aiGenerated: true,
      citedContext: {
        days: [-1, 0],
      },
    };

    const result = ChatResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('Trip Schema (Zod)', () => {
  const baseTrip = {
    id: 'trip-bali-001',
    title: 'Bali Group Expedition 2026',
    destination: 'Bali, Indonesia',
    startDate: '2026-10-10',
    endDate: '2026-10-16',
    totalBudget: 4500,
    currency: 'USD',
    members: [
      { id: 'usr-001', name: 'Diya Shah', role: 'creator' },
    ],
    itineraryDays: [
      {
        day: 1,
        title: 'Arrival & Welcome Dinner',
        activities: [
          { title: 'Airport pickup', time: '14:00', estimatedCost: 25 },
        ],
      },
    ],
  };

  it('validates a complete, structured trip object', () => {
    const result = TripSchema.safeParse(baseTrip);
    expect(result.success).toBe(true);
  });

  it('rejects negative total budget', () => {
    const invalid = { ...baseTrip, totalBudget: -500 };
    const result = TripSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid member role', () => {
    const invalid = {
      ...baseTrip,
      members: [{ id: 'usr-001', name: 'Diya', role: 'superadmin' }],
    };
    const result = TripSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects non-positive itinerary day number', () => {
    const invalid = {
      ...baseTrip,
      itineraryDays: [
        { day: 0, title: 'Pre-trip', activities: [] },
      ],
    };
    const result = TripSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
