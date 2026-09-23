import React from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import type { GlobeLocation } from '@/components/Globe/globe.types';

export interface RailDestination {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  image: string;
  temperature: string;
  style: string;
}

export const railDestinations: RailDestination[] = [
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    latitude: 35.6762,
    longitude: 139.6503,
    image: 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    temperature: '21°C',
    style: 'Modern & Traditional',
  },
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    latitude: 48.8566,
    longitude: 2.3522,
    image: 'https://images.pexels.com/photos/14681748/pexels-photo-14681748.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    temperature: '19°C',
    style: 'Art & Architecture',
  },
  {
    id: 'rome',
    name: 'Rome',
    country: 'Italy',
    latitude: 41.9028,
    longitude: 12.4964,
    image: 'https://images.pexels.com/photos/1797161/pexels-photo-1797161.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    temperature: '23°C',
    style: 'Antiquity & Cuisine',
  },
  {
    id: 'bali',
    name: 'Bali',
    country: 'Indonesia',
    latitude: -8.4095,
    longitude: 115.1889,
    image: 'https://images.pexels.com/photos/2166559/pexels-photo-2166559.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    temperature: '28°C',
    style: 'Island Sanctuaries',
  },
  {
    id: 'cairo',
    name: 'Cairo',
    country: 'Egypt',
    latitude: 30.0444,
    longitude: 31.2357,
    image: 'https://images.pexels.com/photos/71241/pexels-photo-71241.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    temperature: '26°C',
    style: 'Timeless Wonders',
  },
  {
    id: 'santorini',
    name: 'Santorini',
    country: 'Greece',
    latitude: 36.3932,
    longitude: 25.4615,
    image: 'https://images.pexels.com/photos/1010657/pexels-photo-1010657.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    temperature: '22°C',
    style: 'Caldera Vistas',
  },
  {
    id: 'reykjavik',
    name: 'Reykjavik',
    country: 'Iceland',
    latitude: 64.1466,
    longitude: -21.9426,
    image: 'https://images.pexels.com/photos/1009136/pexels-photo-1009136.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    temperature: '11°C',
    style: 'Glaciers & Aurora',
  },
  {
    id: 'cape-town',
    name: 'Cape Town',
    country: 'South Africa',
    latitude: -33.9249,
    longitude: 18.4241,
    image: 'https://images.pexels.com/photos/259447/pexels-photo-259447.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    temperature: '20°C',
    style: 'Atlantic & Mountain',
  },
];

interface DestinationRailProps {
  selectedLocationName?: string;
  onSelect: (location: GlobeLocation) => void;
}

export const DestinationRail: React.FC<DestinationRailProps> = ({
  selectedLocationName,
  onSelect,
}) => {
  return (
    <section className="editorial-rail-section">
      <div className="editorial-rail-header">
        <div>
          <span className="editorial-eyebrow">EXPLORE THE WORLD</span>
          <h2 className="editorial-rail-title">Featured destinations</h2>
        </div>
        <span className="editorial-rail-hint">
          Select any destination to smoothly rotate the Earth
        </span>
      </div>

      <div className="editorial-rail-track">
        {railDestinations.map((dest) => {
          const isSelected = selectedLocationName?.toLowerCase() === dest.name.toLowerCase();
          return (
            <div
              key={dest.id}
              className={`rail-card ${isSelected ? 'active' : ''}`}
              onClick={() => {
                onSelect({
                  name: dest.name,
                  city: dest.name,
                  country: dest.country,
                  latitude: dest.latitude,
                  longitude: dest.longitude,
                  type: 'city',
                });
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSelect({
                    name: dest.name,
                    city: dest.name,
                    country: dest.country,
                    latitude: dest.latitude,
                    longitude: dest.longitude,
                    type: 'city',
                  });
                }
              }}
            >
              <div className="rail-card-img-wrap">
                <img src={dest.image} alt={dest.name} className="rail-card-img" />
                <span className="rail-card-temp">{dest.temperature}</span>
              </div>
              <div className="rail-card-copy">
                <div className="rail-card-names">
                  <h3 className="rail-card-city">{dest.name}</h3>
                  <span className="rail-card-country">{dest.country}</span>
                </div>
                <span className="rail-card-style">{dest.style}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default DestinationRail;
