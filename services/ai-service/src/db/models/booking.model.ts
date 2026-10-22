/**
 * Booking Mongoose Model
 * Manages flights, hotels, transport, and package bookings
 * with status tracking, payment lifecycle, and guest information.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type BookingType = 'flight' | 'hotel' | 'transport' | 'package';
export type BookingStatus = 'pending' | 'confirmed' | 'delayed' | 'cancelled' | 'completed' | 'refunded';
export type PaymentStatus = 'unpaid' | 'authorized' | 'paid' | 'refunded' | 'failed' | 'pending';

export interface IBooking extends Document {
  id?: string;
  bookingId?: string;
  userId: string;
  bookingReference: string;
  bookingType: BookingType;
  title?: string;
  description?: string;
  amount?: number;
  totalAmount?: number;
  currency: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  contactEmail?: string;
  contactPhone?: string;
  specialRequests?: string;
  details?: Record<string, any>;
  flightDetails?: Record<string, any>;
  hotelDetails?: Record<string, any>;
  transportDetails?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    id: { type: String, sparse: true, index: true },
    bookingId: { type: String, sparse: true, index: true },
    userId: { type: String, required: true, index: true },
    bookingReference: { type: String, required: true, unique: true, index: true },
    bookingType: {
      type: String,
      enum: ['flight', 'hotel', 'transport', 'package'],
      required: true,
      index: true,
    },
    title: { type: String },
    description: { type: String, default: '' },
    amount: { type: Number },
    totalAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      default: 'confirmed',
      index: true,
    },
    paymentStatus: {
      type: String,
      default: 'paid',
    },
    paymentReference: { type: String },
    contactEmail: { type: String, lowercase: true, trim: true },
    contactPhone: { type: String },
    specialRequests: { type: String },
    details: { type: Schema.Types.Mixed },
    flightDetails: { type: Schema.Types.Mixed },
    hotelDetails: { type: Schema.Types.Mixed },
    transportDetails: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const BookingModel: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema, 'bookings');

