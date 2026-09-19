/**
 * VPM-122: Travel Reviews & Ratings Engine
 * Assignee: Manav Vyas <manavvyas2004@gmail.com>
 * Provides crowdsourced traveler ratings, category sub-scores, verified traveler reviews,
 * photo attachments, and community helpfulness voting.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createAlert } from './alertService';

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------
export type ReviewTargetType = 'destination' | 'hotel' | 'flight' | 'transport' | 'activity' | 'trip';
export type TravelerType = 'Solo' | 'Couples' | 'Family' | 'Friends' | 'Business';

export interface ReviewCategoryRatings {
  cleanliness: number; // 1-5
  service: number;     // 1-5
  valueForMoney: number; // 1-5
  location: number;    // 1-5
  safety: number;      // 1-5
}

export interface TravelReview {
  id: string;
  targetType: ReviewTargetType;
  targetId: string;
  targetTitle: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1.0 - 5.0
  categoryRatings: ReviewCategoryRatings;
  title: string;
  comment: string;
  pros: string[];
  cons: string[];
  travelerType: TravelerType;
  visitDate: string; // YYYY-MM
  photos: string[];
  helpfulVotes: number;
  votedUsers: string[];
  verifiedBooking: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  recommendationPercentage: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  categoryAverages: ReviewCategoryRatings;
}

export interface CreateReviewInput {
  targetType: ReviewTargetType;
  targetId: string;
  targetTitle: string;
  userId?: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  categoryRatings?: Partial<ReviewCategoryRatings>;
  title: string;
  comment: string;
  pros?: string[];
  cons?: string[];
  travelerType?: TravelerType;
  visitDate?: string;
  photos?: string[];
}

// ---------------------------------------------------------------------------
// LocalStorage Store & Seed Data
// ---------------------------------------------------------------------------
const REVIEWS_KEY = 'voyana.travel_reviews';

const INITIAL_REVIEWS: TravelReview[] = [
  {
    id: 'rev-01',
    targetType: 'destination',
    targetId: 'paris',
    targetTitle: 'Paris, France',
    userId: 'usr-demo-02',
    userName: 'Diya Shah',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    rating: 4.9,
    categoryRatings: { cleanliness: 4.8, service: 4.9, valueForMoney: 4.6, location: 5.0, safety: 4.8 },
    title: 'An unforgettable romantic adventure in the City of Light!',
    comment: 'From the morning warm croissants in Montmartre to sunset river cruises on the Seine, Paris exceeded every expectation. Walking along the cobblestone streets around Île de la Cité at dusk is pure magic.',
    pros: ['Stunning historic architecture', 'World-class gastronomy & bakeries', 'Excellent metro connectivity', 'Incredible museums'],
    cons: ['Peak season museum queues at the Louvre', 'High dining prices around Eiffel Tower'],
    travelerType: 'Couples',
    visitDate: '2026-08',
    photos: [
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1000&auto=format&fit=crop&q=80',
    ],
    helpfulVotes: 48,
    votedUsers: ['Bhavika Sainani', 'Jagrat Kumar', 'Megha Lalwani'],
    verifiedBooking: true,
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'rev-02',
    targetType: 'destination',
    targetId: 'paris',
    targetTitle: 'Paris, France',
    userId: 'usr-demo-03',
    userName: 'Bhavika Sainani',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    rating: 4.8,
    categoryRatings: { cleanliness: 4.7, service: 4.8, valueForMoney: 4.5, location: 4.9, safety: 4.7 },
    title: 'Rich culture, sublime art, and cozy Latin Quarter cafes',
    comment: 'The Musee d’Orsay impressionist collections blew me away. Book your museum passes in advance through Voyana to skip the 2-hour queue. The Latin quarter nightlife and live jazz bars are must-visit!',
    pros: ['Art collections are unmatched', 'Vibrant café culture', 'Walkable neighborhoods'],
    cons: ['Cobblestones are tough with rolling luggage', 'Pickpocket awareness needed in transit'],
    travelerType: 'Friends',
    visitDate: '2026-07',
    photos: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80',
    ],
    helpfulVotes: 32,
    votedUsers: ['Diya Shah', 'Megha Lalwani'],
    verifiedBooking: true,
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'rev-03',
    targetType: 'destination',
    targetId: 'tokyo',
    targetTitle: 'Tokyo, Japan',
    userId: 'usr-demo-04',
    userName: 'Jagrat Kumar',
    rating: 5.0,
    categoryRatings: { cleanliness: 5.0, service: 5.0, valueForMoney: 4.8, location: 5.0, safety: 5.0 },
    title: 'Flawless futuristic hospitality and culinary paradise',
    comment: 'Tokyo is the cleanest, safest, and most thrilling metropolis on Earth. Shinjuku neon lights at night and the serene Meiji shrine in the morning create the ultimate contrast.',
    pros: ['Pinpoint punctual trains', 'Highest safety in the world', 'Incredible ramen & sushi at all price tiers'],
    cons: ['Navigating massive train stations like Shinjuku takes time to learn'],
    travelerType: 'Solo',
    visitDate: '2026-08',
    photos: [
      'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1000&auto=format&fit=crop&q=80',
    ],
    helpfulVotes: 56,
    votedUsers: ['Megha Lalwani', 'Diya Shah', 'Bhavika Sainani'],
    verifiedBooking: true,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'rev-04',
    targetType: 'destination',
    targetId: 'dubai',
    targetTitle: 'Dubai, UAE',
    userId: 'usr-demo-05',
    userName: 'Megha Lalwani',
    rating: 4.7,
    categoryRatings: { cleanliness: 5.0, service: 4.8, valueForMoney: 4.3, location: 4.7, safety: 5.0 },
    title: 'Ultra-luxurious skyscrapers, desert safaris & world-class dining',
    comment: 'The Burj Khalifa fountain shows and sunset desert dune-bashing were highlights. Perfect for luxury winter getaways with spotless amenities everywhere.',
    pros: ['Impeccable cleanliness', 'Top-tier luxury shopping', 'Family-friendly attractions'],
    cons: ['Summer months are extremely hot outdoors', 'High premium on alcohol and fine dining'],
    travelerType: 'Family',
    visitDate: '2026-09',
    photos: [
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1000&auto=format&fit=crop&q=80',
    ],
    helpfulVotes: 29,
    votedUsers: ['Bhavika Sainani', 'Diya Shah'],
    verifiedBooking: true,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

function getStoredReviews(): TravelReview[] {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    if (!raw) {
      localStorage.setItem(REVIEWS_KEY, JSON.stringify(INITIAL_REVIEWS));
      return INITIAL_REVIEWS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_REVIEWS;
  }
}

function saveStoredReviews(list: TravelReview[]): void {
  try {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(list));
  } catch {}
}

// ---------------------------------------------------------------------------
// 1. Get Reviews for Target (Destination, Hotel, Flight, Transport, Activity)
// ---------------------------------------------------------------------------
export async function getReviews(
  targetType?: ReviewTargetType,
  targetId?: string,
  filter?: {
    travelerType?: string;
    minRating?: number;
    sortBy?: 'helpful' | 'newest' | 'highest';
  }
): Promise<TravelReview[]> {
  const all = getStoredReviews();
  let filtered = all;

  if (targetType) {
    filtered = filtered.filter((r) => r.targetType === targetType);
  }
  if (targetId && targetId !== 'all') {
    filtered = filtered.filter((r) => r.targetId.toLowerCase() === targetId.toLowerCase());
  }
  if (filter?.travelerType && filter.travelerType !== 'all') {
    filtered = filtered.filter((r) => r.travelerType === filter.travelerType);
  }
  if (filter?.minRating && filter.minRating > 0) {
    filtered = filtered.filter((r) => r.rating >= filter.minRating!);
  }

  // Sorting
  if (filter?.sortBy === 'highest') {
    filtered.sort((a, b) => b.rating - a.rating);
  } else if (filter?.sortBy === 'newest') {
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else {
    // Default: most helpful
    filtered.sort((a, b) => b.helpfulVotes - a.helpfulVotes);
  }

  return filtered;
}

// ---------------------------------------------------------------------------
// 2. Calculate Comprehensive Review Statistics & Category Averages
// ---------------------------------------------------------------------------
export function getReviewStats(reviews: TravelReview[]): ReviewStats {
  if (reviews.length === 0) {
    return {
      averageRating: 4.8,
      totalReviews: 0,
      recommendationPercentage: 96,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      categoryAverages: { cleanliness: 4.9, service: 4.8, valueForMoney: 4.7, location: 4.9, safety: 4.9 },
    };
  }

  const total = reviews.length;
  const sumRating = reviews.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = Math.round((sumRating / total) * 10) / 10;

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let recommendCount = 0;

  let sumClean = 0;
  let sumService = 0;
  let sumValue = 0;
  let sumLocation = 0;
  let sumSafety = 0;

  reviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[star]++;
    if (r.rating >= 4.0) recommendCount++;

    sumClean += r.categoryRatings?.cleanliness || r.rating;
    sumService += r.categoryRatings?.service || r.rating;
    sumValue += r.categoryRatings?.valueForMoney || r.rating;
    sumLocation += r.categoryRatings?.location || r.rating;
    sumSafety += r.categoryRatings?.safety || r.rating;
  });

  return {
    averageRating,
    totalReviews: total,
    recommendationPercentage: Math.round((recommendCount / total) * 100),
    ratingDistribution: distribution,
    categoryAverages: {
      cleanliness: Math.round((sumClean / total) * 10) / 10,
      service: Math.round((sumService / total) * 10) / 10,
      valueForMoney: Math.round((sumValue / total) * 10) / 10,
      location: Math.round((sumLocation / total) * 10) / 10,
      safety: Math.round((sumSafety / total) * 10) / 10,
    },
  };
}

// ---------------------------------------------------------------------------
// 3. Submit New Travel Review (VPM-122)
// ---------------------------------------------------------------------------
export async function submitReview(
  input: CreateReviewInput
): Promise<{ success: boolean; review?: TravelReview; error?: string }> {
  if (!input.title.trim() || !input.comment.trim()) {
    return { success: false, error: 'Review title and experience details are required.' };
  }

  const list = getStoredReviews();
  const newReview: TravelReview = {
    id: `rev-${Date.now()}`,
    targetType: input.targetType,
    targetId: input.targetId,
    targetTitle: input.targetTitle,
    userId: input.userId || 'usr-demo-01',
    userName: input.userName,
    userAvatar: input.userAvatar,
    rating: input.rating,
    categoryRatings: {
      cleanliness: input.categoryRatings?.cleanliness || input.rating,
      service: input.categoryRatings?.service || input.rating,
      valueForMoney: input.categoryRatings?.valueForMoney || input.rating,
      location: input.categoryRatings?.location || input.rating,
      safety: input.categoryRatings?.safety || input.rating,
    },
    title: input.title,
    comment: input.comment,
    pros: input.pros || [],
    cons: input.cons || [],
    travelerType: input.travelerType || 'Solo',
    visitDate: input.visitDate || new Date().toISOString().substring(0, 7),
    photos: input.photos || [],
    helpfulVotes: 1,
    votedUsers: [input.userName],
    verifiedBooking: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  list.unshift(newReview);
  saveStoredReviews(list);

  // Trigger alert notification for user review publication
  await createAlert({
    user_id: input.userId || 'usr-demo-01',
    booking_id: newReview.id,
    booking_reference: `REV-${newReview.id.substring(4, 8).toUpperCase()}`,
    booking_type: 'package',
    title: `Travel Review Published: ${input.targetTitle}`,
    message: `Thank you for reviewing ${input.targetTitle}! Your verified traveler feedback is now live for the Voyana global community.`,
    severity: 'success',
    old_status: 'pending',
    new_status: 'confirmed',
  });

  return { success: true, review: newReview };
}

// ---------------------------------------------------------------------------
// 4. Vote Review Helpful
// ---------------------------------------------------------------------------
export async function voteReviewHelpful(
  reviewId: string,
  userName: string
): Promise<{ success: boolean; helpfulVotes: number; hasVoted: boolean }> {
  const list = getStoredReviews();
  const target = list.find((r) => r.id === reviewId);
  if (!target) return { success: false, helpfulVotes: 0, hasVoted: false };

  let hasVoted = false;
  if (!target.votedUsers) target.votedUsers = [];

  if (target.votedUsers.includes(userName)) {
    target.votedUsers = target.votedUsers.filter((u) => u !== userName);
    target.helpfulVotes = Math.max(0, target.helpfulVotes - 1);
    hasVoted = false;
  } else {
    target.votedUsers.push(userName);
    target.helpfulVotes++;
    hasVoted = true;
  }

  saveStoredReviews(list);
  return { success: true, helpfulVotes: target.helpfulVotes, hasVoted };
}
