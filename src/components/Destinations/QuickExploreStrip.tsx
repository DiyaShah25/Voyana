import React from 'react';
import { MapPin, Sparkles } from 'lucide-react';
import type { GlobeLocation } from '@/components/Globe/globe.types';

export interface QuickLocationItem {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  tag: string;
}

export const quickLocations: QuickLocationItem[] = [
  { name: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, tag: 'Culture & Neon' },
  { name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522, tag: 'Art & Architecture' },
  { name: 'Rome', country: 'Italy', latitude: 41.9028, longitude: 12.4964, tag: 'Ancient Heritage' },
  { name: 'Bali', country: 'Indonesia', latitude: -8.4095, longitude: 115.1889, tag: 'Tropical Serenity' },
  { name: 'Cairo', country: 'Egypt', latitude: 30.0444, longitude: 31.2357, tag: 'Timeless History' },
  { name: 'Santorini', country: 'Greece', latitude: 36.3932, longitude: 25.4615, tag: 'Aegean Horizons' },
  { name: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006, tag: 'Global Metropolis' },
  { name: 'Kyoto', country: 'Japan', latitude: 35.0116, longitude: 135.7681, tag: 'Temples & Gardens' },
  { name: 'Reykjavik', country: 'Iceland', latitude: 64.1466, longitude: -21.9426, tag: 'Nordic Aurora' },
  { name: 'Cape Town', country: 'South Africa', latitude: -33.9249, longitude: 18.4241, tag: 'Ocean & Peaks' },
];

interface QuickExploreStripProps {
  selectedLocationName?: string;
  onSelect: (location: GlobeLocation) => void;
}

export const QuickExploreStrip: React.FC<QuickExploreStripProps> = ({
  selectedLocationName,
  onSelect,
}) => {
  return (
    <div className="quick-explore-container">
      <div className="quick-explore-header">
        <span className="quick-explore-label">
          <Sparkles size={13} className="text-emerald-700" />
          <span>Quick Geographic Focus:</span>
        </span>
        <span className="quick-explore-hint">Click any destination to fly the 3D globe</span>
      </div>

      <div className="quick-explore-scroll">
        {quickLocations.map((item) => {
          const isSelected = selectedLocationName?.toLowerCase() === item.name.toLowerCase();
          return (
            <button
              key={item.name}
              type="button"
              className={`quick-explore-pill ${isSelected ? 'active' : ''}`}
              onClick={() => {
                onSelect({
                  name: item.name,
                  city: item.name,
                  country: item.country,
                  latitude: item.latitude,
                  longitude: item.longitude,
                  type: 'city',
                });
              }}
              aria-label={`Fly globe to ${item.name}, ${item.country}`}
            >
              <MapPin size={13} className={isSelected ? 'text-white' : 'text-emerald-700'} />
              <span className="pill-name">{item.name}</span>
              <span className="pill-country">{item.country}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickExploreStrip;
