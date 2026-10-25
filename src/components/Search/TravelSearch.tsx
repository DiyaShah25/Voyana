/**
 * Travel Search Component
 * Main search bar with location autocomplete, date selection,
 * traveler count, and globe focus integration for destination search.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ArrowRight,  } from 'lucide-react';
import type { GlobeLocation } from '@/components/Globe/globe.types';
import { suggestDestinations, resolveLocation, formatPlaceName } from '@/services/locationService';

interface TravelSearchProps {
  onLocationSelect: (location: GlobeLocation) => void;
  selectedLocation?: GlobeLocation;
  isLoading?: boolean;
}

export const TravelSearch: React.FC<TravelSearchProps> = ({
  onLocationSelect,
  selectedLocation,
  isLoading = false,
}) => {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const lastSelected = useRef('');
  const [suggestions, setSuggestions] = useState<GlobeLocation[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const text=selectedLocation?formatPlaceName(selectedLocation):'';
    lastSelected.current=text;setQuery(text);setSuggestions([]);setError('');
  },[selectedLocation]);

  // Autocomplete
  useEffect(() => {
    const controller = new AbortController();
    const fetchSuggestions = async () => {
      if (query.trim().length > 0 && query !== lastSelected.current) {
        try {
          const results = await suggestDestinations(query, controller.signal);
          if (!controller.signal.aborted && query !== lastSelected.current) setSuggestions(results);
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
    lastSelected.current = formatPlaceName(loc);
    setError('');
    setQuery(formatPlaceName(loc));
    setSuggestions([]);
    onLocationSelect(loc);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const term = query.trim();
    if (!term) { setError('Enter a city to locate it on the globe.'); return; }
    if(selectedLocation&&term===formatPlaceName(selectedLocation)){handleSelect(selectedLocation);return;}
    setSearching(true);
    setError('');
    try {
      const loc = await resolveLocation(term);
      if (loc) {
        handleSelect(loc);
      } else { setError('No matching place found. Add a state or country and try again.'); }
    } catch (err) {
      console.error(err);
      setError('Location search is unavailable. Try a suggested city.');
    } finally { setSearching(false); }
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
              onChange={(e) => { setQuery(e.target.value); setError(''); lastSelected.current = ''; }}
              aria-label="Destination search"
              aria-autocomplete="list"
              aria-expanded={suggestions.length > 0}
              onKeyDown={e => { if (e.key === 'Escape') setSuggestions([]); }}
              placeholder="Search a city, country, or region…"
              className="editorial-search-input"
            />
          </div>
        </div>

        <div className="search-actions-group">
          <button
            type="submit"
            className="btn-editorial-explore"
            disabled={isLoading || searching}
            aria-label="Explore Destination"
          >
            <span>{searching ? 'Locating…' : 'Explore'}</span>
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

      {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
    </div>
  );
};

export default TravelSearch;
