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

export const locationSeeds: LocationSeed[] = [
  // Europe
  { name: 'Paris', city: 'Paris', state: 'Île-de-France', country: 'France', latitude: 48.8566, longitude: 2.3522, type: 'city', aliases: ['paris, france', 'paris france'] },
  { name: 'Rome', city: 'Rome', state: 'Lazio', country: 'Italy', latitude: 41.9028, longitude: 12.4964, type: 'city', aliases: ['rome, italy', 'roma'] },
  { name: 'Milan', city: 'Milan', state: 'Lombardy', country: 'Italy', latitude: 45.4642, longitude: 9.19, type: 'city', aliases: ['milano', 'milan, italy'] },
  { name: 'Venice', city: 'Venice', state: 'Veneto', country: 'Italy', latitude: 45.4408, longitude: 12.3155, type: 'city', aliases: ['venezia', 'venice, italy'] },
  { name: 'Florence', city: 'Florence', state: 'Tuscany', country: 'Italy', latitude: 43.7696, longitude: 11.2558, type: 'city', aliases: ['firenze'] },
  { name: 'London', city: 'London', state: 'England', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278, type: 'city', aliases: ['london, uk', 'london uk'] },
  { name: 'Barcelona', city: 'Barcelona', state: 'Catalonia', country: 'Spain', latitude: 41.3879, longitude: 2.1699, type: 'city', aliases: ['barcelona, spain'] },
  { name: 'Madrid', city: 'Madrid', state: 'Community of Madrid', country: 'Spain', latitude: 40.4168, longitude: -3.7038, type: 'city', aliases: ['madrid, spain'] },
  { name: 'Amsterdam', city: 'Amsterdam', state: 'North Holland', country: 'Netherlands', latitude: 52.3676, longitude: 4.9041, type: 'city', aliases: ['amsterdam, netherlands'] },
  { name: 'Berlin', city: 'Berlin', state: 'Berlin', country: 'Germany', latitude: 52.52, longitude: 13.405, type: 'city', aliases: ['berlin, germany'] },
  { name: 'Munich', city: 'Munich', state: 'Bavaria', country: 'Germany', latitude: 48.1351, longitude: 11.582, type: 'city', aliases: ['münchen', 'munich, germany'] },
  { name: 'Zurich', city: 'Zurich', state: 'Zurich', country: 'Switzerland', latitude: 47.3769, longitude: 8.5417, type: 'city', aliases: ['zurich, switzerland', 'zürich'] },
  { name: 'Geneva', city: 'Geneva', state: 'Geneva', country: 'Switzerland', latitude: 46.2044, longitude: 6.1432, type: 'city', aliases: ['geneve'] },
  { name: 'Vienna', city: 'Vienna', state: 'Vienna', country: 'Austria', latitude: 48.2082, longitude: 16.3738, type: 'city', aliases: ['wien'] },
  { name: 'Prague', city: 'Prague', state: 'Prague', country: 'Czech Republic', latitude: 50.0755, longitude: 14.4378, type: 'city', aliases: ['praha'] },
  { name: 'Budapest', city: 'Budapest', state: 'Pest', country: 'Hungary', latitude: 47.4979, longitude: 19.0402, type: 'city', aliases: ['budapest, hungary'] },
  { name: 'Athens', city: 'Athens', state: 'Attica', country: 'Greece', latitude: 37.9838, longitude: 23.7275, type: 'city', aliases: ['athens, greece'] },
  { name: 'Santorini', city: 'Santorini', state: 'South Aegean', country: 'Greece', latitude: 36.3932, longitude: 25.4615, type: 'city', aliases: ['santorini, greece', 'thira'] },
  { name: 'Lisbon', city: 'Lisbon', state: 'Lisbon', country: 'Portugal', latitude: 38.7223, longitude: -9.1393, type: 'city', aliases: ['lisboa'] },
  { name: 'Reykjavik', city: 'Reykjavik', state: 'Capital Region', country: 'Iceland', latitude: 64.1466, longitude: -21.9426, type: 'city', aliases: ['reykjavik, iceland'] },

  // Asia & East Asia
  { name: 'Tokyo', city: 'Tokyo', state: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, type: 'city', aliases: ['tokyo, japan', 'tokyo japan'] },
  { name: 'Kyoto', city: 'Kyoto', state: 'Kyoto Prefecture', country: 'Japan', latitude: 35.0116, longitude: 135.7681, type: 'city', aliases: ['kyoto, japan'] },
  { name: 'Osaka', city: 'Osaka', state: 'Osaka Prefecture', country: 'Japan', latitude: 34.6937, longitude: 135.5023, type: 'city', aliases: ['osaka, japan'] },
  { name: 'Seoul', city: 'Seoul', state: 'Seoul', country: 'South Korea', latitude: 37.5665, longitude: 126.978, type: 'city', aliases: ['seoul, korea'] },
  { name: 'Beijing', city: 'Beijing', state: 'Beijing', country: 'China', latitude: 39.9042, longitude: 116.4074, type: 'city', aliases: ['peking'] },
  { name: 'Shanghai', city: 'Shanghai', state: 'Shanghai', country: 'China', latitude: 31.2304, longitude: 121.4737, type: 'city' },
  { name: 'Hong Kong', city: 'Hong Kong', state: 'Hong Kong', country: 'Hong Kong', latitude: 22.3193, longitude: 114.1694, type: 'city', aliases: ['hk'] },
  { name: 'Bangkok', city: 'Bangkok', state: 'Bangkok', country: 'Thailand', latitude: 13.7563, longitude: 100.5018, type: 'city', aliases: ['bangkok, thailand'] },
  { name: 'Singapore', city: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, type: 'city', aliases: ['singapore city'] },
  { name: 'Bali', city: 'Denpasar', state: 'Bali', country: 'Indonesia', latitude: -8.4095, longitude: 115.1889, type: 'city', aliases: ['bali, indonesia', 'ubud', 'kuta'] },
  { name: 'Kuala Lumpur', city: 'Kuala Lumpur', state: 'Federal Territory', country: 'Malaysia', latitude: 3.139, longitude: 101.6869, type: 'city', aliases: ['kl'] },
  { name: 'Hanoi', city: 'Hanoi', state: 'Hanoi', country: 'Vietnam', latitude: 21.0285, longitude: 105.8542, type: 'city' },

  // India & South Asia
  { name: 'Ahmedabad', city: 'Ahmedabad', state: 'Gujarat', country: 'India', latitude: 23.0225, longitude: 72.5714, type: 'city', aliases: ['ahmedabad, india', 'ahmedabad gujarat', 'amdavad'] },
  { name: 'Mumbai', city: 'Mumbai', state: 'Maharashtra', country: 'India', latitude: 19.076, longitude: 72.8777, type: 'city', aliases: ['mumbai, india', 'bombay'] },
  { name: 'Delhi', city: 'New Delhi', state: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.209, type: 'city', aliases: ['delhi, india', 'new delhi'] },
  { name: 'Jaipur', city: 'Jaipur', state: 'Rajasthan', country: 'India', latitude: 26.9124, longitude: 75.7873, type: 'city', aliases: ['jaipur, rajasthan', 'pink city'] },
  { name: 'Udaipur', city: 'Udaipur', state: 'Rajasthan', country: 'India', latitude: 24.5854, longitude: 73.7125, type: 'city', aliases: ['lake city'] },
  { name: 'Srinagar', city: 'Srinagar', state: 'Jammu and Kashmir', country: 'India', latitude: 34.0837, longitude: 74.7973, type: 'city', aliases: ['kashmir', 'srinagar kashmir'] },
  { name: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka', country: 'India', latitude: 12.9716, longitude: 77.5946, type: 'city', aliases: ['bangalore', 'bangalore, india'] },
  { name: 'Goa', city: 'Panaji', state: 'Goa', country: 'India', latitude: 15.2993, longitude: 74.124, type: 'city', aliases: ['goa, india'] },
  { name: 'Varanasi', city: 'Varanasi', state: 'Uttar Pradesh', country: 'India', latitude: 25.3176, longitude: 82.9739, type: 'city', aliases: ['banaras', 'kashi'] },
  { name: 'Kolkata', city: 'Kolkata', state: 'West Bengal', country: 'India', latitude: 22.5726, longitude: 88.3639, type: 'city', aliases: ['calcutta'] },
  { name: 'Chennai', city: 'Chennai', state: 'Tamil Nadu', country: 'India', latitude: 13.0827, longitude: 80.2707, type: 'city', aliases: ['madras'] },
  { name: 'Kochi', city: 'Kochi', state: 'Kerala', country: 'India', latitude: 9.9312, longitude: 76.2673, type: 'city', aliases: ['cochin', 'kerala'] },

  // Middle East & North Africa
  { name: 'Dubai', city: 'Dubai', state: 'Dubai', country: 'United Arab Emirates', latitude: 25.2048, longitude: 55.2708, type: 'city', aliases: ['dubai, uae', 'dubai uae'] },
  { name: 'Abu Dhabi', city: 'Abu Dhabi', state: 'Abu Dhabi', country: 'United Arab Emirates', latitude: 24.4539, longitude: 54.3773, type: 'city' },
  { name: 'Doha', city: 'Doha', state: 'Ad-Dawhah', country: 'Qatar', latitude: 25.2854, longitude: 51.531, type: 'city' },
  { name: 'Riyadh', city: 'Riyadh', state: 'Riyadh Province', country: 'Saudi Arabia', latitude: 24.7136, longitude: 46.6753, type: 'city' },
  { name: 'Cairo', city: 'Cairo', state: 'Cairo Governorate', country: 'Egypt', latitude: 30.0444, longitude: 31.2357, type: 'city', aliases: ['cairo, egypt'] },
  { name: 'Istanbul', city: 'Istanbul', state: 'Istanbul', country: 'Turkey', latitude: 41.0082, longitude: 28.9784, type: 'city', aliases: ['constantinople'] },
  { name: 'Marrakech', city: 'Marrakech', state: 'Marrakesh-Safi', country: 'Morocco', latitude: 31.6295, longitude: -7.9811, type: 'city' },

  // Americas
  { name: 'New York', city: 'New York', state: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006, type: 'city', aliases: ['new york, usa', 'nyc', 'new york city', 'manhattan'] },
  { name: 'Los Angeles', city: 'Los Angeles', state: 'California', country: 'United States', latitude: 34.0522, longitude: -118.2437, type: 'city', aliases: ['la', 'hollywood'] },
  { name: 'San Francisco', city: 'San Francisco', state: 'California', country: 'United States', latitude: 37.7749, longitude: -122.4194, type: 'city', aliases: ['sf', 'bay area'] },
  { name: 'Chicago', city: 'Chicago', state: 'Illinois', country: 'United States', latitude: 41.8781, longitude: -87.6298, type: 'city' },
  { name: 'Miami', city: 'Miami', state: 'Florida', country: 'United States', latitude: 25.7617, longitude: -80.1918, type: 'city' },
  { name: 'Washington DC', city: 'Washington', state: 'District of Columbia', country: 'United States', latitude: 38.9072, longitude: -77.0369, type: 'city' },
  { name: 'Toronto', city: 'Toronto', state: 'Ontario', country: 'Canada', latitude: 43.6532, longitude: -79.3832, type: 'city' },
  { name: 'Vancouver', city: 'Vancouver', state: 'British Columbia', country: 'Canada', latitude: 49.2827, longitude: -123.1207, type: 'city', aliases: ['vancouver, canada'] },
  { name: 'Mexico City', city: 'Mexico City', state: 'CDMX', country: 'Mexico', latitude: 19.4326, longitude: -99.1332, type: 'city' },
  { name: 'Rio de Janeiro', city: 'Rio de Janeiro', state: 'Rio de Janeiro', country: 'Brazil', latitude: -22.9068, longitude: -43.1729, type: 'city', aliases: ['rio', 'rio, brazil'] },
  { name: 'Buenos Aires', city: 'Buenos Aires', state: 'Buenos Aires', country: 'Argentina', latitude: -34.6037, longitude: -58.3816, type: 'city' },

  // Africa & Oceania
  { name: 'Cape Town', city: 'Cape Town', state: 'Western Cape', country: 'South Africa', latitude: -33.9249, longitude: 18.4241, type: 'city', aliases: ['cape town, south africa'] },
  { name: 'Nairobi', city: 'Nairobi', state: 'Nairobi County', country: 'Kenya', latitude: -1.2921, longitude: 36.8219, type: 'city' },
  { name: 'Sydney', city: 'Sydney', state: 'New South Wales', country: 'Australia', latitude: -33.8688, longitude: 151.2093, type: 'city', aliases: ['sydney, australia'] },
  { name: 'Melbourne', city: 'Melbourne', state: 'Victoria', country: 'Australia', latitude: -37.8136, longitude: 144.9631, type: 'city' },
  { name: 'Auckland', city: 'Auckland', state: 'Auckland', country: 'New Zealand', latitude: -36.8485, longitude: 174.7633, type: 'city' },
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
export function formatPlaceName(location: GlobeLocation): string {
  if (!location || location.name === 'Place name unavailable') return '';
  const parts = [
    location.name.includes('°') ? 'Finding place…' : location.name,
    location.city && location.city !== location.name ? location.city : undefined,
    location.state && location.state !== location.name && location.state !== location.city ? location.state : undefined,
    location.country
  ].filter(Boolean) as string[];
  return [...new Set(parts)].join(', ');
}

const reverseCache = new Map<string, GlobeLocation>();

export function getClosestKnownLocation(latitude: number, longitude: number): GlobeLocation {
  let closest: LocationSeed = locationSeeds[0];
  let minDistance = Infinity;

  for (const place of locationSeeds) {
    if (place.type !== 'city') continue;
    const dLat = place.latitude - latitude;
    const dLon = (place.longitude - longitude) * Math.cos((latitude * Math.PI) / 180);
    const dist = Math.hypot(dLat, dLon);
    if (dist < minDistance) {
      minDistance = dist;
      closest = place;
    }
  }

  return {
    name: closest.name,
    city: closest.city || closest.name,
    state: closest.state,
    country: closest.country,
    latitude: closest.latitude,
    longitude: closest.longitude,
    type: 'city',
    bookable: true,
  };
}

export async function reverseLocation(latitude: number, longitude: number, signal?: AbortSignal): Promise<GlobeLocation> {
  // 1. Proximity snap: if click is within ~3.2 degrees (~320 km) of any known city, snap directly
  let nearestSeed: LocationSeed | null = null;
  let nearestDist = Infinity;
  for (const place of locationSeeds) {
    if (place.type !== 'city') continue;
    const dLat = place.latitude - latitude;
    const dLon = (place.longitude - longitude) * Math.cos((latitude * Math.PI) / 180);
    const dist = Math.hypot(dLat, dLon);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestSeed = place;
    }
  }
  if (nearestSeed && nearestDist < 3.2) {
    return {
      name: nearestSeed.name,
      city: nearestSeed.city || nearestSeed.name,
      state: nearestSeed.state,
      country: nearestSeed.country,
      latitude: nearestSeed.latitude,
      longitude: nearestSeed.longitude,
      type: 'city',
      bookable: true,
    };
  }

  const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const cached = reverseCache.get(key);
  if (cached) return cached;

  // 2. Try backend API reverse geocoding
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(`${API_BASE_URL}/api/places/reverse?lat=${latitude}&lon=${longitude}`, {
      signal: signal || controller.signal,
    });
    clearTimeout(timeout);
    if (response.ok) {
      const data = (await response.json()) as { location: GlobeLocation };
      if (
        data.location &&
        data.location.name &&
        data.location.name !== 'Place name unavailable' &&
        data.location.name !== 'Open water or unmapped area'
      ) {
        reverseCache.set(key, data.location);
        return data.location;
      }
    }
  } catch {
    // Backend offline / unavailable
  }

  // 3. Fallback to public Photon reverse geocoder
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(
      `https://photon.komoot.io/reverse?lat=${latitude.toFixed(5)}&lon=${longitude.toFixed(5)}&radius=100&limit=1&lang=en`,
      { signal: signal || controller.signal }
    );
    clearTimeout(timeout);
    if (response.ok) {
      const data = await response.json();
      const feat = data.features?.[0];
      if (feat && feat.properties) {
        const p = feat.properties;
        const name = p.city || p.town || p.name || p.state || p.country;
        if (name && name !== 'Place name unavailable') {
          const loc: GlobeLocation = {
            name,
            city: p.city || p.town || name,
            state: p.state,
            country: p.country,
            latitude,
            longitude,
            type: p.city ? 'city' : 'region',
            bookable: true,
          };
          reverseCache.set(key, loc);
          return loc;
        }
      }
    }
  } catch {
    // Public geocoder unavailable
  }

  // 4. Guaranteed fallback: return the closest known destination
  const fallback = getClosestKnownLocation(latitude, longitude);
  reverseCache.set(key, fallback);
  return fallback;
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
