import React, { useState } from 'react';
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
  bookingType: 'flight' | 'hotel' | 'transport';
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
  { id: 'credit_card', name: 'Credit / Debit Card', icon: '💳', description: 'Visa, Mastercard, Amex, Discover' },
  { id: 'apple_pay', name: 'Apple Pay', icon: '🍏', description: 'Instant touchless checkout' },
  { id: 'google_pay', name: 'Google Pay', icon: '🌐', description: 'Fast, secure Google checkout' },
  { id: 'paypal', name: 'PayPal', icon: '🅿️', description: 'Pay via PayPal balance or bank' },
];

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
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('credit_card');
  const [card, setCard] = useState<CardDetails>({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
    postalCode: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof CardDetails, string>>>({});

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
    <div className="space-y-5">
      {/* Order Summary Ribbon */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900/80 to-violet-950/70 border border-indigo-400/30 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                {bookingReference}
              </span>
              <span className="text-xs text-slate-400 uppercase tracking-wider">{bookingType} RESERVATION</span>
            </div>
            <h3 className="text-sm font-bold text-white mt-1">{title}</h3>
            <p className="text-xs text-slate-300">{subtitle}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Total Due</p>
            <p className="text-xl font-black text-white">${amount.toLocaleString()}</p>
          </div>
        </div>

        {lineItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-1 text-xs">
            {lineItems.map((item) => (
              <div key={item.label} className="flex justify-between text-slate-400">
                <span>{item.label}</span>
                <span className="text-slate-200">${item.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Method Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Choose Payment Method
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => setSelectedMethod(method.id)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                selectedMethod === method.id
                  ? 'bg-indigo-600/40 border-indigo-400/60 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="text-lg">{method.icon}</div>
              <div className="mt-1 text-xs font-semibold leading-tight text-white">{method.name}</div>
              <div className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">{method.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Card Input Form (if credit_card selected) */}
      {selectedMethod === 'credit_card' ? (
        <div className="space-y-3 bg-white/[0.02] border border-white/10 rounded-2xl p-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-300">Card Number</label>
              <span className="text-[11px] text-indigo-300 uppercase font-mono font-bold">{cardBrand}</span>
            </div>
            <div className="relative">
              <input
                type="text"
                maxLength={19}
                placeholder="4532 •••• •••• 8920"
                value={card.cardNumber}
                onChange={(e) => setCard((prev) => ({ ...prev, cardNumber: formatCardNumber(e.target.value) }))}
                className={`w-full bg-white/5 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition font-mono ${
                  errors.cardNumber ? 'border-rose-500/60' : 'border-white/10 focus:border-indigo-400/60'
                }`}
              />
              <CreditCard size={16} className="absolute left-3.5 top-3 text-slate-400" />
            </div>
            {errors.cardNumber && <p className="text-xs text-rose-400">{errors.cardNumber}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Cardholder Name</label>
            <input
              type="text"
              placeholder="Alexander Wright"
              value={card.cardHolder}
              onChange={(e) => setCard((prev) => ({ ...prev, cardHolder: e.target.value }))}
              className={`w-full bg-white/5 border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition ${
                errors.cardHolder ? 'border-rose-500/60' : 'border-white/10 focus:border-indigo-400/60'
              }`}
            />
            {errors.cardHolder && <p className="text-xs text-rose-400">{errors.cardHolder}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Expiration (MM/YY)</label>
              <input
                type="text"
                maxLength={5}
                placeholder="12/28"
                value={card.expiryDate}
                onChange={(e) => setCard((prev) => ({ ...prev, expiryDate: formatExpiryDate(e.target.value) }))}
                className={`w-full bg-white/5 border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition font-mono ${
                  errors.expiryDate ? 'border-rose-500/60' : 'border-white/10 focus:border-indigo-400/60'
                }`}
              />
              {errors.expiryDate && <p className="text-xs text-rose-400">{errors.expiryDate}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">CVV / CVC</label>
              <input
                type="password"
                maxLength={4}
                placeholder="•••"
                value={card.cvv}
                onChange={(e) => setCard((prev) => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
                className={`w-full bg-white/5 border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition font-mono ${
                  errors.cvv ? 'border-rose-500/60' : 'border-white/10 focus:border-indigo-400/60'
                }`}
              />
              {errors.cvv && <p className="text-xs text-rose-400">{errors.cvv}</p>}
            </div>
          </div>
        </div>
      ) : (
        /* Digital Wallet Quick Pay Prompt */
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-400/30 flex items-center justify-center mx-auto text-indigo-300">
            <Wallet size={22} />
          </div>
          <h4 className="text-sm font-bold text-white">
            Pay with {PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.name}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You will authorize ${amount.toLocaleString()} {currency} securely via your connected account.
          </p>
        </div>
      )}

      {/* Security Guarantee Badge */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>256-Bit SSL Encrypted & PCI-DSS Compliant</span>
        </div>
        <div className="flex items-center gap-1">
          <Lock size={12} className="text-slate-500" />
          <span>Voyana Secure Shield</span>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle size={15} className="text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Pay Action CTA */}
      <div className="pt-2 flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-semibold transition"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={handlePay}
          disabled={isProcessing}
          className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm tracking-wide hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Authorizing Payment...</span>
            </>
          ) : (
            <>
              <Lock size={15} />
              <span>Pay ${amount.toLocaleString()} & Complete Booking</span>
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Complete Payment</h2>
              <p className="text-xs text-slate-400">Secure checkout for {props.bookingReference}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        <PaymentView {...props} onCancel={onClose} />
      </div>
    </div>
  );
};

export default PaymentModal;
