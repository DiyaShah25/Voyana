export * from '../../services/ai-service/src/catalog/flights';
import { CITY_TO_AIRPORT, type CabinClass, type Flight, type FlightBookingResult, type PassengerDetails } from '../../services/ai-service/src/catalog/flights';
import { recordBooking } from './bookingService';
/**
 * Flight Booking Service
 * Provides global flight search, seat tier selection, pricing breakdown,
 * route filtering, and instant flight booking reservation.
 */
import { createAlert } from './alertService';

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Supabase Client
// ---------------------------------------------------------------------------


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
  let bookingReference = generateBookingReference();



  // Preview / Offline mode

  const saved = await recordBooking({
    choices: [{type:'flight',id:flight.id,origin:flight.originAirport.code,destination:flight.destinationAirport.code,date:flight.departureTime.slice(0,10),cabin:cabinClass,passengers}],
    bookingReference, bookingType: 'flight', status: 'confirmed', paymentStatus: 'paid',
    totalAmount, currency: flight.currency, contactEmail: passenger.contactEmail, contactPhone: passenger.contactPhone,
    flightDetails: {
      flightNumber: flight.flightNumber, airline: flight.airline,
      originAirport: flight.originAirport.code, destinationAirport: flight.destinationAirport.code,
      originCity: flight.originAirport.city, destinationCity: flight.destinationAirport.city,
      departureTime: flight.departureTime, arrivalTime: flight.arrivalTime,
      cabinClass, passengerName: passenger.fullName, passportNumber: passenger.passportNumber, passengers,
    },
  });
  bookingReference = saved.bookingReference;
  const fakeId = saved.id;

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
