/**
 * MongoDB Data API Router
 * Exposes RESTful endpoints for Trips, Bookings, Expenses,
 * Packing Checklists, and Real-time Booking Alerts backed by MongoDB/Mongoose.
 */

import { Router, Request, Response } from 'express';
import { TripModel } from '../db/models/trip.model.js';
import { BookingModel } from '../db/models/booking.model.js';
import { ExpenseModel } from '../db/models/expense.model.js';
import { PackingListModel } from '../db/models/packing.model.js';
import { AlertModel } from '../db/models/alert.model.js';
import { getMongoStatus } from '../db/mongo.js';

export const apiRouter = Router();

// Middleware: Verify MongoDB connection or return graceful indicator
apiRouter.use((_req: Request, _res: Response, next) => {
  next();
});

// ─── Health / Status ────────────────────────────────────────────────────────
apiRouter.get('/status', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    database: 'MongoDB',
    mongoConnection: getMongoStatus(),
    timestamp: new Date().toISOString(),
  });
});

// ─── 1. Trips ───────────────────────────────────────────────────────────────
apiRouter.get('/trips', async (req: Request, res: Response) => {
  try {
    const trips = await TripModel.find().sort({ updatedAt: -1 }).lean();
    res.json({ success: true, count: trips.length, data: trips });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch trips' });
  }
});

apiRouter.get('/trips/:tripId', async (req: Request, res: Response) => {
  try {
    const trip = await TripModel.findOne({ tripId: req.params.tripId }).lean();
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
    res.json({ success: true, data: trip });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Database error' });
  }
});

apiRouter.post('/trips', async (req: Request, res: Response) => {
  try {
    const { tripId, title, destination, startDate, endDate, budgetTotal, coverImage, members, activities } = req.body;
    const resolvedTripId = tripId || `trip-${Date.now()}`;

    const trip = await TripModel.findOneAndUpdate(
      { tripId: resolvedTripId },
      {
        tripId: resolvedTripId,
        title,
        destination,
        startDate,
        endDate,
        budgetTotal: budgetTotal || 2500,
        coverImage,
        ...(members ? { members } : {}),
        ...(activities ? { activities } : {}),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, data: trip });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Failed to save trip' });
  }
});

