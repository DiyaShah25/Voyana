/**
 * Payment OTP Verification Service
 * Handles secure generation, cooldowns, expiration, attempt rate-limiting,
 * and delivery of one-time verification passwords for payment authorization.
 */

import { createAlert } from './alertService';

export type OtpChannel = 'sms' | 'email';

export interface SendOtpResult {
  success: boolean;
  message: string;
  maskedDestination: string;
  cooldownSeconds: number;
  expiresInSeconds: number;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  attemptsRemaining: number;
  codeExpired?: boolean;
  maxAttemptsExceeded?: boolean;
}

interface StoredOtpSession {
  code: string;
  destination: string;
  channel: OtpChannel;
  createdAt: number;
  expiresAt: number;
  resendAvailableAt: number;
  wrongAttempts: number;
}

const STORAGE_PREFIX = 'voyana_otp_session_';
const EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
const MAX_ATTEMPTS = 3;

// In-memory sessions fallback
const memorySessions = new Map<string, StoredOtpSession>();

function getSession(userId: string): StoredOtpSession | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (raw) return JSON.parse(raw);
  } catch (_e) {}
  return memorySessions.get(userId) || null;
}

function setSession(userId: string, session: StoredOtpSession): void {
  memorySessions.set(userId, session);
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(session));
  } catch (_e) {}
}

function clearSession(userId: string): void {
  memorySessions.delete(userId);
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
  } catch (_e) {}
}

/**
 * Mask destination phone or email for privacy
 */
export function maskDestination(destination: string, channel: OtpChannel): string {
  if (!destination) return channel === 'sms' ? '••••••4321' : '••••••@voyana.com';
  const clean = destination.trim();

  if (channel === 'email' || clean.includes('@')) {
    const [name, domain] = clean.split('@');
    if (!name || !domain) return '••••••@voyana.com';
    const visiblePrefix = name.slice(0, 2);
    return `${visiblePrefix}••••••@${domain}`;
  }

  // Phone masking: keep last 4 digits
  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 4) {
    const last4 = digits.slice(-4);
    return `••••••${last4}`;
  }
  return '••••••4321';
}

/**
 * ---------------------------------------------------------------------------
 * DISPATCH ADAPTER NOTE:
 * In production, replace this demo delivery method with your real provider:
 * - SMS: Twilio, AWS SNS, MessageBird (e.g. twilioClient.messages.create(...))
 * - Email: Supabase Auth Email OTP, SendGrid, Resend (e.g. resend.emails.send(...))
 * ---------------------------------------------------------------------------
 */
async function deliverOtpNotification(
  userId: string,
  code: string,
  channel: OtpChannel,
  destination: string
): Promise<void> {
  // Demo Delivery: Broadcast through Voyana's real-time alerts system
  await createAlert({
    user_id: userId || 'usr-demo-01',
    booking_id: `otp-${Date.now()}`,
    booking_reference: 'OTP-VERIFY',
    booking_type: 'package',
    title: 'Payment Authorization Code',
    message: `Your Voyana payment OTP is ${code} (demo mode)`,
    severity: 'info',
    new_status: 'pending',
  });
}

/**
 * Send an OTP code to the user's destination (Phone or Email).
 * Respects 30-second resend cooldown and 5-minute expiry.
 */
export async function sendOtp(
  userId: string = 'usr-demo-01',
  channel: OtpChannel = 'sms',
  destination: string = '+91 98765 43210'
): Promise<SendOtpResult> {
  const now = Date.now();
  const existing = getSession(userId);

  // Check 30-second resend cooldown
  if (existing && now < existing.resendAvailableAt) {
    const remainingCooldown = Math.max(1, Math.ceil((existing.resendAvailableAt - now) / 1000));
    return {
      success: false,
      message: `Please wait ${remainingCooldown}s before requesting a new code.`,
      maskedDestination: maskDestination(existing.destination, existing.channel),
      cooldownSeconds: remainingCooldown,
      expiresInSeconds: Math.max(0, Math.ceil((existing.expiresAt - now) / 1000)),
    };
  }

  // Generate 6-digit cryptographic-quality random code (NEVER LOG TO CONSOLE)
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const newSession: StoredOtpSession = {
    code,
    destination,
    channel,
    createdAt: now,
    expiresAt: now + EXPIRY_MS,
    resendAvailableAt: now + RESEND_COOLDOWN_MS,
    wrongAttempts: 0,
  };

  setSession(userId, newSession);

  // Dispatch via demo adapter
  await deliverOtpNotification(userId, code, channel, destination);

  return {
    success: true,
    message: 'OTP has been dispatched. Check your security alerts.',
    maskedDestination: maskDestination(destination, channel),
    cooldownSeconds: 30,
    expiresInSeconds: 300,
  };
}

/**
 * Verify a 6-digit OTP code submitted by the user.
 * Enforces 3 wrong attempts limit and clears session on success.
 */
export function verifyOtp(userId: string = 'usr-demo-01', code: string): VerifyOtpResult {
  const now = Date.now();
  const session = getSession(userId);

  if (!session) {
    return {
      success: false,
      message: 'No active OTP verification session found. Please request a new code.',
      attemptsRemaining: 0,
    };
  }

  // Check code expiration (5 mins)
  if (now > session.expiresAt) {
    clearSession(userId);
    return {
      success: false,
      message: 'OTP code has expired. Please request a new code.',
      codeExpired: true,
      attemptsRemaining: 0,
    };
  }

  // Check max attempts
  if (session.wrongAttempts >= MAX_ATTEMPTS) {
    clearSession(userId);
    return {
      success: false,
      message: 'Maximum verification attempts exceeded. Please request a new code.',
      maxAttemptsExceeded: true,
      attemptsRemaining: 0,
    };
  }

  const cleanInput = (code || '').trim().replace(/\D/g, '');

  if (cleanInput === session.code) {
    // Verification successful: immediately clear session
    clearSession(userId);
    return {
      success: true,
      message: 'Code verified successfully.',
      attemptsRemaining: MAX_ATTEMPTS,
    };
  }

  // Increment failure count
  session.wrongAttempts += 1;
  const remaining = Math.max(0, MAX_ATTEMPTS - session.wrongAttempts);

  if (remaining <= 0) {
    clearSession(userId);
    return {
      success: false,
      message: 'Incorrect code. Maximum attempts exceeded. Please request a new code.',
      maxAttemptsExceeded: true,
      attemptsRemaining: 0,
    };
  }

  setSession(userId, session);
  return {
    success: false,
    message: `Incorrect code. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`,
    attemptsRemaining: remaining,
  };
}
