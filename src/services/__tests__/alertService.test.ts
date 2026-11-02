import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchAlerts,
  createAlert,
  markAlertAsRead,
  markAllAlertsAsRead,
  updateBookingStatus,
} from '../alertService';
import * as apiClient from '../apiClient';

describe('alertService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('fetches alerts from API or falls back to local storage', async () => {
    vi.spyOn(apiClient, 'apiRequest').mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const alerts = await fetchAlerts('usr-demo-01');
    expect(Array.isArray(alerts)).toBe(true);
    expect(alerts.length).toBeGreaterThanOrEqual(1);
  });

  it('creates a new operational alert and prepends to stored list', async () => {
    vi.spyOn(apiClient, 'apiRequest').mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const newAlert = await createAlert({
      booking_id: 'bkg-fl-001',
      title: 'Gate Change Notice',
      message: 'Flight LX-18 now boarding at Gate B24',
      severity: 'info',
      booking_reference: 'VOY-FL-185568',
      booking_type: 'flight',
      user_id: 'usr-demo-01',
      new_status: 'confirmed',
    });

    expect(newAlert.id).toBeDefined();
    expect(newAlert.title).toBe('Gate Change Notice');
    expect(newAlert.is_read).toBe(false);

    const all = await fetchAlerts('usr-demo-01');
    expect(all[0].id).toBe(newAlert.id);
  });

  it('marks an alert as read', async () => {
    const alerts = await fetchAlerts('usr-demo-01');
    const target = alerts[0];

    const success = await markAlertAsRead(target.id);
    expect(success).toBe(true);

    const refreshed = await fetchAlerts('usr-demo-01');
    const found = refreshed.find((a) => a.id === target.id);
    expect(found?.is_read).toBe(true);
  });

  it('marks all alerts as read for user', async () => {
    const success = await markAllAlertsAsRead('usr-demo-01');
    expect(success).toBe(true);

    const refreshed = await fetchAlerts('usr-demo-01');
    expect(refreshed.every((a) => a.is_read)).toBe(true);
  });

  it('updates booking status and generates an alert notification', async () => {
    const res = await updateBookingStatus('bkg-fl-001', 'delayed', 'Flight delayed by 45 minutes');

    expect(res.success).toBe(true);
    expect(res.alert).toBeDefined();
    expect(res.alert?.title).toBe('Schedule Update / Delay');
  });
});
