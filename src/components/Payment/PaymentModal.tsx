import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";
import { apiRequest } from "@/services/apiClient";
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
  lineItems = [],
  onPaymentSuccess,
  onCancel,
}: PaymentProps) {
  const [provider, setProvider] = useState("demo");
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
  const pay = async () => {
    if (busy || !enabled) return;
    setBusy(true);
    setError("");
    try {
      await onPaymentSuccess();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Payment could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="razorpay-checkout" aria-label="Secure payment checkout">
      <div className="razorpay-checkout-intro">
        <span className="razorpay-checkout-icon">
          <CreditCard size={24} />
        </span>
        <div>
          <span className="payment-eyebrow">YOUR JOURNEY, ONE STEP AWAY</span>
          <h3>Secure checkout</h3>
          <p>{title}</p>
        </div>
        <span className="payment-test-badge">
          {provider === "demo" ? "Demo · No real money" : "Razorpay Test Mode"}
        </span>
      </div>
      <p className="payment-subtitle">{subtitle}</p>
      <div className="payment-order-lines">
        {lineItems.map((item, index) => (
          <div key={index}>
            <span>{item.label}</span>
            <strong>{money(item.amount)}</strong>
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
      {enabled === false && (
        <p role="status" className="payment-setup-message">
          Razorpay Test Mode needs backend test API keys before checkout can open. No payment has been taken.
        </p>
      )}
      {error && (
        <p role="alert" className="payment-error">
          {error}
        </p>
      )}
      <button
        className="payment-primary"
        disabled={enabled !== true || busy}
        onClick={() => void pay()}
      >
        {busy
          ? "Verifying your payment…"
          : enabled === null
            ? "Checking payment availability…"
            : provider === "demo"
              ? `Continue to OTP · ${money(amount)}`
              : `Pay ${money(amount)} with Razorpay`}
        {!busy && <ArrowRight size={18} />}
      </button>
      <p className="payment-test-note">
        <Lock size={12} />{" "}
        {provider === "demo"
          ? "Project demo only. No SMS or real charge."
          : "Test checkout uses test money. No real charges."}
      </p>
      {onCancel && (
        <button disabled={busy} className="payment-back" onClick={onCancel}>
          Back to booking details
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
