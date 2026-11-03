import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiRequest, getStoredAuthToken, API_BASE_URL } from '../apiClient';

describe('apiClient', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getStoredAuthToken', () => {
    it('returns null when no session is in localStorage', () => {
      expect(getStoredAuthToken()).toBeNull();
    });

    it('returns token from valid voyana.auth_session JSON in localStorage', () => {
      localStorage.setItem('voyana.auth_session', JSON.stringify({ token: 'mock-jwt-token-123' }));
      expect(getStoredAuthToken()).toBe('mock-jwt-token-123');
    });

    it('returns null gracefully when localStorage contains invalid JSON', () => {
      localStorage.setItem('voyana.auth_session', '{invalid-json');
      expect(getStoredAuthToken()).toBeNull();
    });
  });

  describe('apiRequest', () => {
    it('executes successful GET request and attaches Bearer token if present', async () => {
      localStorage.setItem('voyana.auth_session', JSON.stringify({ token: 'test-token-abc' }));

      const mockData = { ok: true, data: [{ id: 'item-1' }] };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      } as any);

      const res = await apiRequest('/api/trips');

      expect(res.ok).toBe(true);
      expect(res.status).toBe(200);
      expect(res.data).toEqual(mockData);

      expect(fetchSpy).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/trips`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-abc',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('handles HTTP error responses (e.g. 404, 500) and extracts error message', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Trip not found' }),
      } as any);

      const res = await apiRequest('/api/trips/unknown-id');

      expect(res.ok).toBe(false);
      expect(res.status).toBe(404);
      expect(res.error).toBe('Trip not found');
    });

    it('handles network failure gracefully and returns status 0 with error message', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Failed to fetch'));

      const res = await apiRequest('/api/health');

      expect(res.ok).toBe(false);
      expect(res.status).toBe(0);
      expect(res.error).toBe('Failed to fetch');
    });

    it('handles AbortError timeout appropriately', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);

      const res = await apiRequest('/api/heavy-task', {}, 50);

      expect(res.ok).toBe(false);
      expect(res.status).toBe(0);
      expect(res.error).toBe('Request timed out');
    });
  });
});

