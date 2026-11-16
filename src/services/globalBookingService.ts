/**
 * Voyana Global Transport Booking Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Integrates real external APIs for cabs, trains, and buses worldwide.
 *
 * APIs used:
 *   • Rome2Rio   – Global multi-modal route discovery (free 100 req/day)
 *   • Amadeus    – Airport transfers & professional car services (free test)
 *   • Distribusion – Global bus booking (FlixBus, BlaBlaBus, 500+ operators)
 *   • Trainline  – European & global rail booking (affiliate deep-link)
 *   • 12Go Asia  – SE Asia bus/train/ferry booking (affiliate deep-link)
 *   • IRCTC      – Indian rail (deep-link, no public key needed)
 *   • Uber        – Regional cab deep-links (no booking key needed)
 *   • Bolt/Grab  – Regional fallback deep-links
 *
 * All live calls fall back gracefully to rich mock data when API keys are
 * absent or when requests fail (network-down, quota exceeded, etc.).
 */

import type { TransportItem, TransportType } from '../../services/ai-service/src/catalog/transport';

// ─── Environment ─────────────────────────────────────────────────────────────
const ROME2RIO_KEY    = import.meta.env.VITE_ROME2RIO_API_KEY    || '';
const AMADEUS_KEY     = import.meta.env.VITE_AMADEUS_API_KEY     || '';
const AMADEUS_SECRET  = import.meta.env.VITE_AMADEUS_API_SECRET  || '';
const DISTRIBUSION_KEY= import.meta.env.VITE_DISTRIBUSION_API_KEY|| '';

const ROME2RIO_BASE   = 'https://free.rome2rio.com/api/1.4/json';
const AMADEUS_AUTH    = 'https://test.api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_BASE    = 'https://test.api.amadeus.com/v1';
const DISTRIBUSION_BASE = 'https://api.distribusion.com/retailers/v4';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GlobalTransportResult {
  items: TransportItem[];
  source: 'live' | 'mock';
  provider: string;
  deepLinks: DeepLink[];
}

export interface DeepLink {
  label: string;
  url: string;
  icon: string;
  type: 'cab' | 'train' | 'bus';
  region: string;
}

export interface BookingLink {
  provider: string;
  url: string;
  icon: string;
  note: string;
}

// ─── Region Detection ─────────────────────────────────────────────────────────

type WorldRegion = 'india' | 'europe' | 'japan' | 'north_america' | 'southeast_asia' | 'china' | 'middle_east' | 'africa' | 'latin_america' | 'oceania' | 'global';

const REGION_MAP: Record<string, WorldRegion> = {
  // India
  ahmedabad: 'india', mumbai: 'india', delhi: 'india', 'new delhi': 'india', pune: 'india',
  bengaluru: 'india', bangalore: 'india', jaipur: 'india', kolkata: 'india', chennai: 'india',
  hyderabad: 'india', amritsar: 'india', goa: 'india', surat: 'india', vadodara: 'india',
  lucknow: 'india', bhopal: 'india', indore: 'india', agra: 'india', varanasi: 'india',
  udaipur: 'india', kochi: 'india', chandigarh: 'india', nagpur: 'india',

  // Europe
  paris: 'europe', london: 'europe', rome: 'europe', milan: 'europe', venice: 'europe',
  florence: 'europe', barcelona: 'europe', madrid: 'europe', berlin: 'europe',
  munich: 'europe', amsterdam: 'europe', brussels: 'europe', zurich: 'europe',
  geneva: 'europe', vienna: 'europe', prague: 'europe', budapest: 'europe',
  warsaw: 'europe', lisbon: 'europe', athens: 'europe', stockholm: 'europe',
  oslo: 'europe', copenhagen: 'europe', dublin: 'europe', edinburgh: 'europe',
  frankfurt: 'europe', hamburg: 'europe', lyon: 'europe', nice: 'europe',
  rotterdam: 'europe', cologne: 'europe', marseille: 'europe',

  // Japan
  tokyo: 'japan', kyoto: 'japan', osaka: 'japan', hiroshima: 'japan',
  nagoya: 'japan', sapporo: 'japan', fukuoka: 'japan', nara: 'japan',
  kobe: 'japan', sendai: 'japan', kanazawa: 'japan',

  // North America
  'new york': 'north_america', 'los angeles': 'north_america', chicago: 'north_america',
  'san francisco': 'north_america', seattle: 'north_america', boston: 'north_america',
  washington: 'north_america', miami: 'north_america', dallas: 'north_america',
  houston: 'north_america', denver: 'north_america', 'las vegas': 'north_america',
  toronto: 'north_america', montreal: 'north_america', vancouver: 'north_america',

  // Southeast Asia
  bangkok: 'southeast_asia', 'chiang mai': 'southeast_asia', singapore: 'southeast_asia',
  'kuala lumpur': 'southeast_asia', penang: 'southeast_asia', bali: 'southeast_asia',
  jakarta: 'southeast_asia', hanoi: 'southeast_asia', 'ho chi minh city': 'southeast_asia',
  'phnom penh': 'southeast_asia', 'siem reap': 'southeast_asia',
  'yangon': 'southeast_asia', manila: 'southeast_asia',

  // China
  beijing: 'china', shanghai: 'china', guangzhou: 'china', shenzhen: 'china',
  chengdu: 'china', xian: 'china', hangzhou: 'china',

  // Middle East
  dubai: 'middle_east', 'abu dhabi': 'middle_east', doha: 'middle_east',
  riyadh: 'middle_east', kuwait: 'middle_east', beirut: 'middle_east',
  amman: 'middle_east', istanbul: 'middle_east', tel: 'middle_east',

  // Africa
  cairo: 'africa', nairobi: 'africa', 'cape town': 'africa', johannesburg: 'africa',
  lagos: 'africa', accra: 'africa', casablanca: 'africa', marrakech: 'africa',

  // Latin America
  'rio de janeiro': 'latin_america', 'sao paulo': 'latin_america',
  'buenos aires': 'latin_america', lima: 'latin_america', bogota: 'latin_america',
  santiago: 'latin_america', mexico: 'latin_america',

  // Oceania
  sydney: 'oceania', melbourne: 'oceania', brisbane: 'oceania',
  auckland: 'oceania', perth: 'oceania',
};

