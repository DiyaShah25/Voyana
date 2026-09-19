/**
 * VPM-202: Transport Booking Service
 * Assignee: Megha Lalwani (202512054) <lalwani2406@gmail.com>
 * Provides transport search (trains, rental cars, buses, private transfers, ferries),
 * seat/class booking reservations, and real-time status management.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createAlert } from './alertService';

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------
export type TransportType = 'train' | 'car_rental' | 'bus' | 'private_transfer' | 'ferry';
export type TransportModeFilter = 'all' | 'train' | 'car' | 'car_rental' | 'bus' | 'private_transfer' | 'ferry';
export type TransportBookingStatus = 'pending' | 'confirmed' | 'delayed' | 'cancelled' | 'completed';

export interface TransportItem {
  id: string;
  providerName: string;
  transportType: TransportType;
  originLocation: string;
  destinationLocation: string;
  originCity: string;
  destinationCity: string;
  scheduledDeparture: string; // ISO timestamp
  scheduledArrival?: string;   // ISO timestamp
  durationMinutes: number;
  vehicleModel?: string;
  vehicleClass: string;
  maxPassengers: number;
  baggageCapacity: number;
  basePrice: number;
  currency: string;
  operatorRating: number;
  amenities: string[];
  imageUrl?: string;
}

export interface TransportSearchParams {
  origin?: string;
  destination?: string;
  date?: string; // YYYY-MM-DD
  mode?: TransportModeFilter;
  passengers?: number;
}

export interface TransportBookingDetails {
  passengerName: string;
  contactEmail: string;
  contactPhone: string;
  passengerCount: number;
  pickupNotes?: string;
  dropoffNotes?: string;
  driverNotes?: string;
}

export interface TransportBookingRecord {
  id: string;
  bookingReference: string;
  transport: TransportItem;
  details: TransportBookingDetails;
  status: TransportBookingStatus;
  totalAmount: number;
  currency: string;
  createdAt: string;
}

export interface TransportBookingResult {
  success: boolean;
  bookingReference?: string;
  bookingId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Supabase Client Setup (Matching flightService & hotelService)
// ---------------------------------------------------------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch {
    supabase = null;
  }
}

// ---------------------------------------------------------------------------
// Seeded Mock Transport Catalog
// ---------------------------------------------------------------------------
export const SEED_TRANSPORTS: TransportItem[] = [
  // Paris
  {
    id: 'trp-par-01',
    providerName: 'Eurostar International',
    transportType: 'train',
    originLocation: 'Paris Gare du Nord',
    destinationLocation: 'London St Pancras International',
    originCity: 'Paris',
    destinationCity: 'London',
    scheduledDeparture: '2026-10-05T08:12:00Z',
    scheduledArrival: '2026-10-05T10:30:00Z',
    durationMinutes: 138,
    vehicleModel: 'e320 High-Speed Rail',
    vehicleClass: 'Standard Premier',
    maxPassengers: 200,
    baggageCapacity: 2,
    basePrice: 145,
    currency: 'USD',
    operatorRating: 4.9,
    amenities: ['High-Speed WiFi', 'Power Sockets', 'At-Seat Meal Service', 'Generous Luggage'],
    imageUrl: 'https://images.pexels.com/photos/163016/railroad-train-tracks-locomotive-163016.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 'trp-par-02',
    providerName: 'Paris Executive Chauffeur',
    transportType: 'private_transfer',
    originLocation: 'Charles de Gaulle Airport (CDG)',
    destinationLocation: 'Eiffel Tower / Central Paris',
    originCity: 'Paris',
    destinationCity: 'Paris',
    scheduledDeparture: '2026-10-05T09:30:00Z',
    scheduledArrival: '2026-10-05T10:15:00Z',
    durationMinutes: 45,
    vehicleModel: 'Mercedes-Benz E-Class Sedan',
    vehicleClass: 'Executive Luxury',
    maxPassengers: 3,
    baggageCapacity: 3,
    basePrice: 95,
    currency: 'USD',
    operatorRating: 4.95,
    amenities: ['Flight Tracking', 'Meet & Greet with Name Sign', 'Bottled Mineral Water', 'Free 60m Wait Time'],
    imageUrl: 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 'trp-par-03',
    providerName: 'Sixt France Luxury Fleet',
    transportType: 'car_rental',
    originLocation: 'Paris Gare de Lyon Station',
    destinationLocation: 'Paris Gare de Lyon Dropoff',
    originCity: 'Paris',
    destinationCity: 'Paris',
    scheduledDeparture: '2026-10-05T10:00:00Z',
    scheduledArrival: '2026-10-06T10:00:00Z',
    durationMinutes: 1440,
    vehicleModel: 'BMW 4 Series Gran Coupé',
    vehicleClass: 'Premium Coupe',
    maxPassengers: 4,
    baggageCapacity: 3,
    basePrice: 120,
    currency: 'USD',
    operatorRating: 4.8,
    amenities: ['Unlimited Mileage', 'GPS Navigation Included', 'Collision Damage Waiver', 'Full-to-Full Fuel'],
    imageUrl: 'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  // Tokyo
  {
    id: 'trp-tyo-01',
    providerName: 'JR Central Shinkansen',
    transportType: 'train',
    originLocation: 'Tokyo Station',
    destinationLocation: 'Kyoto Station',
    originCity: 'Tokyo',
    destinationCity: 'Kyoto',
    scheduledDeparture: '2026-10-05T07:30:00Z',
    scheduledArrival: '2026-10-05T09:45:00Z',
    durationMinutes: 135,
    vehicleModel: 'N700S Series Bullet Train',
    vehicleClass: 'Green Car (First Class)',
    maxPassengers: 150,
    baggageCapacity: 2,
    basePrice: 160,
    currency: 'USD',
    operatorRating: 4.98,
    amenities: ['Ultra-Smooth 285 km/h Ride', 'Quiet Car Experience', 'Reclining Footrest', 'Bento Box Cart'],
    imageUrl: 'https://images.pexels.com/photos/208745/pexels-photo-208745.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 'trp-tyo-02',
    providerName: "Narita Express (N'EX)",
    transportType: 'train',
    originLocation: 'Narita International Airport (NRT)',
    destinationLocation: 'Shinjuku / Shibuya Station',
    originCity: 'Tokyo',
    destinationCity: 'Tokyo',
    scheduledDeparture: '2026-10-05T06:30:00Z',
    scheduledArrival: '2026-10-05T07:25:00Z',
    durationMinutes: 55,
    vehicleModel: 'E259 Series Express',
    vehicleClass: 'Reserved Standard',
    maxPassengers: 180,
    baggageCapacity: 2,
    basePrice: 32,
    currency: 'USD',
    operatorRating: 4.85,
    amenities: ['Luggage Lockers with PIN', 'Direct City Center Line', 'Free WiFi', 'Multi-Language Display'],
    imageUrl: 'https://images.pexels.com/photos/7245258/pexels-photo-7245258.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 'trp-tyo-03',
    providerName: 'Tokyo VIP Limousine',
    transportType: 'private_transfer',
    originLocation: 'Haneda Airport (HND)',
    destinationLocation: 'Shibuya Crossing / Minato City',
    originCity: 'Tokyo',
    destinationCity: 'Tokyo',
    scheduledDeparture: '2026-10-05T11:00:00Z',
    scheduledArrival: '2026-10-05T11:35:00Z',
    durationMinutes: 35,
    vehicleModel: 'Toyota Alphard Executive Lounge',
    vehicleClass: 'VIP Van / MPV',
    maxPassengers: 5,
    baggageCapacity: 5,
    basePrice: 110,
    currency: 'USD',
    operatorRating: 4.96,
    amenities: ['Captain Reclining Seats', 'Privacy Curtains', 'USB High-Speed Ports', 'Complimentary Drinks'],
    imageUrl: 'https://images.pexels.com/photos/112460/pexels-photo-112460.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  // Dubai
  {
    id: 'trp-dxb-01',
    providerName: 'Royal Emirates Limousine',
    transportType: 'private_transfer',
    originLocation: 'Dubai International Airport (DXB)',
    destinationLocation: 'Burj Khalifa / Downtown Dubai',
    originCity: 'Dubai',
    destinationCity: 'Dubai',
    scheduledDeparture: '2026-10-05T11:00:00Z',
    scheduledArrival: '2026-10-05T11:30:00Z',
    durationMinutes: 30,
    vehicleModel: 'Cadillac Escalade Platinum',
    vehicleClass: 'VIP Luxury SUV',
    maxPassengers: 5,
    baggageCapacity: 5,
    basePrice: 85,
    currency: 'USD',
    operatorRating: 4.96,
    amenities: ['Uniformed Chauffeur', 'Flight Delay Protection', 'Chilled Towels & Refreshments', 'Child Seat Available'],
    imageUrl: 'https://images.pexels.com/photos/337909/pexels-photo-337909.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 'trp-dxb-02',
    providerName: 'Arabian Adventures Coach',
    transportType: 'bus',
    originLocation: 'Dubai Marina Mall',
    destinationLocation: 'Al Marmoom Desert Reserve',
    originCity: 'Dubai',
    destinationCity: 'Dubai Desert',
    scheduledDeparture: '2026-10-05T15:00:00Z',
    scheduledArrival: '2026-10-05T16:00:00Z',
    durationMinutes: 60,
    vehicleModel: 'Mercedes Sprinter VIP Coach',
    vehicleClass: 'Panoramic Tourism',
    maxPassengers: 16,
    baggageCapacity: 16,
    basePrice: 40,
    currency: 'USD',
    operatorRating: 4.88,
    amenities: ['Air Conditioned Coach', 'English-Speaking Guide', 'Dune Tour Transfer', 'Sunset Photo Stop'],
    imageUrl: 'https://images.pexels.com/photos/681335/pexels-photo-681335.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 'trp-dxb-03',
    providerName: 'Hertz UAE Luxury',
    transportType: 'car_rental',
    originLocation: 'Dubai International Airport (DXB)',
    destinationLocation: 'Dubai International Airport (DXB)',
    originCity: 'Dubai',
    destinationCity: 'Dubai',
    scheduledDeparture: '2026-10-05T12:00:00Z',
    scheduledArrival: '2026-10-06T12:00:00Z',
    durationMinutes: 1440,
    vehicleModel: 'Porsche Macan GTS',
    vehicleClass: 'Luxury Sports SUV',
    maxPassengers: 5,
    baggageCapacity: 4,
    basePrice: 190,
    currency: 'USD',
    operatorRating: 4.92,
    amenities: ['Salik Toll Tag Included', 'Apple CarPlay & Android Auto', 'Comprehensive Insurance', '24/7 Roadside Assistance'],
    imageUrl: 'https://images.pexels.com/photos/1592384/pexels-photo-1592384.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  // New York
  {
    id: 'trp-nyc-01',
    providerName: 'NYC Airporter Express',
    transportType: 'private_transfer',
    originLocation: 'John F. Kennedy Airport (JFK)',
    destinationLocation: 'Times Square / Midtown Manhattan',
    originCity: 'New York',
    destinationCity: 'New York',
    scheduledDeparture: '2026-10-05T14:00:00Z',
    scheduledArrival: '2026-10-05T15:00:00Z',
    durationMinutes: 60,
    vehicleModel: 'Chevrolet Suburban Luxury SUV',
    vehicleClass: 'Black Car Service',
    maxPassengers: 4,
    baggageCapacity: 4,
    basePrice: 90,
    currency: 'USD',
    operatorRating: 4.82,
    amenities: ['Toll & Tip Included', 'Realtime Curbside Pickup', 'Phone Chargers', 'Spacious Cargo Space'],
    imageUrl: 'https://images.pexels.com/photos/290386/pexels-photo-290386.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 'trp-nyc-02',
    providerName: 'Amtrak Acela Express',
    transportType: 'train',
    originLocation: 'New York Penn Station / Moynihan Train Hall',
    destinationLocation: 'Washington Union Station',
    originCity: 'New York',
    destinationCity: 'Washington DC',
    scheduledDeparture: '2026-10-05T09:00:00Z',
    scheduledArrival: '2026-10-05T11:55:00Z',
    durationMinutes: 175,
    vehicleModel: 'Acela High-Speed Trainset',
    vehicleClass: 'Business Class',
    maxPassengers: 250,
    baggageCapacity: 2,
    basePrice: 130,
    currency: 'USD',
    operatorRating: 4.87,
    amenities: ['Complimentary High-Speed WiFi', 'Quiet Car Available', 'Café Car Service', 'Wide Reclining Seats'],
    imageUrl: 'https://images.pexels.com/photos/176837/pexels-photo-176837.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  // Ahmedabad & India
  {
    id: 'trp-amd-01',
    providerName: 'Indian Railways IRCTC',
    transportType: 'train',
    originLocation: 'Ahmedabad Junction (ADI)',
    destinationLocation: 'Mumbai Central (MMCT)',
    originCity: 'Ahmedabad',
    destinationCity: 'Mumbai',
    scheduledDeparture: '2026-10-05T06:10:00Z',
    scheduledArrival: '2026-10-05T11:35:00Z',
    durationMinutes: 325,
    vehicleModel: 'Vande Bharat 2.0 Semi-High Speed',
    vehicleClass: 'Executive AC Chair Car',
    maxPassengers: 120,
    baggageCapacity: 2,
    basePrice: 30,
    currency: 'USD',
    operatorRating: 4.86,
    amenities: ['160 km/h Semi High Speed', 'Hot Gourmet Meals Included', 'Rotatable Seats', 'Bio-Vacuum Toilets'],
    imageUrl: 'https://images.pexels.com/photos/103123/pexels-photo-103123.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 'trp-amd-02',
    providerName: 'Gujarat Heritage Cab & Transfers',
    transportType: 'private_transfer',
    originLocation: 'Sardar Vallabhbhai Patel Airport (AMD)',
    destinationLocation: 'Sabarmati Ashram / City Center',
    originCity: 'Ahmedabad',
    destinationCity: 'Ahmedabad',
    scheduledDeparture: '2026-10-05T10:00:00Z',
    scheduledArrival: '2026-10-05T10:35:00Z',
    durationMinutes: 35,
    vehicleModel: 'Toyota Innova Crysta',
    vehicleClass: 'AC Premium Sedan/SUV',
    maxPassengers: 5,
    baggageCapacity: 4,
    basePrice: 22,
    currency: 'USD',
    operatorRating: 4.9,
    amenities: ['Clean Sanitized Cabin', 'Luggage Helper', 'Local Sightseeing Advice', 'Prepaid Confirmed Fare'],
    imageUrl: 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 'trp-amd-03',
    providerName: 'Zoomcar Self-Drive Fleet',
    transportType: 'car_rental',
    originLocation: 'Ahmedabad Airport Pickup Hub',
    destinationLocation: 'Ahmedabad Airport Dropoff',
    originCity: 'Ahmedabad',
    destinationCity: 'Ahmedabad',
    scheduledDeparture: '2026-10-05T09:00:00Z',
    scheduledArrival: '2026-10-06T09:00:00Z',
    durationMinutes: 1440,
    vehicleModel: 'Hyundai Creta Automatic',
    vehicleClass: 'Compact SUV',
    maxPassengers: 5,
    baggageCapacity: 3,
    basePrice: 45,
    currency: 'USD',
    operatorRating: 4.78,
    amenities: ['Keyless App Entry', 'Fastag Toll Enabled', 'Zero Security Deposit', '24/7 Support'],
    imageUrl: 'https://images.pexels.com/photos/1149137/pexels-photo-1149137.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
];

// ---------------------------------------------------------------------------
// Helpers & Formatters
// ---------------------------------------------------------------------------
export function getTransportTypeLabel(type: TransportType): string {
  switch (type) {
    case 'train': return 'High-Speed Train';
    case 'car_rental': return 'Car Rental';
    case 'private_transfer': return 'Private Transfer';
    case 'bus': return 'Coach / Shuttle';
    case 'ferry': return 'Ferry & Cruise';
    default: return 'Transport';
  }
}

export function getTransportIcon(type: TransportType): string {
  switch (type) {
    case 'train': return '🚆';
    case 'car_rental': return '🚗';
    case 'private_transfer': return '🚘';
    case 'bus': return '🚌';
    case 'ferry': return '⛴️';
    default: return '🚖';
  }
}

export function formatTransportDuration(minutes: number): string {
  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440);
    return `${days} ${days === 1 ? 'Day' : 'Days'} Rental`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function getTransportById(id: string): TransportItem | undefined {
  return SEED_TRANSPORTS.find((item) => item.id === id);
}

// ---------------------------------------------------------------------------
// Core Search Function (VPM-213)
// ---------------------------------------------------------------------------
export async function searchTransport(
  origin?: string,
  destination?: string,
  date?: string,
  mode?: TransportModeFilter
): Promise<TransportItem[]> {
  const normalizedMode: TransportModeFilter =
    mode === 'car' ? 'car_rental' : (mode || 'all');

  // 1. Try Supabase query if available
  if (supabase) {
    try {
      let query = supabase.from('transport').select('*');

      if (origin && origin.trim()) {
        const o = origin.trim().toLowerCase();
        query = query.or(`origin_city.ilike.%${o}%,origin_location.ilike.%${o}%`);
      }

      if (destination && destination.trim()) {
        const d = destination.trim().toLowerCase();
        query = query.or(`destination_city.ilike.%${d}%,destination_location.ilike.%${d}%`);
      }

      if (normalizedMode !== 'all') {
        query = query.eq('transport_type', normalizedMode);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          providerName: row.provider_name,
          transportType: row.transport_type,
          originLocation: row.origin_location,
          destinationLocation: row.destination_location,
          originCity: row.origin_city || origin || 'Global Hub',
          destinationCity: row.destination_city || destination || 'Global Hub',
          scheduledDeparture: row.scheduled_departure,
          scheduledArrival: row.scheduled_arrival,
          durationMinutes: row.duration_minutes || 60,
          vehicleModel: row.vehicle_model,
          vehicleClass: row.vehicle_class || 'Standard',
          maxPassengers: row.max_passengers || 4,
          baggageCapacity: row.baggage_capacity || 2,
          basePrice: Number(row.base_price),
          currency: row.currency || 'USD',
          operatorRating: Number(row.operator_rating || 4.8),
          amenities: row.amenities || ['Air Conditioning', 'Luggage Assistance'],
          imageUrl: row.image_url,
        }));
      }
    } catch {
      // Fallback to offline catalog
    }
  }

  // 2. Offline / Mock filtering
  let results = [...SEED_TRANSPORTS];

  if (origin && origin.trim()) {
    const o = origin.trim().toLowerCase();
    results = results.filter(
      (item) =>
        item.originCity.toLowerCase().includes(o) ||
        item.originLocation.toLowerCase().includes(o) ||
        item.destinationCity.toLowerCase().includes(o) ||
        item.destinationLocation.toLowerCase().includes(o)
    );
  }

  if (destination && destination.trim()) {
    const d = destination.trim().toLowerCase();
    const destMatches = results.filter(
      (item) =>
        item.destinationCity.toLowerCase().includes(d) ||
        item.destinationLocation.toLowerCase().includes(d)
    );
    if (destMatches.length > 0) {
      results = destMatches;
    }
  }

  if (normalizedMode !== 'all') {
    results = results.filter((item) => item.transportType === normalizedMode);
  }

  // Dynamic fallback for queries without predefined fixtures
  if (results.length === 0 && (origin || destination)) {
    const city = origin || destination || 'Destination';
    results = [
      {
        id: `dyn-trp-${Date.now()}-1`,
        providerName: `${city} Executive Express`,
        transportType: normalizedMode !== 'all' ? (normalizedMode as TransportType) : 'private_transfer',
        originLocation: `${city} Airport / Center`,
        destinationLocation: destination || `${city} Downtown`,
        originCity: origin || city,
        destinationCity: destination || city,
        scheduledDeparture: date ? `${date}T09:00:00Z` : new Date(Date.now() + 86400000).toISOString(),
        scheduledArrival: date ? `${date}T10:00:00Z` : new Date(Date.now() + 90000000).toISOString(),
        durationMinutes: 60,
        vehicleModel: 'Luxury Chauffeur Sedan / SUV',
        vehicleClass: 'Executive Premium',
        maxPassengers: 4,
        baggageCapacity: 3,
        basePrice: 75,
        currency: 'USD',
        operatorRating: 4.9,
        amenities: ['Door-to-Door Service', 'Complimentary WiFi', 'Chilled Refreshments', 'Professional Driver'],
        imageUrl: 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=800',
      },
      {
        id: `dyn-trp-${Date.now()}-2`,
        providerName: `${city} Intercity Rail`,
        transportType: 'train',
        originLocation: `${city} Central Railway Station`,
        destinationLocation: destination ? `${destination} Central Station` : `${city} Regional Terminal`,
        originCity: origin || city,
        destinationCity: destination || city,
        scheduledDeparture: date ? `${date}T10:30:00Z` : new Date(Date.now() + 93600000).toISOString(),
        scheduledArrival: date ? `${date}T12:45:00Z` : new Date(Date.now() + 101700000).toISOString(),
        durationMinutes: 135,
        vehicleModel: 'High-Speed Express Train',
        vehicleClass: 'First Class Reserved',
        maxPassengers: 200,
        baggageCapacity: 2,
        basePrice: 55,
        currency: 'USD',
        operatorRating: 4.84,
        amenities: ['Panoramic Windows', 'At-Seat Power', 'Free WiFi', 'Buffet Dining Car'],
        imageUrl: 'https://images.pexels.com/photos/163016/railroad-train-tracks-locomotive-163016.jpeg?auto=compress&cs=tinysrgb&w=800',
      },
      {
        id: `dyn-trp-${Date.now()}-3`,
        providerName: `${city} Self-Drive Car Rental`,
        transportType: 'car_rental',
        originLocation: `${city} Hub Terminal`,
        destinationLocation: `${city} Hub Terminal Dropoff`,
        originCity: origin || city,
        destinationCity: destination || city,
        scheduledDeparture: date ? `${date}T08:00:00Z` : new Date(Date.now() + 86400000).toISOString(),
        scheduledArrival: date ? `${date}T20:00:00Z` : new Date(Date.now() + 129600000).toISOString(),
        durationMinutes: 1440,
        vehicleModel: 'Audi A4 Allroad / SUV',
        vehicleClass: 'All-Terrain Luxury',
        maxPassengers: 5,
        baggageCapacity: 4,
        basePrice: 95,
        currency: 'USD',
        operatorRating: 4.88,
        amenities: ['Unlimited Mileage', 'Full Comprehensive Coverage', 'GPS Nav System', '24/7 Road Support'],
        imageUrl: 'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800',
      },
    ];

    if (normalizedMode !== 'all') {
      results = results.filter((item) => item.transportType === normalizedMode);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Booking Function (VPM-215 / Manage Transport Booking)
// Pattern matching createFlightBooking and bookHotel exactly
// ---------------------------------------------------------------------------
export async function bookTransport(
  transportOrId: TransportItem | string,
  details: TransportBookingDetails,
  userId?: string
): Promise<TransportBookingResult> {
  const transport: TransportItem =
    typeof transportOrId === 'string'
      ? getTransportById(transportOrId) || {
          id: transportOrId,
          providerName: 'Voyana Ground Express',
          transportType: 'private_transfer',
          originLocation: 'Pickup Terminal',
          destinationLocation: 'Dropoff Destination',
          originCity: 'Global Hub',
          destinationCity: 'Global Hub',
          scheduledDeparture: new Date().toISOString(),
          durationMinutes: 60,
          vehicleClass: 'Standard',
          maxPassengers: 4,
          baggageCapacity: 2,
          basePrice: 50,
          currency: 'USD',
          operatorRating: 4.8,
          amenities: ['Air Conditioning'],
        }
      : transportOrId;

  const bookingReference = `VYN-TRP-${Math.floor(100000 + Math.random() * 900000)}`;
  const passengerCount = Math.max(1, details.passengerCount || 1);
  const totalAmount =
    transport.transportType === 'train' || transport.transportType === 'bus'
      ? transport.basePrice * passengerCount
      : transport.basePrice;

  // 1. Supabase real execution path
  if (supabase) {
    try {
      // Step 1: Insert into bookings with status 'pending'
      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .insert([{
          user_id: userId || 'usr-demo-01',
          booking_reference: bookingReference,
          booking_type: 'transport',
          status: 'pending',
          total_amount: totalAmount,
          currency: transport.currency || 'USD',
          payment_status: 'unpaid',
          contact_email: details.contactEmail,
          contact_phone: details.contactPhone,
          special_requests: details.pickupNotes || details.driverNotes || null,
          metadata: {
            transport_type: transport.transportType,
            provider_name: transport.providerName,
            origin_location: transport.originLocation,
            destination_location: transport.destinationLocation,
            passenger_count: passengerCount,
            vehicle_model: transport.vehicleModel || null,
          },
        }])
        .select()
        .single();

      if (bErr || !booking) {
        console.error('Supabase transport booking error:', bErr);
        return { success: false, error: 'Failed to create transport booking.' };
      }

      // Step 2: Ensure transport catalog record exists
      let targetTransportId = transport.id;
      if (!transport.id.includes('-') || transport.id.length !== 36) {
        const { data: trpRow } = await supabase
          .from('transport')
          .upsert([{
            provider_name: transport.providerName,
            transport_type: transport.transportType,
            origin_location: transport.originLocation,
            destination_location: transport.destinationLocation,
            origin_city: transport.originCity,
            destination_city: transport.destinationCity,
            scheduled_departure: transport.scheduledDeparture,
            scheduled_arrival: transport.scheduledArrival || null,
            duration_minutes: transport.durationMinutes,
            vehicle_model: transport.vehicleModel || null,
            vehicle_class: transport.vehicleClass,
            max_passengers: transport.maxPassengers,
            baggage_capacity: transport.baggageCapacity,
            base_price: transport.basePrice,
            currency: transport.currency || 'USD',
            operator_rating: transport.operatorRating,
          }])
          .select()
          .single();

        if (trpRow) {
          targetTransportId = trpRow.id;
        }
      }

      // Step 3: Insert transport_bookings item
      const { error: tbErr } = await supabase
        .from('transport_bookings')
        .insert([{
          booking_id: booking.id,
          transport_id: targetTransportId.length === 36 ? targetTransportId : null,
          passenger_count: passengerCount,
          pickup_notes: details.pickupNotes || null,
          dropoff_notes: details.dropoffNotes || null,
        }]);

      if (tbErr) {
        console.error('Transport booking item error:', tbErr);
      }

      // Step 4: Confirm booking & payment
      await supabase
        .from('bookings')
        .update({ status: 'confirmed', payment_status: 'paid' })
        .eq('id', booking.id);

      // Trigger alert pipeline (same as flightService & hotelService)
      await createAlert({
        user_id: userId || 'usr-demo-01',
        booking_id: booking.id,
        booking_reference: bookingReference,
        booking_type: 'transport',
        title: 'Transport Booking Confirmed',
        message: `Your ${getTransportTypeLabel(transport.transportType)} reservation (${transport.providerName}) from ${transport.originLocation} to ${transport.destinationLocation} has been confirmed for ${details.passengerName}. Total: $${totalAmount}.`,
        severity: 'success',
        old_status: 'pending',
        new_status: 'confirmed',
      });

      return {
        success: true,
        bookingReference,
        bookingId: booking.id,
      };
    } catch (err) {
      console.error('Supabase transport booking catch error:', err);
      return { success: false, error: 'An unexpected error occurred during transport booking.' };
    }
  }

  // 2. Preview / Offline Mode
  await new Promise((r) => setTimeout(r, 1200)); // Simulate network latency

  const fakeId = `bk-trp-${Date.now()}`;

  // Trigger alert pipeline in preview mode
  await createAlert({
    user_id: userId || 'usr-demo-01',
    booking_id: fakeId,
    booking_reference: bookingReference,
    booking_type: 'transport',
    title: 'Transport Booking Confirmed',
    message: `Your ${getTransportTypeLabel(transport.transportType)} reservation (${transport.providerName}) from ${transport.originLocation} to ${transport.destinationLocation} has been confirmed for ${details.passengerName}. Total: $${totalAmount}.`,
    severity: 'success',
    old_status: 'pending',
    new_status: 'confirmed',
  });

  return {
    success: true,
    bookingReference,
    bookingId: fakeId,
  };
}

// ---------------------------------------------------------------------------
// Cancel Transport Booking Function (VPM-215 / Manage Transport Booking)
// ---------------------------------------------------------------------------
export async function cancelTransportBooking(
  bookingId: string,
  reason: string = 'User requested cancellation',
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  if (supabase) {
    try {
      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', payment_status: 'refunded' })
        .eq('id', bookingId)
        .select()
        .single();

      if (bErr || !booking) {
        return { success: false, error: 'Failed to cancel transport booking.' };
      }

      await createAlert({
        user_id: userId || 'usr-demo-01',
        booking_id: bookingId,
        booking_reference: booking.booking_reference,
        booking_type: 'transport',
        title: 'Transport Booking Cancelled',
        message: `Your transport reservation (${booking.booking_reference}) has been cancelled. Refund of $${booking.total_amount} is being processed. Reason: ${reason}.`,
        severity: 'warning',
        old_status: 'confirmed',
        new_status: 'cancelled',
      });

      return { success: true };
    } catch (err) {
      console.error('Cancel booking error:', err);
      return { success: false, error: 'Unexpected error during cancellation.' };
    }
  }

  // Preview mode cancellation
  await createAlert({
    user_id: userId || 'usr-demo-01',
    booking_id: bookingId,
    booking_reference: `VYN-TRP-${Math.floor(100000 + Math.random() * 900000)}`,
    booking_type: 'transport',
    title: 'Transport Booking Cancelled',
    message: `Your transport booking (${bookingId}) was successfully cancelled and refunded. Reason: ${reason}.`,
    severity: 'warning',
    old_status: 'confirmed',
    new_status: 'cancelled',
  });

  return { success: true };
}
