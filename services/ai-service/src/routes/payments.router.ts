import { validateBookingTrip } from '../services/booking-authority.service.js';
import { Router } from "express";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";
import { z } from "zod";
import { config } from "../config/env.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.js";
import { PaymentIntentModel } from "../db/models/payment-intent.model.js";
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  razorpayEnabled,
  validPaymentSignature,
} from "../services/razorpay.service.js";
import { quoteReservation } from "../services/reservation-quote.service.js";
import { createBookedWorkspace } from "../services/booking-workspace.service.js";

export const paymentsRouter = Router();
const demoMode = () => config.paymentProvider === "demo";
export const demoOtp = (id: string, issuedAt: Date) =>
  String(
    100000 +
      (parseInt(
        createHmac("sha256", config.jwtSecret)
          .update(`${id}|${issuedAt.getTime()}|demo`)
          .digest("hex")
          .slice(0, 10),
        16,
      ) %
        900000),
  );
paymentsRouter.get("/config", (_req, res) => {
  res.json({
    enabled: demoMode() || razorpayEnabled(),
    provider: demoMode() ? "demo" : "razorpay",
    mode: demoMode() ? "demo" : "test",
    currency: "INR",
  });
});
paymentsRouter.use(requireAuth);
paymentsRouter.post("/orders", async (req: AuthenticatedRequest, res) => {
  if (!demoMode() && !razorpayEnabled()) {
    res
      .status(503)
      .json({
        message:
          "Razorpay Test Mode is awaiting account setup. No payment has been taken.",
      });
    return;
  }
  try {
    const reservation = quoteReservation(req.body);
    await validateBookingTrip(req.user!, reservation);
    if (
      typeof req.body.totalAmount !== "number" ||
      req.body.totalAmount !== reservation.totalAmount ||
      req.body.currency !== "INR"
    ) {
      res
        .status(409)
        .json({
          message:
            "The displayed price has changed. Search again before paying.",
          totalAmount: reservation.totalAmount,
          currency: "INR",
        });
      return;
    }
    const requestHash = createHash("sha256")
      .update(JSON.stringify({ userId: req.user!.id, reservation }))
      .digest("hex");
    let intent = await PaymentIntentModel.findOne({
      userId: req.user!.id,
      requestHash,
      provider: demoMode() ? "demo" : "razorpay",
      status: { $in: ["created", "captured"] },
      createdAt: { $gte: new Date(Date.now() - 20 * 60000) },
    }).sort({ createdAt: -1 });
    if (!intent) {
      const id = randomUUID();
      const order = demoMode()
        ? {
            id: `demo_order_${id}`,
            amount: reservation.totalAmount * 100,
            currency: "INR",
          }
        : await createRazorpayOrder(reservation.totalAmount * 100, id);
      if (
        order.amount !== reservation.totalAmount * 100 ||
        order.currency !== "INR"
      )
        throw new Error("Gateway order did not match the reservation.");
      intent = await PaymentIntentModel.create({
        id,
        userId: req.user!.id,
        requestHash,
        orderId: order.id,
        amountPaise: order.amount,
        currency: "INR",
        reservation,
        provider: demoMode() ? "demo" : "razorpay",
        otpIssuedAt: demoMode() ? new Date() : undefined,
        otpExpiresAt: demoMode() ? new Date(Date.now() + 5 * 60000) : undefined,
      });
    }
    if (intent.status === "captured") {
      const result = await createBookedWorkspace(req.user!, {
        ...intent.reservation,
        bookingReference: `${intent.provider === "demo" ? "VOY-DEMO" : "VOY-RZP"}-${intent.id}`,
        paymentReference: intent.id,
      });
      res.json({ completed: true, ...result });
      return;
    }
    res.json({
      intentId: intent.id,
      provider: intent.provider,
      keyId: demoMode() ? undefined : config.razorpayKeyId,
      orderId: intent.orderId,
      amount: intent.amountPaise,
      currency: "INR",
      mode: demoMode() ? "demo" : "test",
      demoOtp:
        intent.provider === "demo"
          ? demoOtp(intent.id, intent.otpIssuedAt!)
          : undefined,
      expiresAt: intent.otpExpiresAt,
    });
  } catch (error) {
    res
      .status((error as {statusCode?: number}).statusCode || 400)
      .json({
        message:
          error instanceof Error
            ? error.message
            : "Could not create payment order.",
      });
  }
});

