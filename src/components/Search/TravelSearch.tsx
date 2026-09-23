import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ArrowRight, SlidersHorizontal, Check } from 'lucide-react';
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
  const [showPreferences, setShowPreferences] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState('Anytime');
  const [selectedStyle, setSelectedStyle] = useState('Cultural & Discovery');

  const containerRef = useRef<HTMLDivElement>(null);

  // Autocomplete
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
    const timer = setTimeout(fetchSuggestions, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Click outside to dismiss suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const term = query.trim() || 'Paris';
    try {
      const loc = await resolveLocation(term);
      if (loc) {
        handleSelect(loc);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="editorial-search-wrap" ref={containerRef}>
      <form onSubmit={handleSubmit} className="editorial-search-bar">
        <div className="search-input-group">
          <label className="search-eyebrow-label">Where do you want to go?</label>
          <div className="search-input-field">
            <Search size={18} className="search-leading-icon" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a city, country, or region…"
              className="editorial-search-input"
            />
          </div>
        </div>

        <div className="search-actions-group">
          <button
            type="button"
            className={`btn-pref-toggle ${showPreferences ? 'active' : ''}`}
            onClick={() => setShowPreferences(!showPreferences)}
            title="Refine season and travel style"
            aria-label="Toggle travel preferences"
          >
            <SlidersHorizontal size={15} />
            <span>Preferences</span>
          </button>

          <button
            type="submit"
            className="btn-editorial-explore"
            disabled={isLoading}
            aria-label="Explore Destination"
          >
            <span>Explore</span>
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Real-time suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="editorial-suggestions-popover animate-fade-down">
            {suggestions.map((loc) => (
              <button
                key={`${loc.name}-${loc.latitude}`}
                type="button"
                className="suggestion-item-row"
                onClick={() => handleSelect(loc)}
              >
                <div className="suggestion-marker-dot">
                  <MapPin size={14} />
                </div>
                <div className="suggestion-details">
                  <span className="suggestion-title">{loc.name}</span>
                  <span className="suggestion-subtitle">
                    {[loc.state, loc.country].filter(Boolean).join(', ')}
                  </span>
                </div>
                <ArrowRight size={13} className="suggestion-tail-arrow" />
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Progressive refinement panel */}
      {showPreferences && (
        <div className="progressive-preferences-tray animate-fade-down">
          <div className="pref-column">
            <span className="pref-label">Travel Season</span>
            <div className="pref-options-row">
              {['Anytime', 'Spring (Mar–May)', 'Summer (Jun–Aug)', 'Autumn (Sep–Nov)', 'Winter (Dec–Feb)'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`pref-pill-btn ${selectedSeason === s ? 'selected' : ''}`}
                  onClick={() => setSelectedSeason(s)}
                >
                  {selectedSeason === s && <Check size={12} className="inline mr-1" />}
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="pref-column">
            <span className="pref-label">Travel Style</span>
            <div className="pref-options-row">
              {['Cultural & Discovery', 'Island & Coastal', 'Alpine & Hiking', 'Epicurean & Wine'].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`pref-pill-btn ${selectedStyle === st ? 'selected' : ''}`}
                  onClick={() => setSelectedStyle(st)}
                >
                  {selectedStyle === st && <Check size={12} className="inline mr-1" />}
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelSearch;
