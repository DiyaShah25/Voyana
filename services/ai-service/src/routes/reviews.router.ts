/**
 * Travel Reviews Router
 * REST endpoints for querying reviews, calculating category metrics,
 * creating new verified reviews, and toggling helpful votes.
 */

import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { ReviewModel } from '../db/models/review.model.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const reviewsRouter = Router();

// GET /api/reviews - Query reviews with optional filters
reviewsRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { targetType, targetId, travelerType, minRating, sortBy } = req.query;
    const filter: Record<string, any> = {};

    if (targetType) {
      filter.targetType = targetType;
    }
    if (targetId && targetId !== 'all') {
      filter.targetId = (targetId as string).toLowerCase();
    }
    if (travelerType && travelerType !== 'all') {
      filter.travelerType = travelerType;
    }
    if (minRating) {
      filter.rating = { $gte: Number(minRating) };
    }

    let query = ReviewModel.find(filter);

    if (sortBy === 'highest') {
      query = query.sort({ rating: -1 });
    } else if (sortBy === 'newest') {
      query = query.sort({ createdAt: -1 });
    } else {
      query = query.sort({ helpfulVotes: -1 });
    }

    const reviews = await query.limit(100);
    res.status(200).json({ ok: true, count: reviews.length, reviews });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to retrieve reviews.', error: err?.message });
  }
});

// POST /api/reviews - Submit a new review
reviewsRouter.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = req.body;
    const newReview = await ReviewModel.create({
      id: body.id || `rev-${randomUUID().slice(0, 8)}`,
      targetType: body.targetType,
      targetId: (body.targetId || '').toLowerCase(),
      targetTitle: body.targetTitle,
      userId: req.user?.id || body.userId || 'usr-traveler-03',
      userName: req.user?.name || body.userName || 'Anonymous Traveler',
      userAvatar: req.user?.avatarUrl || body.userAvatar,
      rating: body.rating,
      categoryRatings: body.categoryRatings || {
        cleanliness: 5,
        service: 5,
        valueForMoney: 5,
        location: 5,
        safety: 5,
      },
      title: body.title,
      comment: body.comment,
      pros: body.pros || [],
      cons: body.cons || [],
      travelerType: body.travelerType || 'Couples',
      visitDate: body.visitDate || new Date().toISOString().slice(0, 7),
      photos: body.photos || [],
      helpfulVotes: 0,
      votedUsers: [],
      verifiedBooking: body.verifiedBooking !== undefined ? body.verifiedBooking : true,
    });

    res.status(201).json({ ok: true, review: newReview });
  } catch (err: any) {
    res.status(400).json({ ok: false, message: 'Failed to create review.', error: err?.message });
  }
});

// POST /api/reviews/:id/vote - Toggle helpful vote
reviewsRouter.post('/:id/vote', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const voter = req.user?.name || (req.body.userName as string) || 'Anonymous';

    const review = await ReviewModel.findOne({ id });
    if (!review) {
      res.status(404).json({ ok: false, message: 'Review not found.' });
      return;
    }

    const hasVoted = review.votedUsers.includes(voter);
    if (hasVoted) {
      review.votedUsers = review.votedUsers.filter((u) => u !== voter);
      review.helpfulVotes = Math.max(0, review.helpfulVotes - 1);
    } else {
      review.votedUsers.push(voter);
      review.helpfulVotes += 1;
    }

    await review.save();
    res.status(200).json({ ok: true, helpfulVotes: review.helpfulVotes, voted: !hasVoted });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to update review vote.', error: err?.message });
  }
});
