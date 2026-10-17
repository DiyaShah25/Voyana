/**
 * Trip Mongoose Model for MongoDB
 * Schema definition for collaborative multi-day travel plans, activities,
 * group members, and budgeting allocations.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ITripActivity {
  id: string;
  dayNumber: number;
  timeSlot: string;
  title: string;
  category: string;
  locationName: string;
  cost: number;
  description?: string;
  completed?: boolean;
}

export interface ITripMember {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  avatar?: string;
}

export interface ITrip extends Document {
  tripId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverImage?: string;
  status: 'planning' | 'active' | 'completed' | 'archived';
  budgetTotal: number;
  members: ITripMember[];
  activities: ITripActivity[];
  createdAt: Date;
  updatedAt: Date;
}

const TripActivitySchema = new Schema(
  {
    id: { type: String, required: true },
    dayNumber: { type: Number, required: true, default: 1 },
    timeSlot: { type: String, default: '10:00 AM' },
    title: { type: String, required: true },
    category: { type: String, default: 'Sightseeing' },
    locationName: { type: String, default: '' },
    cost: { type: Number, default: 0 },
    description: { type: String, default: '' },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const TripMemberSchema = new Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
    avatar: { type: String },
  },
  { _id: false }
);

const TripSchema: Schema = new Schema(
  {
    tripId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    destination: { type: String, required: true, index: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    coverImage: { type: String },
    status: {
      type: String,
      enum: ['planning', 'active', 'completed', 'archived'],
      default: 'planning',
      index: true,
    },
    budgetTotal: { type: Number, default: 2500 },
    members: { type: [TripMemberSchema], default: [] },
    activities: { type: [TripActivitySchema], default: [] },
  },
  {
    timestamps: true,
  }
);

export const TripModel =
  mongoose.models.Trip || mongoose.model<ITrip>('Trip', TripSchema, 'trips');
