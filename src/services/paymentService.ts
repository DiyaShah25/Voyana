import { apiRequest } from "./apiClient";
import { restoreSession } from "./authService";
import type { UnifiedBooking } from "./bookingService";
import type { Trip } from "./tripService";
export type ReservationChoice =
  | {
      type: "flight";
      id: string;
      origin: string;
      destination: string;
      date: string;
      cabin: "economy" | "premium_economy" | "business" | "first";
      passengers: number;
    }
  | {
      type: "hotel";
      id: string;
      checkIn: string;
      checkOut: string;
      roomType:
        | "Standard"
        | "Deluxe"
        | "Executive Suite"
        | "Presidential Suite";
      rooms: number;
      guests: number;
    }
  | {
      type: "transport";
      id: string;
      origin: string;
      date: string;
      passengers: number;
      days?: number;
    };
export interface ConfirmedCheckout {
  booking: UnifiedBooking;
  trip: Trip;
  paymentId?: string;
  transactionReference?: string;
}
interface GatewayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
interface GatewayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (response: GatewayResponse) => void;
  modal: { ondismiss: () => void };
}
interface Gateway {
  open(): void;
  on(event: string, callback: () => void): void;
}
type GatewayWindow = Window & {
  Razorpay?: new (options: GatewayOptions) => Gateway;
};
let loading: Promise<void> | undefined;
function loadCheckout() {
  if ((window as GatewayWindow).Razorpay) return Promise.resolve();
  if (!loading)
    loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      const timer = window.setTimeout(() => {
        script.remove();
        reject(new Error("Razorpay took too long to load. Please retry."));
      }, 15000);
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        clearTimeout(timer);
        if ((window as GatewayWindow).Razorpay) resolve();
        else reject(new Error("Razorpay could not load."));
      };
      script.onerror = () => {
        clearTimeout(timer);
        script.remove();
        reject(
          new Error("Could not connect to Razorpay. Check your connection."),
        );
      };
      document.head.appendChild(script);
    }).catch((error) => {
      loading = undefined;
      throw error;
    });
  return loading;
}
const verification = new Map<string, GatewayResponse>();
export async function checkoutReservation(
  reservation: Record<string, unknown>,
): Promise<ConfirmedCheckout> {
  const session = restoreSession();
  if (!session) throw new Error("Sign in before paying.");
  const order = await apiRequest<{
    completed?: boolean;
    booking?: UnifiedBooking;
    trip?: Trip;
    intentId: string;
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
    provider?: string;
    demoOtp?: string;
    expiresAt?: string;
  }>(
    "/api/payments/orders",
    { method: "POST", body: JSON.stringify(reservation) },
    20000,
  );
  if (!order.ok || !order.data)
    throw new Error(order.error || "Payment order could not be created.");
  const data = order.data;
  window.dispatchEvent(new CustomEvent("voyana:booking-changed"));
  if (data.completed && data.booking && data.trip)
    return { booking: data.booking, trip: data.trip };
  if (data.provider === "demo" && data.demoOtp && data.expiresAt) {
    const { showDemoCheckout } = await import("./demoCheckout");
    return showDemoCheckout({
      intentId: data.intentId,
      amount: data.amount,
      demoOtp: data.demoOtp,
      expiresAt: data.expiresAt,
    });
  }
  let proof = verification.get(data.intentId);
  if (!proof) {
    await loadCheckout();
    proof = await new Promise<GatewayResponse>((resolve, reject) => {
      let finished = false;
      const finish = (result?: GatewayResponse) => {
        if (finished) return;
        finished = true;
        if (result) resolve(result);
        else
          reject(
            new Error(
              "Checkout closed. Your reservation has not been confirmed.",
            ),
          );
      };
      const Constructor = (window as GatewayWindow).Razorpay!;
      const gateway = new Constructor({
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: data.currency,
        name: "Voyana",
        description: `${reservation.destination} travel reservation · Test Mode`,
        prefill: {
          name: session.user.name,
          email: String(reservation.contactEmail || session.user.email),
        },
        theme: { color: "#075e45" },
        handler: (result) => finish(result),
        modal: { ondismiss: () => finish() },
      });
      gateway.on("payment.failed", () => {
        /* Razorpay keeps the checkout open so the customer can retry. */
      });
      gateway.open();
    });
    verification.set(data.intentId, proof);
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    const result = await apiRequest<ConfirmedCheckout>(
      "/api/payments/verify",
      {
        method: "POST",
        body: JSON.stringify({ intentId: data.intentId, ...proof }),
      },
      20000,
    );
    if (result.ok && result.data?.booking && result.data.trip) {
      verification.delete(data.intentId);
      return result.data;
    }
    if (result.status === 409 && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }
    throw new Error(
      result.error ||
        "Payment verification is pending. Retry verification before paying again.",
    );
  }
  throw new Error("Payment verification is pending.");
}
