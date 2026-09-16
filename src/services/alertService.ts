import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type BookingStatus = 'pending' | 'confirmed' | 'delayed' | 'cancelled' | 'completed';
export type BookingType = 'flight' | 'hotel' | 'transport' | 'package';
export type AlertSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface BookingAlert {
  id: string;
  user_id: string;
  booking_id: string;
  booking_reference: string;
  booking_type: BookingType;
  title: string;
  message: string;
  severity: AlertSeverity;
  old_status?: BookingStatus;
  new_status: BookingStatus;
  is_read: boolean;
  created_at: string;
}

export interface NewAlertInput {
  user_id?: string;
  booking_id: string;
  booking_reference: string;
  booking_type: BookingType;
  title: string;
  message: string;
  severity: AlertSeverity;
  old_status?: BookingStatus;
  new_status: BookingStatus;
}

// ---------------------------------------------------------------------------
// Supabase Client Initialization (Matching authService pattern)
// ---------------------------------------------------------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

// ---------------------------------------------------------------------------
// In-Memory & LocalStorage Mock Engine for Preview / Offline Mode
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'voyana.booking_alerts';

const initialMockAlerts: BookingAlert[] = [
  {
    id: 'alt-001',
    user_id: 'usr-demo-01',
    booking_id: 'bk-fl-881',
    booking_reference: 'VYN-FL881',
    booking_type: 'flight',
    title: 'Flight Delay Notification',
    message: 'Air France AF1024 (Paris CDG → Tokyo HND) is delayed by 45 mins due to air traffic control. Estimated departure now 14:15.',
    severity: 'warning',
    old_status: 'confirmed',
    new_status: 'delayed',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 mins ago
  },
  {
    id: 'alt-002',
    user_id: 'usr-demo-01',
    booking_id: 'bk-ht-420',
    booking_reference: 'VYN-HT420',
    booking_type: 'hotel',
    title: 'Hotel Booking Confirmed',
    message: 'Your stay at Hotel Ritz Paris (Standard Deluxe Suite) has been confirmed for Sep 14 - Sep 18. Check-in from 15:00.',
    severity: 'success',
    old_status: 'pending',
    new_status: 'confirmed',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 140).toISOString(), // ~2.3 hours ago
  },
  {
    id: 'alt-003',
    user_id: 'usr-demo-01',
    booking_id: 'bk-tr-109',
    booking_reference: 'VYN-TR109',
    booking_type: 'transport',
    title: 'Private Transfer Scheduled',
    message: 'Your VIP Mercedes sedan transfer from CDG Terminal 2E to Hotel Ritz Paris is scheduled with driver Jean-Luc.',
    severity: 'info',
    old_status: 'pending',
    new_status: 'confirmed',
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
];

function getStoredMockAlerts(): BookingAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMockAlerts));
      return initialMockAlerts;
    }
    return JSON.parse(raw);
  } catch {
    return initialMockAlerts;
  }
}

function saveStoredMockAlerts(alerts: BookingAlert[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    /* storage unavailable */
  }
}

// Listeners for in-memory event dispatching during preview mode
type AlertSubscriber = (alert: BookingAlert) => void;
const subscribers = new Set<AlertSubscriber>();

// ---------------------------------------------------------------------------
// Public Service API
// ---------------------------------------------------------------------------

/**
 * Fetch all alerts for the current user.
 */
export async function fetchAlerts(userId?: string): Promise<BookingAlert[]> {
  if (supabase) {
    let query = supabase
      .from('booking_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Failed to fetch alerts from Supabase:', error);
      return [];
    }
    return data as BookingAlert[];
  }

  // Preview mode fallback
  const alerts = getStoredMockAlerts();
  return alerts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Mark a single alert as read.
 */
export async function markAlertAsRead(alertId: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase
      .from('booking_alerts')
      .update({ is_read: true })
      .eq('id', alertId);

    if (error) {
      console.error('Failed to mark alert as read:', error);
      return false;
    }
    return true;
  }

  // Preview mode
  const alerts = getStoredMockAlerts();
  const updated = alerts.map((a) => (a.id === alertId ? { ...a, is_read: true } : a));
  saveStoredMockAlerts(updated);
  return true;
}

/**
 * Mark all alerts as read for the user.
 */
