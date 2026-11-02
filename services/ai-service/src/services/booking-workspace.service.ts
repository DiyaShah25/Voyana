import { notifyTrip } from './trip-notifications.service.js';
import { validateBookingTrip } from './booking-authority.service.js';
import { createHash, randomUUID } from 'crypto';
import { z } from 'zod';
import { BookingModel } from '../db/models/booking.model.js';
import { TripModel } from '../db/models/trip.model.js';
import { BudgetModel } from '../db/models/budget.model.js';
import { destinationKey } from '../utils/destination.js';
import type { AuthUser } from '../middleware/auth.middleware.js';

const inputSchema = z.object({
  tripId: z.string().optional(), travelMode: z.enum(['solo','group']).optional(),
  id: z.string().optional(), bookingReference: z.string().optional(),
  destination: z.string().trim().min(2), country: z.string().optional(),
  bookingType: z.enum(['flight', 'hotel', 'transport', 'package']),
  status: z.literal('confirmed').default('confirmed'), paymentStatus: z.literal('paid').default('paid'),
  totalAmount: z.number().finite().positive(), currency: z.string().length(3).default('INR'), paymentReference: z.string().optional(),
  contactEmail: z.string().email(), contactPhone: z.string().optional(), specialRequests: z.string().optional(),
  flightDetails: z.record(z.unknown()).optional(), hotelDetails: z.record(z.unknown()).optional(),
  transportDetails: z.record(z.unknown()).optional(), details: z.record(z.unknown()).optional(),
});

export async function createBookedWorkspace(user: AuthUser, raw: Record<string, unknown>) {
  const candidate = raw.flightDetails || raw.hotelDetails || raw.transportDetails;
  const detail = candidate && typeof candidate === 'object' ? candidate as Record<string, unknown> : {};
  const actualDestination = String(detail.destinationCity || detail.city || '');
  const input = inputSchema.parse({ ...raw, destination: raw.destination || actualDestination });
  if (input.bookingType !== 'package' && (!actualDestination || destinationKey(input.destination) !== destinationKey(actualDestination))) {
    throw Object.assign(new Error('The reservation must match the selected destination.'), { statusCode: 400 });
  }
  if (input.bookingType === 'package') {
    const items = input.details?.items;
    if (!Array.isArray(items) || items.length === 0) throw Object.assign(new Error('A bundle needs matching travel items.'), { statusCode: 400 });
    for (const item of items) {
      const data = item?.details;
      const target = data?.flight?.destinationAirport?.city || data?.hotel?.city || data?.transport?.destinationCity;
      if (typeof target !== 'string' || destinationKey(target) !== destinationKey(input.destination)) throw Object.assign(new Error('Every bundle item must match the selected destination.'), { statusCode: 400 });
    }
  }
  await validateBookingTrip(user, input);
  const key = destinationKey(input.destination);
  const tripId = input.tripId || `trip-booked-${createHash('sha256').update(`${user.id}|${key}|${input.currency}`).digest('hex').slice(0, 20)}`;
  const existingTrip = await TripModel.findOne({ id: tripId });
  if (existingTrip && existingTrip.currency !== input.currency) {
    throw Object.assign(new Error('Use the trip currency for this reservation.'), { statusCode: 400 });
  }
  const reference = input.bookingReference || `VOY-${input.bookingType.toUpperCase()}-${randomUUID().slice(0, 8)}`;
  let booking = await BookingModel.findOne({ bookingReference: reference, userId: user.id });
  if (booking && (booking.tripId !== tripId || booking.totalAmount !== input.totalAmount || booking.status !== 'confirmed')) {
    throw Object.assign(new Error('This booking reference already belongs to a different or cancelled reservation.'), { statusCode: 409 });
  }
  if (!booking) booking = await BookingModel.create({ ...input, id: input.id || randomUUID(), userId: user.id, tripId, destinationKey: key, bookingReference: reference });

  const startDate = String(detail.checkInDate || detail.departureTime || detail.scheduledDeparture || new Date().toISOString()).slice(0, 10);
  const endDate = String(detail.checkOutDate || detail.arrivalTime || startDate).slice(0, 10);
  const trip = await TripModel.findOneAndUpdate({ id: tripId }, { $setOnInsert: {
    id: tripId, ownerId: user.id, travelMode: input.travelMode || 'solo', lifecycle: 'booked', title: `${input.destination} trip`, destination: input.destination,
    country: input.country || '', startDate, endDate, visibility: 'private',
    budgetTarget: Math.max(1000, input.totalAmount * 2), currency: input.currency, tags: ['Booked trip'],
    members: [{ id: `owner-${user.id}`, tripId, userId: user.id, name: user.name, email: user.email, role: 'owner', joinedAt: new Date().toISOString() }], activities: [],
  } }, { upsert: true, new: true, setDefaultsOnInsert: true });

  await TripModel.updateOne({ id: tripId, lifecycle: { $ne: 'completed' } }, { $set: { lifecycle: 'booked' } });
  const title = String(detail.hotelName || detail.providerName || (detail.airline ? `${detail.airline} ${detail.flightNumber}` : `Travel bundle ${reference}`));
  const activityId = `booking-${booking.id}`;
  await TripModel.updateOne({ id: tripId, 'activities.id': { $ne: activityId } }, { $push: { activities: {
    id: activityId, dayNumber: 1, activityDate: startDate, title, locationName: input.destination,
    category: input.bookingType === 'hotel' ? 'Accommodation' : 'Transport', cost: input.totalAmount, bookingReference: reference, orderIndex: trip.activities.length,
  } } });
  const members = trip.members.map(member => member.name);
  await BudgetModel.updateOne({ id: tripId }, { $setOnInsert: {
    id: tripId, tripId, destination: input.destination, totalBudget: trip.budgetTarget, currency: input.currency, members,
    allocations: [{ category: 'Flights', allocated: trip.budgetTarget * 0.4, color: '#047857' }, { category: 'Accommodations', allocated: trip.budgetTarget * 0.35, color: '#0369a1' }, { category: 'Transport', allocated: trip.budgetTarget * 0.15, color: '#b45309' }, { category: 'Activities', allocated: trip.budgetTarget * 0.1, color: '#7c3aed' }], expenses: [],
  } }, { upsert: true });
  await BudgetModel.updateOne({ id: tripId, 'expenses.id': { $ne: activityId } }, { $push: { expenses: {
    id: activityId, title, amount: input.totalAmount, currency: input.currency,
    category: input.bookingType === 'flight' ? 'Flights' : input.bookingType === 'hotel' ? 'Accommodations' : 'Transport',
    date: startDate, paidBy: user.name, splitAmong: members, notes: reference, createdAt: new Date().toISOString(),
  } } });
  await notifyTrip(tripId, 'Booking confirmed', `${user.name} confirmed ${input.bookingType} in ${input.destination}. Reference: ${reference}`, `confirmed-${reference}`);
  return { booking, trip: await TripModel.findOne({ id: tripId }) };
}
