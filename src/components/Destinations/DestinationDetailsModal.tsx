/**
 * Destination Details Modal
 * Opens detailed overview and direct booking/planning actions
 * when any destination card is clicked across the website.
 */

import React, { useEffect } from 'react';
import {
  X, MapPin, Calendar, Compass, Plane, Building2,
  Car, Star, Sparkles, CheckCircle2, DollarSign,
  ShieldCheck, ArrowRight, Clock, Sun
} from 'lucide-react';
import type { DestinationItem } from './DestinationCard';
import { getDestinationDetails, type RecommendedDestination } from '@/services/recommendationService';

export interface DestinationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: DestinationItem | null;
  onBookFlight: (city: string) => void;
  onBookHotel: (city: string) => void;
  onBookTransport: (city: string) => void;
  onViewReviews: (city: string) => void;
  onPlanTripInWorkspace: (title: string, destination: string) => void;
  onAskAiGuide: (city: string, prompt?: string) => void;
  onFocusOnGlobe?: (city: string) => void;
}

export const DestinationDetailsModal: React.FC<DestinationDetailsModalProps> = ({
  isOpen,
  onClose,
  destination,
  onBookFlight,
  onBookHotel,
  onBookTransport,
  onViewReviews,
  onPlanTripInWorkspace,
  onAskAiGuide,
  onFocusOnGlobe,
}) => {
  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // Keyboard Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !destination) return null;

  // Enrich with catalog details if available
  const catalogItem: RecommendedDestination | undefined = getDestinationDetails(destination.name);

  const tagline = catalogItem?.tagline || `${destination.style} in ${destination.country}`;
  const description =
    catalogItem?.description ||
    destination.highlight ||
    `Experience the captivating sights, vibrant culture, and unforgettable landscapes of ${destination.name}, ${destination.country}.`;
  const highlights = catalogItem?.topHighlights || [
    `Historic center & iconic landmarks of ${destination.name}`,
    `Authentic culinary culture & local markets`,
    `Scenic viewpoint panoramas & guided tours`,
    `Curated day excursions across ${destination.country}`,
  ];
  const matchScore = catalogItem?.matchScore || 95;
  const safetyScore = catalogItem?.safetyScore || 9;
  const recommendedDays = catalogItem?.recommendedDays || 5;
  const budgetTier = catalogItem?.budgetTier || '$$';
  const dailyCost = catalogItem?.estimatedDailyCostUsd || 150;
  const vibes = catalogItem?.vibe || [destination.style, 'Culture', 'Discovery'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="destination-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HERO BANNER ─────────────────────────────────────────────── */}
        <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-950 flex-shrink-0">
          <img
            src={destination.image}
            alt={`${destination.name}, ${destination.country}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/60 hover:bg-slate-950/80 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-105"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>

          {/* Top badges */}
          <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-700/90 text-white backdrop-blur-md shadow-sm">
              {destination.region}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-slate-800 backdrop-blur-md border border-white/20 shadow-sm flex items-center gap-1">
              <Sun size={12} className="text-amber-500" />
              <span>Best: {destination.bestSeason}</span>
            </span>
          </div>

          {/* Bottom Title Overlay */}
          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold mb-1">
                  <MapPin size={13} className="text-rose-400" />
                  <span>{destination.country}</span>
                  <span>·</span>
                  <span className="text-slate-300 font-mono text-[11px]">
                    {Math.abs(destination.coordinates.latitude).toFixed(2)}°{destination.coordinates.latitude >= 0 ? 'N' : 'S'}, {Math.abs(destination.coordinates.longitude).toFixed(2)}°{destination.coordinates.longitude >= 0 ? 'E' : 'W'}
                  </span>
                </div>
                <h2 id="destination-modal-title" className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                  {destination.name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 font-medium drop-shadow-sm mt-0.5 line-clamp-1">
                  {tagline}
                </p>
              </div>

              {/* Match Score Badge */}
              <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-emerald-500/40 px-3.5 py-1.5 rounded-2xl shadow-lg">
                <Sparkles size={16} className="text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-emerald-300">{matchScore}% Match</div>
                  <div className="text-[10px] text-slate-300">Voyana Score</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── MODAL SCROLLABLE BODY ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center flex-shrink-0">
                <Clock size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">{recommendedDays} Days</div>
                <div className="text-[10px] text-slate-500">Recommended Stay</div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-800 flex items-center justify-center flex-shrink-0">
                <DollarSign size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">${dailyCost} / day</div>
                <div className="text-[10px] text-slate-500">Tier: {budgetTier}</div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-100/70 text-sky-800 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">{safetyScore} / 10</div>
                <div className="text-[10px] text-slate-500">Safety Index</div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100/70 text-indigo-800 flex items-center justify-center flex-shrink-0">
                <Compass size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 truncate max-w-[100px]">{destination.style}</div>
                <div className="text-[10px] text-slate-500">Travel Style</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Destination Overview
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50/80 border border-slate-200 rounded-2xl p-4">
              {description}
            </p>
          </div>

          {/* Top Curated Highlights */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Curated Highlights & Experiences
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {highlights.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 shadow-sm"
                >
                  <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-800">{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Travel Vibe Tags */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Atmosphere & Travel Vibes
            </h4>
            <div className="flex flex-wrap gap-2">
              {vibes.map((v, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  #{v}
                </span>
              ))}
            </div>
          </div>

          {/* ── ACTION TRIGGERS (What the Card Does!) ──────────────────── */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-700" />
              <span>Available Travel Services for {destination.name}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Plan Trip in Workspace */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPlanTripInWorkspace(
                    `${destination.name} Expedition: ${recommendedDays} Days`,
                    destination.name
                  );
                }}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-md shadow-emerald-700/20 transition-all hover:scale-[1.02] active:scale-98"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <Compass size={16} />
                  </div>
                  <div>
                    <div className="font-bold">Plan Itinerary in Workspace</div>
                    <div className="text-[10px] text-emerald-100">Collaborative schedule & group voting</div>
                  </div>
                </div>
                <ArrowRight size={15} />
              </button>

              {/* 2. Ask AI Guide */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAskAiGuide(
                    destination.name,
                    `Create an authentic ${recommendedDays}-day travel itinerary for ${destination.name}, ${destination.country} focusing on ${destination.style}.`
                  );
                }}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-semibold text-xs transition-all hover:scale-[1.02] active:scale-98"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div className="font-bold">Ask AI Travel Guide</div>
                    <div className="text-[10px] text-indigo-700">Customized day plans & recommendations</div>
                  </div>
                </div>
                <ArrowRight size={15} />
              </button>

              {/* 3. Book Flight */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBookFlight(destination.name);
                }}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 font-semibold text-xs transition-all hover:scale-[1.02] active:scale-98"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center">
                    <Plane size={16} />
                  </div>
                  <div>
                    <div className="font-bold">Book Flights to {destination.name}</div>
                    <div className="text-[10px] text-sky-700">Compare airlines & instant boarding passes</div>
                  </div>
                </div>
                <ArrowRight size={15} />
              </button>

              {/* 4. Book Hotel */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBookHotel(destination.name);
                }}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold text-xs transition-all hover:scale-[1.02] active:scale-98"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <div className="font-bold">Book Accommodations</div>
                    <div className="text-[10px] text-amber-700">Luxury suites & boutique retreats</div>
                  </div>
                </div>
                <ArrowRight size={15} />
              </button>

              {/* 5. Book Transport */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBookTransport(destination.name);
                }}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-semibold text-xs transition-all hover:scale-[1.02] active:scale-98"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                    <Car size={16} />
                  </div>
                  <div>
                    <div className="font-bold">Local Transport & Transfers</div>
                    <div className="text-[10px] text-purple-700">Airport express, private vans & rail</div>
                  </div>
                </div>
                <ArrowRight size={15} />
              </button>

              {/* 6. Community Reviews */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewReviews(destination.name);
                }}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 font-semibold text-xs transition-all hover:scale-[1.02] active:scale-98"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                    <Star size={16} />
                  </div>
                  <div>
                    <div className="font-bold">Traveler Community Reviews</div>
                    <div className="text-[10px] text-rose-700">Ratings, tips & authentic experiences</div>
                  </div>
                </div>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────── */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (onFocusOnGlobe) onFocusOnGlobe(destination.name);
              onClose();
            }}
            className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1.5 transition-colors"
          >
            <Compass size={14} className="text-emerald-700" />
            <span>Focus on 3D Globe</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DestinationDetailsModal;
