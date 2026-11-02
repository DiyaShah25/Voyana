import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDestinations,
  getDestinationsByRegion,
  LOCAL_DESTINATIONS_KEY,
} from '../destinationService';
import * as apiClient from '../apiClient';

describe('destinationService', () => {
  const mockDestinations = [
    { id: 'dst-1', name: 'Paris', country: 'France', region: 'Europe' },
    { id: 'dst-2', name: 'Tokyo', country: 'Japan', region: 'Asia' },
  ] as any[];

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getDestinations', () => {
    it('fetches destinations from API and updates localStorage cache', async () => {
      vi.spyOn(apiClient, 'apiRequest').mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { ok: true, count: 2, destinations: mockDestinations },
      });

      const result = await getDestinations([]);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Paris');

      // Verify localStorage was updated
      const cached = JSON.parse(localStorage.getItem(LOCAL_DESTINATIONS_KEY) || '[]');
      expect(cached).toHaveLength(2);
    });

    it('falls back to localStorage cache on API network failure', async () => {
      const cachedList = [{ id: 'dst-cached', name: 'Zermatt', country: 'Switzerland' }] as any[];
      localStorage.setItem(LOCAL_DESTINATIONS_KEY, JSON.stringify(cachedList));

      vi.spyOn(apiClient, 'apiRequest').mockResolvedValueOnce({
        ok: false,
        status: 0,
        error: 'Network failure',
      });

      const result = await getDestinations([]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Zermatt');
    });

    it('falls back to provided fallbackList when API fails and localStorage is empty', async () => {
      vi.spyOn(apiClient, 'apiRequest').mockResolvedValueOnce({
        ok: false,
        status: 500,
        error: 'Server error',
      });

      const fallback = [{ id: 'dst-fallback', name: 'Rome', country: 'Italy' }] as any[];
      const result = await getDestinations(fallback);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Rome');
    });
  });

  describe('getDestinationsByRegion', () => {
    it('fetches region-filtered destinations using query param', async () => {
      const apiSpy = vi.spyOn(apiClient, 'apiRequest').mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { ok: true, count: 1, destinations: [mockDestinations[1]] },
      });

      const result = await getDestinationsByRegion('Asia', mockDestinations);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Tokyo');
      expect(apiSpy).toHaveBeenCalledWith('/api/destinations?region=Asia');
    });

    it('filters fallback list by region when API fails', async () => {
      vi.spyOn(apiClient, 'apiRequest').mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await getDestinationsByRegion('Europe', mockDestinations);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Paris');
    });
  });
});

