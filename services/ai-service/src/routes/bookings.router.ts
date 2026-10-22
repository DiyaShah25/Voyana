/**
 * Booking Management Router
 * Provides REST endpoints for cross-service booking creation, modifications,
 * status updates, cancellations, and unified bookings retrieval in MongoDB Atlas.
 */

import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { BookingModel, IBooking } from '../db/models/booking.model.js';
import { AlertModel } from '../db/models/alert.model.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const bookingsRouter = Router();

function generateBookingReference(type: string): string {
  const prefix =
    type === 'flight' ? 'VOY-FL' : type === 'hotel' ? 'VOY-HT' : type === 'transport' ? 'VOY-TR' : 'VOY-PK';
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${num}`;
}

// ---------------------------------------------------------------------------
// GET /api/bookings - List bookings
// ---------------------------------------------------------------------------
bookingsRouter.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    const filter: any = {};

    if (userId && req.user?.role !== 'admin') {
      filter.userId = userId;
    }

    if (req.query.type) {
      filter.bookingType = req.query.type;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const bookings = await BookingModel.find(filter).sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ ok: true, count: bookings.length, bookings });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to retrieve bookings.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/bookings/:id - Get booking by ID or reference
// ---------------------------------------------------------------------------
bookingsRouter.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const booking = await BookingModel.findOne({
      $or: [{ id }, { bookingReference: id }],
    });

    if (!booking) {
      res.status(404).json({ ok: false, message: 'Booking not found.' });
      return;
    }

    res.status(200).json({ ok: true, booking });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to retrieve booking.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/bookings - Create new booking
// ---------------------------------------------------------------------------
bookingsRouter.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = req.body;
    const userId = req.user?.id || body.userId || 'usr-demo-01';
    const bookingReference = body.bookingReference || generateBookingReference(body.bookingType || 'flight');

    if (!body.bookingType || body.totalAmount === undefined || !body.contactEmail) {
      res.status(400).json({
        ok: false,
        message: 'bookingType, totalAmount, and contactEmail are required.',
      });
      return;
    }

    const booking = new BookingModel({
      id: body.id || `bkg-${randomUUID().slice(0, 8)}`,
      userId,
      bookingReference,
      bookingType: body.bookingType,
      status: body.status || 'confirmed',
      totalAmount: Number(body.totalAmount) || 0,
      currency: body.currency || 'USD',
      paymentStatus: body.paymentStatus || 'paid',
      contactEmail: body.contactEmail.trim().toLowerCase(),
      contactPhone: body.contactPhone,
      specialRequests: body.specialRequests,
      flightDetails: body.flightDetails,
      hotelDetails: body.hotelDetails,
      transportDetails: body.transportDetails,
    });

    await booking.save();

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
      booking,
    });
  } catch (err: any) {
    console.error('[Bookings API] Create error:', err);
    res.status(500).json({ ok: false, message: 'Failed to create booking.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/bookings/:id/cancel - Cancel booking
// ---------------------------------------------------------------------------
bookingsRouter.post('/:id/cancel', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await BookingModel.findOne({
      $or: [{ id }, { bookingReference: id }],
    });

    if (!booking) {
      res.status(404).json({ ok: false, message: 'Booking not found.' });
      return;
    }

    const oldStatus = booking.status;
    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    await booking.save();

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
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to cancel booking.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/bookings/:id - Update or modify booking
// ---------------------------------------------------------------------------
bookingsRouter.put('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates._id;
    delete updates.id;

    const booking = await BookingModel.findOneAndUpdate(
      { $or: [{ id }, { bookingReference: id }] },
      { $set: updates },
      { new: true }
    );

    if (!booking) {
      res.status(404).json({ ok: false, message: 'Booking not found.' });
      return;
    }

    res.status(200).json({ ok: true, message: 'Booking updated.', booking });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to update booking.', error: err?.message });
  }
});
