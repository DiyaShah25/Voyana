import { formatMoney } from './money';
export * from '../../services/ai-service/src/catalog/transport';
import { generateTransportOptions, getTransportById, getTransportTypeLabel, type TransportModeFilter, type TransportItem, type TransportBookingDetails, type TransportBookingResult } from '../../services/ai-service/src/catalog/transport';
import { recordBooking } from './bookingService';
/**
 * Transport Booking Service
 * Provides transport search (trains, rental cars, buses, private transfers, ferries),
 * seat/class booking reservations, and real-time status management.
 */
import { supabase } from './supabaseClient';
import { createAlert } from './alertService';

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------
export async function searchTransport(origin?: string, destination?: string, date?: string, mode: TransportModeFilter='all'): Promise<TransportItem[]> { return generateTransportOptions(origin,destination,date,mode); }

// ---------------------------------------------------------------------------
// Booking Function
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

  let bookingReference = `VYN-TRP-${Math.floor(100000 + Math.random() * 900000)}`;
  const passengerCount = Math.max(1, details.passengerCount || 1);
  const totalAmount =
    ['train','bus','ferry'].includes(transport.transportType)
      ? transport.basePrice * passengerCount
      : transport.basePrice;

  // 1. Supabase real execution path


  // 2. Preview / Offline Mode

  const saved = await recordBooking({
    choices: [{type:'transport',id:transport.id,origin:transport.originCity,date:transport.scheduledDeparture.slice(0,10),passengers:passengerCount}],
    userId, bookingReference, bookingType: 'transport', status: 'confirmed', paymentStatus: 'paid',
    totalAmount, currency: transport.currency, contactEmail: details.contactEmail, contactPhone: details.contactPhone,
    transportDetails: { destinationCity: transport.destinationCity, originCity: transport.originCity, providerName: transport.providerName, transportType: transport.transportType,
      originLocation: transport.originLocation, destinationLocation: transport.destinationLocation,
      scheduledDeparture: transport.scheduledDeparture, vehicleClass: transport.vehicleClass,
      passengerCount, leadPassengerName: details.passengerName, pickupNotes: details.pickupNotes },
  });
  bookingReference = saved.bookingReference;
  const fakeId = saved.id;

  // Trigger alert pipeline in preview mode
  await createAlert({
    user_id: userId || 'usr-demo-01',
    booking_id: fakeId,
    booking_reference: bookingReference,
    booking_type: 'transport',
    title: 'Transport Booking Confirmed',
    message: `Your ${getTransportTypeLabel(transport.transportType)} reservation (${transport.providerName}) from ${transport.originLocation} to ${transport.destinationLocation} has been confirmed for ${details.passengerName}. Total: ${formatMoney(totalAmount,transport.currency)}.`,
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
// Cancel Transport Booking Function
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
        message: `Your transport reservation (${booking.booking_reference}) has been cancelled. Refund of ${formatMoney(booking.total_amount,booking.currency||'INR')} is being processed. Reason: ${reason}.`,
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
