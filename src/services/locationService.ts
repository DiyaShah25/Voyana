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
  { name: 'Paris', city: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522, type: 'city', aliases: ['paris, france', 'paris france'] },
  { name: 'Tokyo', city: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, type: 'city', aliases: ['tokyo, japan', 'tokyo japan'] },
  { name: 'Dubai', city: 'Dubai', country: 'United Arab Emirates', latitude: 25.2048, longitude: 55.2708, type: 'city', aliases: ['dubai, uae', 'dubai uae'] },
  { name: 'New York', city: 'New York', state: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006, type: 'city', aliases: ['new york, usa', 'nyc', 'new york city'] },
  { name: 'Ahmedabad', city: 'Ahmedabad', state: 'Gujarat', country: 'India', latitude: 23.0225, longitude: 72.5714, type: 'city', aliases: ['ahmedabad, india', 'ahmedabad gujarat'] },
  { name: 'Mumbai', city: 'Mumbai', state: 'Maharashtra', country: 'India', latitude: 19.076, longitude: 72.8777, type: 'city', aliases: ['mumbai, india', 'bombay'] },
  { name: 'London', city: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278, type: 'city', aliases: ['london, uk', 'london uk'] },
  { name: 'Sydney', city: 'Sydney', state: 'New South Wales', country: 'Australia', latitude: -33.8688, longitude: 151.2093, type: 'city', aliases: ['sydney, australia'] },
  { name: 'Singapore', city: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, type: 'city' },
  { name: 'Rome', city: 'Rome', country: 'Italy', latitude: 41.9028, longitude: 12.4964, type: 'city', aliases: ['rome, italy'] },
  { name: 'Bangkok', city: 'Bangkok', country: 'Thailand', latitude: 13.7563, longitude: 100.5018, type: 'city' },
  { name: 'Rio de Janeiro', city: 'Rio de Janeiro', state: 'Rio de Janeiro', country: 'Brazil', latitude: -22.9068, longitude: -43.1729, type: 'city', aliases: ['rio', 'rio, brazil'] },
  { name: 'France', country: 'France', latitude: 46.6034, longitude: 1.8883, type: 'country' },
  { name: 'Japan', country: 'Japan', latitude: 36.2048, longitude: 138.2529, type: 'country' },
  { name: 'India', country: 'India', latitude: 22.5937, longitude: 78.9629, type: 'country' },
  { name: 'United States', country: 'United States', latitude: 39.8283, longitude: -98.5795, type: 'country', aliases: ['usa', 'us', 'america'] },
  { name: 'Australia', country: 'Australia', latitude: -25.2744, longitude: 133.7751, type: 'country' },
  { name: 'Italy', country: 'Italy', latitude: 41.8719, longitude: 12.5674, type: 'country' },
  { name: 'Switzerland', country: 'Switzerland', latitude: 46.8182, longitude: 8.2275, type: 'country' },
  { name: 'Gujarat', state: 'Gujarat', country: 'India', latitude: 22.2587, longitude: 71.1924, type: 'state' },
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

  // 2. Fetch from Nominatim if we need more results
  if (results.length < 5 && normalized.length > 2) {
    try {
      const geocodeResults = await fetchNominatim(query, signal);
      
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

async function fetchNominatim(query: string, signal?: AbortSignal): Promise<GlobeLocation[]> {
  const normalized = query.toLowerCase().trim();
  if (geocodeCache.has(normalized)) {
    return geocodeCache.get(normalized)!;
  }

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), {
    headers: { 'Accept-Language': 'en' },
    signal
  });

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.statusText}`);
  }

  const data = (await response.json()) as Array<Record<string, unknown>>;
  const results: GlobeLocation[] = data.map((item) => normalizeNominatimResult(item)).filter((r): r is GlobeLocation => r !== null);
  
  geocodeCache.set(normalized, results);
  return results;
}

function normalizeNominatimResult(item: Record<string, unknown>): GlobeLocation | null {
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  if (isNaN(lat) || isNaN(lon)) return null;

  const address = (item.address || {}) as Record<string, string>;
  const typeStr = String(item.type || item.addresstype || '');
  
  let type: GlobeLocationType = 'region';
  
  // Map Nominatim types to GlobeLocationType
  if (['city', 'town', 'municipality', 'village'].includes(typeStr)) {
    type = 'city';
  } else if (['state', 'province'].includes(typeStr)) {
    type = 'state';
  } else if (['country'].includes(typeStr)) {
    type = 'country';
  } else if (['landmark', 'tourism', 'historic', 'attraction'].includes(typeStr)) {
    type = 'landmark';
  }

  const city = address.city || address.town || address.village || address.municipality;
  const state = address.state || address.province;
  const country = address.country;
  
  const name = String(item.name || city || state || country || typeStr);

  // Sometimes item.name is a full address string we want to avoid if possible, 
  // but if it's a specific landmark or place, we use it.
  
  return {
    name,
    city,
    state,
    country,
    latitude: lat,
    longitude: lon,
    type
  };
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
