/**
 * Travel Reviews Modal
 * Displays and collects user reviews and ratings for destinations,
 * hotels, and experiences with star ratings and text feedback.
 */

import React, { useState, useEffect } from 'react';
import {
  Star, ThumbsUp, MessageSquare, ShieldCheck,
  Plus, X, Filter, Sparkles, MapPin, Camera,
  CheckCircle2, AlertCircle, ArrowRight, UserCheck,
  SlidersHorizontal, Search
} from 'lucide-react';
import {
  getReviews,
  getReviewStats,
  submitReview,
  voteReviewHelpful,
  type TravelReview,
  type ReviewStats,
  type ReviewTargetType,
  type TravelerType,
  type ReviewCategoryRatings
} from '@/services/reviewService';

export interface TravelReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTargetType?: ReviewTargetType;
  initialTargetId?: string;
  initialTargetTitle?: string;
  currentUser?: { name: string; email: string };
}

const DESTINATION_OPTIONS = [
  { id: 'all', label: 'All Destinations' },
  { id: 'paris', label: 'Paris, France' },
  { id: 'tokyo', label: 'Tokyo, Japan' },
  { id: 'dubai', label: 'Dubai, UAE' },
  { id: 'bali', label: 'Bali, Indonesia' },
  { id: 'rome', label: 'Rome, Italy' },
  { id: 'zurich', label: 'Zurich & Zermatt, Switzerland' },
  { id: 'santorini', label: 'Santorini, Greece' },
  { id: 'reykjavik', label: 'Reykjavik, Iceland' },
  { id: 'cape_town', label: 'Cape Town, South Africa' },
  { id: 'kyoto', label: 'Kyoto, Japan' },
  { id: 'new_york', label: 'New York City, USA' },
  { id: 'barcelona', label: 'Barcelona, Spain' },
  { id: 'london', label: 'London, United Kingdom' },
  { id: 'cairo', label: 'Cairo, Egypt' },
  { id: 'amalfi', label: 'Amalfi Coast, Italy' },
  { id: 'sydney', label: 'Sydney, Australia' },
];

