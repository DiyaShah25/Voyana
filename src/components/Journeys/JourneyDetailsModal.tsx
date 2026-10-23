/**
 * Journey Details Modal
 * Opens complete multi-stop expedition overview, itinerary breakdown,
 * and direct planning/booking actions when clicking on a Featured Journey card
 * or its dynamic Plan button in "Seamless journeys across continents".
 */

import React, { useEffect } from 'react';
import {
  X, Calendar, Compass, MapPin, Plane, ArrowRight,
  Sparkles, CheckCircle2, Package, Users, DollarSign,
  Sun
} from 'lucide-react';
import type { FeaturedJourney } from './FeaturedJourneys';
import type { GlobeLocation, GlobeRoute } from '@/components/Globe/globe.types';
import { getDestinationDetails } from '@/services/recommendationService';

export interface JourneyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  journey: FeaturedJourney | null;
  onPlanInWorkspace: (journey: FeaturedJourney) => void;
  onBookBundle: (journey: FeaturedJourney) => void;
  onAskAiPlanner?: (city: string, prompt: string) => void;
  onPreviewOnGlobe: (routes: GlobeRoute[], startLocation: GlobeLocation) => void;
}

export const JourneyDetailsModal: React.FC<JourneyDetailsModalProps> = ({
  isOpen,
  onClose,
  journey,
  onPlanInWorkspace,
  onBookBundle,
  onAskAiPlanner,
  onPreviewOnGlobe,
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
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !journey) return null;

  // Approximate days per stop based on duration string
  const totalDays = parseInt(journey.duration.replace(/\D/g, ''), 10) || 10;
  const daysPerStop = Math.max(2, Math.round(totalDays / journey.stops.length));
  const estimatedCost = totalDays * 280 + journey.routes.length * 450;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="journey-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HERO BANNER ─────────────────────────────────────────────── */}
        <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-950 flex-shrink-0">
          <img
            src={journey.image}
            alt={journey.title}
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
            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-700/90 text-white backdrop-blur-md shadow-sm flex items-center gap-1.5">
              <Calendar size={12} />
              <span>{journey.duration}</span>
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-slate-800 backdrop-blur-md border border-white/20 shadow-sm">
              {journey.style}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-slate-800 backdrop-blur-md border border-white/20 shadow-sm flex items-center gap-1">
              <Sun size={12} className="text-amber-500" />
              <span>Best: {journey.season}</span>
            </span>
          </div>

          {/* Bottom Title & Route Chain */}
          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {journey.stops.map((stop, i) => (
                <React.Fragment key={stop}>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-200 backdrop-blur-md border border-emerald-400/30">
                    <MapPin size={10} className="text-emerald-400" />
                    {stop}
                  </span>
                  {i < journey.stops.length - 1 && (
                    <span className="text-emerald-300 font-bold text-xs">➔</span>
                  )}
                </React.Fragment>
              ))}
            </div>

            <h2 id="journey-modal-title" className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
              {journey.title}
            </h2>
          </div>
        </div>

        {/* ── MODAL SCROLLABLE BODY ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Narrative Summary */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Expedition Overview
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-2xl p-4">
              {journey.description}
            </p>
          </div>

          {/* Multi-Stop Itinerary Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Connected Multi-Stop Route Plan ({journey.stops.length} Cities)
              </h4>
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <Plane size={13} /> {journey.routes.length} Flight Legs
              </span>
            </div>

            <div className="space-y-3">
              {journey.stops.map((stop, index) => {
                const catalog = getDestinationDetails(stop);
                const stopCountry = catalog?.country || 'Global Destination';
                const stopHighlights = catalog?.topHighlights || [
                  `Explore historic landmarks & neighborhoods in ${stop}`,
                  `Authentic culinary culture & regional traditions`,
                  `Curated day excursions and scenic viewpoints`,
                ];

                return (
                  <div
                    key={stop}
                    className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-emerald-500/40 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-xs flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                            {stop}
                          </h5>
                          <span className="text-xs text-slate-500">· {stopCountry}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                          ~{daysPerStop} Days Recommended
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                        {catalog?.description ||
                          `Immerse in curated cultural landmarks, regional cuisine, and scenic excursions across ${stop}.`}
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                        {stopHighlights.slice(0, 2).map((hl) => (
                          <span
                            key={hl}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/70"
                          >
                            <CheckCircle2 size={11} className="text-emerald-600 flex-shrink-0" />
                            <span className="truncate max-w-[280px]">{hl}</span>
                          </span>
                        ))}
                      </div>

                      {index < journey.stops.length - 1 && (
                        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                          <Plane size={11} className="text-emerald-600" />
                          <span>Flight arc connects &rarr; {journey.stops[index + 1]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Features & Logistics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                <Users size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Collaborative Workspace</div>
                <div className="text-[10px] text-slate-500">7 tabs: schedule, chat, voting</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 rounded-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center flex-shrink-0">
                <Plane size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">3D Great-Circle Flight Arcs</div>
                <div className="text-[10px] text-slate-500">{journey.routes.length} Inter-city connections</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center flex-shrink-0">
                <DollarSign size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">${estimatedCost.toLocaleString()} Estimated</div>
                <div className="text-[10px] text-purple-700 font-semibold">Save 18% with Bundle</div>
              </div>
            </div>
          </div>

          {/* ── ACTION TRIGGERS ───────────────────────────────────────── */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-700" />
              <span>Plan & Book This Expedition</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Plan in Interactive Workspace */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPlanInWorkspace(journey);
                }}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-md shadow-emerald-700/20 transition-all hover:scale-[1.02] active:scale-98"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Compass size={16} />
                  </div>
                  <div>
                    <div className="font-bold">Open Workspace</div>
                    <div className="text-[10px] text-emerald-100">7-tab collaborative schedule</div>
                  </div>
                </div>
                <ArrowRight size={14} />
              </button>

              {/* 2. Ask VoyaBot AI Planner */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAskAiPlanner?.(
                    journey.stops[0],
                    `Generate a comprehensive day-by-day itinerary and logistics plan for the ${journey.title} across ${journey.stops.join(', ')} (${journey.duration}, ${journey.style}).`
                  );
                }}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-semibold text-xs transition-all hover:scale-[1.02] active:scale-98"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div className="font-bold">Ask AI Planner</div>
                    <div className="text-[10px] text-indigo-700">Custom transit & daily activities</div>
                  </div>
                </div>
                <ArrowRight size={14} />
              </button>

              {/* 3. Book Multi-City Travel Bundle */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBookBundle(journey);
                }}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-200 font-semibold text-xs transition-all hover:scale-[1.02] active:scale-98"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0">
                    <Package size={16} />
                  </div>
                  <div>
                    <div className="font-bold">Book Bundle</div>
                    <div className="text-[10px] text-purple-700">Flights, stays & transfers</div>
                  </div>
                </div>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────── */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (journey.routes && journey.routes.length > 0) {
                onPreviewOnGlobe(journey.routes, journey.routes[0].from);
              }
              onClose();
            }}
            className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1.5 transition-colors"
          >
            <Compass size={14} className="text-emerald-700" />
            <span>Preview Great-Circle Flight Arcs on Globe</span>
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

export default JourneyDetailsModal;
