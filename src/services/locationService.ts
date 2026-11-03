import { API_BASE_URL } from './apiClient';
/**
 * Location Search & Geocoding Service
 * Provides location search with a local seed database of popular destinations
 * and Nominatim API fallback for geocoding. Powers globe focus, destination
 * suggestions, and travel search autocomplete.
 */

import type { GlobeLocation, GlobeLocationType } from '@/components/Globe/globe.types';

interface LocationSeed {
  name: string;
  city?: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
  type: GlobeLocationType;
  aliases?: string[];
}

const locationSeeds: LocationSeed[] = [
  { name: 'Paris', city: 'Paris', state: 'Île-de-France', country: 'France', latitude: 48.8566, longitude: 2.3522, type: 'city', aliases: ['paris, france', 'paris france'] },
  { name: 'Tokyo', city: 'Tokyo', state: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, type: 'city', aliases: ['tokyo, japan', 'tokyo japan'] },
  { name: 'Dubai', city: 'Dubai', state: 'Dubai', country: 'United Arab Emirates', latitude: 25.2048, longitude: 55.2708, type: 'city', aliases: ['dubai, uae', 'dubai uae'] },
  { name: 'New York', city: 'New York', state: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006, type: 'city', aliases: ['new york, usa', 'nyc', 'new york city'] },
  { name: 'Ahmedabad', city: 'Ahmedabad', state: 'Gujarat', country: 'India', latitude: 23.0225, longitude: 72.5714, type: 'city', aliases: ['ahmedabad, india', 'ahmedabad gujarat'] },
  { name: 'Mumbai', city: 'Mumbai', state: 'Maharashtra', country: 'India', latitude: 19.076, longitude: 72.8777, type: 'city', aliases: ['mumbai, india', 'bombay'] },
  { name: 'London', city: 'London', state: 'England', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278, type: 'city', aliases: ['london, uk', 'london uk'] },
  { name: 'Sydney', city: 'Sydney', state: 'New South Wales', country: 'Australia', latitude: -33.8688, longitude: 151.2093, type: 'city', aliases: ['sydney, australia'] },
  { name: 'Singapore', city: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, type: 'city' },
  { name: 'Rome', city: 'Rome', state: 'Lazio', country: 'Italy', latitude: 41.9028, longitude: 12.4964, type: 'city', aliases: ['rome, italy'] },
  { name: 'Bangkok', city: 'Bangkok', state: 'Bangkok', country: 'Thailand', latitude: 13.7563, longitude: 100.5018, type: 'city' },
  { name: 'Rio de Janeiro', city: 'Rio de Janeiro', state: 'Rio de Janeiro', country: 'Brazil', latitude: -22.9068, longitude: -43.1729, type: 'city', aliases: ['rio', 'rio, brazil'] },
  { name: 'France', country: 'France', latitude: 46.6034, longitude: 1.8883, type: 'country' },
  { name: 'Japan', country: 'Japan', latitude: 36.2048, longitude: 138.2529, type: 'country' },
  { name: 'India', country: 'India', latitude: 22.5937, longitude: 78.9629, type: 'country' },
  { name: 'United States', country: 'United States', latitude: 39.8283, longitude: -98.5795, type: 'country', aliases: ['usa', 'us', 'america'] },
  { name: 'Australia', country: 'Australia', latitude: -25.2744, longitude: 133.7751, type: 'country' },
  { name: 'Italy', country: 'Italy', latitude: 41.8719, longitude: 12.5674, type: 'country' },
  { name: 'Switzerland', country: 'Switzerland', latitude: 46.8182, longitude: 8.2275, type: 'country' },
  { name: 'Gujarat', state: 'Gujarat', country: 'India', latitude: 22.2587, longitude: 71.1924, type: 'state' },
  { name: 'Bali', state: 'Bali', country: 'Indonesia', latitude: -8.4095, longitude: 115.1889, type: 'region', aliases: ['bali, indonesia'] },
  { name: 'Cairo', city: 'Cairo', state: 'Cairo Governorate', country: 'Egypt', latitude: 30.0444, longitude: 31.2357, type: 'city', aliases: ['cairo, egypt'] },
  { name: 'Santorini', state: 'South Aegean', country: 'Greece', latitude: 36.3932, longitude: 25.4615, type: 'region', aliases: ['santorini, greece', 'thira'] },
  { name: 'Kyoto', city: 'Kyoto', state: 'Kyoto Prefecture', country: 'Japan', latitude: 35.0116, longitude: 135.7681, type: 'city', aliases: ['kyoto, japan'] },
  { name: 'Reykjavik', city: 'Reykjavik', state: 'Capital Region', country: 'Iceland', latitude: 64.1466, longitude: -21.9426, type: 'city', aliases: ['reykjavik, iceland'] },
  { name: 'Cape Town', city: 'Cape Town', state: 'Western Cape', country: 'South Africa', latitude: -33.9249, longitude: 18.4241, type: 'city', aliases: ['cape town, south africa'] },
  { name: 'Zurich', city: 'Zurich', state: 'Zurich', country: 'Switzerland', latitude: 47.3769, longitude: 8.5417, type: 'city', aliases: ['zurich, switzerland'] },
  { name: 'Barcelona', city: 'Barcelona', state: 'Catalonia', country: 'Spain', latitude: 41.3879, longitude: 2.1699, type: 'city', aliases: ['barcelona, spain'] },
  { name: 'Vancouver', city: 'Vancouver', state: 'British Columbia', country: 'Canada', latitude: 49.2827, longitude: -123.1207, type: 'city', aliases: ['vancouver, canada'] },
];

