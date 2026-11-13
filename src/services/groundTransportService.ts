import rawGroundTransport from '@/data/groundTransport.json';
import { routeDistanceKm } from '../../services/ai-service/src/catalog/pricing.js';

export type TransportMode = 'flight' | 'train' | 'bus';

export interface GroundTransportItem {
  id: string;
  mode: 'train' | 'bus';
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  name: string;
  operator: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  durationMinutes: number;
  price: number;
  currency: string;
  classType: string;
  bookingUrl: string;
}

// Indian mainland rail and road connected hubs
const INDIAN_MAINLAND_CITIES = new Set([
  'ahmedabad', 'mumbai', 'delhi', 'new delhi', 'pune', 'bengaluru', 'bangalore',
  'jaipur', 'srinagar', 'kashmir', 'jammu', 'katra', 'kolkata', 'chennai',
  'hyderabad', 'amritsar', 'chandigarh', 'agra', 'varanasi', 'udaipur',
  'surat', 'vadodara', 'lucknow', 'goa', 'shimla', 'manali', 'dehradun',
  'bhopal', 'indore', 'patna', 'nagpur', 'kochi', 'coimbatore'
]);

// Non-land or island regions where train and bus are not physically possible
const ISLAND_OR_NON_LAND_CITIES = new Set([
  'port blair', 'andaman', 'nicobar', 'havelock', 'neil island',
  'lakshadweep', 'kavaratti', 'maldives', 'sri lanka', 'mauritius'
]);

// International overseas cities (not connected via Indian rail/road)
const OVERSEAS_CITIES = new Set([
  'paris', 'tokyo', 'london', 'new york', 'dubai', 'singapore', 'rome',
  'bangkok', 'sydney', 'rio de janeiro', 'rio', 'bali', 'barcelona',
  'berlin', 'zurich', 'cairo', 'cape town'
]);

function normalizeCity(name: string): string {
  if (!name) return '';
  const clean = name.trim().toLowerCase();
  if (clean === 'amd' || clean === 'adi') return 'ahmedabad';
  if (clean === 'bom') return 'mumbai';
  if (clean === 'del') return 'delhi';
  if (clean === 'sxr' || clean === 'jat') return 'srinagar';
  if (clean === 'ixz') return 'port blair';
  if (clean.includes('srinagar') || clean.includes('kashmir')) return 'srinagar';
  if (clean.includes('port blair') || clean.includes('andaman')) return 'port blair';
  return clean;
}

/**
 * Determines which transport modes are realistically possible between origin and destination.
 * - Flight: Always available between cities that have airports.
 * - Train: Only if both cities are on the Indian rail network and reachable by land.
 * - Bus: Only if reachable by road, and distance is under ~1500 km.
 * - If not feasible by land (e.g. Port Blair / islands or overseas), return Flight only.
 */
export function getAvailableModes(origin: string, destination: string): TransportMode[] {
  const normOrigin = normalizeCity(origin);
  const normDest = normalizeCity(destination);

  // Flight is always the primary air mode between airport-supported hubs
  const modes: TransportMode[] = ['flight'];

  // 1. Check if either side is an island or overseas (not reachable by land)
  if (
    ISLAND_OR_NON_LAND_CITIES.has(normOrigin) ||
    ISLAND_OR_NON_LAND_CITIES.has(normDest) ||
    OVERSEAS_CITIES.has(normOrigin) ||
    OVERSEAS_CITIES.has(normDest)
  ) {
    return modes; // Flight only!
  }

  // 2. Check if both cities belong to Indian mainland network
  const isOriginIndianLand = INDIAN_MAINLAND_CITIES.has(normOrigin);
  const isDestIndianLand = INDIAN_MAINLAND_CITIES.has(normDest);

  if (!isOriginIndianLand || !isDestIndianLand) {
    return modes; // Default to flight only for unknown / cross-border routes
  }

  // 3. Train connectivity: On Indian rail network connected by land
  // Srinagar / Kashmir connects via Jammu Tawi / Katra mainline
  modes.push('train');

  // 4. Bus connectivity: Reachable by road if distance is under ~1500 km
  const distance = routeDistanceKm(normOrigin, normDest);
  if (distance <= 1500) {
    modes.push('bus');
  }

  return modes;
}

/**
 * Returns train and bus options for a given route.
 * Pulls from groundTransport.json and generates realistic alternatives if needed.
 */
