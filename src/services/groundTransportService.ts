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

// Non-land or island-only cities
const ISLAND_OR_NON_LAND_CITIES = new Set([
  'port blair', 'andaman', 'nicobar', 'havelock', 'neil island',
  'lakshadweep', 'kavaratti', 'maldives', 'mauritius'
]);

// European land-connected cities (rail + bus possible)
const EUROPEAN_CITIES = new Set([
  'paris', 'london', 'rome', 'milan', 'venice', 'florence', 'barcelona',
  'madrid', 'berlin', 'munich', 'amsterdam', 'brussels', 'zurich', 'geneva',
  'vienna', 'prague', 'budapest', 'warsaw', 'lisbon', 'athens', 'stockholm',
  'oslo', 'copenhagen', 'helsinki', 'dublin', 'edinburgh', 'rotterdam',
  'frankfurt', 'cologne', 'hamburg', 'lyon', 'marseille', 'nice', 'bern',
  'innsbruck', 'salzburg', 'krakow', 'bratislava', 'Ljubljana', 'zagreb',
  'bucharest', 'sofia', 'belgrade', 'sarajevo', 'riga', 'tallinn', 'vilnius'
]);

// Japanese land-connected cities (Shinkansen / rail)
const JAPANESE_CITIES = new Set([
  'tokyo', 'kyoto', 'osaka', 'hiroshima', 'nagoya', 'sapporo', 'fukuoka',
  'nara', 'kobe', 'sendai', 'kanazawa', 'hakone'
]);

// US + Canada continental cities (Amtrak / Greyhound)
const NORTH_AMERICAN_CITIES = new Set([
  'new york', 'los angeles', 'chicago', 'san francisco', 'seattle', 'boston',
  'washington dc', 'washington', 'miami', 'dallas', 'houston', 'denver',
  'las vegas', 'orlando', 'philadelphia', 'atlanta', 'toronto', 'montreal',
  'vancouver', 'ottawa', 'calgary'
]);

// Southeast Asia (bus / rail networks)
const SOUTHEAST_ASIAN_CITIES = new Set([
  'bangkok', 'chiang mai', 'singapore', 'kuala lumpur', 'penang', 'bali',
  'jakarta', 'yogyakarta', 'hanoi', 'ho chi minh city', 'saigon',
  'phnom penh', 'siem reap', 'yangon', 'manila', 'cebu'
]);

// China / East Asia mainland
const CHINESE_CITIES = new Set([
  'beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'xian',
  'hangzhou', 'nanjing', 'wuhan', 'chongqing', 'guilin', 'kunming'
]);

// Middle East / GCC (mostly island or flight connections)
const ISLAND_GULF_CITIES = new Set([
  'maldives', 'bali', 'sri lanka', 'colombo', 'male'
]);

function detectRegion(city: string): string {
  if (INDIAN_MAINLAND_CITIES.has(city)) return 'india';
  if (EUROPEAN_CITIES.has(city)) return 'europe';
  if (JAPANESE_CITIES.has(city)) return 'japan';
  if (NORTH_AMERICAN_CITIES.has(city)) return 'north_america';
  if (SOUTHEAST_ASIAN_CITIES.has(city)) return 'southeast_asia';
  if (CHINESE_CITIES.has(city)) return 'china';
  return 'unknown';
}

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
 * - Train: If both cities are on the same regional rail network.
 * - Bus: If reachable by road, and distance is under ~1500 km.
 * - If not feasible by land (e.g. islands), return Flight only.
 */
export function getAvailableModes(origin: string, destination: string): TransportMode[] {
  const normOrigin = normalizeCity(origin);
  const normDest = normalizeCity(destination);

  const modes: TransportMode[] = ['flight'];

  // 1. Island / ocean-only: flight only
  if (ISLAND_OR_NON_LAND_CITIES.has(normOrigin) || ISLAND_OR_NON_LAND_CITIES.has(normDest)) {
    return modes;
  }

  // 2. Same regional land network → train + bus
  const regionOrigin = detectRegion(normOrigin);
  const regionDest = detectRegion(normDest);

  const sameLandRegion =
    regionOrigin !== 'unknown' &&
    regionDest !== 'unknown' &&
    regionOrigin === regionDest;

  if (sameLandRegion) {
    modes.push('train');
    const distance = routeDistanceKm(normOrigin, normDest);
    if (distance <= 1800) {
      modes.push('bus');
    }
  }

  return modes;
}


