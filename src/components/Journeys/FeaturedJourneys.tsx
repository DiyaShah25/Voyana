/**
 * Featured Journeys Component
 * Showcases curated multi-destination journey itineraries
 * with preview cards, pricing, and booking call-to-action.
 */

import React from 'react';
import { Compass, Plane, Calendar, MapPin, ArrowRight } from 'lucide-react';
import type { GlobeLocation, GlobeRoute } from '@/components/Globe/globe.types';

export interface FeaturedJourney {
  id: string;
  title: string;
  duration: string;
  stops: string[];
  description: string;
  season: string;
  style: string;
  image: string;
  routes: GlobeRoute[];
}

export const sampleJourneys: FeaturedJourney[] = [
  {
    id: 'grand-japan-arc',
    title: 'The Imperial & Coastal Golden Route',
    duration: '10 Days',
    stops: ['Tokyo', 'Kyoto', 'Bali'],
    description: 'Transition from Tokyo’s neon architecture to Kyoto’s tranquil cedar forests, culminating in Bali’s ocean sanctuaries.',
    season: 'Spring / Autumn',
    style: 'Culture & Island',
    image: 'https://images.pexels.com/photos/1440476/pexels-photo-1440476.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    routes: [
      {
        from: { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503, type: 'city' },
        to: { name: 'Kyoto', latitude: 35.0116, longitude: 135.7681, type: 'city' },
      },
      {
        from: { name: 'Kyoto', latitude: 35.0116, longitude: 135.7681, type: 'city' },
        to: { name: 'Bali', latitude: -8.4095, longitude: 115.1889, type: 'region' },
      },
    ],
  },
  {
    id: 'classical-europe',
    title: 'Renaissance & Mediterranean Horizons',
    duration: '8 Days',
    stops: ['Paris', 'Rome', 'Santorini'],
    description: 'Follow centuries of art, philosophy, and classical architecture across Paris, ancient Rome, and the Aegean caldera.',
    season: 'May – October',
    style: 'Classical Heritage',
    image: 'https://images.pexels.com/photos/1010657/pexels-photo-1010657.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    routes: [
      {
        from: { name: 'Paris', latitude: 48.8566, longitude: 2.3522, type: 'city' },
        to: { name: 'Rome', latitude: 41.9028, longitude: 12.4964, type: 'city' },
      },
      {
        from: { name: 'Rome', latitude: 41.9028, longitude: 12.4964, type: 'city' },
        to: { name: 'Santorini', latitude: 36.3932, longitude: 25.4615, type: 'region' },
      },
    ],
  },
  {
    id: 'nordic-safari',
    title: 'Aurora & Sahara Expedition',
    duration: '12 Days',
    stops: ['Reykjavik', 'Cairo', 'Cape Town'],
    description: 'An unforgettable North-to-South exploration spanning Arctic glacier lagoons, the ancient pyramids, and coastal Table Mountain.',
    season: 'October – March',
    style: 'Wild Expedition',
    image: 'https://images.pexels.com/photos/1009136/pexels-photo-1009136.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    routes: [
      {
        from: { name: 'Reykjavik', latitude: 64.1466, longitude: -21.9426, type: 'city' },
        to: { name: 'Cairo', latitude: 30.0444, longitude: 31.2357, type: 'city' },
      },
      {
        from: { name: 'Cairo', latitude: 30.0444, longitude: 31.2357, type: 'city' },
        to: { name: 'Cape Town', latitude: -33.9249, longitude: 18.4241, type: 'city' },
      },
    ],
  },
  {
    id: 'alpine-express',
    title: 'Swiss Glacier Peaks & Parisian Grandeur',
    duration: '9 Days',
    stops: ['Zurich', 'Zermatt', 'Paris'],
    description: 'Traverse the dramatic Matterhorn glacier railways, crystalline alpine lakes, and arrive on the high-speed TGV Lyria into Paris.',
    season: 'November – April',
    style: 'Alpine & Heritage',
    image: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&h=650&w=940&q=80',
    routes: [
      {
        from: { name: 'Zurich', latitude: 47.3769, longitude: 8.5417, type: 'city' },
        to: { name: 'Zermatt', latitude: 45.9765, longitude: 7.7491, type: 'city' },
      },
      {
        from: { name: 'Zermatt', latitude: 45.9765, longitude: 7.7491, type: 'city' },
        to: { name: 'Paris', latitude: 48.8566, longitude: 2.3522, type: 'city' },
      },
    ],
  },
  {
    id: 'cyclades-oasis',
    title: 'Aegean Caldera & Arabian Gulf Oasis',
    duration: '11 Days',
    stops: ['Santorini', 'Cairo', 'Dubai'],
    description: 'From sapphire cliffside Aegean sunsets and Giza ancient pyramids to modern luxury skyscrapers and red-dune desert safaris.',
    season: 'October – April',
    style: 'Ancient & Modern Wonders',
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&h=650&w=940&q=80',
    routes: [
      {
        from: { name: 'Santorini', latitude: 36.3932, longitude: 25.4615, type: 'region' },
        to: { name: 'Cairo', latitude: 30.0444, longitude: 31.2357, type: 'city' },
      },
      {
        from: { name: 'Cairo', latitude: 30.0444, longitude: 31.2357, type: 'city' },
        to: { name: 'Dubai', latitude: 25.2048, longitude: 55.2708, type: 'city' },
      },
    ],
  },
];

