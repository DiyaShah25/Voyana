import { describe, it, expect } from 'vitest';
import { getAvailableModes, getGroundTransportOptions } from '../groundTransportService';

describe('groundTransportService - getAvailableModes', () => {
  it('returns flight, train, and bus for Ahmedabad to Srinagar (Kashmir)', () => {
    const modes = getAvailableModes('Ahmedabad', 'Srinagar');
    expect(modes).toContain('flight');
    expect(modes).toContain('train');
    expect(modes).toContain('bus');
    expect(modes).toEqual(['flight', 'train', 'bus']);
  });

  it('handles Kashmir synonym and returns all 3 modes', () => {
    const modes = getAvailableModes('Ahmedabad', 'Kashmir');
    expect(modes).toEqual(['flight', 'train', 'bus']);
  });

  it('returns flight only for island route Ahmedabad to Port Blair (Andaman)', () => {
    const modes = getAvailableModes('Ahmedabad', 'Port Blair');
    expect(modes).toEqual(['flight']);
  });

  it('returns flight only for international overseas route Ahmedabad to Paris', () => {
    const modes = getAvailableModes('Ahmedabad', 'Paris');
    expect(modes).toEqual(['flight']);
  });

  it('returns train and bus options for Ahmedabad to Srinagar', () => {
    const { trains, buses } = getGroundTransportOptions('Ahmedabad', 'Srinagar', '2026-11-20', 1);
    expect(trains.length).toBeGreaterThanOrEqual(1);
    expect(buses.length).toBeGreaterThanOrEqual(1);
    expect(trains[0].bookingUrl).toContain('irctc.co.in');
    expect(buses[0].bookingUrl).toContain('redbus.in');
  });

  it('returns empty ground options for Port Blair (flight only)', () => {
    const { trains, buses } = getGroundTransportOptions('Ahmedabad', 'Port Blair', '2026-11-20', 1);
    expect(trains.length).toBe(0);
    expect(buses.length).toBe(0);
  });
});