interface RegionalOperators {
  train1: string; train1Name: string; train1Class: string; train1Url: string; train1Currency: string; train1PriceMul: number;
  train2: string; train2Name: string; train2Class: string; train2Url: string;
  bus1: string; bus1Name: string; bus1Class: string; bus1Url: string;
  bus2: string; bus2Name: string; bus2Class: string;
  currency: string;
  speedKmH: number;
  busSpeedKmH: number;
  pricePer100km: number;
  busPricePer100km: number;
}

function getRegionalOperators(region: string, normOrigin: string, normDest: string): RegionalOperators {
  switch (region) {
    case 'europe':
      return {
        train1: 'Eurostar / TGV', train1Name: `${normOrigin.charAt(0).toUpperCase() + normOrigin.slice(1)}-${normDest.charAt(0).toUpperCase() + normDest.slice(1)} TGV`,
        train1Class: 'Standard Premier', train1Url: 'https://www.raileurope.com', train1Currency: 'EUR', train1PriceMul: 1,
        train2: 'FlixTrain / Frecciarossa', train2Name: `${normOrigin.charAt(0).toUpperCase() + normOrigin.slice(1)}-${normDest.charAt(0).toUpperCase() + normDest.slice(1)} Intercity`,
        train2Class: 'Comfort Class', train2Url: 'https://www.raileurope.com',
        bus1: 'FlixBus', bus1Name: 'FlixBus Premium Express', bus1Class: 'Business Class Seat',
        bus1Url: `https://global.flixbus.com`,
        bus2: 'Eurolines / Blablabus', bus2Name: 'Eurolines Coach', bus2Class: 'Standard Seat',
        currency: 'EUR', speedKmH: 200, busSpeedKmH: 80, pricePer100km: 10, busPricePer100km: 4,
      };
    case 'japan':
      return {
        train1: 'JR Central (Shinkansen)', train1Name: `${normOrigin.charAt(0).toUpperCase() + normOrigin.slice(1)}-${normDest.charAt(0).toUpperCase() + normDest.slice(1)} Shinkansen Nozomi`,
        train1Class: 'Green Car (1st Class)', train1Url: 'https://www.jrpass.com', train1Currency: 'JPY', train1PriceMul: 1,
        train2: 'JR West (Hikari)', train2Name: `${normOrigin.charAt(0).toUpperCase() + normOrigin.slice(1)}-${normDest.charAt(0).toUpperCase() + normDest.slice(1)} Hikari`,
        train2Class: 'Ordinary Car', train2Url: 'https://www.jrpass.com',
        bus1: 'Willer Express', bus1Name: 'Willer Night Bus', bus1Class: 'Premium Comfort Seat',
        bus1Url: `https://willerexpress.com`,
        bus2: 'JR Bus (Highway)', bus2Name: 'JR Bus Highway Express', bus2Class: 'Standard Seat',
        currency: 'JPY', speedKmH: 250, busSpeedKmH: 70, pricePer100km: 1200, busPricePer100km: 400,
      };
    case 'north_america':
      return {
        train1: 'Amtrak', train1Name: `${normOrigin.charAt(0).toUpperCase() + normOrigin.slice(1)}-${normDest.charAt(0).toUpperCase() + normDest.slice(1)} Amtrak Service`,
        train1Class: 'Business Class', train1Url: 'https://www.amtrak.com', train1Currency: 'USD', train1PriceMul: 1,
        train2: 'VIA Rail (Canada)', train2Name: `${normOrigin.charAt(0).toUpperCase() + normOrigin.slice(1)}-${normDest.charAt(0).toUpperCase() + normDest.slice(1)} VIA Rail`,
        train2Class: 'Economy Plus', train2Url: 'https://www.amtrak.com',
        bus1: 'Greyhound', bus1Name: 'Greyhound Express', bus1Class: 'Business Seat',
        bus1Url: `https://www.greyhound.com`,
        bus2: 'FlixBus USA', bus2Name: 'FlixBus Interstate', bus2Class: 'Standard Seat',
        currency: 'USD', speedKmH: 110, busSpeedKmH: 90, pricePer100km: 7, busPricePer100km: 3,
      };
    case 'southeast_asia':
      return {
        train1: 'KTM / State Railways', train1Name: `${normOrigin.charAt(0).toUpperCase() + normOrigin.slice(1)}-${normDest.charAt(0).toUpperCase() + normDest.slice(1)} Express`,
        train1Class: 'First Class AC', train1Url: 'https://easybook.com/train', train1Currency: 'USD', train1PriceMul: 1,
        train2: 'Thai Railways (SRT)', train2Name: `${normOrigin.charAt(0).toUpperCase() + normOrigin.slice(1)}-${normDest.charAt(0).toUpperCase() + normDest.slice(1)} Rapid',`,
        train2Class: 'Fan Car', train2Url: 'https://easybook.com/train',
        bus1: 'BusOnlineTicket / 12Go', bus1Name: 'Premium Coach Express', bus1Class: 'VIP Bus Seat',
        bus1Url: `https://12go.asia`,
        bus2: 'AirAsia Bus / Transnasional', bus2Name: 'Express Liner', bus2Class: 'Standard Seat',
        currency: 'USD', speedKmH: 70, busSpeedKmH: 55, pricePer100km: 3, busPricePer100km: 1.5,
      };
    case 'china':
      return {
        train1: 'China Railway (CRH)', train1Name: `${normOrigin.charAt(0).toUpperCase() + normOrigin.slice(1)}-${normDest.charAt(0).toUpperCase() + normDest.slice(1)} G-Series HSR`,
        train1Class: 'First Class', train1Url: 'https://www.trip.com/trains/', train1Currency: 'CNY', train1PriceMul: 1,
        train2: 'D-Series Express', train2Name: `${normOrigin.charAt(0).toUpperCase() + normOrigin.slice(1)}-${normDest.charAt(0).toUpperCase() + normDest.slice(1)} D-Series',`,
        train2Class: 'Second Class', train2Url: 'https://www.trip.com/trains/',
        bus1: 'Hao Yi Xing Coach', bus1Name: 'Highway Sleeper Coach', bus1Class: 'Sleeper Berth',
        bus1Url: `https://www.trip.com`,
        bus2: 'Regional Bus Express', bus2Name: 'Inter-City Bus', bus2Class: 'Standard Seat',
        currency: 'CNY', speedKmH: 300, busSpeedKmH: 80, pricePer100km: 50, busPricePer100km: 15,
      };
    default: // india
      return {
        train1: 'Indian Railways', train1Name: `${normOrigin.charAt(0).toUpperCase() + normOrigin.slice(1)}-${normDest.charAt(0).toUpperCase() + normDest.slice(1)} Superfast Express`,
        train1Class: '3A AC / Sleeper', train1Url: 'https://www.irctc.co.in/nget/train-search', train1Currency: 'INR', train1PriceMul: 1,
        train2: 'Indian Railways (Vande Bharat)', train2Name: `Vande Bharat: ${normOrigin.charAt(0).toUpperCase() + normOrigin.slice(1)}-${normDest.charAt(0).toUpperCase() + normDest.slice(1)}`,
        train2Class: 'Chair Car (CC)', train2Url: 'https://www.irctc.co.in/nget/train-search',
        bus1: 'Zingbus Premium', bus1Name: 'Zingbus Multi-Axle Volvo AC Sleeper', bus1Class: 'AC Sleeper (2+1)',
        bus1Url: `https://www.redbus.in/bus-tickets/${encodeURIComponent(normOrigin)}-to-${encodeURIComponent(normDest)}`,
        bus2: 'IntrCity Travels', bus2Name: 'IntrCity SmartBus Scania AC', bus2Class: 'Luxury AC Sleeper',
        currency: 'INR', speedKmH: 65, busSpeedKmH: 50, pricePer100km: 115, busPricePer100km: 145,
      };
  }
}

