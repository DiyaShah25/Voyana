/**
 * Packing Checklist Mongoose Model for MongoDB
 * Schema definition for weather-aware travel checklists, member item assignments,
 * and packing readiness metrics.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IPackingItem {
  id: string;
  name: string;
  category: string;
  isPacked: boolean;
  assignedTo: string;
  priority: 'essential' | 'recommended' | 'optional';
  quantity: number;
  notes?: string;
  weatherTag?: string;
}

export interface IPackingList extends Document {
  tripId: string;
  destination: string;
  tripDurationDays: number;
  seasonOrWeather: string;
  items: IPackingItem[];
  createdAt: Date;
  updatedAt: Date;
}

const PackingItemSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    isPacked: { type: Boolean, default: false },
    assignedTo: { type: String, default: 'Everyone' },
    priority: { type: String, enum: ['essential', 'recommended', 'optional'], default: 'recommended' },
    quantity: { type: Number, default: 1 },
    notes: { type: String, default: '' },
    weatherTag: { type: String, default: '' },
  },
  { _id: false }
);

const PackingListSchema: Schema = new Schema(
  {
    tripId: { type: String, required: true, unique: true, index: true },
    destination: { type: String, required: true },
    tripDurationDays: { type: Number, default: 5 },
    seasonOrWeather: { type: String, default: 'Mild / Spring' },
    items: { type: [PackingItemSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

export const PackingListModel =
  mongoose.models.PackingList || mongoose.model<IPackingList>('PackingList', PackingListSchema, 'packing_lists');
