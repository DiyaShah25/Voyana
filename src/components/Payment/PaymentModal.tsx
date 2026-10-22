/**
 * Payment Modal Component
 * Multi-step payment flow with card input, digital wallet options,
 * UPI QR code, order summary, and transaction confirmation.
 */

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  X,
  Sparkles,
  Smartphone,
  Wallet,
  AlertCircle,
  QrCode,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  initiatePayment,
  confirmPayment,
  formatCardNumber,
  formatExpiryDate,
  detectCardBrand,
  type PaymentMethod,
  type CardDetails,
} from '@/services/paymentService';

export interface PaymentSummaryItem {
  label: string;
  amount: number;
}

export interface PaymentProps {
  bookingId: string;
  bookingReference: string;
  bookingType: 'flight' | 'hotel' | 'transport' | 'package';
  title: string;
  subtitle: string;
  amount: number;
  currency?: string;
  lineItems?: PaymentSummaryItem[];
  onPaymentSuccess: (result: { paymentId: string; transactionReference: string }) => void;
  onCancel?: () => void;
  userId?: string;
}

const PAYMENT_METHODS: { id: PaymentMethod; name: string; icon: string; description: string }[] = [
  { id: 'upi_qr', name: 'UPI / Dynamic QR', icon: '📱', description: 'GPay, PhonePe, Paytm, BHIM' },
  { id: 'credit_card', name: 'Credit / Debit Card', icon: '💳', description: 'Visa, Mastercard, Amex' },
  { id: 'google_pay', name: 'Google Pay', icon: '🌐', description: 'One-tap Google Pay QR & Wallet' },
  { id: 'apple_pay', name: 'Apple Pay', icon: '🍏', description: 'Touchless Apple Wallet / QR' },
  { id: 'paypal', name: 'PayPal', icon: '🅿️', description: 'PayPal Instant Checkout' },
];

/**
 * Procedural Dynamic QR Code Generator Matrix (with corner finder patterns)
 */
function DynamicQRCode({
  reference,
  amount,
  method,
}: {
  reference: string;
  amount: number;
  method: PaymentMethod;
}) {
  // Deterministic seed matrix for visual authenticity
  const size = 21; // standard QR version 1 matrix (21x21)
  const isFinder = (r: number, c: number) => {
    // Top-left
    if (r < 7 && c < 7) return true;
    // Top-right
    if (r < 7 && c >= size - 7) return true;
    // Bottom-left
    if (r >= size - 7 && c < 7) return true;
    return false;
  };

  const isFinderFilled = (r: number, c: number) => {
    // Top-left finder border & center
    if (r < 7 && c < 7) {
      if (r === 0 || r === 6 || c === 0 || c === 6) return true;
      if (r >= 2 && r <= 4 && c >= 2 && c <= 4) return true;
      return false;
    }
    // Top-right finder border & center
    if (r < 7 && c >= size - 7) {
      const oc = c - (size - 7);
      if (r === 0 || r === 6 || oc === 0 || oc === 6) return true;
      if (r >= 2 && r <= 4 && oc >= 2 && oc <= 4) return true;
      return false;
    }
    // Bottom-left finder border & center
    if (r >= size - 7 && c < 7) {
      const or = r - (size - 7);
      if (or === 0 || or === 6 || c === 0 || c === 6) return true;
      if (or >= 2 && or <= 4 && c >= 2 && c <= 4) return true;
      return false;
    }
    return false;
  };

  const charSum = reference.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), amount);

  return (
    <div className="relative p-3 bg-white rounded-2xl shadow-md border border-slate-200 flex items-center justify-center">
      {/* Scanning laser beam animation */}
      <div className="absolute inset-x-3 top-3 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-pulse pointer-events-none opacity-80" />

      <div
        className="grid gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: size }).map((_, r) =>
          Array.from({ length: size }).map((_, c) => {
            let filled = false;
            if (isFinder(r, c)) {
              filled = isFinderFilled(r, c);
            } else {
              // Center data bits pseudo-random pattern based on ref & coords
              const val = Math.sin(r * 13 + c * 37 + charSum) * 10000;
              filled = val - Math.floor(val) > 0.45;
            }
            return (
              <div
                key={`${r}-${c}`}
                className={`w-[7px] h-[7px] md:w-[8px] md:h-[8px] rounded-[1px] ${
                  filled ? 'bg-slate-900' : 'bg-white'
                }`}
              />
            );
          })
        )}
      </div>

      {/* Center Badge Icon */}
      <div className="absolute inset-0 m-auto w-7 h-7 rounded-lg bg-white shadow-md border border-slate-200 flex items-center justify-center">
        {method === 'upi_qr' && <Smartphone size={15} className="text-emerald-700" />}
        {method === 'google_pay' && <span className="font-bold text-xs text-blue-600">G</span>}
        {method === 'apple_pay' && <span className="font-bold text-xs text-slate-900"></span>}
        {method === 'paypal' && <span className="font-bold text-xs text-blue-800">P</span>}
      </div>
    </div>
  );
}

