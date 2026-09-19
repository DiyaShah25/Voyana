/**
 * VPM-200: Flight Booking Service
 * Assignee: Bhavika Sainani (202512053) <bhavikasainani2608@gmail.com>
 * Provides global flight search, seat tier selection, pricing breakdown, and instant booking reservation.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createAlert } from './alertService';

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------
export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';
export type FlightStop = 'nonstop' | '1_stop' | 'any';

export interface Airport {
  code: string;   // IATA code e.g. CDG
  city: string;
  country: string;
  name: string;
}

export interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  airlineCode: string;
  airlineLogo?: string;
  originAirport: Airport;
  destinationAirport: Airport;
  departureTime: string; // ISO timestamp
  arrivalTime: string;   // ISO timestamp
  durationMinutes: number;
  stops: number;
  terminal?: string;
  gate?: string;
  prices: Record<CabinClass, number>;
  currency: string;
  seatsAvailable: Record<CabinClass, number>;
  aircraft: string;
}

export interface FlightSearchParams {
  originCode: string;
  destinationCode: string;
  departureDate: string; // YYYY-MM-DD
  passengers: number;
  cabinClass: CabinClass;
}

export interface PassengerDetails {
  fullName: string;
  passportNumber: string;
  dateOfBirth: string;
  nationality: string;
  seatPreference: 'window' | 'middle' | 'aisle' | 'no_preference';
  mealPreference: 'standard' | 'vegetarian' | 'vegan' | 'halal' | 'kosher';
  contactEmail: string;
  contactPhone: string;
}

export interface FlightBookingResult {
  success: boolean;
  bookingReference?: string;
  bookingId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Airport Catalog (matching Voyana Globe destinations)
// ---------------------------------------------------------------------------
export const AIRPORTS: Record<string, Airport> = {
  CDG: { code: 'CDG', city: 'Paris', country: 'France', name: 'Charles de Gaulle Airport' },
  HND: { code: 'HND', city: 'Tokyo', country: 'Japan', name: 'Haneda Airport' },
  NRT: { code: 'NRT', city: 'Tokyo', country: 'Japan', name: 'Narita International Airport' },
  DXB: { code: 'DXB', city: 'Dubai', country: 'UAE', name: 'Dubai International Airport' },
  JFK: { code: 'JFK', city: 'New York', country: 'USA', name: 'John F. Kennedy International Airport' },
  LGA: { code: 'LGA', city: 'New York', country: 'USA', name: 'LaGuardia Airport' },
  AMD: { code: 'AMD', city: 'Ahmedabad', country: 'India', name: 'Sardar Vallabhbhai Patel International Airport' },
  BOM: { code: 'BOM', city: 'Mumbai', country: 'India', name: 'Chhatrapati Shivaji Maharaj International Airport' },
  LHR: { code: 'LHR', city: 'London', country: 'UK', name: 'Heathrow Airport' },
  SYD: { code: 'SYD', city: 'Sydney', country: 'Australia', name: 'Sydney Kingsford Smith Airport' },
  SIN: { code: 'SIN', city: 'Singapore', country: 'Singapore', name: 'Changi Airport' },
  FCO: { code: 'FCO', city: 'Rome', country: 'Italy', name: "Leonardo da Vinci International Airport" },
  BKK: { code: 'BKK', city: 'Bangkok', country: 'Thailand', name: 'Suvarnabhumi Airport' },
  GIG: { code: 'GIG', city: 'Rio de Janeiro', country: 'Brazil', name: 'Galeão International Airport' },
  DEL: { code: 'DEL', city: 'New Delhi', country: 'India', name: 'Indira Gandhi International Airport' },
};

// City name to primary airport mapping
export const CITY_TO_AIRPORT: Record<string, string> = {
  'paris': 'CDG',
  'tokyo': 'HND',
  'dubai': 'DXB',
  'new york': 'JFK',
  'ahmedabad': 'AMD',
  'mumbai': 'BOM',
  'london': 'LHR',
  'sydney': 'SYD',
  'singapore': 'SIN',
  'rome': 'FCO',
  'bangkok': 'BKK',
  'rio de janeiro': 'GIG',
  'rio': 'GIG',
  'new delhi': 'DEL',
  'delhi': 'DEL',
};

// ---------------------------------------------------------------------------
// Mock Flight Generator
// ---------------------------------------------------------------------------
const AIRLINES = [
  { name: 'Air France', code: 'AF' },
  { name: 'Emirates', code: 'EK' },
  { name: 'British Airways', code: 'BA' },
  { name: 'Singapore Airlines', code: 'SQ' },
  { name: 'Qatar Airways', code: 'QR' },
  { name: 'Lufthansa', code: 'LH' },
  { name: 'IndiGo', code: '6E' },
  { name: 'Air India', code: 'AI' },
  { name: 'Delta Air Lines', code: 'DL' },
  { name: 'Japan Airlines', code: 'JL' },
  { name: 'Thai Airways', code: 'TG' },
  { name: 'Qantas', code: 'QF' },
];

const AIRCRAFT_TYPES = [
  'Boeing 787-9 Dreamliner',
  'Airbus A380-800',
  'Airbus A350-900',
  'Boeing 777-300ER',
  'Airbus A321neo',
  'Boeing 737 MAX 8',
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function addMinutes(isoDate: string, minutes: number): string {
  return new Date(new Date(isoDate).getTime() + minutes * 60000).toISOString();
}

function generateFlightPrice(
  baseEconomy: number,
  seed: number
): Record<CabinClass, number> {
  const variance = 0.85 + seededRandom(seed) * 0.3;
  const eco = Math.round(baseEconomy * variance);
  return {
    economy: eco,
    premium_economy: Math.round(eco * 1.65),
    business: Math.round(eco * 2.8),
    first: Math.round(eco * 4.5),
  };
}

export function generateMockFlights(params: FlightSearchParams): Flight[] {
  const { originCode, destinationCode, departureDate, passengers } = params;
  const origin = AIRPORTS[originCode];
  const destination = AIRPORTS[destinationCode];

  if (!origin || !destination) return [];

  // Estimate flight duration based on common distances
  const durationMap: Record<string, number> = {
    [`${originCode}-${destinationCode}`]: 0,
    'CDG-HND': 720, 'HND-CDG': 730, 'CDG-DXB': 375, 'DXB-CDG': 390,
    'CDG-JFK': 480, 'JFK-CDG': 435, 'CDG-AMD': 540, 'AMD-CDG': 555,
    'CDG-LHR': 80,  'LHR-CDG': 85,  'LHR-DXB': 420, 'DXB-LHR': 410,
    'LHR-HND': 720, 'HND-LHR': 730, 'LHR-JFK': 435, 'JFK-LHR': 420,
    'DXB-HND': 600, 'HND-DXB': 610, 'DXB-JFK': 870, 'JFK-DXB': 840,
    'DXB-AMD': 165, 'AMD-DXB': 170, 'DXB-SIN': 455, 'SIN-DXB': 460,
    'BOM-DXB': 195, 'DXB-BOM': 195, 'BOM-LHR': 570, 'LHR-BOM': 580,
    'BOM-SIN': 330, 'SIN-BOM': 335, 'SIN-SYD': 495, 'SYD-SIN': 510,
    'SIN-HND': 380, 'HND-SIN': 375, 'SIN-LHR': 780, 'LHR-SIN': 760,
    'JFK-SIN': 1110,'SIN-JFK': 1130,'BKK-SIN': 150, 'SIN-BKK': 155,
    'BKK-HND': 375, 'HND-BKK': 370, 'FCO-CDG': 120, 'CDG-FCO': 115,
    'GIG-JFK': 660, 'JFK-GIG': 680, 'AMD-BOM': 60,  'BOM-AMD': 65,
    'DEL-DXB': 225, 'DXB-DEL': 220, 'DEL-LHR': 510, 'LHR-DEL': 525,
  };

  const key = `${originCode}-${destinationCode}`;
  const baseDuration = durationMap[key] || 540;

  // Base economy price by rough distance
  const basePriceMap: Record<string, number> = {
    'CDG-HND': 780, 'HND-CDG': 760, 'CDG-DXB': 420, 'DXB-CDG': 410,
    'CDG-JFK': 560, 'JFK-CDG': 520, 'CDG-AMD': 650, 'AMD-CDG': 630,
    'LHR-DXB': 390, 'DXB-LHR': 380, 'LHR-HND': 820, 'HND-LHR': 800,
    'LHR-JFK': 480, 'JFK-LHR': 460, 'DXB-HND': 640, 'HND-DXB': 620,
    'DXB-AMD': 190, 'AMD-DXB': 185, 'DXB-SIN': 450, 'SIN-DXB': 440,
    'BOM-DXB': 220, 'DXB-BOM': 215, 'SIN-SYD': 480, 'SYD-SIN': 470,
    'SIN-HND': 420, 'HND-SIN': 400, 'JFK-SIN': 1100,'SIN-JFK': 1080,
    'BKK-SIN': 180, 'SIN-BKK': 175, 'FCO-CDG': 180, 'CDG-FCO': 175,
    'AMD-BOM': 90, 'BOM-AMD': 85, 'DEL-DXB': 250, 'DXB-DEL': 245,
  };

  const baseEconomy = (basePriceMap[key] || 450) * (passengers || 1);
  const depDate = new Date(departureDate);

  // Generate 4–6 flight options
  const count = 4 + Math.floor(seededRandom(depDate.getTime()) * 3);
  const flights: Flight[] = [];

  for (let i = 0; i < count; i++) {
    const seed = depDate.getTime() + i * 997 + originCode.charCodeAt(0);
    const airline = AIRLINES[Math.floor(seededRandom(seed) * AIRLINES.length)];
    const aircraft = AIRCRAFT_TYPES[Math.floor(seededRandom(seed + 1) * AIRCRAFT_TYPES.length)];

    // Departure hour spread across the day
    const depHour = 5 + Math.floor(seededRandom(seed + 2) * 17); // 05:00-22:00
    const depMin = [0, 15, 30, 45][Math.floor(seededRandom(seed + 3) * 4)];
    const durationVariance = Math.round((seededRandom(seed + 4) - 0.5) * 60);
    const duration = Math.max(60, baseDuration + durationVariance);

    const departureISO = new Date(
      depDate.getFullYear(), depDate.getMonth(), depDate.getDate(),
      depHour, depMin
    ).toISOString();

    const isNonstop = seededRandom(seed + 5) > 0.4; // 60% nonstop
    const stops = isNonstop ? 0 : 1;
    const totalDuration = isNonstop ? duration : duration + Math.round(seededRandom(seed + 6) * 90 + 60);

    const flightNum = `${airline.code}${Math.floor(seededRandom(seed + 7) * 8900 + 100)}`;

    flights.push({
      id: `fl-${key}-${i}-${depDate.getTime()}`,
      flightNumber: flightNum,
      airline: airline.name,
      airlineCode: airline.code,
      originAirport: origin,
      destinationAirport: destination,
      departureTime: departureISO,
      arrivalTime: addMinutes(departureISO, totalDuration),
      durationMinutes: totalDuration,
      stops,
      aircraft,
      prices: generateFlightPrice(baseEconomy, seed + 8),
      currency: 'USD',
      seatsAvailable: {
        economy: Math.floor(seededRandom(seed + 9) * 120 + 10),
        premium_economy: Math.floor(seededRandom(seed + 10) * 30 + 5),
        business: Math.floor(seededRandom(seed + 11) * 20 + 2),
        first: Math.floor(seededRandom(seed + 12) * 8 + 1),
      },
    });
  }

  // Sort by departure time
  return flights.sort((a, b) =>
    new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
  );
}

// ---------------------------------------------------------------------------
// Supabase Client
// ---------------------------------------------------------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

// ---------------------------------------------------------------------------
// Booking Reference Generator
// ---------------------------------------------------------------------------
function generateBookingReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'VYN-FL';
  for (let i = 0; i < 5; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

// ---------------------------------------------------------------------------
// Create Booking (Supabase or Mock)
// ---------------------------------------------------------------------------
export async function createFlightBooking(
  flight: Flight,
  passenger: PassengerDetails,
  cabinClass: CabinClass,
  passengers: number
): Promise<FlightBookingResult> {
  const totalAmount = flight.prices[cabinClass] * passengers;
  const bookingReference = generateBookingReference();

  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'User not authenticated.' };

      // Insert master booking
      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .insert([{
          user_id: user.id,
          booking_reference: bookingReference,
          booking_type: 'flight',
          status: 'pending',
          total_amount: totalAmount,
          currency: flight.currency,
          payment_status: 'unpaid',
          contact_email: passenger.contactEmail,
          contact_phone: passenger.contactPhone,
          metadata: { cabin_class: cabinClass, passengers },
        }])
        .select()
        .single();

      if (bErr || !booking) return { success: false, error: 'Failed to create booking.' };

      // Insert/find flight in catalog
      const { data: flightRow } = await supabase
        .from('flights')
        .upsert([{
          flight_number: flight.flightNumber,
          airline: flight.airline,
          airline_code: flight.airlineCode,
          origin_airport: flight.originAirport.code,
          destination_airport: flight.destinationAirport.code,
          origin_city: flight.originAirport.city,
          destination_city: flight.destinationAirport.city,
          departure_time: flight.departureTime,
          arrival_time: flight.arrivalTime,
          duration_minutes: flight.durationMinutes,
          base_price: flight.prices.economy,
        }], { onConflict: 'flight_number' })
        .select()
        .single();

      if (flightRow) {
        await supabase.from('flight_bookings').insert([{
          booking_id: booking.id,
          flight_id: flightRow.id,
          passenger_name: passenger.fullName,
          passport_number: passenger.passportNumber,
          cabin_class: cabinClass,
          baggage_allowance_kg: cabinClass === 'economy' ? 23 : cabinClass === 'premium_economy' ? 32 : 50,
        }]);
      }

      // Mark as confirmed
      await supabase
        .from('bookings')
        .update({ status: 'confirmed', payment_status: 'paid' })
        .eq('id', booking.id);

      return { success: true, bookingReference, bookingId: booking.id };
    } catch (err) {
      console.error('Supabase booking error:', err);
      return { success: false, error: 'An unexpected error occurred.' };
    }
  }

  // Preview / Offline mode
  await new Promise(r => setTimeout(r, 1200)); // Simulate network latency

  const fakeId = `bk-${Date.now()}`;

  // Trigger alert pipeline in preview mode
  await createAlert({
    user_id: 'usr-demo-01',
    booking_id: fakeId,
    booking_reference: bookingReference,
    booking_type: 'flight',
    title: 'Flight Booking Confirmed',
    message: `${flight.airline} ${flight.flightNumber} (${flight.originAirport.code} → ${flight.destinationAirport.code}) has been confirmed for ${passenger.fullName}. Enjoy your journey!`,
    severity: 'success',
    old_status: 'pending',
    new_status: 'confirmed',
  });

  return { success: true, bookingReference, bookingId: fakeId };
}

// ---------------------------------------------------------------------------
// Formatting Helpers
// ---------------------------------------------------------------------------
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function getCabinLabel(cabin: CabinClass): string {
  return {
    economy: 'Economy',
    premium_economy: 'Premium Economy',
    business: 'Business',
    first: 'First Class',
  }[cabin];
}

export function resolveAirportCode(cityName: string): string | null {
  const key = cityName.toLowerCase().trim();
  return CITY_TO_AIRPORT[key] || null;
}
