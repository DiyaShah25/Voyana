import { describe, it, expect } from 'vitest';
import {
  generateMockFlights,
  formatDuration,
  formatTime,
  formatDate,
  getCabinLabel,
  resolveAirportCode,
} from '../flightService';

describe('flightService', () => {
  describe('Airport code resolution and formatting', () => {
    it('resolves city names to IATA airport codes', () => {
      expect(resolveAirportCode('New York')).toBe('JFK');
      expect(resolveAirportCode('London')).toBe('LHR');
      expect(resolveAirportCode('Tokyo')).toBe('HND');
      expect(resolveAirportCode('Paris')).toBe('CDG');
      expect(resolveAirportCode('Rome')).toBe('FCO');
    });

    it('returns null for unknown city names', () => {
      expect(resolveAirportCode('NonExistentCity12345')).toBeNull();
    });

    it('formats flight duration into readable hours and minutes', () => {
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(480)).toBe('8h 0m');
      expect(formatDuration(45)).toBe('0h 45m');
    });

    it('formats ISO timestamps to local time and date', () => {
      const iso = '2026-11-10T14:30:00Z';
      const time = formatTime(iso);
      expect(time).toMatch(/\d{2}:\d{2}/);

      const date = formatDate(iso);
      expect(date).toContain('Nov');
      expect(date).toContain('10');
    });

    it('returns friendly human label for cabin classes', () => {
      expect(getCabinLabel('economy')).toBe('Economy');
      expect(getCabinLabel('premium_economy')).toBe('Premium Economy');
      expect(getCabinLabel('business')).toBe('Business');
      expect(getCabinLabel('first')).toBe('First Class');
    });
  });

  describe('generateMockFlights', () => {
    it('generates a deterministic list of flights for given origin, destination, and date', () => {
      const flights = generateMockFlights({
        originCode: 'JFK',
        destinationCode: 'CDG',
        departureDate: '2026-11-15',
        passengers: 1,
        cabinClass: 'economy',
      });

      expect(flights.length).toBeGreaterThanOrEqual(1);
      expect(flights[0]).toHaveProperty('flightNumber');
      expect(flights[0]).toHaveProperty('airline');
      expect(flights[0].originAirport.code).toBe('JFK');
      expect(flights[0].destinationAirport.code).toBe('CDG');
      expect(flights[0].prices.economy).toBeGreaterThan(0);
    });

    it('adjusts flight pricing based on cabin class multiplier', () => {
      const flights = generateMockFlights({
        originCode: 'JFK',
        destinationCode: 'LHR',
        departureDate: '2026-11-20',
        passengers: 1,
        cabinClass: 'economy',
      });

      expect(flights[0].prices.business).toBeGreaterThan(flights[0].prices.economy);
      expect(flights[0].prices.first).toBeGreaterThan(flights[0].prices.business);
    });
  });
});
