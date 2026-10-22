/**
 * Destination Grid Component
 * Displays a responsive grid of destination cards for browsing
 * and discovering popular travel locations.
 */

import React, { useState, useEffect } from 'react';
import { Compass, Filter, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import type { GlobeLocation } from '@/components/Globe/globe.types';
import DestinationCard, { DestinationItem } from './DestinationCard';
import { getDestinations } from '@/services/destinationService';

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
  {
    id: 'dubai',
    name: 'Dubai',
    country: 'United Arab Emirates',
    region: 'Middle East',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&h=650&w=940&q=80',
    bestSeason: 'Nov – Apr',
    highlight: 'Ultra-modern skyscrapers, luxury beachfront resorts, and red desert dune safaris.',
    style: 'Luxury Oasis',
    coordinates: { latitude: 25.2048, longitude: 55.2708 },
  },
  {
    id: 'zurich',
    name: 'Zurich & Swiss Alps',
    country: 'Switzerland',
    region: 'Europe',
    image: 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    bestSeason: 'Jun – Sep & Dec – Mar',
    highlight: 'Pristine alpine lakes, Matterhorn cogwheel railways, and thermal glacier wellness.',
    style: 'Alpine & Peaks',
    coordinates: { latitude: 47.3769, longitude: 8.5417 },
  },
  {
    id: 'new_york',
    name: 'New York City',
    country: 'United States',
    region: 'Americas',
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&h=650&w=940&q=80',
    bestSeason: 'Apr – Jun & Sep – Nov',
    highlight: 'Manhattan skyline energy, Broadway theaters, Central Park, and world-class culinary icons.',
    style: 'Urban Metropolis',
    coordinates: { latitude: 40.7128, longitude: -74.006 },
  },
  {
    id: 'barcelona',
    name: 'Barcelona',
    country: 'Spain',
    region: 'Europe',
    image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&h=650&w=940&q=80',
    bestSeason: 'May – Jun & Sep – Oct',
    highlight: 'Gaudí’s architectural marvels, Mediterranean beaches, and vibrant tapas culture in El Born.',
    style: 'Art & Mediterranean',
    coordinates: { latitude: 41.3879, longitude: 2.1699 },
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    region: 'Europe',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&h=650&w=940&q=80',
    bestSeason: 'May – Sep',
    highlight: 'Historic royal landmarks, West End theater district, Hyde Park, and afternoon tea heritage.',
    style: 'Royal & Cosmopolitan',
    coordinates: { latitude: 51.5074, longitude: -0.1278 },
  },
  {
    id: 'amalfi',
    name: 'Amalfi Coast',
    country: 'Italy',
    region: 'Europe',
    image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&h=650&w=940&q=80',
    bestSeason: 'May – Sep',
    highlight: 'Pastel cliffside villages, private Capri boat charters, and lemon-scented coastal terraces.',
    style: 'Coastal Glamour',
    coordinates: { latitude: 40.634, longitude: 14.6027 },
  },
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    region: 'Oceania',
    image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&h=650&w=940&q=80',
    bestSeason: 'Sep – Nov & Mar – May',
    highlight: 'Iconic Opera House harbor views, Bondi coastal walks, and world-class surfing beaches.',
    style: 'Harbour & Coastal',
    coordinates: { latitude: -33.8688, longitude: 151.2093 },
  },
];

interface DestinationGridProps {
  selectedLocationName?: string;
  onSelectOnGlobe?: (loc: GlobeLocation) => void;
  onSelectDestination?: (loc: GlobeLocation) => void;
  onBookFlight?: (city: string) => void;
  onOpenFlight?: (city: string) => void;
  onBookHotel?: (city: string) => void;
  onOpenHotel?: (city: string) => void;
  onViewReviews?: (city: string) => void;
  onOpenReviews?: (city: string) => void;
}

export const DestinationGrid: React.FC<DestinationGridProps> = ({
  selectedLocationName,
  onSelectOnGlobe,
  onSelectDestination,
  onBookFlight,
  onOpenFlight,
  onBookHotel,
  onOpenHotel,
  onViewReviews,
  onOpenReviews,
}) => {
  const handleSelectOnGlobe = onSelectOnGlobe || onSelectDestination || (() => {});
  const handleBookFlight = onBookFlight || onOpenFlight || (() => {});
  const handleBookHotel = onBookHotel || onOpenHotel || (() => {});
  const handleViewReviews = onViewReviews || onOpenReviews || (() => {});
  const [activeRegion, setActiveRegion] = useState<string>('All');
  const [destinations, setDestinations] = useState<DestinationItem[]>(curatedDestinations);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    let isMounted = true;
    getDestinations(curatedDestinations).then((data) => {
      if (isMounted && data && data.length > 0) {
        setDestinations(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const regions = ['All', 'Europe', 'Asia', 'Middle East', 'Africa', 'Americas', 'Oceania'];

  const filtered = activeRegion === 'All'
    ? destinations
    : destinations.filter((d) => d.region === activeRegion);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length);
  const currentDestinations = filtered.slice(startIndex, endIndex);

  const handleRegionChange = (region: string) => {
    setActiveRegion(region);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    const target = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(target);
    const section = document.getElementById('destinations');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
              onClick={() => handleRegionChange(region)}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="destination-cards-grid">
        {currentDestinations.map((dest) => (
          <DestinationCard
            key={dest.id}
            destination={dest}
            isSelected={selectedLocationName?.toLowerCase() === dest.name.toLowerCase()}
            onSelectOnGlobe={handleSelectOnGlobe}
            onBookFlight={handleBookFlight}
            onBookHotel={handleBookHotel}
            onViewReviews={handleViewReviews}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="destination-pagination-wrap">
          <div className="pagination-counter">
            <span>Showing</span>
            <strong>{filtered.length > 0 ? startIndex + 1 : 0}–{endIndex}</strong>
            <span>of</span>
            <strong>{filtered.length}</strong>
            <span>destinations</span>
          </div>

          <div className="pagination-controls">
            <button
              type="button"
              className="pagination-nav-btn"
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <div className="pagination-pages">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`pagination-page-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => goToPage(page)}
                  aria-label={`Go to page ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="pagination-nav-btn"
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default DestinationGrid;
