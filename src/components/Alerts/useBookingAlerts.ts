import { useState, useEffect, useCallback } from 'react';
import {
  fetchAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
  subscribeToAlerts,
  updateBookingStatus,
  type BookingAlert,
  type BookingStatus,
} from '@/services/alertService';

export interface ToastNotification extends BookingAlert {
  toastId: string;
}

export function useBookingAlerts(userId?: string) {
  const [alerts, setAlerts] = useState<BookingAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Load initial alerts
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAlerts(userId);
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to real-time alerts
  useEffect(() => {
    const unsubscribe = subscribeToAlerts(userId, (newAlert) => {
      setAlerts((prev) => [newAlert, ...prev]);

      // Trigger temporary toast
      const toastItem: ToastNotification = {
        ...newAlert,
        toastId: `toast-${Date.now()}-${Math.random()}`,
      };

      setToasts((prev) => [toastItem, ...prev.slice(0, 2)]); // Keep at most 3 active toasts

      // Auto-dismiss after 6 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.toastId !== toastItem.toastId));
      }, 6000);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const handleMarkAsRead = async (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a))
    );
    await markAlertAsRead(alertId);
  };

  const handleMarkAllAsRead = async () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    await markAllAlertsAsRead(userId);
  };

  const dismissToast = (toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  };

  const simulateStatusChange = async (
    bookingId: string,
    newStatus: BookingStatus,
    reason?: string
  ) => {
    return await updateBookingStatus(bookingId, newStatus, reason);
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return {
    alerts,
    unreadCount,
    loading,
    toasts,
    refresh,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    dismissToast,
    simulateStatusChange,
  };
}
