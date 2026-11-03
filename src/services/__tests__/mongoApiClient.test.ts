import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkMongoBackend,
  getTripsFromMongo,
  saveTripToMongo,
  getBookingsFromMongo,
  createBookingInMongo,
  updateBookingStatusInMongo,
  getExpensesFromMongo,
  createExpenseInMongo,
  getPackingFromMongo,
  savePackingToMongo,
  getAlertsFromMongo,
  createAlertInMongo,
  markAlertReadInMongo,
} from '../mongoApiClient';

describe('mongoApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkMongoBackend', () => {
    it('returns reachable: true and mongoStatus when backend responds 200', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mongoConnection: 'connected' }),
      } as any);

      const res = await checkMongoBackend();
      expect(res.reachable).toBe(true);
      expect(res.mongoStatus).toBe('connected');
    });

    it('returns reachable: false when fetch rejects with network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Connection refused'));

      const res = await checkMongoBackend();
      expect(res.reachable).toBe(false);
    });
  });

  describe('Trips API calls', () => {
    it('getTripsFromMongo returns array on success', async () => {
      const mockTrips = [{ id: 't1', title: 'Alpine Expedition' }];
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: mockTrips }),
      } as any);

      const res = await getTripsFromMongo();
      expect(res).toEqual(mockTrips);
    });

    it('saveTripToMongo returns true on 200/201 response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
      } as any);

      const success = await saveTripToMongo({ title: 'New Trip' });
      expect(success).toBe(true);
    });

    it('saveTripToMongo returns false on fetch error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const success = await saveTripToMongo({ title: 'New Trip' });
      expect(success).toBe(false);
    });
  });

  describe('Bookings API calls', () => {
    it('getBookingsFromMongo includes userId query param when supplied', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as any);

      await getBookingsFromMongo('usr-123');
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/bookings?userId=usr-123'),
        expect.any(Object)
      );
    });

    it('createBookingInMongo returns created booking data', async () => {
      const mockBooking = { id: 'bkg-1', bookingReference: 'VOY-FL-123456' };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockBooking }),
      } as any);

      const res = await createBookingInMongo(mockBooking);
      expect(res).toEqual(mockBooking);
    });

    it('updateBookingStatusInMongo sends PUT with status and note', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
      } as any);

      const ok = await updateBookingStatusInMongo('bkg-1', 'cancelled', 'User requested');
      expect(ok).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/bookings/bkg-1/status'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'cancelled', note: 'User requested' }),
        })
      );
    });
  });

  describe('Expenses, Packing, and Alerts calls', () => {
    it('getExpensesFromMongo returns null on HTTP error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
      } as any);

      const res = await getExpensesFromMongo('trip-999');
      expect(res).toBeNull();
    });

    it('createExpenseInMongo returns true on success', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
      } as any);

      const ok = await createExpenseInMongo({ amount: 120 });
      expect(ok).toBe(true);
    });

    it('getPackingFromMongo returns packing checklist payload', async () => {
      const mockPacking = { categories: ['Clothing'] };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPacking }),
      } as any);

      const res = await getPackingFromMongo('trip-1');
      expect(res).toEqual(mockPacking);
    });

    it('savePackingToMongo returns true on successful save', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true } as any);
      const res = await savePackingToMongo('trip-1', {});
      expect(res).toBe(true);
    });

    it('getAlertsFromMongo returns alert list', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'alt-1' }] }),
      } as any);

      const res = await getAlertsFromMongo('usr-1');
      expect(res).toHaveLength(1);
    });

    it('createAlertInMongo and markAlertReadInMongo handle operations successfully', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as any);

      const createOk = await createAlertInMongo({ title: 'Alert' });
      expect(createOk).toBe(true);

      const markOk = await markAlertReadInMongo('alt-1');
      expect(markOk).toBe(true);
    });
  });
});

