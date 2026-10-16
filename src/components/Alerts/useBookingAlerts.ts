/**
 * Booking Alerts Custom Hook
 * Manages real-time booking alert state, toast notifications,
 * read/unread tracking, and booking status simulation.
 */

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

// Extended alert with unique toast identifier
export interface ToastNotification extends BookingAlert {
  toastId: string;
}

export function useBookingAlerts(userId?: string) {
  const [alerts, setAlerts] = useState<BookingAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Fetch all alerts from the service on mount/refresh
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

  // Subscribe to real-time push alerts
  useEffect(() => {
    const unsubscribe = subscribeToAlerts(userId, (newAlert) => {
      setAlerts((prev) => [newAlert, ...prev]);

      // Create a temporary toast notification
      const toastItem: ToastNotification = {
        ...newAlert,
        toastId: `toast-${Date.now()}-${Math.random()}`,
      };

      setToasts((prev) => [toastItem, ...prev.slice(0, 2)]);

      // Auto-dismiss toast after 6 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.toastId !== toastItem.toastId));
      }, 6000);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  // Mark a single alert as read
  const handleMarkAsRead = async (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a))
    );
    await markAlertAsRead(alertId);
  };

  // Mark all alerts as read at once
  const handleMarkAllAsRead = async () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    await markAllAlertsAsRead(userId);
  };

  // Remove a toast from the visible stack
  const dismissToast = (toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  };

  // Trigger a booking status change and generate a new alert
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
