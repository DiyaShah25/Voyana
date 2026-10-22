/**
 * Trip Mongoose Model
 * Manages multi-day trip itineraries, activities, collaborative members,
 * and travel schedules for Voyana.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITripMember {
  id: string;
  tripId?: string;
  userId?: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: string;
}

export interface ITripActivity {
  id: string;
  dayNumber: number;
  activityDate?: string;
  timeSlot?: string;
  title: string;
  locationName?: string;
  description?: string;
  cost?: number;
  category?: string;
  bookingReference?: string;
  orderIndex: number;
  isCompleted?: boolean;
}

export interface ITrip extends Document {
  id: string;
  ownerId: string;
  title: string;
  destination: string;
  country?: string;
  startDate: string;
  endDate: string;
  description?: string;
  coverImage?: string;
  visibility: 'private' | 'shared' | 'public';
  budgetTarget: number;
  currency: string;
  tags: string[];
  isTemplate: boolean;
  members: ITripMember[];
  activities: ITripActivity[];
  createdAt: Date;
  updatedAt: Date;
}

const TripMemberSchema = new Schema<ITripMember>(
  {
    id: { type: String, required: true },
    userId: { type: String },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    avatarUrl: { type: String },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'viewer' },
    joinedAt: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

const TripActivitySchema = new Schema<ITripActivity>(
  {
    id: { type: String, required: true },
    dayNumber: { type: Number, required: true },
    activityDate: { type: String },
    timeSlot: { type: String },
    title: { type: String, required: true },
    locationName: { type: String },
    description: { type: String },
    cost: { type: Number, default: 0 },
    category: { type: String },
    bookingReference: { type: String },
    orderIndex: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
  },
  { _id: false }
);

const TripSchema = new Schema<ITrip>(
  {
    id: { type: String, required: true, unique: true, index: true },
    ownerId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    country: { type: String, trim: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    description: { type: String },
    coverImage: { type: String },
    visibility: {
      type: String,
      enum: ['private', 'shared', 'public'],
      default: 'shared',
      index: true,
    },
    budgetTarget: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    tags: [{ type: String }],
    isTemplate: { type: Boolean, default: false, index: true },
    members: { type: [TripMemberSchema], default: [] },
    activities: { type: [TripActivitySchema], default: [] },
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

// Indexes for fast lookup
TripSchema.index({ destination: 'text', title: 'text', country: 'text' });
TripSchema.index({ 'members.userId': 1 });
TripSchema.index({ 'members.email': 1 });

export const TripModel: Model<ITrip> =
  mongoose.models.Trip || mongoose.model<ITrip>('Trip', TripSchema);
