import { z } from 'zod';

export const MemberPreferencesSchema = z.object({
  dietary: z.string().optional(),
  pace: z.string().optional(),
  interests: z.array(z.string()).optional(),
});

export const TripMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(['creator', 'editor', 'viewer']),
  preferences: MemberPreferencesSchema.optional(),
});

export const ActivitySchema = z.object({
  time: z.string().optional(),
  title: z.string(),
  category: z.string().optional(),
  estimatedCost: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export const ItineraryDaySchema = z.object({
  day: z.number().int().positive(),
  date: z.string().optional(),
  title: z.string(),
  activities: z.array(ActivitySchema),
});

export const TripSchema = z.object({
  id: z.string(),
  title: z.string(),
  destination: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  totalBudget: z.number().nonnegative(),
  currency: z.string().default('USD'),
  budgetBreakdown: z.record(z.string(), z.number()).optional(),
  members: z.array(TripMemberSchema),
  itineraryDays: z.array(ItineraryDaySchema),
});

export type Trip = z.infer<typeof TripSchema>;
export type TripMember = z.infer<typeof TripMemberSchema>;
export type ItineraryDay = z.infer<typeof ItineraryDaySchema>;
export type Activity = z.infer<typeof ActivitySchema>;
