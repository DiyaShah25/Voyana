import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Compass,
  ArrowRight,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import type { GlobeLocation } from '@/components/Globe/globe.types';
import { suggestDestinations, resolveLocation } from '@/services/locationService';

interface TravelSearchProps {
  onLocationSelect: (location: GlobeLocation) => void;
  isLoading?: boolean;
}

export const TravelSearch: React.FC<TravelSearchProps> = ({
  onLocationSelect,
  isLoading = false,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GlobeLocation[]>([]);
  const [whenOpen, setWhenOpen] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);

  const [selectedSeason, setSelectedSeason] = useState('Anytime / Flexible');
  const [selectedTravelers, setSelectedTravelers] = useState('2 Travelers (Couple)');
  const [selectedStyle, setSelectedStyle] = useState('Cultural & Discovery');

  const containerRef = useRef<HTMLDivElement>(null);

  // Autocomplete suggestions
  useEffect(() => {
    const controller = new AbortController();
    const fetchSuggestions = async () => {
      if (query.trim().length > 0) {
        try {
          const results = await suggestDestinations(query, controller.signal);
          setSuggestions(results);
        } catch (e) {
          if ((e as Error).name !== 'AbortError') console.error(e);
        }
      } else {
        setSuggestions([]);
      }
    };
    const timer = setTimeout(fetchSuggestions, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setWhenOpen(false);
        setWhoOpen(false);
        setStyleOpen(false);
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (loc: GlobeLocation) => {
    setQuery(loc.name);
    setSuggestions([]);
    onLocationSelect(loc);
  };

  const handleSearchSubmit = async () => {
    const term = query.trim() || 'Paris';
    try {
      const loc = await resolveLocation(term);
      if (loc) {
        handleSelect(loc);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="travel-search-bar" ref={containerRef}>
      {/* 1. WHERE */}
      <div className="search-field where-field">
        <div className="search-field-icon">
          <MapPin size={18} className="text-emerald-700" />
        </div>
        <div className="search-field-content">
          <label className="search-field-label">Where to</label>
          <input
            type="text"
            className="search-field-input"
            placeholder="Search destination, city, region…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearchSubmit();
            }}
          />
        </div>

        {/* Suggestions Autocomplete */}
        {suggestions.length > 0 && (
          <div className="search-suggestions-dropdown animate-fade-down">
            {suggestions.map((loc) => (
              <button
                key={`${loc.name}-${loc.latitude}`}
                type="button"
                className="suggestion-row"
                onClick={() => handleSelect(loc)}
              >
                <div className="suggestion-icon">
                  <MapPin size={15} />
                </div>
                <div className="suggestion-text">
                  <span className="suggestion-name">{loc.name}</span>
                  <span className="suggestion-meta">
                    {[loc.state, loc.country].filter(Boolean).join(', ')}
                  </span>
                </div>
                <ArrowRight size={14} className="suggestion-arrow" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="search-divider" />

      {/* 2. WHEN */}
      <div className="search-field interactive-field" onClick={() => { setWhenOpen(!whenOpen); setWhoOpen(false); setStyleOpen(false); }}>
        <div className="search-field-icon">
          <Calendar size={18} className="text-emerald-700" />
        </div>
        <div className="search-field-content">
          <label className="search-field-label">When</label>
          <div className="search-field-value">
            <span>{selectedSeason}</span>
            <ChevronDown size={13} className={`field-chevron ${whenOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {whenOpen && (
          <div className="search-popover-menu animate-fade-down">
            {[
              'Anytime / Flexible',
              'Spring (Mar – May)',
              'Summer (Jun – Aug)',
              'Autumn (Sep – Nov)',
              'Winter (Dec – Feb)',
            ].map((season) => (
              <button
                key={season}
                type="button"
                className={`popover-option ${selectedSeason === season ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSeason(season);
                  setWhenOpen(false);
                }}
              >
                {season}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="search-divider" />

      {/* 3. WHO */}
      <div className="search-field interactive-field" onClick={() => { setWhoOpen(!whoOpen); setWhenOpen(false); setStyleOpen(false); }}>
        <div className="search-field-icon">
          <Users size={18} className="text-emerald-700" />
        </div>
        <div className="search-field-content">
          <label className="search-field-label">Who</label>
          <div className="search-field-value">
            <span>{selectedTravelers}</span>
            <ChevronDown size={13} className={`field-chevron ${whoOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {whoOpen && (
          <div className="search-popover-menu animate-fade-down">
            {[
              '1 Traveler (Solo Explorer)',
              '2 Travelers (Couple)',
              '3–5 Travelers (Family / Friends)',
              '6+ Travelers (Group Expedition)',
            ].map((travelers) => (
              <button
                key={travelers}
                type="button"
                className={`popover-option ${selectedTravelers === travelers ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTravelers(travelers);
                  setWhoOpen(false);
                }}
              >
                {travelers}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="search-divider" />

      {/* 4. STYLE */}
      <div className="search-field interactive-field" onClick={() => { setStyleOpen(!styleOpen); setWhenOpen(false); setWhoOpen(false); }}>
        <div className="search-field-icon">
          <Compass size={18} className="text-emerald-700" />
        </div>
        <div className="search-field-content">
          <label className="search-field-label">Travel Style</label>
          <div className="search-field-value">
            <span>{selectedStyle}</span>
            <ChevronDown size={13} className={`field-chevron ${styleOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {styleOpen && (
          <div className="search-popover-menu animate-fade-down">
            {[
              'Cultural & Discovery',
              'Relaxation & Wellness',
              'Mountain & Trekking',
              'Coastal & Tropical',
              'Culinary & Epicurean',
            ].map((style) => (
              <button
                key={style}
                type="button"
                className={`popover-option ${selectedStyle === style ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStyle(style);
                  setStyleOpen(false);
                }}
              >
                {style}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 5. EXPLORE CTA BUTTON */}
      <div className="search-action-wrap">
        <button
          type="button"
          className="btn-search-explore"
          onClick={handleSearchSubmit}
          disabled={isLoading}
          aria-label="Explore Destination"
        >
          {isLoading ? (
            <div className="spinner-small" />
          ) : (
            <>
              <span>Explore</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TravelSearch;
