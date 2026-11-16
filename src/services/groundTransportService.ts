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


// ─── Extended operator catalog per region ────────────────────────────────────
interface TrainOperatorEntry {
  operator: string;
  nameTemplate: string;
  classType: string;
  bookingUrl: string;
  speedMultiplier: number;   // 1.0 = base speed, >1 = faster, <1 = slower
  priceMultiplier: number;   // relative to base price
}

interface BusOperatorEntry {
  operator: string;
  nameTemplate: string;
  classType: string;
  bookingUrl: string;
  speedMultiplier: number;
  priceMultiplier: number;
}

interface RegionConfig {
  trains: TrainOperatorEntry[];
  buses: BusOperatorEntry[];
  currency: string;
  baseTrainSpeedKmH: number;
  baseBusSpeedKmH: number;
  trainPricePer100km: number;
  busPricePer100km: number;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getRegionConfig(region: string, normOrigin: string, normDest: string): RegionConfig {
  const o = capitalize(normOrigin);
  const d = capitalize(normDest);

  switch (region) {
    case 'europe':
      return {
        trains: [
          { operator: 'Eurostar / TGV', nameTemplate: `${o}-${d} TGV InOui`, classType: 'Standard Premier', bookingUrl: 'https://www.raileurope.com', speedMultiplier: 1.2, priceMultiplier: 1.3 },
          { operator: 'FlixTrain', nameTemplate: `FlixTrain ${o}-${d}`, classType: 'Economy', bookingUrl: 'https://www.flixtrain.com', speedMultiplier: 0.8, priceMultiplier: 0.6 },
          { operator: 'Frecciarossa', nameTemplate: `Frecciarossa ${o}-${d}`, classType: 'Standard', bookingUrl: 'https://www.raileurope.com', speedMultiplier: 1.1, priceMultiplier: 1.0 },
          { operator: 'ICE (Deutsche Bahn)', nameTemplate: `ICE ${o}-${d} Express`, classType: '2nd Class', bookingUrl: 'https://www.bahn.com', speedMultiplier: 1.0, priceMultiplier: 0.9 },
          { operator: 'Thalys', nameTemplate: `Thalys ${o}-${d}`, classType: 'Comfort 2', bookingUrl: 'https://www.thalys.com', speedMultiplier: 1.15, priceMultiplier: 1.1 },
          { operator: 'Renfe (AVE)', nameTemplate: `AVE ${o}-${d}`, classType: 'Turista Plus', bookingUrl: 'https://www.renfe.com', speedMultiplier: 1.2, priceMultiplier: 1.05 },
          { operator: 'Trenitalia Intercity', nameTemplate: `Intercity ${o}-${d}`, classType: '1st Class', bookingUrl: 'https://www.trenitalia.com', speedMultiplier: 0.85, priceMultiplier: 0.75 },
          { operator: 'OBB Nightjet', nameTemplate: `Nightjet ${o}-${d}`, classType: 'Couchette', bookingUrl: 'https://www.nightjet.com', speedMultiplier: 0.5, priceMultiplier: 0.7 },
        ],
        buses: [
          { operator: 'FlixBus', nameTemplate: `FlixBus ${o}-${d} Express`, classType: 'Business Seat', bookingUrl: 'https://global.flixbus.com', speedMultiplier: 1.0, priceMultiplier: 1.0 },
          { operator: 'Eurolines', nameTemplate: `Eurolines ${o}-${d}`, classType: 'Standard Seat', bookingUrl: 'https://www.eurolines.com', speedMultiplier: 0.9, priceMultiplier: 0.85 },
          { operator: 'BlaBlaBus', nameTemplate: `BlaBlaBus ${o}-${d}`, classType: 'Comfort', bookingUrl: 'https://www.blablabus.com', speedMultiplier: 0.95, priceMultiplier: 0.75 },
          { operator: 'OUIBUS', nameTemplate: `OUIBUS ${o}-${d}`, classType: 'Standard', bookingUrl: 'https://www.ouibus.com', speedMultiplier: 0.85, priceMultiplier: 0.65 },
          { operator: 'RegioJet', nameTemplate: `RegioJet ${o}-${d}`, classType: 'Fun Relax', bookingUrl: 'https://www.regiojet.com', speedMultiplier: 0.9, priceMultiplier: 0.7 },
          { operator: 'Megabus Europe', nameTemplate: `Megabus ${o}-${d}`, classType: 'Standard', bookingUrl: 'https://www.megabus.com', speedMultiplier: 0.85, priceMultiplier: 0.55 },
          { operator: 'Marino Bus', nameTemplate: `MarinoBus ${o}-${d}`, classType: 'Grand Comfort', bookingUrl: 'https://www.marinobus.it', speedMultiplier: 0.88, priceMultiplier: 0.8 },
        ],
        currency: 'EUR', baseTrainSpeedKmH: 200, baseBusSpeedKmH: 80, trainPricePer100km: 10, busPricePer100km: 4,
      };

    case 'japan':
      return {
        trains: [
          { operator: 'JR Central (Nozomi)', nameTemplate: `Shinkansen Nozomi ${o}-${d}`, classType: 'Green Car (1st Class)', bookingUrl: 'https://www.jrpass.com', speedMultiplier: 1.2, priceMultiplier: 1.4 },
          { operator: 'JR West (Hikari)', nameTemplate: `Shinkansen Hikari ${o}-${d}`, classType: 'Ordinary Car', bookingUrl: 'https://www.jrpass.com', speedMultiplier: 1.0, priceMultiplier: 1.0 },
          { operator: 'JR Kodama', nameTemplate: `Shinkansen Kodama ${o}-${d}`, classType: 'Non-Reserved', bookingUrl: 'https://www.jrpass.com', speedMultiplier: 0.7, priceMultiplier: 0.75 },
          { operator: 'JR Sakura', nameTemplate: `Shinkansen Sakura ${o}-${d}`, classType: 'Reserved Seat', bookingUrl: 'https://www.jrpass.com', speedMultiplier: 1.05, priceMultiplier: 1.1 },
          { operator: 'JR Mizuho', nameTemplate: `Shinkansen Mizuho ${o}-${d}`, classType: 'Green Car', bookingUrl: 'https://www.jrpass.com', speedMultiplier: 1.2, priceMultiplier: 1.35 },
          { operator: 'Tobu Railway Limited Express', nameTemplate: `Tobu Ltd Express ${o}-${d}`, classType: 'Reserved', bookingUrl: 'https://www.tobu.co.jp', speedMultiplier: 0.6, priceMultiplier: 0.5 },
          { operator: 'Kintetsu Railway', nameTemplate: `Kintetsu Express ${o}-${d}`, classType: 'Premium', bookingUrl: 'https://www.kintetsu.co.jp', speedMultiplier: 0.55, priceMultiplier: 0.55 },
        ],
        buses: [
          { operator: 'Willer Express', nameTemplate: `Willer Night Bus ${o}-${d}`, classType: 'Premium Comfort', bookingUrl: 'https://willerexpress.com', speedMultiplier: 1.0, priceMultiplier: 1.0 },
          { operator: 'JR Bus Kanto', nameTemplate: `JR Highway Bus ${o}-${d}`, classType: 'Standard Seat', bookingUrl: 'https://www.jrbuskanto.co.jp', speedMultiplier: 0.9, priceMultiplier: 0.8 },
          { operator: 'Kosoku Bus', nameTemplate: `Kosoku Express ${o}-${d}`, classType: 'Super Seat', bookingUrl: 'https://www.kosokubus.com', speedMultiplier: 0.95, priceMultiplier: 0.85 },
          { operator: 'VIP Liner', nameTemplate: `VIP Liner ${o}-${d}`, classType: '3-Row Reclining', bookingUrl: 'https://vipliner.biz', speedMultiplier: 0.85, priceMultiplier: 1.1 },
          { operator: 'Jamjam Liner', nameTemplate: `JAM JAM ${o}-${d}`, classType: '4-Row Relax', bookingUrl: 'https://www.jamjamliner.jp', speedMultiplier: 0.9, priceMultiplier: 0.6 },
          { operator: 'Orion Bus', nameTemplate: `Orion Tour ${o}-${d}`, classType: 'Standard Night', bookingUrl: 'https://www.orion-bus.jp', speedMultiplier: 0.85, priceMultiplier: 0.55 },
        ],
        currency: 'JPY', baseTrainSpeedKmH: 250, baseBusSpeedKmH: 70, trainPricePer100km: 1200, busPricePer100km: 400,
      };

    case 'north_america':
      return {
        trains: [
          { operator: 'Amtrak Acela', nameTemplate: `Acela Express ${o}-${d}`, classType: 'Business Class', bookingUrl: 'https://www.amtrak.com', speedMultiplier: 1.3, priceMultiplier: 1.5 },
          { operator: 'Amtrak Northeast Regional', nameTemplate: `NE Regional ${o}-${d}`, classType: 'Coach', bookingUrl: 'https://www.amtrak.com', speedMultiplier: 1.0, priceMultiplier: 0.8 },
          { operator: 'Amtrak Silver Service', nameTemplate: `Silver Meteor ${o}-${d}`, classType: 'Roomette', bookingUrl: 'https://www.amtrak.com', speedMultiplier: 0.7, priceMultiplier: 1.2 },
          { operator: 'Amtrak Capitol Limited', nameTemplate: `Capitol Ltd ${o}-${d}`, classType: 'Coach', bookingUrl: 'https://www.amtrak.com', speedMultiplier: 0.75, priceMultiplier: 0.9 },
          { operator: 'VIA Rail (Canada)', nameTemplate: `VIA Rail ${o}-${d}`, classType: 'Economy Plus', bookingUrl: 'https://www.viarail.ca', speedMultiplier: 0.85, priceMultiplier: 0.85 },
          { operator: 'VIA Rail Business', nameTemplate: `VIA Rail Business ${o}-${d}`, classType: 'Business', bookingUrl: 'https://www.viarail.ca', speedMultiplier: 0.85, priceMultiplier: 1.3 },
          { operator: 'Brightline', nameTemplate: `Brightline ${o}-${d}`, classType: 'Smart', bookingUrl: 'https://www.gobrightline.com', speedMultiplier: 1.1, priceMultiplier: 1.0 },
        ],
        buses: [
          { operator: 'Greyhound', nameTemplate: `Greyhound Express ${o}-${d}`, classType: 'Business Seat', bookingUrl: 'https://www.greyhound.com', speedMultiplier: 1.0, priceMultiplier: 1.0 },
          { operator: 'FlixBus USA', nameTemplate: `FlixBus ${o}-${d}`, classType: 'Standard', bookingUrl: 'https://www.flixbus.com', speedMultiplier: 0.95, priceMultiplier: 0.7 },
          { operator: 'Megabus', nameTemplate: `Megabus ${o}-${d}`, classType: 'Standard', bookingUrl: 'https://us.megabus.com', speedMultiplier: 0.9, priceMultiplier: 0.55 },
          { operator: 'BoltBus', nameTemplate: `BoltBus ${o}-${d}`, classType: 'Reserved', bookingUrl: 'https://www.boltbus.com', speedMultiplier: 0.95, priceMultiplier: 0.65 },
          { operator: 'Peter Pan Bus', nameTemplate: `Peter Pan ${o}-${d}`, classType: 'Express', bookingUrl: 'https://peterpanbus.com', speedMultiplier: 0.9, priceMultiplier: 0.75 },
          { operator: 'Red Coach', nameTemplate: `RedCoach ${o}-${d}`, classType: 'First Class', bookingUrl: 'https://www.redcoachusa.com', speedMultiplier: 1.0, priceMultiplier: 1.3 },
          { operator: 'OurBus', nameTemplate: `OurBus ${o}-${d}`, classType: 'Standard', bookingUrl: 'https://www.ourbus.com', speedMultiplier: 0.88, priceMultiplier: 0.6 },
        ],
        currency: 'USD', baseTrainSpeedKmH: 110, baseBusSpeedKmH: 90, trainPricePer100km: 7, busPricePer100km: 3,
      };

    case 'southeast_asia':
      return {
        trains: [
          { operator: 'KTM ETS', nameTemplate: `ETS Gold ${o}-${d}`, classType: 'Business', bookingUrl: 'https://easybook.com/train', speedMultiplier: 1.1, priceMultiplier: 1.2 },
          { operator: 'Thai Railways (SRT)', nameTemplate: `SRT Rapid ${o}-${d}`, classType: '1st Class AC', bookingUrl: 'https://12go.asia', speedMultiplier: 0.8, priceMultiplier: 0.9 },
          { operator: 'Vietnam Railways', nameTemplate: `Reunification Express ${o}-${d}`, classType: 'Soft Sleeper AC', bookingUrl: 'https://12go.asia', speedMultiplier: 0.6, priceMultiplier: 0.7 },
          { operator: 'KTM Intercity', nameTemplate: `Intercity ${o}-${d}`, classType: 'Superior Night', bookingUrl: 'https://easybook.com/train', speedMultiplier: 0.7, priceMultiplier: 0.65 },
          { operator: 'Cambodia Royal Railway', nameTemplate: `Royal Railway ${o}-${d}`, classType: 'Standard', bookingUrl: 'https://12go.asia', speedMultiplier: 0.5, priceMultiplier: 0.4 },
          { operator: 'SRT Special Express', nameTemplate: `SRT Special Express ${o}-${d}`, classType: '2nd Class AC', bookingUrl: 'https://12go.asia', speedMultiplier: 0.75, priceMultiplier: 0.8 },
        ],
        buses: [
          { operator: 'BusOnlineTicket / 12Go', nameTemplate: `Premium Coach ${o}-${d}`, classType: 'VIP Bus', bookingUrl: 'https://12go.asia', speedMultiplier: 1.0, priceMultiplier: 1.0 },
          { operator: 'Transnasional', nameTemplate: `Transnasional ${o}-${d}`, classType: 'Executive', bookingUrl: 'https://easybook.com', speedMultiplier: 0.9, priceMultiplier: 0.8 },
          { operator: 'Nakhonchai Air', nameTemplate: `NCA Gold ${o}-${d}`, classType: 'First Class', bookingUrl: 'https://12go.asia', speedMultiplier: 0.95, priceMultiplier: 1.1 },
          { operator: 'The Sinh Tourist', nameTemplate: `Sinh Tourist ${o}-${d}`, classType: 'Sleeper', bookingUrl: 'https://thesinhtourist.vn', speedMultiplier: 0.8, priceMultiplier: 0.6 },
          { operator: 'Giant Ibis', nameTemplate: `Giant Ibis ${o}-${d}`, classType: 'Night Bus', bookingUrl: 'https://giantibis.com', speedMultiplier: 0.85, priceMultiplier: 0.7 },
          { operator: 'Grassland Express', nameTemplate: `Grassland ${o}-${d}`, classType: 'Standard', bookingUrl: 'https://easybook.com', speedMultiplier: 0.8, priceMultiplier: 0.5 },
        ],
        currency: 'USD', baseTrainSpeedKmH: 70, baseBusSpeedKmH: 55, trainPricePer100km: 3, busPricePer100km: 1.5,
      };

    case 'china':
      return {
        trains: [
          { operator: 'China Railway (G-Series)', nameTemplate: `G-Series HSR ${o}-${d}`, classType: 'First Class', bookingUrl: 'https://www.trip.com/trains/', speedMultiplier: 1.2, priceMultiplier: 1.4 },
          { operator: 'China Railway (D-Series)', nameTemplate: `D-Series ${o}-${d}`, classType: 'Second Class', bookingUrl: 'https://www.trip.com/trains/', speedMultiplier: 0.8, priceMultiplier: 0.7 },
          { operator: 'China Railway (C-Series)', nameTemplate: `C-Series Intercity ${o}-${d}`, classType: 'First Class', bookingUrl: 'https://www.trip.com/trains/', speedMultiplier: 1.0, priceMultiplier: 1.1 },
          { operator: 'China Railway (Z-Series)', nameTemplate: `Z Direct Express ${o}-${d}`, classType: 'Soft Sleeper', bookingUrl: 'https://www.trip.com/trains/', speedMultiplier: 0.5, priceMultiplier: 0.8 },
          { operator: 'China Railway (T-Series)', nameTemplate: `T Express ${o}-${d}`, classType: 'Hard Sleeper', bookingUrl: 'https://www.trip.com/trains/', speedMultiplier: 0.45, priceMultiplier: 0.5 },
          { operator: 'China Railway (K-Series)', nameTemplate: `K Fast Train ${o}-${d}`, classType: 'Hard Seat', bookingUrl: 'https://www.trip.com/trains/', speedMultiplier: 0.35, priceMultiplier: 0.3 },
          { operator: 'CRH Business', nameTemplate: `G-Series Business ${o}-${d}`, classType: 'Business Class', bookingUrl: 'https://www.trip.com/trains/', speedMultiplier: 1.2, priceMultiplier: 2.0 },
        ],
        buses: [
          { operator: 'Hao Yi Xing Coach', nameTemplate: `Highway Sleeper ${o}-${d}`, classType: 'Sleeper Berth', bookingUrl: 'https://www.trip.com', speedMultiplier: 1.0, priceMultiplier: 1.0 },
          { operator: 'Regional Bus Express', nameTemplate: `Inter-City Bus ${o}-${d}`, classType: 'Standard Seat', bookingUrl: 'https://www.trip.com', speedMultiplier: 0.9, priceMultiplier: 0.7 },
          { operator: 'Changtu Coach', nameTemplate: `Changtu Coach ${o}-${d}`, classType: 'Business Seat', bookingUrl: 'https://www.trip.com', speedMultiplier: 0.95, priceMultiplier: 0.85 },
          { operator: 'Provincial Express', nameTemplate: `Provincial Bus ${o}-${d}`, classType: 'Luxury Seat', bookingUrl: 'https://www.trip.com', speedMultiplier: 0.85, priceMultiplier: 0.6 },
          { operator: 'Airport Shuttle Bus', nameTemplate: `Airport Shuttle ${o}-${d}`, classType: 'Standard', bookingUrl: 'https://www.trip.com', speedMultiplier: 0.8, priceMultiplier: 0.5 },
          { operator: 'Kuai Ke Express', nameTemplate: `Kuai Ke ${o}-${d}`, classType: 'Night Sleeper', bookingUrl: 'https://www.trip.com', speedMultiplier: 0.75, priceMultiplier: 0.65 },
        ],
        currency: 'CNY', baseTrainSpeedKmH: 300, baseBusSpeedKmH: 80, trainPricePer100km: 50, busPricePer100km: 15,
      };

    default: // india
      return {
        trains: [
          { operator: 'Indian Railways', nameTemplate: `${o}-${d} Rajdhani Express`, classType: '1A First AC', bookingUrl: 'https://www.irctc.co.in/nget/train-search', speedMultiplier: 1.2, priceMultiplier: 1.8 },
          { operator: 'Indian Railways', nameTemplate: `${o}-${d} Shatabdi Express`, classType: 'Executive Chair (EC)', bookingUrl: 'https://www.irctc.co.in/nget/train-search', speedMultiplier: 1.15, priceMultiplier: 1.5 },
          { operator: 'Indian Railways (Vande Bharat)', nameTemplate: `Vande Bharat ${o}-${d}`, classType: 'Chair Car (CC)', bookingUrl: 'https://www.irctc.co.in/nget/train-search', speedMultiplier: 1.3, priceMultiplier: 1.4 },
          { operator: 'Indian Railways', nameTemplate: `${o}-${d} Duronto Express`, classType: '3A AC Three Tier', bookingUrl: 'https://www.irctc.co.in/nget/train-search', speedMultiplier: 1.1, priceMultiplier: 1.0 },
          { operator: 'Indian Railways', nameTemplate: `${o}-${d} Superfast Express`, classType: '2A AC Two Tier', bookingUrl: 'https://www.irctc.co.in/nget/train-search', speedMultiplier: 0.9, priceMultiplier: 1.2 },
          { operator: 'Indian Railways', nameTemplate: `${o}-${d} Garib Rath Express`, classType: '3A AC Economy', bookingUrl: 'https://www.irctc.co.in/nget/train-search', speedMultiplier: 0.85, priceMultiplier: 0.65 },
          { operator: 'Indian Railways', nameTemplate: `${o}-${d} Humsafar Express`, classType: '3A AC (Humsafar)', bookingUrl: 'https://www.irctc.co.in/nget/train-search', speedMultiplier: 0.9, priceMultiplier: 0.85 },
          { operator: 'Indian Railways', nameTemplate: `${o}-${d} Jan Shatabdi Express`, classType: '2S Second Sitting', bookingUrl: 'https://www.irctc.co.in/nget/train-search', speedMultiplier: 0.8, priceMultiplier: 0.4 },
        ],
        buses: [
          { operator: 'Zingbus Premium', nameTemplate: `Zingbus Volvo AC Sleeper ${o}-${d}`, classType: 'AC Sleeper (2+1)', bookingUrl: `https://www.redbus.in/bus-tickets/${encodeURIComponent(normOrigin)}-to-${encodeURIComponent(normDest)}`, speedMultiplier: 1.0, priceMultiplier: 1.1 },
          { operator: 'IntrCity SmartBus', nameTemplate: `IntrCity Scania AC ${o}-${d}`, classType: 'Luxury AC Sleeper', bookingUrl: `https://www.redbus.in/bus-tickets/${encodeURIComponent(normOrigin)}-to-${encodeURIComponent(normDest)}`, speedMultiplier: 1.05, priceMultiplier: 1.2 },
          { operator: 'VRL Travels', nameTemplate: `VRL Multi-Axle Volvo ${o}-${d}`, classType: 'AC Seater/Sleeper', bookingUrl: `https://www.redbus.in/bus-tickets/${encodeURIComponent(normOrigin)}-to-${encodeURIComponent(normDest)}`, speedMultiplier: 0.95, priceMultiplier: 0.9 },
          { operator: 'Neeta Travels', nameTemplate: `Neeta Volvo B11R ${o}-${d}`, classType: 'AC Sleeper (2+1)', bookingUrl: `https://www.redbus.in/bus-tickets/${encodeURIComponent(normOrigin)}-to-${encodeURIComponent(normDest)}`, speedMultiplier: 0.9, priceMultiplier: 0.85 },
          { operator: 'GSRTC Volvo', nameTemplate: `GSRTC Volvo AC ${o}-${d}`, classType: 'AC Seater', bookingUrl: 'https://gsrtc.in', speedMultiplier: 0.85, priceMultiplier: 0.6 },
          { operator: 'RSRTC / MSRTC', nameTemplate: `State Transport ${o}-${d}`, classType: 'Semi-Deluxe', bookingUrl: 'https://rsrtc.rajasthan.gov.in', speedMultiplier: 0.75, priceMultiplier: 0.4 },
          { operator: 'Shrinath Travels', nameTemplate: `Shrinath AC Sleeper ${o}-${d}`, classType: 'AC Sleeper', bookingUrl: `https://www.redbus.in/bus-tickets/${encodeURIComponent(normOrigin)}-to-${encodeURIComponent(normDest)}`, speedMultiplier: 0.9, priceMultiplier: 0.75 },
          { operator: 'Patel Travels', nameTemplate: `Patel Travels Volvo ${o}-${d}`, classType: 'AC Seater', bookingUrl: `https://www.redbus.in/bus-tickets/${encodeURIComponent(normOrigin)}-to-${encodeURIComponent(normDest)}`, speedMultiplier: 0.88, priceMultiplier: 0.7 },
        ],
        currency: 'INR', baseTrainSpeedKmH: 65, baseBusSpeedKmH: 50, trainPricePer100km: 115, busPricePer100km: 145,
      };
  }
}

// Departure time slots spread across the day
const TRAIN_DEPARTURE_TIMES = ['04:45', '06:00', '08:20', '10:30', '13:15', '16:00', '19:30', '22:00'];
const BUS_DEPARTURE_TIMES = ['06:00', '08:30', '11:00', '14:00', '17:30', '20:00', '21:30', '23:00'];

function computeArrival(depTime: string, durationMinutes: number): string {
  const [h, m] = depTime.split(':').map(Number);
  const totalMin = h * 60 + m + durationMinutes;
  const arrH = Math.floor(totalMin / 60) % 24;
  const arrM = totalMin % 60;
  return `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`;
}

function formatDurationStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/**
 * Returns train and bus options for a given route.
 * Pulls from groundTransport.json and generates realistic regional alternatives.
 * Now generates 6-8 options per mode for a realistic travel search experience.
 */
export function getGroundTransportOptions(
  origin: string,
  destination: string,
  departureDate: string,
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
    }

