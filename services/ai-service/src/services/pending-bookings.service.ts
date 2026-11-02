import type { FilterQuery } from 'mongoose';
import { PaymentIntentModel } from '../db/models/payment-intent.model.js';

// Read-only unpaid checkouts never grant paid-trip access or create expenses.
export async function pendingBookings(scope: FilterQuery<Record<string, unknown>>) {
  const intents = await PaymentIntentModel.find({ ...scope, status: 'created' })
    .sort({ createdAt: -1 }).limit(100);
  return intents.map(intent => {
    const r = intent.reservation;
    return {
      id: `pending-${intent.id}`, userId: intent.userId,
      bookingReference: `PENDING-${intent.id}`, bookingType: r.bookingType,
      destination: r.destination, tripId: r.tripId,
      status: 'pending', paymentStatus: 'unpaid',
      totalAmount: intent.amountPaise / 100, currency: intent.currency,
      contactEmail: r.contactEmail, flightDetails: r.flightDetails,
      hotelDetails: r.hotelDetails, transportDetails: r.transportDetails,
      details: r.details, createdAt: intent.createdAt, updatedAt: intent.createdAt,
    };
  });
}
