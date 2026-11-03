import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { apiRequest } from "@/services/apiClient";
import { formatMoney } from "@/services/money";
import type { ConfirmedCheckout } from "@/services/paymentService";

export interface DemoOrder {
  intentId: string;
  amount: number;
  demoOtp: string;
  expiresAt: string;
}
export default function DemoOtpCheckout({
  order,
  onDone,
  onCancel,
}: {
  order: DemoOrder;
  onDone: (result: ConfirmedCheckout) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState(order.demoOtp);
  const [expires, setExpires] = useState(order.expiresAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [cooldown, setCooldown] = useState(() =>
    Math.max(
      0,
      30 -
        Math.floor(
          (Date.now() - (Date.parse(order.expiresAt) - 5 * 60000)) / 1000,
        ),
    ),
  );
  useEffect(() => {
    const timer = window.setInterval(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);
  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError("");
    const result = await apiRequest<ConfirmedCheckout>(
      "/api/payments/demo/confirm",
      {
        method: "POST",
        body: JSON.stringify({ intentId: order.intentId, otp: code }),
      },
      20000,
    );
    if (result.ok && result.data?.booking && result.data.trip)
      onDone(result.data);
    else {
      setError(result.error || "Confirmation could not finish. Please retry.");
      setBusy(false);
    }
  };
  const resend = async () => {
    if (cooldown || busy) return;
    setBusy(true);
    setError("");
    const result = await apiRequest<{ demoOtp: string; expiresAt: string }>(
      "/api/payments/demo/resend",
      { method: "POST", body: JSON.stringify({ intentId: order.intentId }) },
    );
    if (result.ok && result.data) {
      setDemoCode(result.data.demoOtp);
      setExpires(result.data.expiresAt);
      setCode("");
      setCooldown(30);
    } else setError(result.error || "Could not generate another code.");
    setBusy(false);
  };
  return (
    <div className="demo-otp-overlay">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Demo OTP payment"
        className="demo-otp-dialog"
      >
        <header>
          <span className="demo-otp-brand">
            <span>V</span> VOYANA PAY
          </span>
          <button
            aria-label="Close demo payment"
            disabled={busy}
            onClick={onCancel}
          >
            <X size={19} />
          </button>
        </header>
        <div className="demo-otp-content">
          <span className="demo-otp-lock">
            <LockKeyhole size={27} />
          </span>
          <span className="payment-eyebrow">PROJECT DEMONSTRATION</span>
          <h2>One code. You’re all set.</h2>
          <p className="demo-otp-lede">
            Confirm your demo payment of{" "}
            <strong>{formatMoney(order.amount / 100)}</strong>.
          </p>
          <form onSubmit={(event) => void verify(event)}>
            <label htmlFor="demo-payment-otp">Enter the 6-digit OTP</label>
            <input
              id="demo-payment-otp"
              className="demo-otp-input"
              aria-label="Payment OTP"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
              autoFocus
            />
            <div className="demo-otp-sample">
              <div>
                <span>Your demo OTP</span>
                <strong data-testid="demo-otp">{demoCode}</strong>
              </div>
              <button
                type="button"
                aria-label="Use demo OTP"
                onClick={() => {
                  setCode(demoCode);
                  setCopied(true);
                  setError("");
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}Use code
              </button>
            </div>
            <p className="demo-otp-explanation">
              This code is generated for your project. No SMS is sent and no
              money is charged. Valid until{" "}
              {new Date(expires).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              .
            </p>
            {error && (
              <p role="alert" className="payment-error">
                {error}
              </p>
            )}
            <button
              className="payment-primary"
              type="submit"
              disabled={code.length !== 6 || busy}
            >
              {busy ? "Confirming your booking…" : "Confirm demo payment"}
              {!busy && <ArrowRight size={17} />}
            </button>
          </form>
          <button
            className="demo-otp-resend"
            disabled={Boolean(cooldown) || busy}
            onClick={() => void resend()}
          >
            <RefreshCw size={13} />
            {cooldown
              ? `New code available in ${cooldown}s`
              : "Get a new demo OTP"}
          </button>
          <p className="payment-footer-proof">
            <ShieldCheck size={14} /> Demo verification · No bank connection
          </p>
        </div>
      </section>
    </div>
  );
}
