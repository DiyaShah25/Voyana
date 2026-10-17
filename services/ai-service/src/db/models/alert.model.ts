/**
 * Booking Alert Mongoose Model for MongoDB
 * Schema definition for real-time customer notifications on booking status transitions
 * (flight delays, hotel confirmations, cancellations).
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
  alertId: string;
  userId: string;
  bookingId?: string;
  bookingReference?: string;
  bookingType?: 'flight' | 'hotel' | 'transport';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'success' | 'critical';
  isRead: boolean;
  oldStatus?: string;
  newStatus?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema: Schema = new Schema(
  {
    alertId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    bookingId: { type: String, index: true },
    bookingReference: { type: String },
    bookingType: { type: String, enum: ['flight', 'hotel', 'transport'] },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: {
      type: String,
      enum: ['info', 'warning', 'success', 'critical'],
      default: 'info',
    },
    isRead: { type: Boolean, default: false, index: true },
    oldStatus: { type: String },
    newStatus: { type: String },
  },
  {
    timestamps: true,
  }
);

export const AlertModel =
  mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema, 'booking_alerts');
