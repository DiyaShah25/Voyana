/**
 * Booking Mongoose Model for MongoDB
 * Schema definition for flights, hotels, and transportation reservations.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IBooking extends Document {
  bookingId: string;
  userId: string;
  bookingReference: string;
  bookingType: 'flight' | 'hotel' | 'transport';
  title: string;
  description?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'delayed' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentReference?: string;
  details?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema: Schema = new Schema(
  {
    bookingId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    bookingReference: { type: String, required: true, unique: true, index: true },
    bookingType: {
      type: String,
      enum: ['flight', 'hotel', 'transport'],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'delayed', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentReference: { type: String },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

export const BookingModel =
  mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema, 'bookings');