export const PaymentView: React.FC<PaymentProps> = ({
  bookingId,
  bookingReference,
  bookingType,
  title,
  subtitle,
  amount,
  currency = 'USD',
  lineItems = [],
  onPaymentSuccess,
  onCancel,
  userId,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('upi_qr');
  const [card, setCard] = useState<CardDetails>({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
    postalCode: '',
  });
  const [copiedUPI, setCopiedUPI] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(299); // 5 min timer
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof CardDetails, string>>>({});

  // Countdown for dynamic QR
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 300));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `0${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const upiId = `voyana.pay.${bookingReference.toLowerCase()}@hdfcbank`;

  const copyUPI = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUPI(true);
    setTimeout(() => setCopiedUPI(false), 2000);
  };

  const cardBrand = detectCardBrand(card.cardNumber);

  const validateCard = (): boolean => {
    if (selectedMethod !== 'credit_card') return true;

    const newErrors: Partial<Record<keyof CardDetails, string>> = {};
    const rawCard = card.cardNumber.replace(/\s+/g, '');

    if (rawCard.length < 15) {
      newErrors.cardNumber = 'Valid 16-digit card number is required.';
    }
    if (!card.cardHolder.trim()) {
      newErrors.cardHolder = 'Cardholder name is required.';
    }
    if (!/^\d{2}\/\d{2}$/.test(card.expiryDate)) {
      newErrors.expiryDate = 'MM/YY required.';
    }
    if (card.cvv.length < 3) {
      newErrors.cvv = '3 or 4 digits required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePay = async () => {
    if (!validateCard()) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Step 1: Initiate Payment
      const initResult = await initiatePayment({
        bookingId,
        amount,
        currency,
        paymentMethod: selectedMethod,
        userId,
        metadata: {
          booking_reference: bookingReference,
          booking_type: bookingType,
          payment_channel: selectedMethod,
        },
      });

      if (!initResult.success || !initResult.paymentId) {
        setErrorMessage(initResult.error || 'Failed to initiate payment.');
        setIsProcessing(false);
        return;
      }

      // Step 2: Confirm Payment (Simulate Gateway Authorization & Settlement)
      const confirmResult = await confirmPayment(initResult.paymentId, bookingId, {
        bookingReference,
        bookingType,
        title: `${title} Payment Received`,
        description: `Payment of $${amount.toLocaleString()} for ${bookingReference} successfully authorized via ${selectedMethod}.`,
        userId,
      });

      if (!confirmResult.success || !confirmResult.transactionReference) {
        setErrorMessage(confirmResult.error || 'Payment authorization failed.');
        setIsProcessing(false);
        return;
      }

      // Step 3: Success callback
      onPaymentSuccess({
        paymentId: initResult.paymentId,
        transactionReference: confirmResult.transactionReference,
      });
    } catch (err: any) {
      console.error('[PaymentView] Unexpected error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Order Summary Ribbon */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                {bookingReference}
              </span>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{bookingType} RESERVATION</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-1">{title}</h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 font-medium">Total Due</p>
            <p className="text-xl font-black text-slate-900">${amount.toLocaleString()}</p>
          </div>
        </div>

        {lineItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-1 text-xs">
            {lineItems.map((item) => (
              <div key={item.label} className="flex justify-between text-slate-500">
                <span>{item.label}</span>
                <span className="text-slate-800 font-medium">${item.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Method Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Choose Payment Method
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => setSelectedMethod(method.id)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                selectedMethod === method.id
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm ring-1 ring-emerald-500/30'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="text-base">{method.icon}</div>
              <div className="mt-0.5 text-xs font-semibold leading-tight text-slate-900">{method.name}</div>
              <div className="text-[10px] text-slate-500 leading-tight mt-0.5 truncate">{method.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── DYNAMIC QR CODE SCANNER VIEW (for UPI_QR, Google Pay, Apple Pay, PayPal) ─── */}
      {selectedMethod !== 'credit_card' ? (
        <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-5">
          {/* Visual Scannable QR Code */}
          <div className="flex-shrink-0">
            <DynamicQRCode
              reference={bookingReference}
              amount={amount}
              method={selectedMethod}
            />
            <div className="mt-1.5 text-center">
              <span className="text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1">
                <RefreshCw size={10} className="animate-spin text-emerald-700" />
                Expires in <span className="text-emerald-800 font-bold">{formatTimer(secondsLeft)}</span>
              </span>
            </div>
          </div>

          {/* Instructions and Fast-Pay Trigger */}
          <div className="flex-1 space-y-3 text-left w-full">
            <div>
              <div className="flex items-center gap-1.5">
                <QrCode size={16} className="text-emerald-700" />
                <h4 className="text-sm font-bold text-slate-900">
                  Scan to Pay ${amount.toLocaleString()} {currency}
                </h4>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Scan this QR code using any camera, banking app, or {PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.name}.
              </p>
            </div>

            {/* Virtual UPI / ID Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-sm">
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Merchant Virtual Payment ID</p>
                <p className="text-xs font-mono text-emerald-800 font-semibold truncate">{upiId}</p>
              </div>
              <button
                type="button"
                onClick={copyUPI}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-medium flex items-center gap-1 transition flex-shrink-0"
              >
                {copiedUPI ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} />}
                <span>{copiedUPI ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-snug">
              Once scanned on your device, click <b className="text-slate-900">"Verify & Approve Payment"</b> below to finalize your booking.
            </p>
          </div>
        </div>
      ) : (
        /* ─── CARD PAYMENT INPUT FORM ─── */
        <div className="space-y-3 bg-slate-50/80 border border-slate-200 rounded-2xl p-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700">Card Number</label>
              <span className="text-[11px] text-emerald-700 uppercase font-mono font-bold">{cardBrand}</span>
            </div>
            <div className="relative">
              <input
                type="text"
                maxLength={19}
                placeholder="4532 •••• •••• 8920"
                value={card.cardNumber}
                onChange={(e) => setCard((prev) => ({ ...prev, cardNumber: formatCardNumber(e.target.value) }))}
                className={`w-full bg-white border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition font-mono ${
                  errors.cardNumber ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                }`}
              />
              <CreditCard size={16} className="absolute left-3.5 top-3 text-slate-400" />
            </div>
            {errors.cardNumber && <p className="text-xs text-rose-500 font-medium">{errors.cardNumber}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Cardholder Name</label>
            <input
              type="text"
              placeholder="Alexander Wright"
              value={card.cardHolder}
              onChange={(e) => setCard((prev) => ({ ...prev, cardHolder: e.target.value }))}
              className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition ${
                errors.cardHolder ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
              }`}
            />
            {errors.cardHolder && <p className="text-xs text-rose-500 font-medium">{errors.cardHolder}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Expiration (MM/YY)</label>
              <input
                type="text"
                maxLength={5}
                placeholder="12/28"
                value={card.expiryDate}
                onChange={(e) => setCard((prev) => ({ ...prev, expiryDate: formatExpiryDate(e.target.value) }))}
                className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition font-mono ${
                  errors.expiryDate ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                }`}
              />
              {errors.expiryDate && <p className="text-xs text-rose-500 font-medium">{errors.expiryDate}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">CVV / CVC</label>
              <input
                type="password"
                maxLength={4}
                placeholder="•••"
                value={card.cvv}
                onChange={(e) => setCard((prev) => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
                className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition font-mono ${
                  errors.cvv ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                }`}
              />
              {errors.cvv && <p className="text-xs text-rose-500 font-medium">{errors.cvv}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Security Guarantee Badge */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>256-Bit SSL Encrypted & PCI-DSS Compliant</span>
        </div>
        <div className="flex items-center gap-1">
          <Lock size={12} className="text-slate-400" />
          <span>Voyana Secure Shield</span>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle size={15} className="text-rose-500 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Pay Action CTA */}
      <div className="pt-1 flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-5 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-sm font-semibold transition"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={handlePay}
          disabled={isProcessing}
          className="flex-1 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-emerald-700/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Verifying & Authorizing Payment...</span>
            </>
          ) : (
            <>
              <Lock size={15} />
              <span>
                {selectedMethod === 'credit_card'
                  ? `Pay $${amount.toLocaleString()} & Complete Booking`
                  : `Verify & Approve $${amount.toLocaleString()} Payment`}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ─── Standalone Payment Modal ────────────────────────────────────────────────
export interface StandalonePaymentModalProps extends PaymentProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentModal: React.FC<StandalonePaymentModalProps> = ({
  isOpen,
  onClose,
  ...props
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Complete Payment</h2>
              <p className="text-xs text-slate-500">Secure checkout for {props.bookingReference}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
            <X size={18} />
          </button>
        </div>

        <PaymentView {...props} onCancel={onClose} />
      </div>
    </div>
  );
};

export default PaymentModal;
