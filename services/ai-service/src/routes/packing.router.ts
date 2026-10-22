/**
 * Smart Packing Checklist Router
 * Provides REST endpoints for trip packing checklists, category items,
 * and member assignments in MongoDB Atlas.
 */

import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { PackingListModel, IPackingItem } from '../db/models/packing.model.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const packingRouter = Router();

const DEFAULT_ITEMS: IPackingItem[] = [
  {
    id: 'pack-1',
    name: 'Passport & Visa Documents',
    category: 'Documents & Money',
    isPacked: true,
    priority: 'essential',
    assignedTo: 'Diya Shah',
    quantity: 1,
    notes: 'Digital backup in encrypted cloud',
  },
  {
    id: 'pack-2',
    name: 'Travel Insurance Certificate',
    category: 'Documents & Money',
    isPacked: true,
    priority: 'essential',
    assignedTo: 'Everyone',
    quantity: 1,
  },
  {
    id: 'pack-3',
    name: 'Universal Power Adapter',
    category: 'Electronics',
    isPacked: false,
    priority: 'essential',
    assignedTo: 'Tirth Gandhi',
    quantity: 2,
  },
];

// ---------------------------------------------------------------------------
// GET /api/packing/:tripId - Get or initialize checklist
// ---------------------------------------------------------------------------
packingRouter.get('/:tripId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId } = req.params;
    let list = await PackingListModel.findOne({
      $or: [{ id: tripId }, { tripId }],
    });

    if (!list) {
      list = new PackingListModel({
        id: tripId,
        tripId,
        destination: 'Paris',
        tripDurationDays: 5,
        seasonOrWeather: 'Mild Autumn',
        items: DEFAULT_ITEMS,
      });
      await list.save();
    }

    res.status(200).json({ ok: true, list });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to retrieve packing list.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/packing/:tripId - Update packing list
// ---------------------------------------------------------------------------
packingRouter.put('/:tripId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId } = req.params;
    const updates = req.body;
    delete updates._id;

    const list = await PackingListModel.findOneAndUpdate(
      { $or: [{ id: tripId }, { tripId }] },
      { $set: updates },
      { new: true, upsert: true }
    );

    res.status(200).json({ ok: true, message: 'Packing checklist updated.', list });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to update packing list.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/packing/:tripId/items - Add an item
// ---------------------------------------------------------------------------
packingRouter.post('/:tripId/items', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId } = req.params;
    const body = req.body;

    if (!body.name) {
      res.status(400).json({ ok: false, message: 'Item name is required.' });
      return;
    }

    const newItem: IPackingItem = {
      id: body.id || `pack-${randomUUID().slice(0, 6)}`,
      name: body.name.trim(),
      category: body.category || 'Clothing',
      isPacked: Boolean(body.isPacked),
      priority: body.priority || 'recommended',
      assignedTo: body.assignedTo || 'Everyone',
      quantity: Number(body.quantity) || 1,
      notes: body.notes,
      weatherTag: body.weatherTag,
    };

    let list = await PackingListModel.findOne({
      $or: [{ id: tripId }, { tripId }],
    });

    if (!list) {
      list = new PackingListModel({
        id: tripId,
        tripId,
        destination: 'Travel Destination',
        tripDurationDays: 5,
        seasonOrWeather: 'Mild',
        items: [],
      });
      await list.save();
    }

    list.items.push(newItem);
    await list.save();

    res.status(201).json({ ok: true, message: 'Item added.', item: newItem, list });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to add packing item.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/packing/:tripId/items/:itemId - Toggle or update item
// ---------------------------------------------------------------------------
packingRouter.put('/:tripId/items/:itemId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId, itemId } = req.params;
    const updates = req.body;

    const list = await PackingListModel.findOne({
      $or: [{ id: tripId }, { tripId }],
    });

    if (!list) {
      res.status(404).json({ ok: false, message: 'Packing list not found.' });
      return;
    }

    const item = list.items.find((i) => i.id === itemId);
    if (!item) {
      res.status(404).json({ ok: false, message: 'Packing item not found.' });
      return;
    }

    Object.assign(item, updates);
    list.markModified('items');
    await list.save();

    res.status(200).json({ ok: true, message: 'Item updated.', item, list });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to update item.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/packing/:tripId/items/:itemId - Delete item
// ---------------------------------------------------------------------------
packingRouter.delete('/:tripId/items/:itemId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId, itemId } = req.params;

    const list = await PackingListModel.findOneAndUpdate(
      { $or: [{ id: tripId }, { tripId }] },
      { $pull: { items: { id: itemId } } },
      { new: true }
    );

    if (!list) {
      res.status(404).json({ ok: false, message: 'Packing list not found.' });
      return;
    }

    res.status(200).json({ ok: true, message: 'Item removed.', list });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to delete item.', error: err?.message });
  }
});