function detectRegion(city: string): WorldRegion {
  return REGION_MAP[city.trim().toLowerCase()] ?? 'global';
}

// ─── Deep Link Generators (always available, no API key needed) ───────────────

function getCabDeepLinks(origin: string, destination: string, lat?: number, lng?: number): DeepLink[] {
  const region = detectRegion(destination || origin);
  const enc = (s: string) => encodeURIComponent(s);
  const links: DeepLink[] = [];

  // Uber — available in 70+ countries
  const uberBase = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${enc(destination)}`;
  links.push({ label: 'Uber', url: uberBase, icon: '🚗', type: 'cab', region: 'global' });

  if (region === 'india') {
    // Ola — India, UK, Australia
    links.push({
      label: 'Ola Cabs',
      url: `https://book.olacabs.com/?serviceType=p2p&drop=${enc(destination)}`,
      icon: '🟡', type: 'cab', region: 'india',
    });
    // Rapido — India
    links.push({
      label: 'Rapido',
      url: `https://www.rapido.bike/`,
      icon: '⚡', type: 'cab', region: 'india',
    });
  }

  if (region === 'europe') {
    // Bolt — Europe, Africa
    links.push({
      label: 'Bolt',
      url: `https://bolt.eu/en/`,
      icon: '🟢', type: 'cab', region: 'europe',
    });
    // FreeNow — Europe
    links.push({
      label: 'FREE NOW',
      url: `https://www.free-now.com/`,
      icon: '🔵', type: 'cab', region: 'europe',
    });
  }

  if (region === 'southeast_asia') {
    // Grab — SE Asia
    links.push({
      label: 'Grab',
      url: `https://www.grab.com/`,
      icon: '🟢', type: 'cab', region: 'southeast_asia',
    });
    // Gojek — Indonesia / SEA
    links.push({
      label: 'Gojek',
      url: `https://www.gojek.com/`,
      icon: '🟢', type: 'cab', region: 'southeast_asia',
    });
  }

  if (region === 'north_america') {
    links.push({
      label: 'Lyft',
      url: `https://www.lyft.com/rider/`,
      icon: '💜', type: 'cab', region: 'north_america',
    });
  }

  if (region === 'middle_east') {
    links.push({
      label: 'Careem',
      url: `https://www.careem.com/`,
      icon: '🟢', type: 'cab', region: 'middle_east',
    });
    links.push({
      label: 'InDrive',
      url: `https://indrive.com/`,
      icon: '⚫', type: 'cab', region: 'middle_east',
    });
  }

  if (region === 'africa') {
    links.push({
      label: 'Bolt',
      url: `https://bolt.eu/en/`,
      icon: '🟢', type: 'cab', region: 'africa',
    });
    links.push({
      label: 'Yango',
      url: `https://yango.com/`,
      icon: '🔴', type: 'cab', region: 'africa',
    });
  }

  if (region === 'latin_america') {
    links.push({
      label: 'InDrive',
      url: `https://indrive.com/`,
      icon: '⚫', type: 'cab', region: 'latin_america',
    });
    links.push({
      label: '99 Táxi',
      url: `https://99app.com/`,
      icon: '🟡', type: 'cab', region: 'latin_america',
    });
  }

  if (region === 'china') {
    links.push({
      label: 'DiDi',
      url: `https://www.didiglobal.com/`,
      icon: '🟠', type: 'cab', region: 'china',
    });
  }

  if (region === 'oceania') {
    links.push({
      label: 'Ola (AU)',
      url: `https://book.olacabs.com/`,
      icon: '🟡', type: 'cab', region: 'oceania',
    });
  }

  return links;
}

