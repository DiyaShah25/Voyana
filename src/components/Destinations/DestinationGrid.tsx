import React, { useState } from 'react';
import { Compass, Filter, Sparkles } from 'lucide-react';
import type { GlobeLocation } from '@/components/Globe/globe.types';
import DestinationCard, { DestinationItem } from './DestinationCard';

export const curatedDestinations: DestinationItem[] = [
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    region: 'Asia',
    image: 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    bestSeason: 'Mar – May',
    highlight: 'Hyper-modern skylines meet ancient shrines and world-class culinary mastery.',
    style: 'Culture & Urban',
    coordinates: { latitude: 35.6762, longitude: 139.6503 },
  },
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    region: 'Europe',
    image: 'https://images.pexels.com/photos/14681748/pexels-photo-14681748.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    bestSeason: 'Apr – Jun',
    highlight: 'Iconic riverside boulevards, world-class galleries, and quintessential café culture.',
    style: 'Art & Heritage',
    coordinates: { latitude: 48.8566, longitude: 2.3522 },
  },
  {
    id: 'bali',
    name: 'Bali',
    country: 'Indonesia',
    region: 'Asia',
    image: 'https://images.pexels.com/photos/2166559/pexels-photo-2166559.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    bestSeason: 'May – Sep',
    highlight: 'Emerald rice terraces, spiritual water temples, and tranquil coastal sanctuaries.',
    style: 'Wellness & Island',
    coordinates: { latitude: -8.4095, longitude: 115.1889 },
  },
  {
    id: 'rome',
    name: 'Rome',
    country: 'Italy',
    region: 'Europe',
    image: 'https://images.pexels.com/photos/1797161/pexels-photo-1797161.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    bestSeason: 'Apr – Oct',
    highlight: 'Walk among living antiquity from the Colosseum arches to cobblestone piazzas.',
    style: 'Classical Antiquity',
    coordinates: { latitude: 41.9028, longitude: 12.4964 },
  },
  {
    id: 'cairo',
    name: 'Cairo',
    country: 'Egypt',
    region: 'Middle East',
    image: 'https://images.pexels.com/photos/71241/pexels-photo-71241.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    bestSeason: 'Oct – Apr',
    highlight: 'The legendary pyramids of Giza and golden desert sunsets along the fertile Nile.',
    style: 'Wonders of World',
    coordinates: { latitude: 30.0444, longitude: 31.2357 },
  },
  {
    id: 'santorini',
    name: 'Santorini',
    country: 'Greece',
    region: 'Europe',
    image: 'https://images.pexels.com/photos/1010657/pexels-photo-1010657.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    bestSeason: 'May – Oct',
    highlight: 'Whitewashed cliffside villas perched over deep sapphire Aegean caldera waters.',
    style: 'Coastal Escapes',
    coordinates: { latitude: 36.3932, longitude: 25.4615 },
  },
  {
    id: 'kyoto',
    name: 'Kyoto',
    country: 'Japan',
    region: 'Asia',
    image: 'https://images.pexels.com/photos/1440476/pexels-photo-1440476.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    bestSeason: 'Mar – May & Oct – Nov',
    highlight: 'Centuries of Zen rock gardens, bamboo groves, and traditional tea ceremony pavilions.',
    style: 'Zen & Nature',
    coordinates: { latitude: 35.0116, longitude: 135.7681 },
  },
  {
    id: 'reykjavik',
    name: 'Reykjavik',
    country: 'Iceland',
    region: 'Europe',
    image: 'https://images.pexels.com/photos/1009136/pexels-photo-1009136.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    bestSeason: 'Jun – Aug (Summer) & Nov – Feb (Aurora)',
    highlight: 'Glacial waterfalls, black sand shores, geothermal lagoons, and dancing polar lights.',
    style: 'Alpine & Aurora',
    coordinates: { latitude: 64.1466, longitude: -21.9426 },
  },
  {
    id: 'cape-town',
    name: 'Cape Town',
    country: 'South Africa',
    region: 'Africa',
    image: 'https://images.pexels.com/photos/259447/pexels-photo-259447.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    bestSeason: 'Nov – Mar',
    highlight: 'Majestic Table Mountain backdrop meeting the dramatic collision of two oceans.',
    style: 'Ocean & Peaks',
    coordinates: { latitude: -33.9249, longitude: 18.4241 },
  },
];

interface DestinationGridProps {
  selectedLocationName?: string;
  onSelectOnGlobe: (loc: GlobeLocation) => void;
  onBookFlight: (city: string) => void;
  onBookHotel: (city: string) => void;
  onViewReviews: (city: string) => void;
}

export const DestinationGrid: React.FC<DestinationGridProps> = ({
  selectedLocationName,
  onSelectOnGlobe,
  onBookFlight,
  onBookHotel,
  onViewReviews,
}) => {
  const [activeRegion, setActiveRegion] = useState<string>('All');

  const regions = ['All', 'Europe', 'Asia', 'Middle East', 'Africa'];

  const filtered = activeRegion === 'All'
    ? curatedDestinations
    : curatedDestinations.filter((d) => d.region === activeRegion);

  return (
    <section className="destinations-section" id="destinations">
      <div className="section-header-wrap">
        <div className="section-title-col">
          <div className="section-eyebrow">
            <Compass size={14} className="text-emerald-700" />
            <span>CURATED WORLD DESTINATIONS</span>
          </div>
          <h2 className="section-title">Places crafted for discovery</h2>
          <p className="section-subtitle">
            Every destination synchronizes directly with the 3D Earth globe. Select any place to explore local geography, seasonal weather, and travel services.
          </p>
        </div>

        {/* Region Filter Tabs */}
        <div className="region-filter-tabs">
          {regions.map((region) => (
            <button
              key={region}
              type="button"
              className={`region-tab-btn ${activeRegion === region ? 'active' : ''}`}
              onClick={() => setActiveRegion(region)}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="destination-cards-grid">
        {filtered.map((dest) => (
          <DestinationCard
            key={dest.id}
            destination={dest}
            isSelected={selectedLocationName?.toLowerCase() === dest.name.toLowerCase()}
            onSelectOnGlobe={onSelectOnGlobe}
            onBookFlight={onBookFlight}
            onBookHotel={onBookHotel}
            onViewReviews={onViewReviews}
          />
        ))}
      </div>
    </section>
  );
};

export default DestinationGrid;
