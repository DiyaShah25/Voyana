/**
 * Booking Alert & Notification Router
 * Provides REST endpoints for alert generation, unread counts,
 * status change notices, and mark-as-read tracking in MongoDB Atlas.
 */

import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { AlertModel } from '../db/models/alert.model.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const alertsRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/alerts - List alerts
// ---------------------------------------------------------------------------
alertsRouter.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    const filter: any = {};

    if (userId) {
      filter.user_id = userId;
    }

    const alerts = await AlertModel.find(filter).sort({ created_at: -1 }).limit(50);
    const unreadCount = await AlertModel.countDocuments({ ...filter, is_read: false });

    res.status(200).json({ ok: true, count: alerts.length, unreadCount, alerts });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to fetch alerts.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/alerts - Create alert
// ---------------------------------------------------------------------------
alertsRouter.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = req.body;
    const userId = req.user?.id || body.user_id || 'usr-demo-01';

    if (!body.title || !body.message) {
      res.status(400).json({ ok: false, message: 'Alert title and message are required.' });
      return;
    }

    const alert = new AlertModel({
      id: body.id || `alt-${randomUUID().slice(0, 6)}`,
      user_id: userId,
      booking_id: body.booking_id,
      booking_reference: body.booking_reference,
      booking_type: body.booking_type,
      title: body.title,
      message: body.message,
      severity: body.severity || 'info',
      old_status: body.old_status,
      new_status: body.new_status,
      is_read: false,
    });

    await alert.save();
    res.status(201).json({ ok: true, message: 'Alert created.', alert });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to create alert.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/alerts/:id/read - Mark an alert as read
// ---------------------------------------------------------------------------
alertsRouter.put('/:id/read', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const alert = await AlertModel.findOneAndUpdate({ id }, { $set: { is_read: true } }, { new: true });

    if (!alert) {
      res.status(404).json({ ok: false, message: 'Alert not found.' });
      return;
    }

    res.status(200).json({ ok: true, message: 'Alert marked as read.', alert });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to update alert.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/alerts/read-all - Mark all alerts as read
// ---------------------------------------------------------------------------
alertsRouter.put('/read-all', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || (req.body.userId as string);
    const filter: any = {};
    if (userId) filter.user_id = userId;

    await AlertModel.updateMany(filter, { $set: { is_read: true } });
    res.status(200).json({ ok: true, message: 'All alerts marked as read.' });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to mark all alerts as read.', error: err?.message });
  }
});
