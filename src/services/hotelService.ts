export * from '../../services/ai-service/src/catalog/hotels';
import { generateMockHotels, calculateNights, type RoomType, type Hotel, type GuestDetails, type HotelBookingResult } from '../../services/ai-service/src/catalog/hotels';
import { recordBooking } from './bookingService';
/**
 * Hotel Booking Service
 * Provides worldwide hotel stay search, room type selection,
 * amenity filtering, and accommodation reservation pipelines.
 */

import { createAlert } from './alertService';

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Supabase Client Initialization
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Booking Reference Generator
// ---------------------------------------------------------------------------
export function generateHotelBookingReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'VYN-HT';
  for (let i = 0; i < 5; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

// ---------------------------------------------------------------------------
// Mock Hotel Generator
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Search Hotels (Supabase with Mock Fallback)
// ---------------------------------------------------------------------------
export async function searchHotels(location: string, checkInDate: string, checkOutDate: string, guests=1, rooms=1, roomType: RoomType='Standard'): Promise<Hotel[]> { return generateMockHotels({location,checkInDate,checkOutDate,guests,rooms,roomType}); }

// ---------------------------------------------------------------------------
// Book Hotel (Supabase or Mock Alert Dispatch)
// ---------------------------------------------------------------------------
export async function bookHotel(
  hotel: Hotel,
  guest: GuestDetails,
  checkInDate: string,
  checkOutDate: string,
  roomType: RoomType = 'Standard',
  rooms: number = 1,
  guests: number = 1,
  userId?: string
): Promise<HotelBookingResult> {
  const nights = calculateNights(checkInDate, checkOutDate);
  const nightlyRate = hotel.roomRates[roomType] || hotel.baseNightlyRate;
  const totalAmount = nightlyRate * nights * rooms;
  let bookingReference = generateHotelBookingReference();



  // Preview / Offline Mode

  const saved = await recordBooking({
    choices: [{type:'hotel',id:hotel.id,checkIn:checkInDate,checkOut:checkOutDate,roomType,rooms,guests}],
    userId, bookingReference, bookingType: 'hotel', status: 'confirmed', paymentStatus: 'paid',
    totalAmount, currency: hotel.currency, contactEmail: guest.contactEmail, contactPhone: guest.contactPhone,
    hotelDetails: { hotelName: hotel.name, city: hotel.city, address: hotel.address, roomType,
      checkInDate, checkOutDate, numberOfGuests: guests, numberOfRooms: rooms, guestName: guest.fullName, nightlyRate },
  });
  bookingReference = saved.bookingReference;
  const fakeId = saved.id;

  // Trigger alert pipeline in preview mode
  await createAlert({
    user_id: userId || 'usr-demo-01',
    booking_id: fakeId,
    booking_reference: bookingReference,
    booking_type: 'hotel',
    title: 'Hotel Booking Confirmed',
    message: `Your stay at ${hotel.name} (${roomType}, ${rooms} room${rooms > 1 ? 's' : ''}) in ${hotel.city} has been confirmed for ${formatDateRange(checkInDate, checkOutDate)} for ${guest.fullName}. Check-in starts at 15:00.`,
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
// Helpers & Formatting
// ---------------------------------------------------------------------------


export function formatDateRange(checkIn: string, checkOut: string): string {
  if (!checkIn || !checkOut) return '';
  const inD = new Date(checkIn);
  const outD = new Date(checkOut);
  const inStr = inD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const outStr = outD.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${inStr} – ${outStr}`;
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
