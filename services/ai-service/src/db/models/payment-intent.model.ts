import mongoose, { Schema } from "mongoose";

interface IPaymentIntent {
  id: string;
  userId: string;
  requestHash: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  reservation: Record<string, unknown>;
  status: "created" | "captured" | "refunded";
  paymentId?: string;
  bookingId?: string;
  createdAt: Date;
  provider: "demo" | "razorpay";
  otpIssuedAt?: Date;
  otpExpiresAt?: Date;
  otpAttempts: number;
}
const schema = new Schema<IPaymentIntent>(
  {
    id: { type: String, unique: true, required: true },
    userId: { type: String, required: true, index: true },
    requestHash: { type: String, index: true },
    orderId: { type: String, required: true, unique: true },
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    reservation: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["created", "captured", "refunded"],
      default: "created",
    },
    paymentId: String,
    bookingId: String,
    provider: { type: String, enum: ["demo", "razorpay"], default: "razorpay" },
    otpIssuedAt: Date,
    otpExpiresAt: Date,
    otpAttempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export const PaymentIntentModel = mongoose.model<IPaymentIntent>(
  "PaymentIntent",
  schema,
);
