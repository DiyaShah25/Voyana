/**
 * Destinations Router
 * REST endpoints for retrieving curated global destinations, coordinates,
 * and regional filters from MongoDB Atlas.
 */

import { Router, Request, Response } from 'express';
import { DestinationModel } from '../db/models/destination.model.js';

export const destinationsRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/destinations - Retrieve all destinations or filter by region
// ---------------------------------------------------------------------------
destinationsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { region } = req.query;
    const filter: Record<string, any> = {};

    if (region && typeof region === 'string' && region.toLowerCase() !== 'all') {
      filter.region = new RegExp(`^${region.trim()}$`, 'i');
    }

    const destinations = await DestinationModel.find(filter).sort({ name: 1 });

    res.status(200).json({
      ok: true,
      count: destinations.length,
      destinations,
    });
  } catch (err: any) {
    console.error('[DestinationsRouter] Error fetching destinations:', err);
    res.status(500).json({
      ok: false,
      message: 'Failed to retrieve destinations from database.',
      error: err?.message,
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/destinations/:id - Retrieve single destination by id
// ---------------------------------------------------------------------------
destinationsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const destination = await DestinationModel.findOne({ id });

    if (!destination) {
      res.status(404).json({ ok: false, message: `Destination '${id}' not found.` });
      return;
    }

    res.status(200).json({ ok: true, destination });
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch destination details.',
      error: err?.message,
    });
  }
});