function getTrainDeepLinks(origin: string, destination: string): DeepLink[] {
  const region = detectRegion(destination || origin);
  const enc = (s: string) => encodeURIComponent(s);
  const links: DeepLink[] = [];

  if (region === 'india') {
    links.push({
      label: 'IRCTC Rail Connect',
      url: `https://www.irctc.co.in/nget/train-search`,
      icon: '🚆', type: 'train', region: 'india',
    });
    links.push({
      label: 'ixigo Trains',
      url: `https://www.ixigo.com/trains/${enc(origin)}-to-${enc(destination)}`,
      icon: '🔵', type: 'train', region: 'india',
    });
    links.push({
      label: 'Cleartrip Trains',
      url: `https://www.cleartrip.com/trains/results?origin=${enc(origin)}&destination=${enc(destination)}`,
      icon: '🟢', type: 'train', region: 'india',
    });
  }

  if (region === 'europe') {
    links.push({
      label: 'Trainline (Europe)',
      url: `https://www.thetrainline.com/en/train-times/${enc(origin)}-to-${enc(destination)}`,
      icon: '🚆', type: 'train', region: 'europe',
    });
    links.push({
      label: 'Omio (Multi-carrier)',
      url: `https://www.omio.com/trains/${enc(origin)}/${enc(destination)}`,
      icon: '🔵', type: 'train', region: 'europe',
    });
    links.push({
      label: 'Rail Europe',
      url: `https://www.raileurope.com/en/routes/${enc(origin)}-${enc(destination)}`,
      icon: '🔴', type: 'train', region: 'europe',
    });
  }

  if (region === 'japan') {
    links.push({
      label: 'JR Pass / Klook',
      url: `https://www.klook.com/en-US/train-tickets/`,
      icon: '🚅', type: 'train', region: 'japan',
    });
    links.push({
      label: 'Hyperdia (Schedules)',
      url: `https://www.hyperdia.com/en/`,
      icon: '🗾', type: 'train', region: 'japan',
    });
  }

  if (region === 'north_america') {
    links.push({
      label: 'Amtrak',
      url: `https://www.amtrak.com/tickets/departure.html`,
      icon: '🚆', type: 'train', region: 'north_america',
    });
    links.push({
      label: 'VIA Rail (Canada)',
      url: `https://www.viarail.ca/en/book-train`,
      icon: '🍁', type: 'train', region: 'north_america',
    });
  }

  if (region === 'southeast_asia') {
    links.push({
      label: '12Go Asia',
      url: `https://12go.asia/en/travel/${enc(origin)}/${enc(destination)}`,
      icon: '🌏', type: 'train', region: 'southeast_asia',
    });
  }

  if (region === 'china') {
    links.push({
      label: 'Trip.com (CRH)',
      url: `https://www.trip.com/trains/`,
      icon: '🚄', type: 'train', region: 'china',
    });
    links.push({
      label: 'TrainPal',
      url: `https://www.trainpal.com/`,
      icon: '🔵', type: 'train', region: 'china',
    });
  }

  if (region === 'global') {
    links.push({
      label: 'Omio (Global Rail)',
      url: `https://www.omio.com/trains/${enc(origin)}/${enc(destination)}`,
      icon: '🌍', type: 'train', region: 'global',
    });
    links.push({
      label: 'Rome2Rio',
      url: `https://www.rome2rio.com/s/${enc(origin)}/${enc(destination)}`,
      icon: '🗺️', type: 'train', region: 'global',
    });
  }

  return links;
}

