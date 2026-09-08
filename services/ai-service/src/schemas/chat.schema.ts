import { z } from 'zod';

export const ChatMessageHistorySchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
});

export const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  tripId: z.string().optional().default('trip-bali-001'),
  history: z.array(ChatMessageHistorySchema).optional().default([]),
});

export const CitedContextSchema = z.object({
  days: z.array(z.number().int().positive()).default([]),
  topics: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const ProposedChangeSchema = z.object({
  day: z.number().int().positive(),
  activity: z.string(),
  rationale: z.string(),
});

export const ChatResponseSchema = z.object({
  content: z.string(),
  aiGenerated: z.literal(true).default(true),
  citedContext: CitedContextSchema,
  proposedChanges: z.array(ProposedChangeSchema).optional().default([]),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type CitedContext = z.infer<typeof CitedContextSchema>;
export type ProposedChange = z.infer<typeof ProposedChangeSchema>;
