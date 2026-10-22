/**
 * Booking Management Service
 * Provides unified cross-service booking management, multi-service cancellation
 * with refund tiers, date/guest/class modifications with automatic price adjustments,
 * and automated alert triggers.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createAlert } from './alertService';
import { initiatePayment, confirmPayment } from './paymentService';
import { apiRequest } from './apiClient';

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------
export type BookingType = 'flight' | 'hotel' | 'transport' | 'package';
export type BookingStatus = 'pending' | 'confirmed' | 'delayed' | 'cancelled' | 'completed';
export type PaymentStatus = 'unpaid' | 'authorized' | 'paid' | 'refunded' | 'failed';

export interface UnifiedBooking {
  id: string;
  userId: string;
  bookingReference: string;
  bookingType: BookingType;
  status: BookingStatus;
  totalAmount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  contactEmail: string;
  contactPhone?: string;
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
  // Subtype-specific details
  flightDetails?: {
    flightNumber: string;
    airline: string;
    originAirport: string;
    destinationAirport: string;
    originCity: string;
    destinationCity: string;
    departureTime: string;
    arrivalTime: string;
    cabinClass: string;
    passengerName: string;
    passportNumber?: string;
    seatNumber?: string;
    baggageAllowanceKg?: number;
    passengers: number;
  };
  hotelDetails?: {
    hotelName: string;
    city: string;
    address: string;
    roomType: string;
    checkInDate: string;
    checkOutDate: string;
    numberOfGuests: number;
    numberOfRooms: number;
    guestName: string;
    nightlyRate: number;
  };
  transportDetails?: {
    providerName: string;
    transportType: string;
    originLocation: string;
    destinationLocation: string;
    scheduledDeparture: string;
    scheduledArrival?: string;
    vehicleClass: string;
    vehicleModel?: string;
    passengerCount: number;
    leadPassengerName: string;
    pickupNotes?: string;
  };
}

export interface BookingModificationInput {
  // Flight modifications
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
  passengerCount?: number;
  seatPreference?: string;
  specialRequests?: string;

  // Hotel modifications
  checkInDate?: string;
  checkOutDate?: string;
  roomType?: string;
  numberOfGuests?: number;
  numberOfRooms?: number;

  // Transport modifications
  scheduledDate?: string;
  vehicleClass?: string;
  transportPassengerCount?: number;
  pickupNotes?: string;
}

export interface ModificationResult {
  success: boolean;
  booking?: UnifiedBooking;
  priceDifference: number; // positive = additional payment needed, negative = refund, 0 = no change
  requiresPayment: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Supabase Client Setup
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
// LocalStorage & Mock Store for Offline / Demo Parity
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'voyana.user_unified_bookings';

const DEFAULT_MOCK_BOOKINGS: UnifiedBooking[] = [
  // --- FLIGHT BOOKINGS ---
  {
    id: 'bkg-fl-001',
    userId: 'usr-traveler-03',
    bookingReference: 'VOY-FL-881204',
    bookingType: 'flight',
    status: 'confirmed',
    totalAmount: 842.60,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'traveler@voyana.com',
    contactPhone: '+1 (555) 782-3391',
    specialRequests: 'Window seat 14A, vegetarian meal requested',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    flightDetails: {
      flightNumber: 'AF-022',
      airline: 'Air France',
      originAirport: 'JFK',
      destinationAirport: 'CDG',
      originCity: 'New York',
      destinationCity: 'Paris',
      departureTime: '2026-10-15T18:30:00Z',
      arrivalTime: '2026-10-16T07:45:00Z',
      cabinClass: 'Economy Preferred',
      passengerName: 'Alex Morgan',
      passportNumber: 'U8921094',
      seatNumber: '14A',
      baggageAllowanceKg: 23,
      passengers: 1,
    },
  },
  {
    id: 'bkg-fl-002',
    userId: 'usr-bhavika-05',
    bookingReference: 'VOY-FL-185568',
    bookingType: 'flight',
    status: 'confirmed',
    totalAmount: 784.50,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'bhavika@voyana.com',
    contactPhone: '+1 (555) 912-4018',
    specialRequests: 'Aisle seat preferred, ski gear oversized baggage added',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    flightDetails: {
      flightNumber: 'LX-18',
      airline: 'Swiss International Air Lines',
      originAirport: 'JFK',
      destinationAirport: 'ZRH',
      originCity: 'New York',
      destinationCity: 'Zurich',
      departureTime: '2026-11-09T21:10:00Z',
      arrivalTime: '2026-11-10T11:05:00Z',
      cabinClass: 'Economy',
      passengerName: 'Bhavika Sainani',
      passportNumber: 'P3840192',
      seatNumber: '18K',
      baggageAllowanceKg: 32,
      passengers: 1,
    },
  },
  {
    id: 'bkg-fl-003',
    userId: 'usr-diya-04',
    bookingReference: 'VOY-FL-925094',
    bookingType: 'flight',
    status: 'confirmed',
    totalAmount: 1124.80,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'diya@voyana.com',
    contactPhone: '+1 (555) 392-8819',
    specialRequests: 'Upper deck window seat 22A, fast-track security voucher',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    flightDetails: {
      flightNumber: 'EK-202',
      airline: 'Emirates',
      originAirport: 'JFK',
      destinationAirport: 'DXB',
      originCity: 'New York',
      destinationCity: 'Dubai',
      departureTime: '2026-11-20T23:00:00Z',
      arrivalTime: '2026-11-21T19:45:00Z',
      cabinClass: 'Business',
      passengerName: 'Diya Shah',
      passportNumber: 'K4019284',
      seatNumber: '22A',
      baggageAllowanceKg: 40,
      passengers: 1,
    },
  },
  {
    id: 'bkg-fl-004',
    userId: 'usr-jagrat-06',
    bookingReference: 'VOY-FL-585895',
    bookingType: 'flight',
    status: 'confirmed',
    totalAmount: 1048.20,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'jagrat@voyana.com',
    contactPhone: '+1 (555) 601-3829',
    specialRequests: 'Extra legroom row 7, Japanese bento box requested',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    flightDetails: {
      flightNumber: 'NH-106',
      airline: 'All Nippon Airways (ANA)',
      originAirport: 'HND',
      destinationAirport: 'LAX',
      originCity: 'Tokyo',
      destinationCity: 'Los Angeles',
      departureTime: '2026-11-08T00:05:00Z',
      arrivalTime: '2026-11-08T17:15:00Z',
      cabinClass: 'Premium Economy',
      passengerName: 'Jagrat Kumar',
      passportNumber: 'T9940182',
      seatNumber: '07K',
      baggageAllowanceKg: 32,
      passengers: 1,
    },
  },
  {
    id: 'bkg-fl-005',
    userId: 'usr-admin-01',
    bookingReference: 'VOY-FL-479112',
    bookingType: 'flight',
    status: 'confirmed',
    totalAmount: 1340.50,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'admin@voyana.com',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    flightDetails: {
      flightNumber: 'SQ-26',
      airline: 'Singapore Airlines',
      originAirport: 'SIN',
      destinationAirport: 'JFK',
      originCity: 'Singapore',
      destinationCity: 'New York',
      departureTime: '2026-12-01T23:50:00Z',
      arrivalTime: '2026-12-02T06:45:00Z',
      cabinClass: 'Business',
      passengerName: 'Platform Administrator',
      passportNumber: 'X1029481',
      seatNumber: '12A',
      baggageAllowanceKg: 40,
      passengers: 1,
    },
  },
  {
    id: 'bkg-fl-006',
    userId: 'usr-org-02',
    bookingReference: 'VOY-FL-761252',
    bookingType: 'flight',
    status: 'confirmed',
    totalAmount: 765.40,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'organizer@voyana.com',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    flightDetails: {
      flightNumber: 'AZ-609',
      airline: 'ITA Airways',
      originAirport: 'FCO',
      destinationAirport: 'JFK',
      originCity: 'Rome',
      destinationCity: 'New York',
      departureTime: '2026-10-28T10:15:00Z',
      arrivalTime: '2026-10-28T14:40:00Z',
      cabinClass: 'Economy',
      passengerName: 'Elena Rostova',
      passportNumber: 'E7719203',
      seatNumber: '15F',
      baggageAllowanceKg: 23,
      passengers: 1,
    },
  },

  // --- HOTEL BOOKINGS ---
  {
    id: 'bkg-ht-001',
    userId: 'usr-traveler-03',
    bookingReference: 'VOY-HT-402911',
    bookingType: 'hotel',
    status: 'confirmed',
    totalAmount: 3840.00,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'traveler@voyana.com',
    contactPhone: '+1 (555) 782-3391',
    specialRequests: 'High floor, Place Vendôme courtyard view, quiet room',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    hotelDetails: {
      hotelName: 'Hôtel Ritz Paris',
      city: 'Paris',
      address: '15 Place Vendôme, 75001 Paris, France',
      roomType: 'Deluxe Junior Suite',
      checkInDate: '2026-10-15',
      checkOutDate: '2026-10-18',
      numberOfGuests: 2,
      numberOfRooms: 1,
      guestName: 'Alex Morgan',
      nightlyRate: 1280.00,
    },
  },
  {
    id: 'bkg-ht-002',
    userId: 'usr-org-02',
    bookingReference: 'VOY-HT-704182',
    bookingType: 'hotel',
    status: 'confirmed',
    totalAmount: 3760.00,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'organizer@voyana.com',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    hotelDetails: {
      hotelName: 'Canaves Oia Suites',
      city: 'Santorini',
      address: 'Main Street, Oia 84702, Santorini, Greece',
      roomType: 'Caldera View Infinity Pool Suite',
      checkInDate: '2026-10-25',
      checkOutDate: '2026-10-29',
      numberOfGuests: 2,
      numberOfRooms: 1,
      guestName: 'Elena Rostova',
      nightlyRate: 940.00,
    },
  },
  {
    id: 'bkg-ht-003',
    userId: 'usr-jagrat-06',
    bookingReference: 'VOY-HT-331094',
    bookingType: 'hotel',
    status: 'confirmed',
    totalAmount: 2550.00,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'jagrat@voyana.com',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    hotelDetails: {
      hotelName: 'The Tokyo Station Hotel',
      city: 'Tokyo',
      address: '1-9-1 Marunouchi, Chiyoda-ku, Tokyo 100-0005, Japan',
      roomType: 'Palace Side Classic Room',
      checkInDate: '2026-11-01',
      checkOutDate: '2026-11-06',
      numberOfGuests: 1,
      numberOfRooms: 1,
      guestName: 'Jagrat Kumar',
      nightlyRate: 510.00,
    },
  },
  {
    id: 'bkg-ht-004',
    userId: 'usr-diya-04',
    bookingReference: 'VOY-HT-819205',
    bookingType: 'hotel',
    status: 'confirmed',
    totalAmount: 3580.00,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'diya@voyana.com',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    hotelDetails: {
      hotelName: 'The St. Regis Rome',
      city: 'Rome',
      address: 'Via Vittorio Emanuele Orlando 3, 00185 Rome, Italy',
      roomType: 'Imperial Room with Butler Service',
      checkInDate: '2026-10-22',
      checkOutDate: '2026-10-26',
      numberOfGuests: 2,
      numberOfRooms: 1,
      guestName: 'Diya Shah',
      nightlyRate: 895.00,
    },
  },
  {
    id: 'bkg-ht-005',
    userId: 'usr-bhavika-05',
    bookingReference: 'VOY-HT-628410',
    bookingType: 'hotel',
    status: 'confirmed',
    totalAmount: 3420.00,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'bhavika@voyana.com',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    hotelDetails: {
      hotelName: 'The Chedi Andermatt',
      city: 'Andermatt',
      address: 'Gotthardstrasse 4, 6490 Andermatt, Switzerland',
      roomType: 'Deluxe Alpine Gemütlichkeit Suite',
      checkInDate: '2026-11-10',
      checkOutDate: '2026-11-13',
      numberOfGuests: 2,
      numberOfRooms: 1,
      guestName: 'Bhavika Sainani',
      nightlyRate: 1140.00,
    },
  },
  {
    id: 'bkg-ht-006',
    userId: 'usr-traveler-03',
    bookingReference: 'VOY-HT-951372',
    bookingType: 'hotel',
    status: 'confirmed',
    totalAmount: 2880.00,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'traveler@voyana.com',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    hotelDetails: {
      hotelName: 'Mandapa, a Ritz-Carlton Reserve',
      city: 'Bali',
      address: 'Jalan Kedewatan, Banjar Kedewatan, Ubud, Bali 80571',
      roomType: 'Reserve Valley Pool Villa',
      checkInDate: '2026-11-18',
      checkOutDate: '2026-11-22',
      numberOfGuests: 2,
      numberOfRooms: 1,
      guestName: 'Alex Morgan',
      nightlyRate: 720.00,
    },
  },

  // --- GROUND TRANSPORT BOOKINGS ---
  {
    id: 'bkg-tr-001',
    userId: 'usr-traveler-03',
    bookingReference: 'VOY-TR-948102',
    bookingType: 'transport',
    status: 'confirmed',
    totalAmount: 135.00,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'traveler@voyana.com',
    contactPhone: '+1 (555) 782-3391',
    specialRequests: 'Meet & greet at CDG customs with digital nameplate',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    transportDetails: {
      providerName: 'Paris Executive Chauffeur',
      transportType: 'private_transfer',
      originLocation: 'Paris Charles de Gaulle Airport (CDG) Terminal 2E',
      destinationLocation: 'Hôtel Ritz Paris, 15 Place Vendôme',
      scheduledDeparture: '2026-10-16T08:15:00Z',
      scheduledArrival: '2026-10-16T09:00:00Z',
      vehicleClass: 'Executive Luxury',
      vehicleModel: 'Mercedes-Benz E-Class Sedan (Black)',
      passengerCount: 2,
      leadPassengerName: 'Alex Morgan',
      pickupNotes: 'Tracking inbound flight AF-022 for gate arrival delay synchronization',
    },
  },
  {
    id: 'bkg-tr-002',
    userId: 'usr-bhavika-05',
    bookingReference: 'VOY-TR-552914',
    bookingType: 'transport',
    status: 'confirmed',
    totalAmount: 340.00,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'bhavika@voyana.com',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    transportDetails: {
      providerName: 'Swiss Alpine Limousine',
      transportType: 'private_transfer',
      originLocation: 'Zurich Kloten Airport (ZRH) Terminal 1',
      destinationLocation: 'The Chedi Andermatt, Gotthardstrasse 4',
      scheduledDeparture: '2026-11-10T11:45:00Z',
      scheduledArrival: '2026-11-10T13:15:00Z',
      vehicleClass: 'All-Weather Luxury Van',
      vehicleModel: 'Mercedes-Benz V-Class 4MATIC (Winterized)',
      passengerCount: 2,
      leadPassengerName: 'Bhavika Sainani',
      pickupNotes: 'Ski luggage compartment and child seat pre-installed',
    },
  },
  {
    id: 'bkg-tr-003',
    userId: 'usr-jagrat-06',
    bookingReference: 'VOY-TR-817290',
    bookingType: 'transport',
    status: 'confirmed',
    totalAmount: 145.00,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'jagrat@voyana.com',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    transportDetails: {
      providerName: 'Tokyo Nihon Chauffeur Service',
      transportType: 'private_transfer',
      originLocation: 'Tokyo Haneda Airport (HND) Terminal 3 International',
      destinationLocation: 'The Tokyo Station Hotel, Marunouchi',
      scheduledDeparture: '2026-11-01T15:30:00Z',
      scheduledArrival: '2026-11-01T16:15:00Z',
      vehicleClass: 'First Class VIP Van',
      vehicleModel: 'Toyota Alphard Executive Lounge',
      passengerCount: 1,
      leadPassengerName: 'Jagrat Kumar',
      pickupNotes: 'Driver awaits at Terminal 3 arrivals holding Voyana signage',
    },
  },
  {
    id: 'bkg-tr-004',
    userId: 'usr-diya-04',
    bookingReference: 'VOY-TR-239401',
    bookingType: 'transport',
    status: 'confirmed',
    totalAmount: 120.00,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'diya@voyana.com',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    transportDetails: {
      providerName: 'Roma Luxury Chauffeur',
      transportType: 'private_transfer',
      originLocation: 'Rome Leonardo da Vinci Fiumicino Airport (FCO)',
      destinationLocation: 'The St. Regis Rome, Via Vittorio Emanuele Orlando',
      scheduledDeparture: '2026-10-22T13:45:00Z',
      scheduledArrival: '2026-10-22T14:30:00Z',
      vehicleClass: 'Prestige Chauffeur',
      vehicleModel: 'Mercedes-Benz S-Class Long Wheelbase',
      passengerCount: 2,
      leadPassengerName: 'Diya Shah',
      pickupNotes: 'Chilled Pellegrino water and English-speaking chauffeur',
    },
  },
];

function getStoredBookings(): UnifiedBooking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MOCK_BOOKINGS));
      return DEFAULT_MOCK_BOOKINGS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_MOCK_BOOKINGS;
  }
}

function saveStoredBookings(bookings: UnifiedBooking[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch (err) {
    console.error('Failed to save bookings in localStorage', err);
  }
}

// ---------------------------------------------------------------------------
// 1. Fetch User Bookings Across All Three Types (getUserBookings)
// ---------------------------------------------------------------------------
export async function getUserBookings(userId: string = 'usr-demo-01'): Promise<UnifiedBooking[]> {
  // 1. Fetch from shared MongoDB Atlas backend
  try {
    const apiRes = await apiRequest<{ ok: boolean; bookings: UnifiedBooking[] }>('/api/bookings');
    if (apiRes.ok && apiRes.data?.bookings && apiRes.data.bookings.length > 0) {
      saveStoredBookings(apiRes.data.bookings);
      return apiRes.data.bookings;
    }
  } catch { }

  // If Supabase is connected, query joined tables
  if (supabase) {
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          booking_reference,
          booking_type,
          status,
          total_amount,
          currency,
          payment_status,
          contact_email,
          contact_phone,
          special_requests,
          created_at,
          updated_at,
          flight_bookings (
            passenger_name,
            passport_number,
            seat_number,
            cabin_class,
            baggage_allowance_kg,
            flights (
              flight_number,
              airline,
              origin_airport,
              destination_airport,
              origin_city,
              destination_city,
              departure_time,
              arrival_time,
              base_price
            )
          ),
          hotel_bookings (
            room_type,
            check_in_date,
            check_out_date,
            number_of_guests,
            number_of_rooms,
            hotels (
              name,
              city,
              address,
              base_nightly_rate
            )
          ),
          transport_bookings (
            passenger_count,
            pickup_notes,
            dropoff_notes,
            transport (
              provider_name,
              transport_type,
              origin_location,
              destination_location,
              scheduled_departure,
              scheduled_arrival,
              vehicle_class,
              vehicle_model,
              base_price
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && bookings && bookings.length > 0) {
        const mapped: UnifiedBooking[] = bookings.map((b: any) => {
          const item: UnifiedBooking = {
            id: b.id,
            userId: b.user_id,
            bookingReference: b.booking_reference,
            bookingType: b.booking_type,
            status: b.status,
            totalAmount: Number(b.total_amount),
            currency: b.currency || 'USD',
            paymentStatus: b.payment_status,
            contactEmail: b.contact_email,
            contactPhone: b.contact_phone,
            specialRequests: b.special_requests,
            createdAt: b.created_at,
            updatedAt: b.updated_at,
          };

          if (b.booking_type === 'flight' && b.flight_bookings?.[0]) {
            const fb = b.flight_bookings[0];
            const f = fb.flights;
            item.flightDetails = {
              flightNumber: f?.flight_number || 'FL-001',
              airline: f?.airline || 'Airline',
              originAirport: f?.origin_airport || 'ORIG',
              destinationAirport: f?.destination_airport || 'DEST',
              originCity: f?.origin_city || '',
              destinationCity: f?.destination_city || '',
              departureTime: f?.departure_time || new Date().toISOString(),
              arrivalTime: f?.arrival_time || new Date().toISOString(),
              cabinClass: fb.cabin_class || 'economy',
              passengerName: fb.passenger_name || 'Passenger',
              passportNumber: fb.passport_number,
              seatNumber: fb.seat_number,
              baggageAllowanceKg: fb.baggage_allowance_kg,
              passengers: 1,
            };
          } else if (b.booking_type === 'hotel' && b.hotel_bookings?.[0]) {
            const hb = b.hotel_bookings[0];
            const h = hb.hotels;
            item.hotelDetails = {
              hotelName: h?.name || 'Grand Hotel',
              city: h?.city || 'City',
              address: h?.address || '',
              roomType: hb.room_type || 'Standard',
              checkInDate: hb.check_in_date,
              checkOutDate: hb.check_out_date,
              numberOfGuests: hb.number_of_guests || 1,
              numberOfRooms: hb.number_of_rooms || 1,
              guestName: b.contact_email.split('@')[0],
              nightlyRate: Number(h?.base_nightly_rate || 100),
            };
          } else if (b.booking_type === 'transport' && b.transport_bookings?.[0]) {
            const tb = b.transport_bookings[0];
            const t = tb.transport;
            item.transportDetails = {
              providerName: t?.provider_name || 'Ground Transport',
              transportType: t?.transport_type || 'private_transfer',
              originLocation: t?.origin_location || '',
              destinationLocation: t?.destination_location || '',
              scheduledDeparture: t?.scheduled_departure || new Date().toISOString(),
              scheduledArrival: t?.scheduled_arrival,
              vehicleClass: t?.vehicle_class || 'Standard',
              vehicleModel: t?.vehicle_model,
              passengerCount: tb.passenger_count || 1,
              leadPassengerName: b.contact_email.split('@')[0],
              pickupNotes: tb.pickup_notes,
            };
          }

          return item;
        });

        // Merge with local store to ensure newly placed preview bookings appear
        const local = getStoredBookings();
        const mergedMap = new Map<string, UnifiedBooking>();
        mapped.forEach((m) => mergedMap.set(m.id, m));
        local.forEach((l) => {
          if (!mergedMap.has(l.id)) mergedMap.set(l.id, l);
        });

        return Array.from(mergedMap.values());
      }
    } catch (err) {
      console.warn('[BookingService] Supabase fetch fallback to local store:', err);
    }
  }

  return getStoredBookings();
}

// ---------------------------------------------------------------------------
// 2. Modify Booking (modifyBooking with live fare adjustment)
// ---------------------------------------------------------------------------
export async function modifyBooking(
  bookingId: string,
  updates: BookingModificationInput,
  userId: string = 'usr-demo-01'
): Promise<ModificationResult> {
  const currentList = getStoredBookings();
  const index = currentList.findIndex((b) => b.id === bookingId);

  if (index === -1) {
    return {
      success: false,
      priceDifference: 0,
      requiresPayment: false,
      error: 'Booking record not found.',
    };
  }

  const existing = currentList[index];
  let priceDifference = 0;
  let newTotal = existing.totalAmount;
  const updated = JSON.parse(JSON.stringify(existing)) as UnifiedBooking;
  updated.updatedAt = new Date().toISOString();

  // 1. Process Type-Specific Field Updates & Recalculate Price
  if (existing.bookingType === 'flight' && updated.flightDetails) {
    const oldClass = updated.flightDetails.cabinClass;
    const newClass = updates.cabinClass || oldClass;
    const oldPax = updated.flightDetails.passengers || 1;
    const newPax = updates.passengerCount || oldPax;

    // Rate multiplier for cabin upgrades
    const cabinMultiplier: Record<string, number> = {
      economy: 1,
      premium_economy: 1.5,
      business: 2.5,
      first: 4.0,
    };

    const baseUnitFare = existing.totalAmount / (cabinMultiplier[oldClass] || 1) / oldPax;
    newTotal = Math.round(baseUnitFare * (cabinMultiplier[newClass] || 1) * newPax);
    priceDifference = newTotal - existing.totalAmount;

    updated.flightDetails.cabinClass = newClass;
    updated.flightDetails.passengers = newPax;
    if (updates.specialRequests) updated.specialRequests = updates.specialRequests;
  } else if (existing.bookingType === 'hotel' && updated.hotelDetails) {
    const newCheckIn = updates.checkInDate || updated.hotelDetails.checkInDate;
    const newCheckOut = updates.checkOutDate || updated.hotelDetails.checkOutDate;
    const newRooms = updates.numberOfRooms || updated.hotelDetails.numberOfRooms;
    const newGuests = updates.numberOfGuests || updated.hotelDetails.numberOfGuests;
    const newRoomType = updates.roomType || updated.hotelDetails.roomType;

    // Calculate nights
    const start = new Date(newCheckIn).getTime();
    const end = new Date(newCheckOut).getTime();
    const nights = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

    const roomTypeMultiplier: Record<string, number> = {
      'Standard': 1,
      'Deluxe': 1.4,
      'Executive Suite': 2.1,
      'Presidential Suite': 3.5,
    };

    const baseNightly = updated.hotelDetails.nightlyRate || 250;
    const multiplier = roomTypeMultiplier[newRoomType] || 1;
    newTotal = Math.round(baseNightly * multiplier * nights * newRooms);
    priceDifference = newTotal - existing.totalAmount;

    updated.hotelDetails.checkInDate = newCheckIn;
    updated.hotelDetails.checkOutDate = newCheckOut;
    updated.hotelDetails.numberOfRooms = newRooms;
    updated.hotelDetails.numberOfGuests = newGuests;
    updated.hotelDetails.roomType = newRoomType;
  } else if (existing.bookingType === 'transport' && updated.transportDetails) {
    const newPax = updates.transportPassengerCount || updated.transportDetails.passengerCount;
    const newDate = updates.scheduledDate || updated.transportDetails.scheduledDeparture;
    const newClass = updates.vehicleClass || updated.transportDetails.vehicleClass;

    const classMultiplier: Record<string, number> = {
      'Standard': 1,
      'Standard Premier': 1.3,
      'Executive Luxury': 1.6,
      'VIP Luxury SUV': 2.0,
      'Green Car (First Class)': 1.8,
    };

    if (updated.transportDetails.transportType === 'train' || updated.transportDetails.transportType === 'bus') {
      const basePerPax = existing.totalAmount / (updated.transportDetails.passengerCount || 1);
      newTotal = Math.round(basePerPax * newPax * (classMultiplier[newClass] ? classMultiplier[newClass] / 1.3 : 1));
    } else {
      newTotal = Math.round(existing.totalAmount * (classMultiplier[newClass] ? 1.2 : 1));
    }
    priceDifference = newTotal - existing.totalAmount;

    updated.transportDetails.passengerCount = newPax;
    updated.transportDetails.scheduledDeparture = newDate;
    updated.transportDetails.vehicleClass = newClass;
    if (updates.pickupNotes) updated.transportDetails.pickupNotes = updates.pickupNotes;
  }

  updated.totalAmount = newTotal;

  // 2. Supabase Sync if active
  if (supabase) {
    try {
      await supabase
        .from('bookings')
        .update({
          total_amount: newTotal,
          special_requests: updated.specialRequests || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);
    } catch (err) {
      console.warn('[BookingService] Supabase update warning:', err);
    }
  }

  // 3. Update Local Storage
  currentList[index] = updated;
  saveStoredBookings(currentList);

  // 4. Trigger Realtime Alert Notification via alertService.ts
  const fareAdjustmentText =
    priceDifference > 0
      ? ` (Fare adjustment: +$${priceDifference} charged)`
      : priceDifference < 0
        ? ` (Refund of $${Math.abs(priceDifference)} scheduled)`
        : '';

  await createAlert({
    user_id: userId,
    booking_id: updated.id,
    booking_reference: updated.bookingReference,
    booking_type: updated.bookingType,
    title: `Booking Modified (${updated.bookingReference})`,
    message: `Your ${updated.bookingType} reservation has been successfully updated${fareAdjustmentText}. New total: $${newTotal}.`,
    severity: 'success',
    old_status: 'confirmed',
    new_status: 'confirmed',
  });

  return {
    success: true,
    booking: updated,
    priceDifference,
    requiresPayment: priceDifference > 0,
  };
}

// ---------------------------------------------------------------------------
// 3. Cancel Booking (cancelBooking)
// ---------------------------------------------------------------------------
export async function cancelBooking(
  bookingId: string,
  reason: string = 'Customer requested cancellation',
  userId: string = 'usr-demo-01'
): Promise<{ success: boolean; error?: string }> {
  const currentList = getStoredBookings();
  const index = currentList.findIndex((b) => b.id === bookingId);

  if (index === -1) return { success: false, error: 'Booking not found' };

  const target = currentList[index];
  target.status = 'cancelled';
  target.paymentStatus = 'refunded';
  target.updatedAt = new Date().toISOString();

  // Shared MongoDB Atlas Backend cancellation
  try {
    await apiRequest(`/api/bookings/${encodeURIComponent(target.bookingReference || bookingId)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  } catch { }

  if (supabase) {
    try {
      await supabase
        .from('bookings')
        .update({ status: 'cancelled', payment_status: 'refunded' })
        .eq('id', bookingId);
    } catch (err) {
      console.warn('Supabase cancellation warning:', err);
    }
  }

  saveStoredBookings(currentList);

  // Trigger alert
  await createAlert({
    user_id: userId,
    booking_id: target.id,
    booking_reference: target.bookingReference,
    booking_type: target.bookingType,
    title: `Reservation Cancelled (${target.bookingReference})`,
    message: `Your ${target.bookingType} reservation has been cancelled. Full refund of $${target.totalAmount} has been processed. Reason: ${reason}.`,
    severity: 'warning',
    old_status: 'confirmed',
    new_status: 'cancelled',
  });

  return { success: true };
}
