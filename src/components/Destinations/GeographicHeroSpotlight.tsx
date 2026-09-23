import React from 'react';
import {
  Compass,
  Plane,
  Building2,
  Briefcase,
  Star,
  MapPin,
  Clock,
  Thermometer,
  ArrowRight,
} from 'lucide-react';
import type { GlobeLocation } from '@/components/Globe/globe.types';

interface GeographicHeroSpotlightProps {
  selectedLocation: GlobeLocation;
  onSelectLocation: (loc: GlobeLocation) => void;
  onOpenFlight: () => void;
  onOpenHotel: () => void;
  onOpenTrips: () => void;
  onOpenReviews: () => void;
}

const FEATURED_EXPLORE_CITIES: Array<GlobeLocation & { image: string; temp: string; style: string; time: string; desc: string }> = [
  {
    name: 'Paris',
    city: 'Paris',
    country: 'France',
    latitude: 48.8566,
    longitude: 2.3522,
    type: 'city',
    temp: '21°C',
    style: 'Art & Historic',
    time: '14:30 CET',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=700&q=80',
    desc: 'Wander tree-lined boulevards, neoclassical architecture, world-renowned museums, and riverside dining along the Seine.',
  },
  {
    name: 'Tokyo',
    city: 'Tokyo',
    country: 'Japan',
    latitude: 35.6762,
    longitude: 139.6503,
    type: 'city',
    temp: '19°C',
    style: 'Futuristic & Tradition',
    time: '22:30 JST',
    image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=700&q=80',
    desc: 'From Shibuya neon crossings and Michelin-starred culinary craft to tranquil Meiji shrine gardens.',
  },
  {
    name: 'Bali',
    city: 'Bali',
    country: 'Indonesia',
    latitude: -8.4095,
    longitude: 115.1889,
    type: 'region',
    temp: '29°C',
    style: 'Tropical Sanctuary',
    time: '21:30 WITA',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=700&q=80',
    desc: 'Emerald rice terraces in Ubud, volcanic coastal cliffs in Uluwatu, and serene oceanfront wellness retreats.',
  },
  {
    name: 'Rome',
    city: 'Rome',
    country: 'Italy',
    latitude: 41.9028,
    longitude: 12.4964,
    type: 'city',
    temp: '24°C',
    style: 'Classical Heritage',
    time: '14:30 CET',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=700&q=80',
    desc: 'The eternal amphitheaters, cobblestone piazzas, baroque fountains, and artisan trattorias.',
  },
  {
    name: 'New York',
    city: 'New York',
    country: 'United States',
    latitude: 40.7128,
    longitude: -74.006,
    type: 'city',
    temp: '18°C',
    style: 'Metropolitan Energy',
    time: '08:30 EDT',
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=700&q=80',
    desc: 'Skyline vantage points, Central Park autumn strolls, Broadway theatre, and world-class cultural institutions.',
  },
  {
    name: 'Kyoto',
    city: 'Kyoto',
    country: 'Japan',
    latitude: 35.0116,
    longitude: 135.7681,
    type: 'city',
    temp: '17°C',
    style: 'Zen & Temples',
    time: '22:30 JST',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=700&q=80',
    desc: 'Bamboo groves of Arashiyama, thousand torii gates at Fushimi Inari, and historic geisha tea houses.',
  },
];

export const GeographicHeroSpotlight: React.FC<GeographicHeroSpotlightProps> = ({
  selectedLocation,
  onSelectLocation,
  onOpenFlight,
  onOpenHotel,
  onOpenTrips,
  onOpenReviews,
}) => {
  const currentCity =
    FEATURED_EXPLORE_CITIES.find(
      (c) => c.name.toLowerCase() === selectedLocation.name.toLowerCase()
    ) || {
      ...selectedLocation,
      temp: '22°C',
      style: 'Curated Discovery',
      time: 'Local Time',
      image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=700&q=80',
      desc: 'Explore authentic local neighborhoods, curated boutique accommodations, and geographic wonders with Voyana.',
    };

  return (
    <div className="geo-spotlight-wrapper animate-fade-in">
      {/* Main Glass Spotlight Card */}
      <div className="geo-spotlight-card">
        {/* Destination Photo Banner */}
        <div className="geo-card-image-wrap">
          <img
            src={currentCity.image}
            alt={currentCity.name}
            className="geo-card-image"
          />
          <div className="geo-card-image-scrim" />

          {/* Top Floating Badges */}
          <div className="geo-image-top-row">
            <span className="geo-badge-live">
              <span className="geo-badge-pulse" />
              <span>ACTIVE SPOTLIGHT</span>
            </span>
            <span className="geo-badge-style">{currentCity.style}</span>
          </div>

          {/* Bottom Title on Image */}
          <div className="geo-image-bottom-row">
            <div className="geo-title-wrap">
              <h2 className="geo-city-name">{currentCity.name}</h2>
              <span className="geo-country-name">{currentCity.country}</span>
            </div>
            <div className="geo-temp-badge">
              <Thermometer size={14} className="text-emerald-400" />
              <span>{currentCity.temp}</span>
            </div>
          </div>
        </div>

        {/* Details & Telemetry Body */}
        <div className="geo-card-body">
          <div className="geo-telemetry-row">
            <span className="geo-telemetry-item">
              <MapPin size={13} className="text-emerald-700" />
              <span>
                {Math.abs(selectedLocation.latitude).toFixed(2)}°{selectedLocation.latitude >= 0 ? 'N' : 'S'},{' '}
                {Math.abs(selectedLocation.longitude).toFixed(2)}°{selectedLocation.longitude >= 0 ? 'E' : 'W'}
              </span>
            </span>
            <span className="geo-telemetry-item">
              <Clock size={13} className="text-slate-400" />
              <span>{currentCity.time}</span>
            </span>
          </div>

          <p className="geo-description">{currentCity.desc}</p>

          {/* 1-Click Action Buttons */}
          <div className="geo-action-grid">
            <button
              type="button"
              className="geo-action-btn primary"
              onClick={onOpenFlight}
            >
              <Plane size={14} />
              <span>Flights</span>
            </button>

            <button
              type="button"
              className="geo-action-btn secondary"
              onClick={onOpenHotel}
            >
              <Building2 size={14} />
              <span>Stays</span>
            </button>

            <button
              type="button"
              className="geo-action-btn secondary"
              onClick={onOpenTrips}
            >
              <Briefcase size={14} />
              <span>Workspace</span>
            </button>

            <button
              type="button"
              className="geo-action-btn secondary"
              onClick={onOpenReviews}
            >
              <Star size={14} />
              <span>Reviews</span>
            </button>
          </div>
        </div>

        {/* Quick Destination Navigation Switcher */}
        <div className="geo-switcher-bar">
          <span className="geo-switcher-label">
            <Compass size={13} className="text-emerald-700" />
            <span>Fast Explore:</span>
          </span>
          <div className="geo-switcher-chips">
            {FEATURED_EXPLORE_CITIES.map((city) => (
              <button
                key={city.name}
                type="button"
                className={`geo-city-chip ${
                  selectedLocation.name.toLowerCase() === city.name.toLowerCase() ? 'active' : ''
                }`}
                onClick={() => onSelectLocation(city)}
              >
                <span>{city.name}</span>
                {selectedLocation.name.toLowerCase() === city.name.toLowerCase() && (
                  <ArrowRight size={11} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeographicHeroSpotlight;
