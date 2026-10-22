/**
 * Trip & Itinerary Management Router
 * Provides REST endpoints for creating, retrieving, updating, and deleting trips,
 * managing multi-day activities, and handling collaborator memberships in MongoDB Atlas.
 */

import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { TripModel, ITripActivity, ITripMember } from '../db/models/trip.model.js';
import { optionalAuth, requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const tripsRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/trips - List trips with search, filters, and visibility checks
// ---------------------------------------------------------------------------
tripsRouter.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { destination, search, templateOnly, ownerId } = req.query;
    const currentUserId = req.user?.id;

    const filter: any = {};

    if (templateOnly === 'true') {
      filter.isTemplate = true;
    } else if (ownerId) {
      filter.ownerId = ownerId;
    } else if (currentUserId) {
      // Show templates, public/shared trips, and any trip where user is owner or member
      filter.$or = [
        { isTemplate: true },
        { visibility: { $in: ['public', 'shared'] } },
        { ownerId: currentUserId },
        { 'members.userId': currentUserId },
        { 'members.email': req.user?.email },
      ];
    } else {
      // Unauthenticated: show public trips and curated templates
      filter.$or = [
        { isTemplate: true },
        { visibility: { $in: ['public', 'shared'] } },
      ];
    }

    if (destination && typeof destination === 'string') {
      filter.destination = new RegExp(destination.trim(), 'i');
    }

    if (search && typeof search === 'string') {
      const term = search.trim();
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title: new RegExp(term, 'i') },
          { destination: new RegExp(term, 'i') },
          { country: new RegExp(term, 'i') },
          { tags: { $in: [new RegExp(term, 'i')] } },
        ],
      });
    }

    const trips = await TripModel.find(filter).sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ ok: true, count: trips.length, trips });
  } catch (err: any) {
    console.error('[Trips API] List error:', err);
    res.status(500).json({ ok: false, message: 'Failed to retrieve trips.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/trips/:id - Get trip details by ID
// ---------------------------------------------------------------------------
tripsRouter.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const trip = await TripModel.findOne({ id: req.params.id });
    if (!trip) {
      res.status(404).json({ ok: false, message: 'Trip not found.' });
      return;
    }
    res.status(200).json({ ok: true, trip });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to fetch trip details.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/trips - Create new trip
// ---------------------------------------------------------------------------
tripsRouter.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = req.body;
    const ownerId = req.user?.id || body.ownerId || 'usr-demo-01';
    const ownerName = req.user?.name || body.ownerName || 'Voyana Traveler';
    const ownerEmail = req.user?.email || body.ownerEmail || 'traveler@voyana.com';

    if (!body.title || !body.destination || !body.startDate || !body.endDate) {
      res.status(400).json({
        ok: false,
        message: 'Trip title, destination, startDate, and endDate are required fields.',
      });
      return;
    }

    const tripId = body.id || `trip-${randomUUID().slice(0, 8)}`;

    const initialMembers: ITripMember[] = body.members?.length
      ? body.members
      : [
          {
            id: `m-${randomUUID().slice(0, 6)}`,
            userId: ownerId,
            name: ownerName,
            email: ownerEmail,
            role: 'owner',
            joinedAt: new Date().toISOString(),
          },
        ];

    // If invited emails supplied, add them as invited members
    if (Array.isArray(body.invitedEmails)) {
      for (const email of body.invitedEmails) {
        if (email && typeof email === 'string' && email.includes('@')) {
          initialMembers.push({
            id: `m-${randomUUID().slice(0, 6)}`,
            name: email.split('@')[0],
            email: email.trim().toLowerCase(),
            role: 'editor',
            joinedAt: new Date().toISOString(),
          });
        }
      }
    }

    const trip = new TripModel({
      id: tripId,
      ownerId,
      title: body.title.trim(),
      destination: body.destination.trim(),
      country: body.country || '',
      startDate: body.startDate,
      endDate: body.endDate,
      description: body.description || '',
      coverImage: body.coverImage || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80',
      visibility: body.visibility || 'shared',
      budgetTarget: Number(body.budgetTarget) || 0,
      currency: body.currency || 'USD',
      tags: Array.isArray(body.tags) ? body.tags : ['Vacation', 'Exploration'],
      isTemplate: Boolean(body.isTemplate),
      members: initialMembers,
      activities: Array.isArray(body.activities) ? body.activities : [],
    });

    await trip.save();

    res.status(201).json({
      ok: true,
      message: 'Trip created successfully in shared MongoDB Atlas.',
      trip,
    });
  } catch (err: any) {
    console.error('[Trips API] Create error:', err);
    res.status(500).json({ ok: false, message: 'Failed to create trip.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/trips/:id - Update trip details
// ---------------------------------------------------------------------------
tripsRouter.put('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates._id;
    delete updates.id;

    const trip = await TripModel.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!trip) {
      res.status(404).json({ ok: false, message: 'Trip not found.' });
      return;
    }

    res.status(200).json({
      ok: true,
      message: 'Trip updated successfully in shared MongoDB Atlas.',
      trip,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to update trip.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/trips/:id - Delete trip
// ---------------------------------------------------------------------------
tripsRouter.delete('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await TripModel.findOneAndDelete({ id });

    if (!result) {
      res.status(404).json({ ok: false, message: 'Trip not found.' });
      return;
    }

    res.status(200).json({
      ok: true,
      message: `Trip "${result.title}" deleted from shared MongoDB Atlas.`,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to delete trip.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/trips/:id/activities - Add activity to trip
// ---------------------------------------------------------------------------
tripsRouter.post('/:id/activities', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body;

    const newActivity: ITripActivity = {
      id: body.id || `act-${randomUUID().slice(0, 6)}`,
      dayNumber: Number(body.dayNumber) || 1,
      activityDate: body.activityDate,
      timeSlot: body.timeSlot || '10:00 AM',
      title: body.title || 'Sightseeing activity',
      locationName: body.locationName,
      description: body.description,
      cost: Number(body.cost) || 0,
      category: body.category || 'Sightseeing',
      bookingReference: body.bookingReference,
      orderIndex: Number(body.orderIndex) || 0,
      isCompleted: Boolean(body.isCompleted),
    };

    const trip = await TripModel.findOneAndUpdate(
      { id },
      { $push: { activities: newActivity } },
      { new: true }
    );

    if (!trip) {
      res.status(404).json({ ok: false, message: 'Trip not found.' });
      return;
    }

    res.status(201).json({
      ok: true,
      message: 'Activity added to trip itinerary.',
      activity: newActivity,
      trip,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to add activity.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/trips/:id/activities/:activityId - Update an activity
// ---------------------------------------------------------------------------
tripsRouter.put('/:id/activities/:activityId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id, activityId } = req.params;
    const updates = req.body;

    const trip = await TripModel.findOne({ id });
    if (!trip) {
      res.status(404).json({ ok: false, message: 'Trip not found.' });
      return;
    }

    const activityIndex = trip.activities.findIndex((a) => a.id === activityId);
    if (activityIndex === -1) {
      res.status(404).json({ ok: false, message: 'Activity not found in this trip.' });
      return;
    }

    Object.assign(trip.activities[activityIndex], updates);
    trip.markModified('activities');
    await trip.save();

    res.status(200).json({
      ok: true,
      message: 'Activity updated successfully.',
      activity: trip.activities[activityIndex],
      trip,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to update activity.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/trips/:id/activities/:activityId - Delete an activity
// ---------------------------------------------------------------------------
tripsRouter.delete('/:id/activities/:activityId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id, activityId } = req.params;

    const trip = await TripModel.findOneAndUpdate(
      { id },
      { $pull: { activities: { id: activityId } } },
      { new: true }
    );

    if (!trip) {
      res.status(404).json({ ok: false, message: 'Trip not found.' });
      return;
    }

    res.status(200).json({ ok: true, message: 'Activity removed.', trip });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to remove activity.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/trips/:id/members - Invite collaborator to trip
// ---------------------------------------------------------------------------
tripsRouter.post('/:id/members', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, role = 'editor' } = req.body;

    if (!email || !email.includes('@')) {
      res.status(400).json({ ok: false, message: 'Valid email is required.' });
      return;
    }

    const newMember: ITripMember = {
      id: `m-${randomUUID().slice(0, 6)}`,
      name: name || email.split('@')[0],
      email: email.trim().toLowerCase(),
      role: ['owner', 'editor', 'viewer'].includes(role) ? role : 'editor',
      joinedAt: new Date().toISOString(),
    };

    const trip = await TripModel.findOneAndUpdate(
      { id, 'members.email': { $ne: newMember.email } },
      { $push: { members: newMember } },
      { new: true }
    );

    if (!trip) {
      res.status(400).json({ ok: false, message: 'Trip not found or member already exists in this trip.' });
      return;
    }

    res.status(201).json({ ok: true, message: 'Collaborator added to trip.', member: newMember, trip });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to add collaborator.', error: err?.message });
  }
});