    // Always generate additional options to fill up to 6-8 results
    const region = detectRegion(normOrigin);
    const config = getRegionConfig(region, normOrigin, normDest);
    const dist = routeDistanceKm(normOrigin, normDest);

    const remainingSlots = Math.max(0, 8 - trains.length);
    const operatorsToUse = config.trains.slice(0, remainingSlots);

    operatorsToUse.forEach((op, idx) => {
      const speedKmH = config.baseTrainSpeedKmH * op.speedMultiplier;
      const estMinutes = Math.max(45, Math.round((dist / speedKmH) * 60));
      // add some variance: ±10 minutes
      const variance = (idx % 3 - 1) * 10;
      const finalMinutes = Math.max(45, estMinutes + variance);
      const basePrice = Math.max(200, Math.round((dist / 100) * config.trainPricePer100km * op.priceMultiplier));
      const totalPrice = basePrice * passengers;

      const depTime = TRAIN_DEPARTURE_TIMES[idx % TRAIN_DEPARTURE_TIMES.length];
      const arrTime = computeArrival(depTime, finalMinutes);

      // Don't add if we already have this exact operator from JSON
      const existingOp = trains.find(t => t.operator === op.operator && t.departureTime === depTime);
      if (existingOp) return;

      trains.push({
        id: `trn-${normOrigin.slice(0, 3)}-${normDest.slice(0, 3)}-${String(idx + 1).padStart(2, '0')}`,
        mode: 'train',
        origin: origin.trim(),
        originCode: origin.slice(0, 3).toUpperCase(),
        destination: destination.trim(),
        destinationCode: destination.slice(0, 3).toUpperCase(),
        name: op.nameTemplate,
        operator: op.operator,
        departureTime: depTime,
        arrivalTime: arrTime,
        duration: formatDurationStr(finalMinutes),
        durationMinutes: finalMinutes,
        price: totalPrice,
        currency: config.currency,
        classType: op.classType,
        bookingUrl: op.bookingUrl,
      });
    });
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
    }

    // Generate additional options to fill up to 6-8 results
    const region = detectRegion(normOrigin);
    const config = getRegionConfig(region, normOrigin, normDest);
    const dist = routeDistanceKm(normOrigin, normDest);

    const remainingSlots = Math.max(0, 8 - buses.length);
    const operatorsToUse = config.buses.slice(0, remainingSlots);

    operatorsToUse.forEach((op, idx) => {
      const speedKmH = config.baseBusSpeedKmH * op.speedMultiplier;
      const estMinutes = Math.max(60, Math.round((dist / speedKmH) * 60));
      const variance = (idx % 3 - 1) * 15;
      const finalMinutes = Math.max(60, estMinutes + variance);
      const basePrice = Math.max(150, Math.round((dist / 100) * config.busPricePer100km * op.priceMultiplier));
      const totalPrice = basePrice * passengers;

      const depTime = BUS_DEPARTURE_TIMES[idx % BUS_DEPARTURE_TIMES.length];
      const arrTime = computeArrival(depTime, finalMinutes);

      const existingOp = buses.find(b => b.operator === op.operator && b.departureTime === depTime);
      if (existingOp) return;

      buses.push({
        id: `bus-${normOrigin.slice(0, 3)}-${normDest.slice(0, 3)}-${String(idx + 1).padStart(2, '0')}`,
        mode: 'bus',
        origin: origin.trim(),
        originCode: origin.slice(0, 3).toUpperCase(),
        destination: destination.trim(),
        destinationCode: destination.slice(0, 3).toUpperCase(),
        name: op.nameTemplate,
        operator: op.operator,
        departureTime: depTime,
        arrivalTime: arrTime,
        duration: formatDurationStr(finalMinutes),
        durationMinutes: finalMinutes,
        price: totalPrice,
        currency: config.currency,
        classType: op.classType,
        bookingUrl: op.bookingUrl,
      });
    });
  }

  return { trains, buses };
}
