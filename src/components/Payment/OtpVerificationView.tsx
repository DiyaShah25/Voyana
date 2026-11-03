/**
 * OTP Verification View Component
 * Provides 6-digit input boxes with auto-focus, paste support,
 * countdown timer, resend cooldown, attempt tracking, and demo alert integration.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Bell,
  Clock,
} from 'lucide-react';
import { sendOtp, verifyOtp, type OtpChannel } from '@/services/otpService';
import { formatCurrency } from '@/services/currencyService';

export interface OtpVerificationViewProps {
  userId?: string;
  destination?: string;
  channel?: OtpChannel;
  amount: number;
  currency?: string;
  bookingReference: string;
  onVerified: () => Promise<void> | void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export const OtpVerificationView: React.FC<OtpVerificationViewProps> = ({
  userId = 'usr-demo-01',
  destination = '+91 98765 43210',
  channel = 'sms',
  amount,
  currency = 'USD',
  bookingReference,
  onVerified,
  onCancel,
  isProcessing = false,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [maskedDest, setMaskedDest] = useState<string>('••••••4321');
  const [expiresIn, setExpiresIn] = useState<number>(300); // 5 min
  const [resendCooldown, setResendCooldown] = useState<number>(30); // 30s
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(3);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Dispatch initial OTP on mount
  const handleSendInitial = useCallback(async () => {
    setIsSending(true);
    setErrorMessage(null);
    try {
      const res = await sendOtp(userId, channel, destination);
      setMaskedDest(res.maskedDestination);
      setResendCooldown(res.cooldownSeconds || 30);
      setExpiresIn(res.expiresInSeconds || 300);
      if (!res.success && res.message) {
        setErrorMessage(res.message);
      }
    } catch (_err) {
      setErrorMessage('Failed to dispatch security code. Please retry.');
    } finally {
      setIsSending(false);
    }
  }, [userId, channel, destination]);

  useEffect(() => {
    handleSendInitial();
    // Auto-focus first input
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, [handleSendInitial]);

  // Timers
  useEffect(() => {
    const timer = setInterval(() => {
      setExpiresIn((s) => (s > 0 ? s - 1 : 0));
      setResendCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `0${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    const lastChar = clean.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = lastChar;
    setDigits(newDigits);
    setErrorMessage(null);

    // Auto-advance focus
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setDigits(newDigits);
    setErrorMessage(null);

    const nextIndex = Math.min(5, pasted.length);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isSending) return;
    setIsSending(true);
    setErrorMessage(null);
    try {
      const res = await sendOtp(userId, channel, destination);
      setMaskedDest(res.maskedDestination);
      setResendCooldown(res.cooldownSeconds || 30);
      setExpiresIn(res.expiresInSeconds || 300);
      setAttemptsRemaining(3);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      if (!res.success) {
        setErrorMessage(res.message);
      }
    } catch (_err) {
      setErrorMessage('Could not resend OTP. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const fullCode = digits.join('');
  const isComplete = fullCode.length === 6;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isComplete || isVerifying || isProcessing) return;

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const result = verifyOtp(userId, fullCode);

      if (!result.success) {
        setErrorMessage(result.message);
        setAttemptsRemaining(result.attemptsRemaining);
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setIsVerifying(false);
        return;
      }

      // Verification succeeded -> trigger payment confirmation
      await onVerified();
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please retry.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Security Header Banner */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 shadow-sm">
          <ShieldCheck size={20} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Security Authorization Required</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-emerald-800 font-bold border border-emerald-200">
              {bookingReference}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            A 6-digit confirmation code was dispatched to{' '}
            <b className="text-slate-900 font-mono">{maskedDest}</b> to authorize{' '}
            <span className="font-bold text-emerald-800">{formatCurrency(amount, currency)}</span>.
          </p>
        </div>
      </div>

      {/* Demo Notification Guidance Banner */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 text-xs text-amber-900">
        <Bell size={15} className="text-amber-700 flex-shrink-0 animate-bounce" />
        <p className="text-[11px] leading-tight">
          <b>Demo Mode Active:</b> Your OTP code has been delivered to the <b>Alerts Bell 🔔</b> in the header above.
        </p>
      </div>

      {/* 6 Digit Input Boxes */}
      <div className="py-2">
        <label className="block text-center text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">
          Enter 6-Digit One-Time Password
        </label>
        <div className="flex justify-center items-center gap-2 sm:gap-3">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              disabled={isVerifying || isProcessing}
              className={`w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono rounded-xl border transition-all outline-none ${
                digit
                  ? 'bg-emerald-50/50 border-emerald-500 text-emerald-900 shadow-sm ring-1 ring-emerald-500/30'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Expiration Countdown & Cooldown Resend */}
      <div className="flex items-center justify-between text-xs px-1 text-slate-500">
        <div className="flex items-center gap-1.5 font-mono">
          <Clock size={13} className="text-emerald-700" />
          <span>
            Code expires in <b className="text-slate-800">{formatTimer(expiresIn)}</b>
          </span>
        </div>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || isSending || isProcessing}
          className="font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
        >
          {isSending ? (
            <>
              <RefreshCw size={12} className="animate-spin" />
              <span>Sending...</span>
            </>
          ) : resendCooldown > 0 ? (
            <span>Resend code in {resendCooldown}s</span>
          ) : (
            <span>Resend code</span>
          )}
        </button>
      </div>

      {/* Error Message & Attempt Counter */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-700">
          <AlertCircle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
            {attemptsRemaining < 3 && attemptsRemaining > 0 && (
              <p className="text-[11px] text-rose-600 mt-0.5">
                Remaining attempts before lockout: <b>{attemptsRemaining}</b>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isVerifying || isProcessing}
          className="px-5 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-sm font-semibold transition"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={!isComplete || isVerifying || isProcessing || expiresIn === 0}
          className="flex-1 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-emerald-700/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isVerifying || isProcessing ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Verifying OTP & Authorizing...</span>
            </>
          ) : (
            <>
              <Lock size={15} />
              <span>Authorize & Confirm Payment</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default OtpVerificationView;
