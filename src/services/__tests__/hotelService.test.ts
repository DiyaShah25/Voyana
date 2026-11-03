import { describe, it, expect } from 'vitest';
import {
  generateHotelBookingReference,
  calculateNights,
  formatDateRange,
  formatShortDate,
  generateMockHotels,
} from '../hotelService';

describe('hotelService', () => {
  describe('Hotel date calculations and formatting', () => {
    it('generates a compliant hotel booking reference (VOY-HT-XXXXXX)', () => {
      const ref = generateHotelBookingReference();
      expect(ref).toMatch(/^VYN-HT[A-Z0-9]+$/);
    });

    it('calculates the exact difference in nights between check-in and check-out', () => {
      expect(calculateNights('2026-11-10', '2026-11-15')).toBe(5);
      expect(calculateNights('2026-12-01', '2026-12-02')).toBe(1);
    });

    it('ensures minimum 1 night even when same-day input provided', () => {
      expect(calculateNights('2026-11-10', '2026-11-10')).toBe(1);
    });

    it('formats date ranges into clean human readable strings', () => {
      const formatted = formatDateRange('2026-11-10', '2026-11-15');
      expect(formatted).toContain('Nov');
      expect(formatted).toContain('10');
      expect(formatted).toContain('15');
    });

    it('formats short dates correctly', () => {
      const short = formatShortDate('2026-11-10');
      expect(short).toContain('Nov');
    });
  });

  describe('generateMockHotels', () => {
    it('generates curated hotels for requested location with star rating and nightly rates', () => {
      const hotels = generateMockHotels({
        location: 'Paris',
        checkInDate: '2026-11-10',
        checkOutDate: '2026-11-15',
        guests: 2,
        rooms: 1,
      });

      expect(hotels.length).toBeGreaterThanOrEqual(1);
      expect(hotels[0].city).toBe('Paris');
      expect(hotels[0].starRating).toBeGreaterThanOrEqual(3);
      expect(hotels[0].baseNightlyRate).toBeGreaterThan(0);
      expect(hotels[0].amenities.length).toBeGreaterThan(0);
    });
  });
});