/**
 * Returns train and bus options for a given route.
 * Pulls from groundTransport.json and generates realistic regional alternatives.
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
      const region = detectRegion(normOrigin);
      const ops = getRegionalOperators(region, normOrigin, normDest);
      const dist = routeDistanceKm(normOrigin, normDest);
      const estHours = Math.max(1, Math.round(dist / ops.speedKmH));
      const price1 = Math.max(500, Math.round((dist / 100) * ops.pricePer100km * passengers));
      const price2 = Math.max(300, Math.round((dist / 100) * ops.pricePer100km * passengers * 0.75));

      trains.push(
        {
          id: `trn-${normOrigin.slice(0, 3)}-${normDest.slice(0, 3)}-01`,
          mode: 'train',
          origin: origin.trim(),
          originCode: origin.slice(0, 3).toUpperCase(),
          destination: destination.trim(),
          destinationCode: destination.slice(0, 3).toUpperCase(),
          name: ops.train1Name,
          operator: ops.train1,
          departureTime: '06:30',
          arrivalTime: `${String((6 + estHours) % 24).padStart(2, '0')}:45`,
          duration: `${estHours}h 15m`,
          durationMinutes: estHours * 60 + 15,
          price: price1,
          currency: ops.currency,
          classType: ops.train1Class,
          bookingUrl: ops.train1Url,
        },
        {
          id: `trn-${normOrigin.slice(0, 3)}-${normDest.slice(0, 3)}-02`,
          mode: 'train',
          origin: origin.trim(),
          originCode: origin.slice(0, 3).toUpperCase(),
          destination: destination.trim(),
          destinationCode: destination.slice(0, 3).toUpperCase(),
          name: ops.train2Name,
          operator: ops.train2,
          departureTime: '14:15',
          arrivalTime: `${String((14 + Math.round(estHours * 1.1)) % 24).padStart(2, '0')}:30`,
          duration: `${Math.round(estHours * 1.1)}h 15m`,
          durationMinutes: Math.round(estHours * 1.1) * 60 + 15,
          price: price2,
          currency: ops.currency,
          classType: ops.train2Class,
          bookingUrl: ops.train2Url,
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
      const region = detectRegion(normOrigin);
      const ops = getRegionalOperators(region, normOrigin, normDest);
      const dist = routeDistanceKm(normOrigin, normDest);
      const estHours = Math.max(2, Math.round(dist / ops.busSpeedKmH));
      const busPrice1 = Math.max(500, Math.round((dist / 100) * ops.busPricePer100km * passengers * 1.1));
      const busPrice2 = Math.max(300, Math.round((dist / 100) * ops.busPricePer100km * passengers * 0.9));

      buses.push(
        {
          id: `bus-${normOrigin.slice(0, 3)}-${normDest.slice(0, 3)}-01`,
          mode: 'bus',
          origin: origin.trim(),
          originCode: origin.slice(0, 3).toUpperCase(),
          destination: destination.trim(),
          destinationCode: destination.slice(0, 3).toUpperCase(),
          name: ops.bus1Name,
          operator: ops.bus1,
          departureTime: '18:30',
          arrivalTime: `${String((18 + estHours) % 24).padStart(2, '0')}:30`,
          duration: `${estHours}h 00m`,
          durationMinutes: estHours * 60,
          price: busPrice1,
          currency: ops.currency,
          classType: ops.bus1Class,
          bookingUrl: ops.bus1Url,
        },
        {
          id: `bus-${normOrigin.slice(0, 3)}-${normDest.slice(0, 3)}-02`,
          mode: 'bus',
          origin: origin.trim(),
          originCode: origin.slice(0, 3).toUpperCase(),
          destination: destination.trim(),
          destinationCode: destination.slice(0, 3).toUpperCase(),
          name: ops.bus2Name,
          operator: ops.bus2,
          departureTime: '20:15',
          arrivalTime: `${String((20 + estHours + 1) % 24).padStart(2, '0')}:15`,
          duration: `${estHours + 1}h 00m`,
          durationMinutes: (estHours + 1) * 60,
          price: busPrice2,
          currency: ops.currency,
          classType: ops.bus2Class,
          bookingUrl: ops.bus1Url,
        }
      );
    }
  }

  return { trains, buses };
}

