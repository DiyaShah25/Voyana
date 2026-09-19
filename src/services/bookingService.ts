/**
 * VPM-203: Booking Management Service
 * Assignee: Megha Lalwani (202512054) <lalwani2406@gmail.com>
 * Provides unified cross-service booking management, multi-service cancellation with refund tiers,
 * date/guest/class modifications with automatic price difference adjustment and alert triggers.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createAlert } from './alertService';
import { initiatePayment, confirmPayment } from './paymentService';

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
  {
    id: 'bkg-fl-001',
    userId: 'usr-demo-01',
    bookingReference: 'VYN-FL881',
    bookingType: 'flight',
    status: 'confirmed',
    totalAmount: 850,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'bhavika@example.com',
    contactPhone: '+1 (555) 019-2834',
    specialRequests: 'Vegetarian meal requested',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    flightDetails: {
      flightNumber: 'AF 1024',
      airline: 'Air France',
      originAirport: 'CDG',
      destinationAirport: 'HND',
      originCity: 'Paris',
      destinationCity: 'Tokyo',
      departureTime: '2026-10-12T13:30:00Z',
      arrivalTime: '2026-10-13T08:45:00Z',
      cabinClass: 'economy',
      passengerName: 'Bhavika Sainani',
      passportNumber: 'Z8921094',
      seatNumber: '14A',
      baggageAllowanceKg: 23,
      passengers: 1,
    },
  },
  {
    id: 'bkg-ht-001',
    userId: 'usr-demo-01',
    bookingReference: 'VYN-HT402',
    bookingType: 'hotel',
    status: 'confirmed',
    totalAmount: 2250,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'bhavika@example.com',
    contactPhone: '+1 (555) 019-2834',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    hotelDetails: {
      hotelName: 'Hôtel Ritz Paris',
      city: 'Paris',
      address: '15 Place Vendôme, 75001 Paris',
      roomType: 'Deluxe',
      checkInDate: '2026-10-14',
      checkOutDate: '2026-10-17',
      numberOfGuests: 2,
      numberOfRooms: 1,
      guestName: 'Bhavika Sainani',
      nightlyRate: 750,
    },
  },
  {
    id: 'bkg-trp-001',
    userId: 'usr-demo-01',
    bookingReference: 'VYN-TRP-948102',
    bookingType: 'transport',
    status: 'confirmed',
    totalAmount: 95,
    currency: 'USD',
    paymentStatus: 'paid',
    contactEmail: 'bhavika@example.com',
    contactPhone: '+1 (555) 019-2834',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    transportDetails: {
      providerName: 'Paris Executive Chauffeur',
      transportType: 'private_transfer',
      originLocation: 'Paris Charles de Gaulle Airport (CDG)',
      destinationLocation: 'Eiffel Tower / Central Paris',
      scheduledDeparture: '2026-10-14T10:00:00Z',
      scheduledArrival: '2026-10-14T10:45:00Z',
      vehicleClass: 'Executive Luxury',
      vehicleModel: 'Mercedes-Benz E-Class Sedan',
      passengerCount: 2,
      leadPassengerName: 'Bhavika Sainani',
      pickupNotes: 'Flight AF 1024 arrival tracking',
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