export async function markAllAlertsAsRead(userId?: string): Promise<boolean> {
  if (supabase) {
    let query = supabase
      .from('booking_alerts')
      .update({ is_read: true })
      .eq('is_read', false);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query;
    if (error) {
      console.error('Failed to mark all alerts as read:', error);
      return false;
    }
    return true;
  }

  // Preview mode
  const alerts = getStoredMockAlerts();
  const updated = alerts.map((a) => ({ ...a, is_read: true }));
  saveStoredMockAlerts(updated);
  return true;
}

/**
 * Programmatically create an alert (used by triggers, Edge Functions, or manual simulation).
 */
export async function createAlert(input: NewAlertInput): Promise<BookingAlert> {
  const newAlert: BookingAlert = {
    id: `alt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: input.user_id || 'usr-demo-01',
    booking_id: input.booking_id,
    booking_reference: input.booking_reference,
    booking_type: input.booking_type,
    title: input.title,
    message: input.message,
    severity: input.severity,
    old_status: input.old_status,
    new_status: input.new_status,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('booking_alerts')
      .insert([newAlert])
      .select()
      .single();

    if (error) {
      console.error('Failed to create alert in Supabase:', error);
      throw error;
    }
    return data as BookingAlert;
  }

  // Preview mode
  const alerts = getStoredMockAlerts();
  const updated = [newAlert, ...alerts];
  saveStoredMockAlerts(updated);

  // Notify active listeners
  subscribers.forEach((cb) => cb(newAlert));

  return newAlert;
}

/**
 * Simulate or trigger a booking status change (triggers the automated alert pipeline).
 */
export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  reason?: string
): Promise<{ success: boolean; alert?: BookingAlert }> {
  if (supabase) {
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, user_id, booking_reference, booking_type, status')
      .eq('id', bookingId)
      .single();

    if (fetchErr || !booking) {
      console.error('Could not find booking to update:', fetchErr);
      return { success: false };
    }

    const oldStatus = booking.status as BookingStatus;
    const { error: updateErr } = await supabase
      .from('bookings')
      .update({
        status: newStatus,
        metadata: {
          previous_status: oldStatus,
          status_change_reason: reason || 'Manual update',
        },
      })
      .eq('id', bookingId);

    if (updateErr) {
      console.error('Failed to update booking status in Supabase:', updateErr);
      return { success: false };
    }

    return { success: true };
  }

  // Preview mode simulation
  const alerts = getStoredMockAlerts();
  const existingAlert = alerts.find((a) => a.booking_id === bookingId) || alerts[0];

  let title = 'Booking Status Updated';
  let message = `Reservation ${existingAlert?.booking_reference || 'VYN-BK01'} status updated to ${newStatus}.`;
  let severity: AlertSeverity = 'info';

  if (newStatus === 'confirmed') {
    title = 'Booking Confirmed';
    message = `Reservation ${existingAlert?.booking_reference || 'VYN-BK01'} has been confirmed. Tickets are ready!`;
    severity = 'success';
  } else if (newStatus === 'delayed') {
    title = 'Schedule Update / Delay';
    message = `Reservation ${existingAlert?.booking_reference || 'VYN-BK01'} is experiencing a delay: ${reason || 'Technical check'}.`;
    severity = 'warning';
  } else if (newStatus === 'cancelled') {
    title = 'Booking Cancelled';
    message = `Reservation ${existingAlert?.booking_reference || 'VYN-BK01'} was cancelled. Refund processed.`;
    severity = 'critical';
  }

  const generatedAlert = await createAlert({
    user_id: existingAlert?.user_id || 'usr-demo-01',
    booking_id: bookingId,
    booking_reference: existingAlert?.booking_reference || 'VYN-BK01',
    booking_type: existingAlert?.booking_type || 'flight',
    title,
    message,
    severity,
    old_status: existingAlert?.new_status || 'pending',
    new_status: newStatus,
  });

  return { success: true, alert: generatedAlert };
}

/**
 * Subscribe to realtime alerts via Supabase Realtime channel,
 * with fallback to local event bus in preview mode.
 */
export function subscribeToAlerts(
  userId: string | undefined,
  onAlert: (alert: BookingAlert) => void
): () => void {
  if (supabase) {
    const channel = supabase
      .channel('booking_alerts_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_alerts',
          filter: userId ? `user_id=eq.${userId}` : undefined,
        },
        (payload) => {
          onAlert(payload.new as BookingAlert);
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }

  // Preview mode local subscription
  subscribers.add(onAlert);
  return () => {
    subscribers.delete(onAlert);
  };
}