export interface FeaturedJourneysProps {
  onSelectRoute: (routes: GlobeRoute[], startLocation: GlobeLocation) => void;
  onOpenWorkspaceWithRoute?: (title: string, destination: string) => void;
  onOpenJourneyDetails?: (journey: FeaturedJourney) => void;
}

export const FeaturedJourneys: React.FC<FeaturedJourneysProps> = ({
  onSelectRoute,
  onOpenWorkspaceWithRoute,
  onOpenJourneyDetails,
}) => {
  const handlePlanClick = (journey: FeaturedJourney) => {
    if (onOpenJourneyDetails) {
      onOpenJourneyDetails(journey);
    } else {
      onOpenWorkspaceWithRoute?.(journey.title, journey.stops[0]);
    }
  };

  return (
    <section className="featured-journeys-section" id="journeys">
      <div className="section-header-wrap">
        <div className="section-title-col">
          <div className="section-eyebrow">
            <Plane size={14} className="text-emerald-700" />
            <span>CURATED MULTI-STOP EXPEDITIONS</span>
          </div>
          <h2 className="section-title">Seamless journeys across continents</h2>
          <p className="section-subtitle">
            Preview great-circle flight arcs rendered directly on the 3D globe. Select any journey to inspect full expedition itineraries, multi-stop logistics, and booking packages.
          </p>
        </div>
      </div>

      <div className="journeys-grid">
        {sampleJourneys.map((journey) => (
          <article
            key={journey.id}
            className="journey-card cursor-pointer group hover:shadow-xl transition-all duration-300"
            onClick={() => handlePlanClick(journey)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePlanClick(journey);
            }}
          >
            <div className="journey-image-wrap">
              <img src={journey.image} alt={journey.title} className="journey-cover-img group-hover:scale-105 transition-transform duration-500" />
              <div className="journey-badge-row">
                <span className="journey-duration-badge">
                  <Calendar size={12} /> {journey.duration}
                </span>
                <span className="journey-style-badge">{journey.style}</span>
              </div>
            </div>

            <div className="journey-content-wrap">
              <div className="journey-stops-chain">
                {journey.stops.map((stop, i) => (
                  <React.Fragment key={stop}>
                    <span className="journey-stop-pill">
                      <MapPin size={11} className="text-emerald-700" />
                      {stop}
                    </span>
                    {i < journey.stops.length - 1 && <span className="journey-stop-arrow">&rarr;</span>}
                  </React.Fragment>
                ))}
              </div>

              <h3 className="journey-title group-hover:text-emerald-800 transition-colors">{journey.title}</h3>
              <p className="journey-desc">{journey.description}</p>

              <div className="journey-action-bar">
                <button
                  type="button"
                  className="btn-preview-route"
                  onClick={(e) => {
                    e.stopPropagation();
                    const startLoc = journey.routes[0].from;
                    onSelectRoute(journey.routes, startLoc);
                  }}
                  aria-label={`Preview ${journey.title} flight route on globe`}
                >
                  <Compass size={14} />
                  <span>Preview Route on Globe</span>
                </button>

                <button
                  type="button"
                  className="btn-plan-journey"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlanClick(journey);
                  }}
                  aria-label={`Plan ${journey.title}`}
                >
                  <span>Plan</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default FeaturedJourneys;