paymentsRouter.post("/verify", async (req: AuthenticatedRequest, res) => {
  try {
    const input = z
      .object({
        intentId: z.string(),
        razorpay_payment_id: z.string().regex(/^pay_[a-zA-Z0-9]+$/),
        razorpay_order_id: z.string(),
        razorpay_signature: z.string(),
      })
      .parse(req.body);
    const intent = await PaymentIntentModel.findOne({
      id: input.intentId,
      userId: req.user!.id,
    });
    if (!intent) {
      res.status(404).json({ message: "Payment order not found." });
      return;
    }
    if (
      intent.provider === "demo" ||
      intent.orderId !== input.razorpay_order_id ||
      !validPaymentSignature(
        intent.orderId,
        input.razorpay_payment_id,
        input.razorpay_signature,
      )
    ) {
      res
        .status(400)
        .json({ message: "Payment signature could not be verified." });
      return;
    }
    const payment = await fetchRazorpayPayment(input.razorpay_payment_id);
    if (
      payment.order_id !== intent.orderId ||
      payment.amount !== intent.amountPaise ||
      payment.currency !== "INR" ||
      payment.status !== "captured" ||
      payment.refunded ||
      payment.refund_status
    ) {
      res
        .status(409)
        .json({
          message:
            "Payment is not captured for this reservation yet. Retry verification shortly.",
        });
      return;
    }
    if (intent.status === "refunded") {
      res.status(409).json({ message: "This payment was refunded." });
      return;
    }
    intent.status = "captured";
    intent.paymentId = payment.id;
    await intent.save();
    const result = await createBookedWorkspace(req.user!, {
      ...intent.reservation,
      bookingReference: `VOY-RZP-${intent.id}`,
      paymentReference: intent.id,
    });
    intent.bookingId = result.booking.id;
    await intent.save();
    res.json({
      ...result,
      paymentId: payment.id,
      transactionReference: intent.orderId,
    });
  } catch (error) {
    res
      .status(error instanceof z.ZodError ? 400 : 502)
      .json({
        message:
          error instanceof z.ZodError
            ? "Invalid payment verification details."
            : "Payment could not be verified. Retry verification for this order before paying again.",
      });
  }
});

paymentsRouter.post("/demo/confirm", async (req: AuthenticatedRequest, res) => {
  if (!demoMode()) {
    res.status(404).json({ message: "Demo payments are disabled." });
    return;
  }
  try {
    const input = z
      .object({ intentId: z.string(), otp: z.string().regex(/^\d{6}$/) })
      .parse(req.body);
    const intent = await PaymentIntentModel.findOne({
      id: input.intentId,
      userId: req.user!.id,
      provider: "demo",
    });
    if (!intent) {
      res.status(404).json({ message: "Demo order not found." });
      return;
    }
    if (intent.status === "refunded") {
      res.status(409).json({ message: "This demo payment was cancelled." });
      return;
    }
    if (intent.status !== "captured") {
      if (!intent.otpExpiresAt || intent.otpExpiresAt.getTime() < Date.now()) {
        res
          .status(410)
          .json({ message: "OTP expired. Request a new demo OTP." });
        return;
      }
      const attempt = await PaymentIntentModel.updateOne(
        { id: intent.id, otpAttempts: { $lt: 5 } },
        { $inc: { otpAttempts: 1 } },
      );
      if (!attempt.modifiedCount) {
        res
          .status(429)
          .json({ message: "Too many attempts. Request a new demo OTP." });
        return;
      }
      if (
        !timingSafeEqual(
          Buffer.from(demoOtp(intent.id, intent.otpIssuedAt!)),
          Buffer.from(input.otp),
        )
      ) {
        res
          .status(400)
          .json({
            message:
              "Incorrect OTP. Enter the six-digit demo code shown below.",
          });
        return;
      }
      intent.status = "captured";
      intent.paymentId = `demo_payment_${intent.id}`;
      await intent.save();
    }
    const result = await createBookedWorkspace(req.user!, {
      ...intent.reservation,
      bookingReference: `VOY-DEMO-${intent.id}`,
      paymentReference: intent.id,
    });
    intent.bookingId = result.booking.id;
    await intent.save();
    res.json({
      ...result,
      paymentId: intent.paymentId,
      transactionReference: intent.orderId,
    });
  } catch (error) {
    res
      .status(error instanceof z.ZodError ? 400 : 500)
      .json({
        message:
          error instanceof z.ZodError
            ? "Enter a six-digit OTP."
            : "Demo confirmation could not finish. Retry this order.",
      });
  }
});

paymentsRouter.post("/demo/resend", async (req: AuthenticatedRequest, res) => {
  if (!demoMode()) {
    res.status(404).json({ message: "Demo payments are disabled." });
    return;
  }
  const input = z.object({ intentId: z.string() }).safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ message: "Select a demo order." });
    return;
  }
  try {
    const intent = await PaymentIntentModel.findOne({
      id: input.data.intentId,
      userId: req.user!.id,
      provider: "demo",
      status: "created",
    });
    if (!intent) {
      res.status(404).json({ message: "Demo order unavailable." });
      return;
    }
    if (
      intent.otpIssuedAt &&
      Date.now() - intent.otpIssuedAt.getTime() < 30000
    ) {
      res
        .status(429)
        .json({
          message: "Wait thirty seconds before requesting another code.",
        });
      return;
    }
    intent.otpIssuedAt = new Date();
    intent.otpExpiresAt = new Date(Date.now() + 5 * 60000);
    intent.otpAttempts = 0;
    await intent.save();
    res.json({
      demoOtp: demoOtp(intent.id, intent.otpIssuedAt),
      expiresAt: intent.otpExpiresAt,
    });
  } catch {
    res.status(500).json({ message: "Could not generate a new demo OTP." });
  }
});
