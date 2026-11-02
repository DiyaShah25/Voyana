import type { Response, NextFunction } from 'express';
import { TripModel } from '../db/models/trip.model.js';
import { BookingModel } from '../db/models/booking.model.js';
import type { AuthenticatedRequest } from './auth.middleware.js';
import { destinationKey } from '../utils/destination.js';

async function checkWorkspace(req: AuthenticatedRequest, res: Response, next: NextFunction, booked: boolean): Promise<void> {
  try {
    const trip = await TripModel.findOne({ id: req.params.tripId || req.params.id });
    if (!trip || !req.user) { res.status(404).json({ message: 'Workspace not found.' }); return; }
    const owner = trip.ownerId === req.user.id;
    const member = trip.members.find(entry => entry.userId === req.user!.id || entry.email === req.user!.email);
    if (!owner && !member && req.user.role !== 'admin') { res.status(403).json({ message: 'You are not a member of this workspace.' }); return; }
    if (!owner && member?.role === 'viewer' && req.method !== 'GET' && req.user.role !== 'admin') { res.status(403).json({ message: 'This workspace is read-only for your account.' }); return; }
    if (!owner && req.user.role !== 'admin' && (req.method === 'DELETE' && req.path === '/' || req.body?.members || req.body?.ownerId || req.path.startsWith('/members'))) { res.status(403).json({ message: 'Only the owner can manage workspace membership.' }); return; }
    const booking = await BookingModel.exists({ userId: trip.ownerId, status: 'confirmed', paymentStatus: 'paid', $or: [{ tripId: trip.id }, { destinationKey: destinationKey(trip.destination) }] });
    if (booked && !booking && req.user.role !== 'admin') { res.status(403).json({ message: 'Confirm a reservation for this destination before using its workspace or expense tools.' }); return; }
    next();
  } catch (error) { next(error); }
}

export const requireBookedTrip = (req: AuthenticatedRequest, res: Response, next: NextFunction) => checkWorkspace(req, res, next, true);
export const requireTripMember = (req: AuthenticatedRequest, res: Response, next: NextFunction) => checkWorkspace(req, res, next, false);
