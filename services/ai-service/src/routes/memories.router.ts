/**
 * Travel Memories & Photo Journal REST API Router
 * Provides complete CRUD, likes, filtering, search, and AI story generation
 * persisted in MongoDB Atlas 'memories' collection.
 */

import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { MemoryModel, IMemory } from '../db/models/collaboration.model.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const memoriesRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/memories - List all travel memories with search, filter, and sort
// ---------------------------------------------------------------------------
memoriesRouter.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId, tag, search, sortBy, limit } = req.query;
    const filter: any = {};

    if (tripId && tripId !== 'all') {
      filter.tripId = String(tripId);
    }

    if (tag && tag !== 'all') {
      filter.tags = String(tag);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { caption: { $regex: q, $options: 'i' } },
        { locationName: { $regex: q, $options: 'i' } },
        { uploadedBy: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } },
      ];
    }

    let query = MemoryModel.find(filter);

    if (sortBy === 'likes') {
      // Sort in memory after fetch or by likes array length
      const docs = await query.exec();
      docs.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
      const maxLimit = limit ? Math.min(Number(limit), 200) : 100;
      const sliced = docs.slice(0, maxLimit);
      const allTags = Array.from(new Set(docs.flatMap((m) => m.tags || [])));
      res.status(200).json({ ok: true, count: sliced.length, total: docs.length, memories: sliced, tags: allTags });
      return;
    } else if (sortBy === 'oldest') {
      query = query.sort({ date: 1, createdAt: 1 });
    } else {
      // Default: newest first
      query = query.sort({ date: -1, createdAt: -1 });
    }

    const maxLimit = limit ? Math.min(Number(limit), 200) : 100;
    const memories = await query.limit(maxLimit).exec();
    const allTags = Array.from(new Set(memories.flatMap((m) => m.tags || [])));

    res.status(200).json({
      ok: true,
      count: memories.length,
      memories,
      tags: allTags,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to retrieve travel memories.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/memories/:id - Get single memory by ID
// ---------------------------------------------------------------------------
memoriesRouter.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const memory = await MemoryModel.findOne({
      $or: [{ id }, { _id: /^[0-9a-fA-F]{24}$/.test(id) ? id : null }],
    });

    if (!memory) {
      res.status(404).json({ ok: false, message: 'Travel memory not found.' });
      return;
    }

    res.status(200).json({ ok: true, memory });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to retrieve memory.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/memories - Create and persist a new travel memory in MongoDB
// ---------------------------------------------------------------------------
memoriesRouter.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = req.body;
    const uploadedBy = body.uploadedBy || req.user?.name || 'Voyana Traveler';

    if (!body.title || !body.imageUrl) {
      res.status(400).json({ ok: false, message: 'Title and imageUrl are required to create a memory.' });
      return;
    }

    const tags = Array.isArray(body.tags)
      ? body.tags.map((t: string) => String(t).trim().replace(/^#/, '')).filter(Boolean)
      : typeof body.tags === 'string'
      ? body.tags.split(',').map((t: string) => t.trim().replace(/^#/, '')).filter(Boolean)
      : ['Travel', 'Moments'];

    const newMemory = new MemoryModel({
      id: body.id || `mem-${randomUUID().slice(0, 8)}`,
      tripId: body.tripId || 'trip-user-01',
      uploadedBy,
      title: body.title.trim(),
      locationName: body.locationName?.trim() || undefined,
      caption: body.caption?.trim() || undefined,
      imageUrl: body.imageUrl.trim(),
      date: body.date || new Date().toISOString().split('T')[0],
      likes: Array.isArray(body.likes) ? body.likes : [],
      tags,
    });

    await newMemory.save();
    res.status(201).json({
      ok: true,
      message: 'Travel memory saved successfully to MongoDB Atlas.',
      memory: newMemory,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to save travel memory.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/memories/:id/like - Toggle like on memory
// ---------------------------------------------------------------------------
memoriesRouter.post('/:id/like', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const userName = req.body.userName || req.user?.name || 'Voyana Traveler';

    const memory = await MemoryModel.findOne({
      $or: [{ id }, { _id: /^[0-9a-fA-F]{24}$/.test(id) ? id : null }],
    });

    if (!memory) {
      res.status(404).json({ ok: false, message: 'Memory not found.' });
      return;
    }

    const index = memory.likes.indexOf(userName);
    let isLiked = false;

    if (index > -1) {
      memory.likes.splice(index, 1);
      isLiked = false;
    } else {
      memory.likes.push(userName);
      isLiked = true;
    }

    memory.markModified('likes');
    await memory.save();

    res.status(200).json({
      ok: true,
      message: isLiked ? 'Memory liked.' : 'Like removed.',
      likes: memory.likes,
      isLiked,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to toggle like.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/memories/:id - Update an existing memory
// ---------------------------------------------------------------------------
memoriesRouter.put('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const body = req.body;

    const memory = await MemoryModel.findOne({
      $or: [{ id }, { _id: /^[0-9a-fA-F]{24}$/.test(id) ? id : null }],
    });

    if (!memory) {
      res.status(404).json({ ok: false, message: 'Memory not found.' });
      return;
    }

    if (body.title) memory.title = body.title.trim();
    if (body.caption !== undefined) memory.caption = body.caption.trim();
    if (body.locationName !== undefined) memory.locationName = body.locationName.trim();
    if (body.imageUrl) memory.imageUrl = body.imageUrl.trim();
    if (body.date) memory.date = body.date;
    if (body.tripId) memory.tripId = body.tripId;

    if (body.tags) {
      memory.tags = Array.isArray(body.tags)
        ? body.tags.map((t: string) => String(t).trim().replace(/^#/, '')).filter(Boolean)
        : typeof body.tags === 'string'
        ? body.tags.split(',').map((t: string) => t.trim().replace(/^#/, '')).filter(Boolean)
        : memory.tags;
    }

    await memory.save();
    res.status(200).json({
      ok: true,
      message: 'Travel memory updated successfully.',
      memory,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to update memory.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/memories/:id - Delete a memory from MongoDB
// ---------------------------------------------------------------------------
memoriesRouter.delete('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    const result = await MemoryModel.deleteOne({
      $or: [{ id }, { _id: /^[0-9a-fA-F]{24}$/.test(id) ? id : null }],
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ ok: false, message: 'Memory not found or already deleted.' });
      return;
    }

    res.status(200).json({ ok: true, message: 'Travel memory deleted successfully from MongoDB.' });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to delete memory.', error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/memories/ai-story - Generate AI reflection and smart hashtags
// ---------------------------------------------------------------------------
memoriesRouter.post('/ai-story', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title = '', location = '', destination = 'the journey' } = req.body;
    const place = location || destination || 'this unforgettable spot';
    const subject = title || 'travel moment';

    const reflections = [
      {
        caption: `Paused in the quiet glow of ${place} to take in "${subject}". There's a singular magic to traveling when the bustling world fades into soft light, leaving behind only the timeless pulse of discovery and genuine gratitude.`,
        tags: ['TravelMoments', 'Wanderlust', 'GoldenHour', 'ExploreMore', 'VoyanaTravel'],
      },
      {
        caption: `Unscripted memories are always the ones that linger longest. Finding ourselves surrounded by the sights, sounds, and vibrant rhythms of ${place} felt like stepping into an intimate postcard from "${subject}".`,
        tags: ['TravelDiary', 'HiddenGems', 'AdventureAwaits', 'LocalVibes', 'PassportReady'],
      },
      {
        caption: `Every street corner in ${place} carries its own quiet poetry. Standing here capturing "${subject}", you are reminded that the truest luxury of travel is time well shared with companions and open horizons.`,
        tags: ['MemoriesInTheMaking', 'CultureTrip', 'TravelInspiration', 'JourneyOn'],
      },
      {
        caption: `A snapshot that captures far more than just a photo—the laughter, the crisp morning breeze in ${place}, and the thrill of exploring "${subject}" together. Definitely one for the permanent travel journal.`,
        tags: ['TravelJournal', 'FriendshipTrip', 'PostcardsFromEverywhere', 'Wanderer'],
      },
      {
        caption: `Golden sunbeams dancing across ${place} during our exploration of "${subject}". Days like this remind us that travel isn't just about the places we visit, but the stories we take with us.`,
        tags: ['GoldenHour', 'ScenicViews', 'Wanderlust', 'TravelStories'],
      },
    ];

    const pick = reflections[Math.floor(Math.random() * reflections.length)];
    res.status(200).json({ ok: true, ...pick });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to generate story.', error: err?.message });
  }
});
