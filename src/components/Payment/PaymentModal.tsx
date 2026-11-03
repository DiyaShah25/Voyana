import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Lock,
  ShieldCheck,
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
import { useCurrency } from '@/context/CurrencyContext';
import OtpVerificationView from './OtpVerificationView';

export interface PaymentSummaryItem {
  label: string;
  amount: number;
}
export interface PaymentProps {
  bookingId: string;
  bookingReference: string;
  bookingType: "flight" | "hotel" | "transport" | "package";
  title: string;
  subtitle: string;
  amount: number;
  currency?: string;
  lineItems?: PaymentSummaryItem[];
  onPaymentSuccess: () => void | Promise<void>;
  onCancel?: () => void;
  userId?: string;
}
const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
export function PaymentView({
  title,
  subtitle,
  amount,
  currency,
  lineItems = [],
  onPaymentSuccess,
  onCancel,
  userId,
}) => {
  const { currency: globalCurrency, convertFromUSD, formatCurrency } = useCurrency();
  const activeCurrency = currency || globalCurrency;
  const chargedAmount = convertFromUSD(amount);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('upi_qr');
  const [card, setCard] = useState<CardDetails>({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
    postalCode: '',
  });
  const [paymentStep, setPaymentStep] = useState<'details' | 'otp'>('details');
  const [copiedUPI, setCopiedUPI] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(299); // 5 min timer
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof CardDetails, string>>>({});

  // Countdown for dynamic QR
  useEffect(() => {
    let cancelled = false;
    void apiRequest<{ enabled: boolean; provider: string }>(
      "/api/payments/config",
    ).then((result) => {
      if (!cancelled) {
        setEnabled(Boolean(result.ok && result.data?.enabled));
        setProvider(result.data?.provider || "demo");
      }
    });
    return () => {
      cancelled = true;
    };
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

  const handleProceedToOtp = () => {
    if (!validateCard()) return;
    setErrorMessage(null);
    setPaymentStep('otp');
  };

  const handleVerifiedPayment = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Step 1: Initiate Payment
      const initResult = await initiatePayment({
        bookingId,
        amount: chargedAmount,
        currency: activeCurrency,
        paymentMethod: selectedMethod,
        userId,
        metadata: {
          booking_reference: bookingReference,
          booking_type: bookingType,
          payment_channel: selectedMethod,
          base_usd_amount: amount,
          otp_verified: true,
          otp_verified_at: new Date().toISOString(),
        },
      });

      if (!initResult.success || !initResult.paymentId) {
        setErrorMessage(initResult.error || 'Failed to initiate payment.');
        setPaymentStep('details');
        return;
      }

      // Step 2: Confirm Payment (Simulate Gateway Authorization & Settlement)
      const confirmResult = await confirmPayment(initResult.paymentId, bookingId, {
        bookingReference,
        bookingType,
        title: `${title} Payment Received`,
        description: `Payment of ${formatCurrency(chargedAmount, activeCurrency)} for ${bookingReference} successfully authorized via ${selectedMethod} with 2FA OTP.`,
        userId,
      });

      if (!confirmResult.success || !confirmResult.transactionReference) {
        setErrorMessage(confirmResult.error || 'Payment authorization failed.');
        setPaymentStep('details');
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
      setPaymentStep('details');
    } finally {
      setBusy(false);
    }
  };

  if (paymentStep === 'otp') {
    return (
      <div className="space-y-4">
        {/* Compact summary header */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                {bookingReference}
              </span>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                {bookingType} RESERVATION
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-1">{title}</h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 font-medium">Authorizing Total</p>
            <p className="text-lg font-black text-slate-900">
              {formatCurrency(chargedAmount, activeCurrency)}
            </p>
          </div>
        </div>

        <OtpVerificationView
          userId={userId || 'usr-demo-01'}
          amount={chargedAmount}
          currency={activeCurrency}
          bookingReference={bookingReference}
          onVerified={handleVerifiedPayment}
          onCancel={() => setPaymentStep('details')}
          isProcessing={isProcessing}
        />
      </div>
    );
  }

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
            <p className="text-xl font-black text-slate-900">{formatCurrency(chargedAmount, activeCurrency)}</p>
          </div>
        </div>

        {lineItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-1 text-xs">
            {lineItems.map((item) => (
              <div key={item.label} className="flex justify-between text-slate-500">
                <span>{item.label}</span>
                <span className="text-slate-800 font-medium">{formatCurrency(convertFromUSD(item.amount), activeCurrency)}</span>
              </div>
            ))}
          </div>
        ))}
        <div className="payment-grand-total">
          <span>Total to pay</span>
          <strong>{money(amount)}</strong>
        </div>
      </div>
      <div className="payment-method-strip">
        {provider === "demo" ? (
          <>
            <span>Get demo OTP</span>
            <span>Enter code</span>
            <span>Confirm trip</span>
          </>
        ) : (
          <>
            <span>UPI</span>
            <span>Cards</span>
            <span>Netbanking</span>
            <span>Wallets</span>
          </>
        )}
      </div>
      <div className="payment-security-copy">
        <ShieldCheck size={19} />
        <p>
          {provider === "demo"
            ? "Get a demo OTP, enter it to confirm, and your trip workspace will be ready. No PAN, bank account or payment details required."
            : "Choose your payment method in Razorpay’s secure checkout. Your booking is confirmed after the payment is verified."}
        </p>
      </div>

      {/* ─── DYNAMIC QR CODE SCANNER VIEW (for UPI_QR, Google Pay, Apple Pay, PayPal) ─── */}
      {selectedMethod !== 'credit_card' ? (
        <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-5">
          {/* Visual Scannable QR Code */}
          <div className="flex-shrink-0">
            <DynamicQRCode
              reference={bookingReference}
              amount={chargedAmount}
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
                  Scan to Pay {formatCurrency(chargedAmount, activeCurrency)}
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
      {error && (
        <p role="alert" className="payment-error">
          {error}
        </p>
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
          onClick={handleProceedToOtp}
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
                  ? `Proceed to OTP Verification (${formatCurrency(chargedAmount, activeCurrency)})`
                  : `Authorize with OTP (${formatCurrency(chargedAmount, activeCurrency)})`}
              </span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      )}
      <div className="payment-footer-proof">
        <CheckCircle2 size={14} />{" "}
        {provider === "demo"
          ? "OTP demo checkout · Powered by Voyana"
          : "Payment protected by Razorpay"}
      </div>
    </section>
  );
}
export interface StandalonePaymentModalProps extends PaymentProps {
  isOpen: boolean;
  onClose: () => void;
}
export function PaymentModal({
  isOpen,
  onClose,
  ...props
}: StandalonePaymentModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1300] bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto">
        <button aria-label="Close payment" onClick={onClose}>
          <X />
        </button>
        <PaymentView {...props} onCancel={onClose} />
      </div>
    </div>
  );
}
export default PaymentModal;
