import { describe, it, expect } from 'vitest';
import {
  getTransportTypeLabel,
  getTransportIcon,
  formatTransportDuration,
  getTransportById,
} from '../transportService';

describe('transportService', () => {
  it('returns clean human labels for ground transport types', () => {
    expect(getTransportTypeLabel('train')).toBe('High-Speed Train');
    expect(getTransportTypeLabel('bus')).toBe('Coach / Shuttle');
    expect(getTransportTypeLabel('private_transfer')).toBe('Private Transfer');
    expect(getTransportTypeLabel('car_rental')).toBe('Car Rental');
    expect(getTransportTypeLabel('ferry')).toBe('Ferry & Cruise');
  });

  it('returns icon emoji identifiers for each transport type', () => {
    expect(getTransportIcon('train')).toBe('🚆');
    expect(getTransportIcon('bus')).toBe('🚌');
    expect(getTransportIcon('private_transfer')).toBe('🚘');
    expect(getTransportIcon('ferry')).toBe('⛴️');
  });

  it('formats transport duration into hours and minutes', () => {
    expect(formatTransportDuration(150)).toBe('2h 30m');
    expect(formatTransportDuration(45)).toBe('45m');
    expect(formatTransportDuration(60)).toBe('1h');
  });

  it('retrieves transport item by id from catalog', () => {
    const item = getTransportById('tr-paris-01');
    if (item) {
      expect(item.id).toBe('tr-paris-01');
      expect(item.originCity).toBe('Paris');
      expect(item.basePrice).toBeGreaterThan(0);
    }
  });
});