function getBusDeepLinks(origin: string, destination: string): DeepLink[] {
  const region = detectRegion(destination || origin);
  const enc = (s: string) => encodeURIComponent(s);
  const links: DeepLink[] = [];

  if (region === 'india') {
    links.push({
      label: 'redBus',
      url: `https://www.redbus.in/bus-tickets/${enc(origin)}-to-${enc(destination)}`,
      icon: '🔴', type: 'bus', region: 'india',
    });
    links.push({
      label: 'Zingbus',
      url: `https://zingbus.com/`,
      icon: '🟡', type: 'bus', region: 'india',
    });
    links.push({
      label: 'IntrCity SmartBus',
      url: `https://www.intracity.in/`,
      icon: '🟢', type: 'bus', region: 'india',
    });
  }

  if (region === 'europe' || region === 'north_america') {
    links.push({
      label: 'FlixBus',
      url: `https://global.flixbus.com/bus-routes/${enc(origin)}-${enc(destination)}`,
      icon: '🟢', type: 'bus', region: region,
    });
    links.push({
      label: 'Busbud',
      url: `https://www.busbud.com/en/bus/${enc(origin)}/${enc(destination)}`,
      icon: '🔵', type: 'bus', region: region,
    });
  }

  if (region === 'southeast_asia') {
    links.push({
      label: '12Go Asia',
      url: `https://12go.asia/en/travel/${enc(origin)}/${enc(destination)}`,
      icon: '🌏', type: 'bus', region: 'southeast_asia',
    });
    links.push({
      label: 'easybook.com',
      url: `https://www.easybook.com/en-my/bus/${enc(origin)}-to-${enc(destination)}`,
      icon: '🔵', type: 'bus', region: 'southeast_asia',
    });
  }

  if (region === 'north_america') {
    links.push({
      label: 'Greyhound',
      url: `https://www.greyhound.com/`,
      icon: '🐕', type: 'bus', region: 'north_america',
    });
  }

  if (region === 'latin_america') {
    links.push({
      label: 'Busbud (LatAm)',
      url: `https://www.busbud.com/en/bus/${enc(origin)}/${enc(destination)}`,
      icon: '🔵', type: 'bus', region: 'latin_america',
    });
    links.push({
      label: 'RedBus (LatAm)',
      url: `https://www.redbus.pe/`,
      icon: '🔴', type: 'bus', region: 'latin_america',
    });
  }

  if (region === 'africa') {
    links.push({
      label: 'Busbud',
      url: `https://www.busbud.com/en/bus/${enc(origin)}/${enc(destination)}`,
      icon: '🔵', type: 'bus', region: 'africa',
    });
  }

  // Global fallback always available
  links.push({
    label: 'Busbud (Global)',
    url: `https://www.busbud.com/en/bus/${enc(origin)}/${enc(destination)}`,
    icon: '🌍', type: 'bus', region: 'global',
  });

  return links;
}

// ─── Rome2Rio Route Discovery ─────────────────────────────────────────────────

interface Rome2RioSegment {
  name?: string;
  vehicle?: { kind?: string };
  transitInfo?: { name?: string; longName?: string };
}
interface Rome2RioRoute {
  name?: string;
  distance?: number;
  duration?: number;
  price?: { low?: number; high?: number; currency?: string };
  segments?: Rome2RioSegment[];
}
interface Rome2RioResponse {
  routes?: Rome2RioRoute[];
}

async function fetchRome2RioRoutes(origin: string, destination: string): Promise<Rome2RioRoute[]> {
  if (!ROME2RIO_KEY) return [];
  try {
    const url = `${ROME2RIO_BASE}/Search?key=${ROME2RIO_KEY}&oName=${encodeURIComponent(origin)}&dName=${encodeURIComponent(destination)}&languageCode=en&currencyCode=USD`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as Rome2RioResponse;
    return data.routes ?? [];
  } catch {
    return [];
  }
}

// ─── Amadeus Transfer Search ──────────────────────────────────────────────────

let _amadeusToken = '';
let _amadeusTokenExpiry = 0;

