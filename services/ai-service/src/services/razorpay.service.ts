import { createHmac, timingSafeEqual } from "crypto";
import { config } from "../config/env.js";

export function razorpayEnabled() {
  return (
    config.razorpayKeyId.startsWith("rzp_test_") &&
    Boolean(config.razorpayKeySecret)
  );
}
async function request<T>(
  path: string,
  method = "GET",
  body?: Record<string, unknown>,
): Promise<T> {
  if (!razorpayEnabled())
    throw new Error(
      "Configure Razorpay Test Mode keys before taking a payment.",
    );
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      "Razorpay could not complete the request. Please retry or check the Test Mode setup.",
    );
  return response.json() as Promise<T>;
}
export const createRazorpayOrder = (amount: number, receipt: string) =>
  request<{ id: string; amount: number; currency: string }>("orders", "POST", {
    amount,
    currency: "INR",
    receipt,
    partial_payment: false,
  });
export const fetchRazorpayPayment = (id: string) =>
  request<{
    id: string;
    order_id: string;
    amount: number;
    currency: string;
    status: string;
    refunded?: boolean;
    refund_status?: string;
  }>(`payments/${encodeURIComponent(id)}`);
export const refundRazorpayPayment = (id: string) =>
  request<{ id: string; status: string }>(
    `payments/${encodeURIComponent(id)}/refund`,
    "POST",
    {},
  );
export function validPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", config.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
