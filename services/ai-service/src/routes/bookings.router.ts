import { pendingBookings } from '../services/pending-bookings.service.js';
import { notifyTrip } from '../services/trip-notifications.service.js';
import { createBookedWorkspace } from '../services/booking-workspace.service.js';
import { z, ZodError } from 'zod';
import { destinationKey } from '../utils/destination.js';
import { TripModel } from '../db/models/trip.model.js';
import { BudgetModel } from '../db/models/budget.model.js';
import { PaymentIntentModel } from '../db/models/payment-intent.model.js';
import { fetchRazorpayPayment, refundRazorpayPayment } from '../services/razorpay.service.js';
import type { FilterQuery } from 'mongoose';
import { toError } from '../utils/errors.js';
/**
 * Booking Management Router
 * Provides REST endpoints for cross-service booking creation, modifications,
 * status updates, cancellations, and unified bookings retrieval in MongoDB Atlas.
 */

import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { BookingModel } from '../db/models/booking.model.js';
import { AlertModel } from '../db/models/alert.model.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const bookingsRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/bookings - List bookings
// ---------------------------------------------------------------------------
bookingsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    const filter: FilterQuery<Record<string, unknown>> = {};

    const pendingScope: FilterQuery<Record<string, unknown>> = {};
    if (userId && !(req.user?.role === 'admin' && req.query.all === 'true')) {
      const sharedTrips = await TripModel.find({travelMode:'group',$or:[{ownerId:userId},{'members.userId':userId},{'members.email':req.user!.email}]}).select('id');
      filter.$or = [{userId}, {tripId:{$in:sharedTrips.map(trip=>trip.id)}}];
      pendingScope.$or = [{userId}, {'reservation.tripId':{$in:sharedTrips.map(trip=>trip.id)}}];
    }

    if (req.query.type) {
      filter.bookingType = req.query.type;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [confirmed, pending] = await Promise.all([
      BookingModel.find(filter).sort({ createdAt: -1 }).limit(100),
      !req.query.status || req.query.status === 'pending' ? pendingBookings(pendingScope) : Promise.resolve([]),
    ]);
    const bookings = [...confirmed, ...pending.filter(item => !req.query.type || item.bookingType === req.query.type)]
      .sort((a,b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0,100);
    res.status(200).json({ ok: true, count: bookings.length, bookings });
  } catch (caught) {
      const err = toError(caught);
    res.status(500).json({ ok: false, message: 'Failed to retrieve bookings.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/bookings/:id - Get booking by ID or reference
// ---------------------------------------------------------------------------
bookingsRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const booking = await BookingModel.findOne({
      $or: [{ id }, { bookingReference: id }],
    });
    const visible = booking && (booking.userId === req.user!.id || req.user?.role === 'admin' || (booking.tripId && await TripModel.exists({id:booking.tripId,travelMode:'group',$or:[{'members.userId':req.user!.id},{'members.email':req.user!.email}]})));

    if (!booking || !visible) {
      res.status(404).json({ ok: false, message: 'Booking not found.' });
      return;
    }

    res.status(200).json({ ok: true, booking });
  } catch (caught) {
      const err = toError(caught);
    res.status(500).json({ ok: false, message: 'Failed to retrieve booking.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/bookings - Create new booking
// ---------------------------------------------------------------------------
bookingsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const intent = await PaymentIntentModel.findOne({ id: req.body.paymentReference, userId: req.user!.id, status: 'captured' });
    if (!intent) { res.status(403).json({ message: 'Complete verified Razorpay checkout before confirming a reservation.' }); return; }
    const { booking, trip } = await createBookedWorkspace(req.user!, { ...intent.reservation, bookingReference: `${intent.provider === 'demo' ? 'VOY-DEMO' : 'VOY-RZP'}-${intent.id}`, paymentReference: intent.id });
    const userId = req.user!.id;
    // Automatically create a booking confirmation alert
    try {
      await AlertModel.create({
        id: `alt-${randomUUID().slice(0, 6)}`,
        user_id: userId,
        booking_id: booking.id,
        booking_reference: booking.bookingReference,
        booking_type: booking.bookingType,
        title: `Booking Confirmed: ${booking.bookingReference}`,
        message: `Your ${booking.bookingType} reservation for ${booking.totalAmount} ${booking.currency} is confirmed.`,
        severity: 'success',
        new_status: 'confirmed',
        is_read: false,
      });
    } catch {
      // Non-fatal
    }

    res.status(201).json({
      ok: true,
      message: 'Booking confirmed and recorded in shared MongoDB Atlas.',
      booking, trip,
    });
  } catch (caught) {
      const err = toError(caught);
    console.error('[Bookings API] Create error:', err);
    res.status(err instanceof ZodError ? 400 : err.statusCode || 500).json({ ok: false, message: err instanceof ZodError ? 'Select a destination and provide valid reservation details.' : err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/bookings/:id/cancel - Cancel booking
// ---------------------------------------------------------------------------
bookingsRouter.post('/:id/cancel', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await BookingModel.findOne({
      $or: [{ id }, { bookingReference: id }],
      ...(req.user?.role === 'admin' ? {} : { userId: req.user!.id }),
    });

    if (!booking) {
      res.status(404).json({ ok: false, message: 'Booking not found.' });
      return;
    }

    if (booking.paymentReference) {
      const intent = await PaymentIntentModel.findOne({ id: booking.paymentReference, userId: booking.userId });
      if (!intent?.paymentId) { res.status(409).json({ message: 'The original payment could not be located. Please contact support before cancelling.' }); return; }
      if (intent.provider !== 'demo') {
      const payment = await fetchRazorpayPayment(intent.paymentId);
      if (payment.refund_status !== 'full') {
        const refund = await refundRazorpayPayment(intent.paymentId);
        if (refund.status !== 'processed') { res.status(409).json({ message: 'Your refund is processing at Razorpay. Refresh the booking status shortly.' }); return; }
      }
      }
      intent.status = 'refunded'; await intent.save();
    }
    const oldStatus = booking.status;
    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    await booking.save();
    if(booking.tripId) await notifyTrip(booking.tripId,'Booking cancelled',`${req.user!.name} cancelled ${booking.bookingReference}.`);

    // Trigger alert
    await AlertModel.create({
      id: `alt-${randomUUID().slice(0, 6)}`,
      user_id: booking.userId,
      booking_id: booking.id,
      booking_reference: booking.bookingReference,
      booking_type: booking.bookingType,
      title: `Booking Cancelled: ${booking.bookingReference}`,
      message: `Reservation was cancelled. Reason: ${reason || 'Customer request'}. Refund processed.`,
      severity: 'warning',
      old_status: oldStatus,
      new_status: 'cancelled',
      is_read: false,
    });

    res.status(200).json({
      ok: true,
      message: `Booking ${booking.bookingReference} cancelled successfully.`,
      booking,
    });
  } catch (caught) {
      const err = toError(caught);
    res.status(500).json({ ok: false, message: 'Failed to cancel booking.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/bookings/:id - Update or modify booking
// ---------------------------------------------------------------------------
bookingsRouter.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const allowed = ['contactPhone', 'specialRequests', 'totalAmount', 'flightDetails', 'hotelDetails', 'transportDetails'];
    if (Object.keys(req.body).some(key => !allowed.includes(key))) {
      res.status(403).json({ ok: false, message: 'Reservation ownership, destination and payment details cannot be changed here.' });
      return;
    }
    const booking = await BookingModel.findOne(
      { $or: [{ id }, { bookingReference: id }], ...(req.user?.role === 'admin' ? {} : { userId: req.user!.id }) },
    );

    if (!booking) {
      res.status(404).json({ ok: false, message: 'Booking not found.' });
      return;
    }
    if (booking.status !== 'confirmed') { res.status(400).json({ message: 'Only confirmed reservations can be modified.' }); return; }
    if (booking.paymentReference && Object.keys(req.body).some(key => !['contactPhone', 'specialRequests'].includes(key))) { res.status(409).json({ message: 'For a paid Razorpay reservation, cancel and rebook to change the fare, guests or travel dates.' }); return; }
    const updates = z.object({ contactPhone: z.string().optional(), specialRequests: z.string().optional(), totalAmount: z.number().finite().positive().optional(), flightDetails: z.record(z.unknown()).optional(), hotelDetails: z.record(z.unknown()).optional(), transportDetails: z.record(z.unknown()).optional() }).parse(req.body);
    const field = booking.bookingType === 'flight' ? 'flightDetails' : booking.bookingType === 'hotel' ? 'hotelDetails' : 'transportDetails';
    if (['flightDetails', 'hotelDetails', 'transportDetails'].some(key => key !== field && key in updates)) { res.status(400).json({ message: 'Reservation type cannot change.' }); return; }
    const detail = updates[field];
    if (detail && destinationKey(String(detail.destinationCity || detail.city || '')) !== destinationKey(booking.destination || '')) { res.status(400).json({ message: 'Reservation destination cannot change.' }); return; }
    Object.assign(booking, updates);
    await booking.save();
    if (booking.tripId && updates.totalAmount) {
      const activityId = `booking-${booking.id}`;
      await TripModel.updateOne({ id: booking.tripId, 'activities.id': activityId }, { $set: { 'activities.$.cost': booking.totalAmount } });
      await BudgetModel.updateOne({ id: booking.tripId, 'expenses.id': activityId }, { $set: { 'expenses.$.amount': booking.totalAmount } });
    }

    res.status(200).json({ ok: true, message: 'Booking updated.', booking });
  } catch (caught) {
      const err = toError(caught);
    res.status(err instanceof ZodError ? 400 : 500).json({ ok: false, message: 'Failed to update booking.', error: err?.message });
  }
});