export function getGroundTransportOptions(
  origin: string,
  destination: string,
  _departureDate: string,
  passengers: number = 1
): { trains: GroundTransportItem[]; buses: GroundTransportItem[] } {
  const normOrigin = normalizeCity(origin);
  const normDest = normalizeCity(destination);
  const availableModes = getAvailableModes(origin, destination);

  const trains: GroundTransportItem[] = [];
  const buses: GroundTransportItem[] = [];

  // 1. Fetch matching trains from local sample JSON if Train mode is available
  if (availableModes.includes('train')) {
    const rawTrains = (rawGroundTransport.trains as GroundTransportItem[]).filter(
      (t) =>
        (normalizeCity(t.origin) === normOrigin || normalizeCity(t.originCode) === normOrigin) &&
        (normalizeCity(t.destination) === normDest || normalizeCity(t.destinationCode) === normDest)
    );

    if (rawTrains.length > 0) {
      trains.push(...rawTrains.map(t => ({ ...t, mode: 'train' as const })));
    } else {
      // Dynamic fallback for Indian mainland pair
      const dist = routeDistanceKm(normOrigin, normDest);
      const estHours = Math.max(3, Math.round(dist / 65));
      trains.push(
        {
          id: `trn-${normOrigin.slice(0, 3)}-${normDest.slice(0, 3)}-01`,
          mode: 'train',
          origin: origin.trim(),
          originCode: origin.slice(0, 3).toUpperCase(),
          destination: destination.trim(),
          destinationCode: destination.slice(0, 3).toUpperCase(),
          name: `${origin} - ${destination} Superfast Express`,
          operator: 'Indian Railways',
          departureTime: '06:30',
          arrivalTime: `+${Math.floor(estHours / 24) > 0 ? `${Math.floor(estHours / 24)}d ` : ''}${String((6 + estHours) % 24).padStart(2, '0')}:45`,
          duration: `${estHours}h 15m`,
          durationMinutes: estHours * 60 + 15,
          price: Math.max(450, Math.round(dist * 1.15)),
          currency: 'INR',
          classType: '3A AC / Sleeper',
          bookingUrl: 'https://www.irctc.co.in/nget/train-search',
        },
        {
          id: `trn-${normOrigin.slice(0, 3)}-${normDest.slice(0, 3)}-02`,
          mode: 'train',
          origin: origin.trim(),
          originCode: origin.slice(0, 3).toUpperCase(),
          destination: destination.trim(),
          destinationCode: destination.slice(0, 3).toUpperCase(),
          name: `${origin} - ${destination} Vande Bharat`,
          operator: 'Northern / Western Railway',
          departureTime: '14:15',
          arrivalTime: `${String((14 + Math.round(estHours * 0.8)) % 24).padStart(2, '0')}:30`,
          duration: `${Math.round(estHours * 0.8)}h 15m`,
          durationMinutes: Math.round(estHours * 0.8) * 60 + 15,
          price: Math.max(1200, Math.round(dist * 1.95)),
          currency: 'INR',
          classType: 'Chair Car (CC)',
          bookingUrl: 'https://www.irctc.co.in/nget/train-search',
        }
      );
    }
  }

  // 2. Fetch matching buses from local sample JSON if Bus mode is available
  if (availableModes.includes('bus')) {
    const rawBuses = (rawGroundTransport.buses as GroundTransportItem[]).filter(
      (b) =>
        (normalizeCity(b.origin) === normOrigin || normalizeCity(b.originCode) === normOrigin) &&
        (normalizeCity(b.destination) === normDest || normalizeCity(b.destinationCode) === normDest)
    );

    if (rawBuses.length > 0) {
      buses.push(...rawBuses.map(b => ({ ...b, mode: 'bus' as const })));
    } else {
      const dist = routeDistanceKm(normOrigin, normDest);
      const estHours = Math.max(4, Math.round(dist / 50));
      buses.push(
        {
          id: `bus-${normOrigin.slice(0, 3)}-${normDest.slice(0, 3)}-01`,
          mode: 'bus',
          origin: origin.trim(),
          originCode: origin.slice(0, 3).toUpperCase(),
          destination: destination.trim(),
          destinationCode: destination.slice(0, 3).toUpperCase(),
          name: `Zingbus Multi-Axle Volvo AC Sleeper`,
          operator: 'Zingbus Premium',
          departureTime: '18:30',
          arrivalTime: `+${Math.floor(estHours / 24) > 0 ? `${Math.floor(estHours / 24)}d ` : ''}${String((18 + estHours) % 24).padStart(2, '0')}:30`,
          duration: `${estHours}h 00m`,
          durationMinutes: estHours * 60,
          price: Math.max(650, Math.round(dist * 1.45)),
          currency: 'INR',
          classType: 'AC Sleeper (2+1)',
          bookingUrl: `https://www.redbus.in/bus-tickets/${encodeURIComponent(normOrigin)}-to-${encodeURIComponent(normDest)}`,
        },
        {
          id: `bus-${normOrigin.slice(0, 3)}-${normDest.slice(0, 3)}-02`,
          mode: 'bus',
          origin: origin.trim(),
          originCode: origin.slice(0, 3).toUpperCase(),
          destination: destination.trim(),
          destinationCode: destination.slice(0, 3).toUpperCase(),
          name: `IntrCity SmartBus Scania AC`,
          operator: 'IntrCity Travels',
          departureTime: '20:15',
          arrivalTime: `+${Math.floor((estHours + 1) / 24) > 0 ? `${Math.floor((estHours + 1) / 24)}d ` : ''}${String((20 + estHours + 1) % 24).padStart(2, '0')}:15`,
          duration: `${estHours + 1}h 00m`,
          durationMinutes: (estHours + 1) * 60,
          price: Math.max(750, Math.round(dist * 1.55)),
          currency: 'INR',
          classType: 'Luxury AC Sleeper',
          bookingUrl: `https://www.redbus.in/bus-tickets/${encodeURIComponent(normOrigin)}-to-${encodeURIComponent(normDest)}`,
        }
      );
    }
  }

  return { trains, buses };
}