export async function searchLocations(query: string, signal?: AbortSignal): Promise<GlobeLocation[]> {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [];

  // 1. Search local seeds first
  const localMatches = locationSeeds.filter((seed) => {
    const haystack = [seed.name, seed.city, seed.state, seed.country, ...(seed.aliases ?? [])].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(normalized);
  });

  const exactMatches = localMatches.filter(seed => 
    seed.name.toLowerCase() === normalized || 
    seed.aliases?.some(a => a.toLowerCase() === normalized)
  );
  
  // We prioritize exact matches, then other local matches
  const results = [...exactMatches, ...localMatches.filter(m => !exactMatches.includes(m))];

  // 2. Query the cached Photon proxy when local places do not match.
  if (exactMatches.length === 0 && results.length < 5 && normalized.length > 2) {
    try {
      const geocodeResults = await fetchRemotePlaces(query, signal);
      
      // Merge and deduplicate
      for (const loc of geocodeResults) {
        // Prevent duplicates (simple check by name/country or coordinates proximity)
        const isDuplicate = results.some(r => 
          (r.name === loc.name && r.country === loc.country) || 
          (Math.abs(r.latitude - loc.latitude) < 0.1 && Math.abs(r.longitude - loc.longitude) < 0.1)
        );
        if (!isDuplicate) {
          results.push(loc);
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('Geocoding error:', e);
      }
    }
  }

  return results.slice(0, 6);
}

const geocodeCache = new Map<string, GlobeLocation[]>();
async function fetchRemotePlaces(query:string,signal?:AbortSignal):Promise<GlobeLocation[]>{
 const key=query.trim().toLowerCase();if(geocodeCache.has(key))return geocodeCache.get(key)!;
 const response=await fetch(`${API_BASE_URL}/api/places/search?q=${encodeURIComponent(query)}`,{signal});if(!response.ok)throw new Error('Place search is unavailable.');const data=await response.json() as {locations:GlobeLocation[]};geocodeCache.set(key,data.locations);return data.locations;
}
export function formatPlaceName(location:GlobeLocation):string{return [...new Set([location.name.includes('°')?'Finding place…':location.name,location.city,location.state,location.country].filter(Boolean))].join(', ');}
const reverseCache=new Map<string,GlobeLocation>();
export async function reverseLocation(latitude:number,longitude:number,signal?:AbortSignal):Promise<GlobeLocation>{
 const known=locationSeeds.find(place=>place.type==='city'&&Math.hypot(place.latitude-latitude,(place.longitude-longitude)*Math.cos(latitude*Math.PI/180))<0.009);
 if(known)return {...known,latitude,longitude};
 const key=`${latitude.toFixed(4)},${longitude.toFixed(4)}`;const cached=reverseCache.get(key);if(cached)return {...cached,latitude,longitude};
 const response=await fetch(`${API_BASE_URL}/api/places/reverse?lat=${latitude}&lon=${longitude}`,{signal});if(!response.ok)throw new Error('Place-name lookup is unavailable.');const data=await response.json() as {location:GlobeLocation};reverseCache.set(key,data.location);return data.location;
}

export async function resolveLocation(query: string, signal?: AbortSignal): Promise<GlobeLocation | null> {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return null;

  const exact = locationSeeds.find((seed) => seed.name.toLowerCase() === normalized || seed.aliases?.some((alias) => alias.toLowerCase() === normalized));
  if (exact) return { ...exact };

  const results = await searchLocations(query, signal);
  return results.length > 0 ? results[0] : null;
}

export async function suggestDestinations(query: string, signal?: AbortSignal): Promise<GlobeLocation[]> {
  const results = await searchLocations(query, signal);
  return results.slice(0, 5);
}