export default function TravelReviewsModal({
  isOpen,
  onClose,
  initialTargetType = 'destination',
  initialTargetId = 'paris',
  initialTargetTitle = 'Paris, France',
  currentUser = { name: 'Travel Explorer', email: 'traveler@voyana.com' },
}: TravelReviewsModalProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string>(initialTargetId);
  const [selectedTravelerType, setSelectedTravelerType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'helpful' | 'newest' | 'highest'>('helpful');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [reviews, setReviews] = useState<TravelReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);

  // Write Review Modal state
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [newRating, setNewRating] = useState<number>(5);
  const [newHoverRating, setNewHoverRating] = useState<number>(0);
  const [newTitle, setNewTitle] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newProsInput, setNewProsInput] = useState('Great location, delicious breakfast');
  const [newConsInput, setNewConsInput] = useState('Queues during peak hours');
  const [newTravelerType, setNewTravelerType] = useState<TravelerType>('Couples');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newCategoryScores, setNewCategoryScores] = useState<ReviewCategoryRatings>({
    cleanliness: 5,
    service: 5,
    valueForMoney: 5,
    location: 5,
    safety: 5,
  });

  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  const loadReviewsData = async () => {
    const list = await getReviews(
      selectedTargetId === 'all' ? undefined : 'destination',
      selectedTargetId === 'all' ? undefined : selectedTargetId,
      {
        travelerType: selectedTravelerType,
        sortBy,
      }
    );
    setReviews(list);
    setStats(getReviewStats(list));
  };

  useEffect(() => {
    if (isOpen) {
      loadReviewsData();
    }
  }, [isOpen, selectedTargetId, selectedTravelerType, sortBy]);

  if (!isOpen) return null;

  const currentDestinationName = DESTINATION_OPTIONS.find((d) => d.id === selectedTargetId)?.label || initialTargetTitle;

  const handleVote = async (reviewId: string) => {
    await voteReviewHelpful(reviewId, currentUser.name);
    loadReviewsData();
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newComment.trim()) return;

    const pros = newProsInput.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
    const cons = newConsInput.split(',').map((c) => c.trim()).filter((c) => c.length > 0);
    const photos = newPhotoUrl.trim() ? [newPhotoUrl.trim()] : [];

    await submitReview({
      targetType: 'destination',
      targetId: selectedTargetId === 'all' ? 'paris' : selectedTargetId,
      targetTitle: currentDestinationName,
      userName: currentUser.name,
      rating: newRating,
      categoryRatings: newCategoryScores,
      title: newTitle,
      comment: newComment,
      pros,
      cons,
      travelerType: newTravelerType,
      photos,
    });

    setShowWriteModal(false);
    setNewTitle('');
    setNewComment('');
    setNewPhotoUrl('');
    loadReviewsData();
  };

  const filteredReviews = reviews.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.comment.toLowerCase().includes(q) ||
      r.userName.toLowerCase().includes(q) ||
      r.pros.some((p) => p.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[94vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
              <Star size={22} className="fill-amber-500 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Travel Reviews & Community Ratings</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Community Verified
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Verified traveler scores, detailed pros/cons & genuine community insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWriteModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus size={14} />
              <span>Write a Review</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Reviews Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Score Matrix & Category Radar */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/70 border border-slate-200 rounded-3xl p-6 shadow-sm">
              {/* Overall Score */}
              <div className="flex flex-col justify-center items-center text-center p-4 border-b md:border-b-0 md:border-r border-slate-200">
                <span className="text-4xl font-black text-amber-500 flex items-center gap-1">
                  {stats.averageRating}
                  <span className="text-lg text-slate-400 font-normal">/5.0</span>
                </span>

                <div className="flex items-center gap-1 my-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={18}
                      className={`${s <= Math.round(stats.averageRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                    />
                  ))}
                </div>

                <p className="text-xs font-semibold text-slate-900">
                  Based on {stats.totalReviews} verified traveler reviews
                </p>
                <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                  ✨ {stats.recommendationPercentage}% of visitors recommend this destination
                </p>
              </div>

              {/* Star Rating Distribution Bars */}
              <div className="space-y-1.5 justify-center flex flex-col p-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Rating Distribution
                </span>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.ratingDistribution[star as 1 | 2 | 3 | 4 | 5] || 0;
                  const pct = stats.totalReviews > 0 ? Math.round((count / stats.totalReviews) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-6 text-slate-500 font-mono text-[11px]">{star} ★</span>
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-[11px] text-slate-500">{pct}%</span>
                    </div>
                  );
                })}
              </div>

              {/* Category Sub-Scores */}
              <div className="space-y-2 justify-center flex flex-col p-2 border-t md:border-t-0 md:border-l border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Experience Sub-Scores
                </span>

                {[
                  { label: 'Cleanliness & Hygiene', score: stats.categoryAverages.cleanliness },
                  { label: 'Service & Hospitality', score: stats.categoryAverages.service },
                  { label: 'Value for Money', score: stats.categoryAverages.valueForMoney },
                  { label: 'Location & Transit', score: stats.categoryAverages.location },
                  { label: 'Safety & Security', score: stats.categoryAverages.safety },
                ].map((cat) => (
                  <div key={cat.label} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{cat.label}</span>
                    <span className="font-bold text-emerald-800 font-mono">{cat.score.toFixed(1)} / 5</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter, Search & Destination Bar */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Destination Selector Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {DESTINATION_OPTIONS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedTargetId(d.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedTargetId === d.id
                        ? 'bg-emerald-700 text-white font-bold shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[220px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reviews by keyword..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                />
              </div>
            </div>

            {/* Sub-Filters: Traveler Type & Sorting */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <span className="text-[11px] text-slate-500 font-medium mr-1">Traveler:</span>
                {['all', 'Solo', 'Couples', 'Family', 'Friends', 'Business'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTravelerType(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedTravelerType === t
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    {t === 'all' ? 'All Types' : t}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 shadow-sm"
                >
                  <option value="helpful">Most Helpful</option>
                  <option value="newest">Newest First</option>
                  <option value="highest">Highest Rating</option>
                </select>
              </div>
            </div>
          </div>

          {/* Review Cards Stream */}
          <div className="space-y-4">
            {filteredReviews.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/70 border border-dashed border-slate-200 rounded-3xl">
                <p className="text-xs text-slate-500 italic">No travel reviews found matching current filter.</p>
                <button
                  onClick={() => setShowWriteModal(true)}
                  className="mt-3 text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
                >
                  + Be the first to review {currentDestinationName}
                </button>
              </div>
            ) : (
              filteredReviews.map((rev) => {
                const isHelpfulVoted = rev.votedUsers?.includes(currentUser.name);

                return (
                  <div
                    key={rev.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-500/50 hover:shadow-md transition-all space-y-3"
                  >
                    {/* Review Author & Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center text-xs font-bold shadow-sm">
                          {rev.userName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900">{rev.userName}</h4>
                            {rev.verifiedBooking && (
                              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <ShieldCheck size={11} />
                                <span>Verified Traveler</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} className="text-rose-500" />
                            <span>{rev.targetTitle}</span>
                            <span>·</span>
                            <span>Traveler Type: <strong>{rev.travelerType}</strong></span>
                            <span>·</span>
                            <span>Visited {rev.visitDate}</span>
                          </p>
                        </div>
                      </div>

                      {/* Rating Stars */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={14}
                              className={s <= Math.round(rev.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          {rev.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Review Title & Body */}
                    <div>
                      <h5 className="text-sm font-bold text-slate-900 mb-1">{rev.title}</h5>
                      <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
                    </div>

                    {/* Pros & Cons Pills */}
                    {(rev.pros.length > 0 || rev.cons.length > 0) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {rev.pros.length > 0 && (
                          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 text-xs">
                            <span className="text-[10px] uppercase font-bold text-emerald-800 block mb-1">
                              👍 Highlights & Pros
                            </span>
                            <ul className="space-y-1">
                              {rev.pros.map((p, idx) => (
                                <li key={idx} className="text-slate-700 flex items-start gap-1.5">
                                  <span className="text-emerald-600">•</span>
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {rev.cons.length > 0 && (
                          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-2.5 text-xs">
                            <span className="text-[10px] uppercase font-bold text-rose-700 block mb-1">
                              ⚠️ Things to Note / Cons
                            </span>
                            <ul className="space-y-1">
                              {rev.cons.map((c, idx) => (
                                <li key={idx} className="text-slate-700 flex items-start gap-1.5">
                                  <span className="text-rose-500">•</span>
                                  <span>{c}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Review Attached Photos */}
                    {rev.photos && rev.photos.length > 0 && (
                      <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1">
                        {rev.photos.map((ph, idx) => (
                          <img
                            key={idx}
                            src={ph}
                            alt="Traveler photo"
                            onClick={() => setActivePhoto(ph)}
                            className="w-16 h-16 rounded-xl object-cover border border-slate-200 cursor-pointer hover:scale-105 transition-transform shadow-sm"
                          />
                        ))}
                      </div>
                    )}

                    {/* Card Footer Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">
                        Published {new Date(rev.createdAt).toLocaleDateString()}
                      </span>

                      <button
                        onClick={() => handleVote(rev.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                          isHelpfulVoted
                            ? 'bg-emerald-700 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                        }`}
                      >
                        <ThumbsUp size={13} className={isHelpfulVoted ? 'fill-white' : ''} />
                        <span>Helpful ({rev.helpfulVotes})</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ─── WRITE REVIEW MODAL WIZARD ────────────────────────────────────── */}
      {showWriteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Star size={18} className="text-amber-500 fill-amber-500" />
                <h3 className="text-base font-bold text-slate-900">Write a Travel Review</h3>
              </div>
              <button onClick={() => setShowWriteModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateReview} className="space-y-4">
              {/* Star Rating Picker */}
              <div className="text-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-600 block mb-2 font-medium">
                  Overall Rating for {currentDestinationName}
                </span>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setNewHoverRating(star)}
                      onMouseLeave={() => setNewHoverRating(0)}
                      onClick={() => setNewRating(star)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        size={28}
                        className={`${
                          (newHoverRating || newRating) >= star
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-lg font-black text-amber-500 ml-2">{newRating}.0</span>
                </div>
              </div>

              {/* Review Title & Details */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Review Headline *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Breathtaking scenery and incredible local culture!"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Travel Experience *</label>
                <textarea
                  rows={3}
                  required
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share details about attractions, local food, transportation, best times to visit..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 resize-none shadow-sm"
                />
              </div>

              {/* Category Sliders */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Category Ratings (1 to 5)
                </span>
                {[
                  { key: 'cleanliness', label: 'Cleanliness' },
                  { key: 'service', label: 'Service Quality' },
                  { key: 'valueForMoney', label: 'Value for Money' },
                  { key: 'location', label: 'Location & Transit' },
                  { key: 'safety', label: 'Safety & Comfort' },
                ].map((cat) => (
                  <div key={cat.key} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{cat.label}</span>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={newCategoryScores[cat.key as keyof ReviewCategoryRatings]}
                      onChange={(e) =>
                        setNewCategoryScores({
                          ...newCategoryScores,
                          [cat.key]: Number(e.target.value),
                        })
                      }
                      className="w-32 accent-emerald-600"
                    />
                    <span className="font-mono text-emerald-700 font-bold w-6 text-right">
                      {newCategoryScores[cat.key as keyof ReviewCategoryRatings]}
                    </span>
                  </div>
                ))}
              </div>

              {/* Traveler Type & Photo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Traveler Type</label>
                  <select
                    value={newTravelerType}
                    onChange={(e) => setNewTravelerType(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
                  >
                    <option value="Solo">Solo</option>
                    <option value="Couples">Couples</option>
                    <option value="Family">Family</option>
                    <option value="Friends">Friends</option>
                    <option value="Business">Business</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Photo URL (Optional)</label>
                  <input
                    type="url"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="https://images.unsplash..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-sm"
                  />
                </div>
              </div>

              {/* Pros & Cons */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-800 mb-1">Pros (comma separated)</label>
                  <input
                    type="text"
                    value={newProsInput}
                    onChange={(e) => setNewProsInput(e.target.value)}
                    placeholder="Scenery, food"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1">Cons (comma separated)</label>
                  <input
                    type="text"
                    value={newConsInput}
                    onChange={(e) => setNewConsInput(e.target.value)}
                    placeholder="Crowded, pricey"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-sm"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowWriteModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all hover:scale-105 active:scale-95"
                >
                  Publish Travel Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── FULL PHOTO LIGHTBOX ─────────────────────────────────────────── */}
      {activePhoto && (
        <div
          onClick={() => setActivePhoto(null)}
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in"
        >
          <div className="relative max-w-3xl w-full">
            <img src={activePhoto} alt="Full resolution" className="w-full rounded-2xl shadow-2xl object-contain max-h-[85vh] mx-auto" />
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
