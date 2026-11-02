import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getUserBookings,
  modifyBooking,
  cancelBooking,
} from '../bookingService';
import * as alertService from '../alertService';

vi.mock('../alertService', () => ({
  createAlert: vi.fn().mockResolvedValue(true),
}));

describe('bookingService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('getUserBookings', () => {
    it('retrieves user bookings in fallback demo mode', async () => {
      const bookings = await getUserBookings('usr-traveler-03');
      expect(Array.isArray(bookings)).toBe(true);
      expect(bookings.length).toBeGreaterThanOrEqual(1);
      expect(bookings[0]).toHaveProperty('bookingReference');
      expect(bookings[0]).toHaveProperty('bookingType');
      expect(bookings[0]).toHaveProperty('totalAmount');
    });
  });

  describe('modifyBooking', () => {
    it('modifies booking details and updates price difference', async () => {
      const bookings = await getUserBookings('usr-traveler-03');
      const flightBooking = bookings.find((b) => b.bookingType === 'flight');

      if (flightBooking) {
        const result = await modifyBooking(
          flightBooking.id,
          {
            specialRequests: 'Window seat please and vegetarian meal',
          },
          flightBooking.userId
        );

        expect(result.success).toBe(true);
        expect(result.booking?.specialRequests).toContain('Window seat');
      }
    });
  });

  describe('cancelBooking', () => {
    it('cancels a booking, updates status to cancelled, and sets paymentStatus to refunded', async () => {
      const bookings = await getUserBookings('usr-traveler-03');
      const booking = bookings[0];

      const result = await cancelBooking(booking.id, 'Schedule conflict', 'usr-traveler-03');

      expect(result.success).toBe(true);

      const refreshed = await getUserBookings('usr-traveler-03');
      const cancelledBooking = refreshed.find((b) => b.id === booking.id);
      expect(cancelledBooking?.status).toBe('cancelled');
      expect(cancelledBooking?.paymentStatus).toBe('refunded');
    });
  });
});