async function getAmadeusToken(): Promise<string> {
  if (!AMADEUS_KEY || !AMADEUS_SECRET) return '';
  if (_amadeusToken && Date.now() < _amadeusTokenExpiry) return _amadeusToken;
  try {
    const res = await fetch(AMADEUS_AUTH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${AMADEUS_KEY}&client_secret=${AMADEUS_SECRET}`,
    });
    if (!res.ok) return '';
    const data = await res.json() as { access_token?: string; expires_in?: number };
    _amadeusToken = data.access_token ?? '';
    _amadeusTokenExpiry = Date.now() + ((data.expires_in ?? 1800) - 60) * 1000;
    return _amadeusToken;
  } catch {
    return '';
  }
}

interface AmadeusOffer {
  transferType?: string; vehicle?: { code?: string; description?: string; seats?: { count?: number }[] };
  serviceProvider?: { name?: string; logoUrl?: string };
  quotation?: { monetaryAmount?: string; currencyCode?: string };
  estimated?: { totalAmount?: string };
  duration?: string;
}

async function fetchAmadeusTransfers(
  originLat: number, originLng: number,
  destLat: number, destLng: number,
  date: string, passengers: number
): Promise<AmadeusOffer[]> {
  const token = await getAmadeusToken();
  if (!token) return [];
  try {
    const body = {
      startLocationCode: `${originLat.toFixed(4)},${originLng.toFixed(4)}`,
      endAddressLine: '', endCityName: '', endZipCode: '',
      endCountryCode: 'XX', endName: 'Destination',
      endGeoCode: `${destLat.toFixed(4)},${destLng.toFixed(4)}`,
      transferType: 'PRIVATE',
      startDateTime: `${date}T10:00:00`,
      passengers,
      stopOvers: [], startConnectedSegment: undefined,
    };
    const res = await fetch(`${AMADEUS_BASE}/shopping/transfer-offers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return [];
    const data = await res.json() as { data?: AmadeusOffer[] };
    return data.data ?? [];
  } catch {
    return [];
  }
}

// ─── Distribusion Bus Search ──────────────────────────────────────────────────

interface DistribusionTrip {
  id?: string; operator_name?: string; departure_time?: string; arrival_time?: string;
  duration?: number; fare?: { amount?: number; currency?: string };
  origin_station?: { code?: string; name?: string };
  destination_station?: { code?: string; name?: string };
}

async function fetchDistribusionBuses(
  originCode: string, destCode: string, date: string, passengers: number
): Promise<DistribusionTrip[]> {
  if (!DISTRIBUSION_KEY) return [];
  try {
    const url = `${DISTRIBUSION_BASE}/connections?marketing_carrier_codes=FLIXBUS&origin_station_codes=${originCode}&destination_station_codes=${destCode}&departure_date=${date}&pax=${passengers}&locale=en&currency=EUR`;
    const res = await fetch(url, {
      headers: { 'Api-Key': DISTRIBUSION_KEY, 'Content-Type': 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json() as { data?: DistribusionTrip[] };
    return data.data ?? [];
  } catch {
    return [];
  }
}

// ─── Mock Fallback Data ───────────────────────────────────────────────────────

function mockCabItems(origin: string, destination: string, date: string, passengers: number): TransportItem[] {
  const region = detectRegion(destination || origin);
  const dist = Math.max(20, Math.floor(Math.random() * 300 + 50));

  const templates: Array<{ provider: string; model: string; cls: string; pricePerKm: number; currency: string }> = {
    india:         [
      { provider: 'Ola Prime Sedan', model: 'Maruti Suzuki Ciaz', cls: 'Prime Sedan', pricePerKm: 14, currency: 'INR' },
      { provider: 'Ola SUV', model: 'Toyota Innova Crysta', cls: 'SUV Premium', pricePerKm: 18, currency: 'INR' },
      { provider: 'Uber Go', model: 'Swift Dzire / Wagon R', cls: 'Economy', pricePerKm: 11, currency: 'INR' },
      { provider: 'Uber Premier', model: 'Honda City / Hyundai Verna', cls: 'Premier', pricePerKm: 16, currency: 'INR' },
    ],
    europe:        [
      { provider: 'Bolt Executive', model: 'Mercedes-Benz E-Class', cls: 'Executive', pricePerKm: 2.8, currency: 'EUR' },
      { provider: 'FREE NOW Business', model: 'BMW 5 Series', cls: 'Business', pricePerKm: 2.5, currency: 'EUR' },
      { provider: 'Uber Comfort', model: 'Volvo XC60', cls: 'Comfort', pricePerKm: 2.2, currency: 'EUR' },
    ],
    japan:         [
      { provider: 'Nihon Kotsu Taxi', model: 'Toyota Crown Comfort', cls: 'Standard Taxi', pricePerKm: 700, currency: 'JPY' },
      { provider: 'Uber Japan', model: 'Toyota Alphard', cls: 'Premium MPV', pricePerKm: 950, currency: 'JPY' },
    ],
    north_america: [
      { provider: 'Uber X', model: 'Toyota Prius', cls: 'Economy', pricePerKm: 1.4, currency: 'USD' },
      { provider: 'Lyft Plus', model: 'Chrysler Minivan', cls: 'Plus (Group)', pricePerKm: 1.8, currency: 'USD' },
      { provider: 'Uber Black', model: 'Cadillac Escalade', cls: 'Black SUV', pricePerKm: 3.2, currency: 'USD' },
    ],
    southeast_asia:[
      { provider: 'GrabCar Plus', model: 'Toyota Camry', cls: 'Premium', pricePerKm: 60, currency: 'THB' },
      { provider: 'Gojek GoCar', model: 'Toyota Avanza', cls: 'Standard', pricePerKm: 4000, currency: 'IDR' },
      { provider: 'Grab JustGrab', model: 'Perodua Myvi', cls: 'Standard', pricePerKm: 1.4, currency: 'SGD' },
    ],
    middle_east:   [
      { provider: 'Careem Business', model: 'Mercedes E-Class', cls: 'Business', pricePerKm: 4.5, currency: 'AED' },
      { provider: 'Uber Premium', model: 'BMW 7 Series', cls: 'Prestige', pricePerKm: 6.2, currency: 'AED' },
    ],
    china:         [
      { provider: 'DiDi Express', model: 'BYD Han', cls: 'Economy Electric', pricePerKm: 2.5, currency: 'CNY' },
      { provider: 'DiDi Premier', model: 'BMW 5 Series', cls: 'Premier', pricePerKm: 4.5, currency: 'CNY' },
    ],
    africa:        [
      { provider: 'Bolt Economy', model: 'Toyota Corolla', cls: 'Economy', pricePerKm: 15, currency: 'KES' },
      { provider: 'Uber X Africa', model: 'VW Polo', cls: 'Standard', pricePerKm: 8, currency: 'ZAR' },
    ],
    latin_america: [
      { provider: '99 Pop', model: 'VW Gol', cls: 'Economy', pricePerKm: 1.8, currency: 'BRL' },
      { provider: 'InDrive Premium', model: 'Chevrolet Spin', cls: 'Standard', pricePerKm: 2.4, currency: 'BRL' },
    ],
    oceania:       [
      { provider: 'Ola Comfort', model: 'Toyota Camry', cls: 'Comfort', pricePerKm: 1.9, currency: 'AUD' },
      { provider: 'Uber Comfort AU', model: 'Hyundai Tucson', cls: 'Comfort', pricePerKm: 2.1, currency: 'AUD' },
    ],
    global:        [
      { provider: 'Uber X', model: 'Standard Vehicle', cls: 'Economy', pricePerKm: 1.5, currency: 'USD' },
      { provider: 'Private Transfer', model: 'Executive Sedan', cls: 'Private', pricePerKm: 3, currency: 'USD' },
    ],
  }[region] ?? [
    { provider: 'Uber X', model: 'Standard Vehicle', cls: 'Economy', pricePerKm: 1.5, currency: 'USD' },
  ];

  return templates.map((t, i) => ({
    id: `cab-${region}-${i + 1}-${Date.now()}`,
    providerName: t.provider,
    transportType: 'private_transfer' as TransportType,
    originLocation: `${origin} Pickup Point`,
    destinationLocation: `${destination} Drop-off`,
    originCity: origin,
    destinationCity: destination,
    scheduledDeparture: `${date}T10:00:00Z`,
    scheduledArrival: `${date}T${String(10 + Math.round(dist / 50)).padStart(2, '0')}:30:00Z`,
    durationMinutes: Math.round((dist / 50) * 60),
    vehicleModel: t.model,
    vehicleClass: t.cls,
    maxPassengers: passengers <= 4 ? 4 : 7,
    baggageCapacity: 3,
    basePrice: Math.round(dist * t.pricePerKm),
    currency: t.currency,
    operatorRating: parseFloat((4.3 + Math.random() * 0.65).toFixed(1)),
    amenities: ['Air Conditioning', 'GPS Navigation', 'Luggage Assistance'],
    imageUrl: '/images/booking/car.jpg',
  }));
}

// ─── Main Public API ──────────────────────────────────────────────────────────

/**
 * Search for cabs near/to a destination.
 * Tries Amadeus Transfers → falls back to rich regional mock data.
 */
export async function searchGlobalCabs(
  origin: string,
  destination: string,
  date: string,
  passengers: number = 1,
  originLat?: number,
  originLng?: number,
  destLat?: number,
  destLng?: number,
): Promise<GlobalTransportResult> {
  const deepLinks = getCabDeepLinks(origin, destination);

  // Try Amadeus live transfer search
  if (AMADEUS_KEY && originLat && originLng && destLat && destLng) {
    const offers = await fetchAmadeusTransfers(originLat, originLng, destLat, destLng, date, passengers);
    if (offers.length > 0) {
      const items: TransportItem[] = offers.map((o, i) => ({
        id: `amadeus-cab-${i}`,
        providerName: o.serviceProvider?.name ?? 'Amadeus Transfer',
        transportType: 'private_transfer' as TransportType,
        originLocation: origin,
        destinationLocation: destination,
        originCity: origin,
        destinationCity: destination,
        scheduledDeparture: `${date}T10:00:00Z`,
        durationMinutes: o.duration ? parseInt(o.duration, 10) : 60,
        vehicleModel: o.vehicle?.description ?? 'Professional Vehicle',
        vehicleClass: o.transferType ?? 'Private Transfer',
        maxPassengers: o.vehicle?.seats?.[0]?.count ?? 4,
        baggageCapacity: 3,
        basePrice: parseFloat(o.quotation?.monetaryAmount ?? o.estimated?.totalAmount ?? '80'),
        currency: o.quotation?.currencyCode ?? 'USD',
        operatorRating: 4.7,
        amenities: ['Meet & Greet', 'Flight Tracking', 'Free Waiting Time'],
        imageUrl: '/images/booking/car.jpg',
      }));
      return { items, source: 'live', provider: 'Amadeus Transfers', deepLinks };
    }
  }

  // Fallback: regional mock data
  return {
    items: mockCabItems(origin, destination, date, passengers),
    source: 'mock',
    provider: 'Voyana Regional Estimates',
    deepLinks,
  };
}

/**
 * Search for trains between origin and destination.
 * Tries Rome2Rio → falls back to regional mock/data.
 */
export async function searchGlobalTrains(
  origin: string,
  destination: string,
  date: string,
  _passengers: number = 1,
): Promise<GlobalTransportResult> {
  const deepLinks = getTrainDeepLinks(origin, destination);

  // Try Rome2Rio
  if (ROME2RIO_KEY) {
    const routes = await fetchRome2RioRoutes(origin, destination);
    const trainRoutes = routes.filter(r =>
      r.segments?.some(s => s.vehicle?.kind === 'train' || (s.name ?? '').toLowerCase().includes('train'))
    );
    if (trainRoutes.length > 0) {
      const items: TransportItem[] = trainRoutes.map((r, i) => ({
        id: `r2r-train-${i}`,
        providerName: r.name ?? 'Rail Service',
        transportType: 'train' as TransportType,
        originLocation: `${origin} Station`,
        destinationLocation: `${destination} Station`,
        originCity: origin,
        destinationCity: destination,
        scheduledDeparture: `${date}T07:00:00Z`,
        durationMinutes: r.duration ?? 180,
        vehicleClass: 'Standard',
        maxPassengers: 200,
        baggageCapacity: 2,
        basePrice: r.price?.low ?? 50,
        currency: r.price?.currency ?? 'USD',
        operatorRating: 4.5,
        amenities: ['Reserved Seat', 'Luggage Storage'],
        imageUrl: '/images/booking/train.jpg',
      }));
      return { items, source: 'live', provider: 'Rome2Rio', deepLinks };
    }
  }

  // Fallback: regional mock (re-uses groundTransportService logic)
  const { getGroundTransportOptions } = await import('./groundTransportService');
  const { trains } = getGroundTransportOptions(origin, destination, date, _passengers);
  const items: TransportItem[] = trains.map(t => ({
    id: t.id,
    providerName: t.operator,
    transportType: 'train' as TransportType,
    originLocation: `${t.origin} Station`,
    destinationLocation: `${t.destination} Station`,
    originCity: t.origin,
    destinationCity: t.destination,
    scheduledDeparture: `${date}T${t.departureTime}:00Z`,
    durationMinutes: t.durationMinutes,
    vehicleClass: t.classType,
    maxPassengers: 200,
    baggageCapacity: 2,
    basePrice: t.price,
    currency: t.currency,
    operatorRating: 4.5,
    amenities: ['Reserved Seat', 'Air Conditioning'],
    imageUrl: '/images/booking/train.jpg',
  }));
  return { items, source: 'mock', provider: 'Voyana Rail Estimates', deepLinks };
}

/**
 * Search for buses between origin and destination.
 * Tries Distribusion → falls back to regional mock data.
 */
export async function searchGlobalBuses(
  origin: string,
  destination: string,
  date: string,
  passengers: number = 1,
): Promise<GlobalTransportResult> {
  const deepLinks = getBusDeepLinks(origin, destination);

  // Map city to Distribusion station code (extend as needed)
  const DISTRIBUSION_STATIONS: Record<string, string> = {
    paris: 'FRPAR', london: 'GBLON', berlin: 'DEBER', amsterdam: 'NLAMS',
    brussels: 'BEBRU', munich: 'DEMUC', frankfurt: 'DEFRA', hamburg: 'DEHAM',
    vienna: 'ATWIE', zurich: 'CHZRH', prague: 'CZPRG', warsaw: 'PLWAW',
    rome: 'ITROM', milan: 'ITMIL', barcelona: 'ESBCN', madrid: 'ESMAD',
  };

  const originCode = DISTRIBUSION_STATIONS[origin.toLowerCase()];
  const destCode   = DISTRIBUSION_STATIONS[destination.toLowerCase()];

  if (DISTRIBUSION_KEY && originCode && destCode) {
    const trips = await fetchDistribusionBuses(originCode, destCode, date, passengers);
    if (trips.length > 0) {
      const items: TransportItem[] = trips.map((t, i) => ({
        id: t.id ?? `dist-bus-${i}`,
        providerName: t.operator_name ?? 'FlixBus',
        transportType: 'bus' as TransportType,
        originLocation: `${origin} Bus Station`,
        destinationLocation: `${destination} Bus Station`,
        originCity: origin,
        destinationCity: destination,
        scheduledDeparture: t.departure_time ?? `${date}T08:00:00Z`,
        scheduledArrival: t.arrival_time,
        durationMinutes: t.duration ?? 240,
        vehicleClass: 'Standard Coach',
        maxPassengers: 48,
        baggageCapacity: 2,
        basePrice: t.fare?.amount ?? 25,
        currency: t.fare?.currency ?? 'EUR',
        operatorRating: 4.3,
        amenities: ['WiFi', 'Power Sockets', 'Air Conditioning', 'Toilet on Board'],
        imageUrl: '/images/booking/bus.jpg',
      }));
      return { items, source: 'live', provider: 'Distribusion / FlixBus', deepLinks };
    }
  }

  // Fallback: regional mock
  const { getGroundTransportOptions } = await import('./groundTransportService');
  const { buses } = getGroundTransportOptions(origin, destination, date, passengers);
  const items: TransportItem[] = buses.map(b => ({
    id: b.id,
    providerName: b.operator,
    transportType: 'bus' as TransportType,
    originLocation: `${b.origin} Bus Station`,
    destinationLocation: `${b.destination} Bus Station`,
    originCity: b.origin,
    destinationCity: b.destination,
    scheduledDeparture: `${date}T${b.departureTime}:00Z`,
    durationMinutes: b.durationMinutes,
    vehicleClass: b.classType,
    maxPassengers: 48,
    baggageCapacity: 2,
    basePrice: b.price,
    currency: b.currency,
    operatorRating: 4.2,
    amenities: ['WiFi', 'Air Conditioning', 'USB Charging'],
    imageUrl: '/images/booking/bus.jpg',
  }));
  return { items, source: 'mock', provider: 'Voyana Bus Estimates', deepLinks };
}

/**
 * Combined search: all transport modes from one call.
 */
export async function searchAllGlobalTransport(
  origin: string,
  destination: string,
  date: string,
  passengers: number = 1,
  originLat?: number, originLng?: number,
  destLat?: number, destLng?: number,
): Promise<{ cabs: GlobalTransportResult; trains: GlobalTransportResult; buses: GlobalTransportResult }> {
  const [cabs, trains, buses] = await Promise.all([
    searchGlobalCabs(origin, destination, date, passengers, originLat, originLng, destLat, destLng),
    searchGlobalTrains(origin, destination, date, passengers),
    searchGlobalBuses(origin, destination, date, passengers),
  ]);
  return { cabs, trains, buses };
}

/**
 * Get booking deep-links for a destination: all operators, all modes.
 */
export function getBookingLinks(origin: string, destination: string): {
  cabs: DeepLink[]; trains: DeepLink[]; buses: DeepLink[];
} {
  return {
    cabs:   getCabDeepLinks(origin, destination),
    trains: getTrainDeepLinks(origin, destination),
    buses:  getBusDeepLinks(origin, destination),
  };
}