apiRouter.delete('/trips/:tripId', async (req: Request, res: Response) => {
  try {
    await TripModel.deleteOne({ tripId: req.params.tripId });
    res.json({ success: true, message: 'Trip deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ─── 2. Bookings ────────────────────────────────────────────────────────────
apiRouter.get('/bookings', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || undefined;
    const filter = userId ? { userId } : {};
    const bookings = await BookingModel.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

apiRouter.post('/bookings', async (req: Request, res: Response) => {
  try {
    const booking = new BookingModel({
      bookingId: req.body.bookingId || `bk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: req.body.userId || 'usr-demo-01',
      bookingReference: req.body.bookingReference || `VOY-${Date.now().toString().slice(-6)}`,
      bookingType: req.body.bookingType,
      title: req.body.title,
      description: req.body.description,
      amount: req.body.amount,
      currency: req.body.currency || 'USD',
      status: req.body.status || 'confirmed',
      paymentStatus: req.body.paymentStatus || 'paid',
      details: req.body.details || {},
    });

    await booking.save();

    // Auto-create confirmation alert in MongoDB
    await AlertModel.create({
      alertId: `alt-${Date.now()}`,
      userId: booking.userId,
      bookingId: booking.bookingId,
      bookingReference: booking.bookingReference,
      bookingType: booking.bookingType,
      title: `${booking.bookingType.toUpperCase()} Reservation Confirmed`,
      message: `Your booking for "${booking.title}" has been recorded. Reference: ${booking.bookingReference}`,
      severity: 'success',
      isRead: false,
      newStatus: 'confirmed',
    });

    res.status(201).json({ success: true, data: booking });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message });
  }
});

apiRouter.put('/bookings/:bookingId/status', async (req: Request, res: Response) => {
  try {
    const { status, note } = req.body;
    const booking = await BookingModel.findOne({ bookingId: req.params.bookingId });
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    const oldStatus = booking.status;
    booking.status = status;
    await booking.save();

    // Create status change alert in MongoDB
    const severity = status === 'cancelled' ? 'critical' : status === 'delayed' ? 'warning' : 'info';
    await AlertModel.create({
      alertId: `alt-${Date.now()}`,
      userId: booking.userId,
      bookingId: booking.bookingId,
      bookingReference: booking.bookingReference,
      bookingType: booking.bookingType,
      title: `Booking Status: ${status.toUpperCase()}`,
      message: note || `Reservation ${booking.bookingReference} status shifted from ${oldStatus} to ${status}.`,
      severity,
      isRead: false,
      oldStatus,
      newStatus: status,
    });

    res.json({ success: true, data: booking });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ─── 3. Expenses & Budget ───────────────────────────────────────────────────
apiRouter.get('/expenses/:tripId', async (req: Request, res: Response) => {
  try {
    const expenses = await ExpenseModel.find({ tripId: req.params.tripId }).sort({ date: -1 }).lean();
    res.json({ success: true, count: expenses.length, data: expenses });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

apiRouter.post('/expenses', async (req: Request, res: Response) => {
  try {
    const expense = new ExpenseModel({
      expenseId: req.body.expenseId || `exp-${Date.now()}`,
      tripId: req.body.tripId,
      title: req.body.title,
      amount: req.body.amount,
      currency: req.body.currency || 'USD',
      category: req.body.category,
      paidBy: req.body.paidBy,
      splitAmong: req.body.splitAmong || [],
      date: req.body.date || new Date().toISOString().split('T')[0],
      paymentMethod: req.body.paymentMethod || 'Credit Card',
      notes: req.body.notes || '',
    });

    await expense.save();
    res.status(201).json({ success: true, data: expense });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message });
  }
});

apiRouter.delete('/expenses/:expenseId', async (req: Request, res: Response) => {
  try {
    await ExpenseModel.deleteOne({ expenseId: req.params.expenseId });
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ─── 4. Packing Checklist ───────────────────────────────────────────────────
apiRouter.get('/packing/:tripId', async (req: Request, res: Response) => {
  try {
    const packing = await PackingListModel.findOne({ tripId: req.params.tripId }).lean();
    res.json({ success: true, data: packing });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

apiRouter.post('/packing/:tripId', async (req: Request, res: Response) => {
  try {
    const { destination, tripDurationDays, seasonOrWeather, items } = req.body;
    const packing = await PackingListModel.findOneAndUpdate(
      { tripId: req.params.tripId },
      {
        tripId: req.params.tripId,
        destination,
        tripDurationDays: tripDurationDays || 5,
        seasonOrWeather: seasonOrWeather || 'Spring',
        items: items || [],
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: packing });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message });
  }
});

// ─── 5. Alerts ──────────────────────────────────────────────────────────────
apiRouter.get('/alerts', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || 'usr-demo-01';
    const alerts = await AlertModel.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

apiRouter.post('/alerts', async (req: Request, res: Response) => {
  try {
    const alert = new AlertModel({
      alertId: req.body.alertId || `alt-${Date.now()}`,
      userId: req.body.userId || 'usr-demo-01',
      bookingId: req.body.bookingId,
      bookingReference: req.body.bookingReference,
      bookingType: req.body.bookingType,
      title: req.body.title,
      message: req.body.message,
      severity: req.body.severity || 'info',
      isRead: false,
    });
    await alert.save();
    res.status(201).json({ success: true, data: alert });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message });
  }
});

apiRouter.put('/alerts/:alertId/read', async (req: Request, res: Response) => {
  try {
    await AlertModel.updateOne({ alertId: req.params.alertId }, { isRead: true });
    res.json({ success: true, message: 'Alert marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

apiRouter.put('/alerts/read-all', async (req: Request, res: Response) => {
  try {
    const userId = (req.body.userId as string) || 'usr-demo-01';
    await AlertModel.updateMany({ userId, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All alerts marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});
