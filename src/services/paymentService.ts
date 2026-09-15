import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createAlert } from './alertService';

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------
export type PaymentMethod = 'credit_card' | 'apple_pay' | 'google_pay' | 'paypal' | 'upi_qr';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface PaymentRecord {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  transaction_reference: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface InitiatePaymentParams {
  bookingId: string;
  amount: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface CardDetails {
  cardNumber: string;
  cardHolder: string;
  expiryDate: string; // MM/YY
  cvv: string;
  postalCode?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  transactionReference?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Supabase Client Initialization (Matching authService & flightService pattern)
// ---------------------------------------------------------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

// ---------------------------------------------------------------------------
// Transaction Reference Generator (Standard: TXN-YYYYMMDD-XXXXXX)
// ---------------------------------------------------------------------------
export function generateTransactionReference(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateSegment = `${year}${month}${day}`;

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randSegment = '';
  for (let i = 0; i < 6; i++) {
    randSegment += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `TXN-${dateSegment}-${randSegment}`;
}

// ---------------------------------------------------------------------------
// 1. Initiate Payment (Creates a Pending Payment Record)
// ---------------------------------------------------------------------------
export async function initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult> {
  const {
    bookingId,
    amount,
    currency = 'USD',
    paymentMethod,
    userId,
    metadata = {},
  } = params;

  const transactionReference = generateTransactionReference();

  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = user?.id || userId;

      if (!targetUserId) {
        console.error('[PaymentService] initiatePayment error: Missing authenticated user.');
        return { success: false, error: 'User must be authenticated to initiate payment.' };
      }

      const { data: payment, error: pErr } = await supabase
        .from('payments')
        .insert([{
          booking_id: bookingId,
          user_id: targetUserId,
          amount,
          currency,
          status: 'pending',
          payment_method: paymentMethod,
          transaction_reference: transactionReference,
          metadata,
        }])
        .select()
        .single();

      if (pErr || !payment) {
        console.error('[PaymentService] Failed to insert pending payment into Supabase:', pErr);
        return { success: false, error: `Failed to initiate payment: ${pErr?.message || 'Database error'}` };
      }

      return {
        success: true,
        paymentId: payment.id,
        transactionReference: payment.transaction_reference,
      };
    } catch (err) {
      console.error('[PaymentService] Unexpected error during initiatePayment:', err);
      return { success: false, error: 'An unexpected error occurred while initiating payment.' };
    }
  }

  // Preview / Offline Mock Mode
  const mockPaymentId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  return {
    success: true,
    paymentId: mockPaymentId,
    transactionReference,
  };
}

// ---------------------------------------------------------------------------
// 2. Confirm Payment (Settlement & Linked Booking Confirmation)
// ---------------------------------------------------------------------------
/**
 * MOCK / SIMULATED PAYMENT GATEWAY SETTLEMENT
 * Note: A mock gateway authorization and latency is simulated here for VPM-68.
 * Real payment gateway integration (Stripe / Razorpay / Adyen) is scheduled
 * for future task VPM-82 (Integrate Payment Gateway).
 */
export async function confirmPayment(
  paymentId: string,
  bookingId: string,
  bookingDetails?: {
    bookingReference: string;
    bookingType: 'flight' | 'hotel' | 'transport';
    title: string;
    description: string;
    userId?: string;
  }
): Promise<PaymentResult> {
  // Simulate payment gateway settlement latency (800ms)
  await new Promise((r) => setTimeout(r, 800));

  if (supabase) {
    try {
      // 1. Update Payment Status to 'completed'
      const { data: payment, error: pErr } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId)
        .select()
        .single();

      if (pErr || !payment) {
        console.error('[PaymentService] Failed to confirm payment in Supabase:', pErr);
        return { success: false, error: `Payment authorization failed: ${pErr?.message || 'Database error'}` };
      }

      // 2. Update linked Booking Status to 'confirmed' and payment_status to 'paid'
      const { error: bErr } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          payment_reference: payment.transaction_reference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (bErr) {
        console.error('[PaymentService] Failed to update linked booking status:', bErr);
        return { success: false, error: `Failed to confirm linked reservation: ${bErr.message}` };
      }

      return {
        success: true,
        paymentId: payment.id,
        transactionReference: payment.transaction_reference,
      };
    } catch (err) {
      console.error('[PaymentService] Unexpected error in confirmPayment:', err);
      return { success: false, error: 'An unexpected error occurred during payment confirmation.' };
    }
  }

  // Preview / Offline Mode
  const fallbackRef = generateTransactionReference();

  // Trigger booking confirmation alert via alertService
  if (bookingDetails) {
    await createAlert({
      user_id: bookingDetails.userId || 'usr-demo-01',
      booking_id: bookingId,
      booking_reference: bookingDetails.bookingReference,
      booking_type: bookingDetails.bookingType,
      title: `${bookingDetails.bookingType === 'flight' ? 'Flight' : 'Hotel'} Booking Confirmed`,
      message: `${bookingDetails.description} (Payment Ref: ${fallbackRef})`,
      severity: 'success',
      old_status: 'pending',
      new_status: 'confirmed',
    });
  }

  return {
    success: true,
    paymentId,
    transactionReference: fallbackRef,
  };
}

// ---------------------------------------------------------------------------
// Card Validation & Helper Utilities
// ---------------------------------------------------------------------------
export function detectCardBrand(number: string): 'visa' | 'mastercard' | 'amex' | 'discover' | 'generic' {
  const clean = number.replace(/\s+/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^5[1-5]/.test(clean)) return 'mastercard';
  if (/^3[47]/.test(clean)) return 'amex';
  if (/^6(?:011|5)/.test(clean)) return 'discover';
  return 'generic';
}

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').substring(0, 16);
  const parts = digits.match(/.{1,4}/g);
  return parts ? parts.join(' ') : digits;
}

export function formatExpiryDate(value: string): string {
  const digits = value.replace(/\D/g, '').substring(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  }
  return digits;
}
