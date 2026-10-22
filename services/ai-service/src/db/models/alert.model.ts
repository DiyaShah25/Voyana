/**
 * Alert / Notification Mongoose Model
 * Manages booking alerts, status updates, travel notices, and read-states for Voyana.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type BookingStatus = 'pending' | 'confirmed' | 'delayed' | 'cancelled' | 'completed';
export type BookingType = 'flight' | 'hotel' | 'transport' | 'package';
export type AlertSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface IAlert extends Document {
  id: string;
  user_id: string;
  booking_id?: string;
  booking_reference?: string;
  booking_type?: BookingType;
  title: string;
  message: string;
  severity: AlertSeverity;
  old_status?: BookingStatus;
  new_status?: BookingStatus;
  is_read: boolean;
  created_at: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    id: { type: String, required: true, unique: true, index: true },
    user_id: { type: String, required: true, index: true },
    booking_id: { type: String },
    booking_reference: { type: String },
    booking_type: {
      type: String,
      enum: ['flight', 'hotel', 'transport', 'package'],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: {
      type: String,
      enum: ['info', 'success', 'warning', 'critical'],
      default: 'info',
    },
    old_status: { type: String },
    new_status: { type: String },
    is_read: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const AlertModel: Model<IAlert> =
  mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema);
