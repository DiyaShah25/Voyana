/**
 * Destination Card Component
 * Renders an individual destination card with image, name,
 * location metadata, and click-to-explore interaction.
 */

import React from 'react';
import { ArrowRight, Plane, Building2, Star, Compass } from 'lucide-react';
import type { GlobeLocation } from '@/components/Globe/globe.types';

export interface DestinationItem {
  id: string;
  name: string;
  country: string;
  region: 'Europe' | 'Asia' | 'Americas' | 'Africa' | 'Middle East' | 'Oceania';
  image: string;
  bestSeason: string;
  highlight: string;
  style: string;
  coordinates: { latitude: number; longitude: number };
}

interface DestinationCardProps {
  destination: DestinationItem;
  isSelected?: boolean;
  onSelectOnGlobe: (loc: GlobeLocation) => void;
  onOpenDetails?: (destination: DestinationItem) => void;
  onBookFlight: (city: string) => void;
  onBookHotel: (city: string) => void;
  onViewReviews: (city: string) => void;
}

export const DestinationCard: React.FC<DestinationCardProps> = ({
  destination,
  isSelected,
  onSelectOnGlobe,
  onOpenDetails,
  onBookFlight,
  onBookHotel,
  onViewReviews,
}) => {
  const globeLoc: GlobeLocation = {
    name: destination.name,
    city: destination.name,
    country: destination.country,
    latitude: destination.coordinates.latitude,
    longitude: destination.coordinates.longitude,
    type: 'city',
    style: destination.style,
  };

  const handleCardClick = () => {
    onSelectOnGlobe(globeLoc);
    if (onOpenDetails) {
      onOpenDetails(destination);
    }
  };

  return (
    <article
      className={`destination-card-premium cursor-pointer ${isSelected ? 'active-selection' : ''}`}
      onClick={handleCardClick}
    >
      {/* Image Wrap */}
      <div className="card-image-wrap cursor-pointer" onClick={handleCardClick}>
        <img
          src={destination.image}
          alt={`${destination.name}, ${destination.country}`}
          loading="lazy"
          className="card-cover-img"
        />
        <div className="card-badge-row">
          <span className="card-region-badge">{destination.region}</span>
          <span className="card-season-badge">{destination.bestSeason}</span>
        </div>
        <div className="card-fly-overlay">
          <span className="card-fly-chip">
            <Compass size={13} />
            <span>Explore Details & Globe</span>
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="card-body-wrap">
        <div className="card-header-row">
          <div>
            <h3 className="card-title cursor-pointer" onClick={handleCardClick}>
              {destination.name}
            </h3>
            <p className="card-country">{destination.country}</p>
          </div>
          <span className="card-style-tag">{destination.style}</span>
        </div>

        <p className="card-highlight-text cursor-pointer" onClick={handleCardClick}>
          {destination.highlight}
        </p>

        {/* Action Row */}
        <div className="card-action-bar">
          <button
            type="button"
            className="btn-card-explore"
            onClick={handleCardClick}
            aria-label={`Explore ${destination.name} details`}
          >
            <span>Explore</span>
            <ArrowRight size={14} />
          </button>

          <div className="card-service-triggers">
            <button
              type="button"
              className="btn-card-icon"
              title={`Book Flight to ${destination.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onBookFlight(destination.name);
              }}
            >
              <Plane size={14} />
            </button>
            <button
              type="button"
              className="btn-card-icon"
              title={`Book Hotel in ${destination.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onBookHotel(destination.name);
              }}
            >
              <Building2 size={14} />
            </button>
            <button
              type="button"
              className="btn-card-icon"
              title={`Reviews for ${destination.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onViewReviews(destination.name);
              }}
            >
              <Star size={14} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default DestinationCard;
