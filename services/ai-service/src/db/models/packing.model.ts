/**
 * Smart Packing Checklist Mongoose Model
 * Manages category-based packing items, checklist progress tracking,
 * and member assignments for Voyana.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type PackingCategory =
  | 'Clothing'
  | 'Electronics'
  | 'Documents & Money'
  | 'Toiletries & Health'
  | 'Destination Essentials'
  | 'Accessories';

export type PackingPriority = 'essential' | 'recommended' | 'optional';

export interface IPackingItem {
  id: string;
  name: string;
  category: PackingCategory;
  isPacked: boolean;
  priority: PackingPriority;
  assignedTo: string;
  quantity: number;
  notes?: string;
  weatherTag?: string;
}

export interface IPackingList extends Document {
  id: string;
  tripId?: string;
  destination: string;
  tripDurationDays: number;
  seasonOrWeather: string;
  items: IPackingItem[];
  createdAt: Date;
  updatedAt: Date;
}

const PackingItemSchema = new Schema<IPackingItem>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'Clothing',
        'Electronics',
        'Documents & Money',
        'Toiletries & Health',
        'Destination Essentials',
        'Accessories',
      ],
      default: 'Clothing',
    },
    isPacked: { type: Boolean, default: false },
    priority: {
      type: String,
      enum: ['essential', 'recommended', 'optional'],
      default: 'recommended',
    },
    assignedTo: { type: String, default: 'Everyone' },
    quantity: { type: Number, default: 1 },
    notes: { type: String },
    weatherTag: { type: String },
  },
  { _id: false }
);

const PackingListSchema = new Schema<IPackingList>(
  {
    id: { type: String, required: true, unique: true, index: true },
    tripId: { type: String, index: true },
    destination: { type: String, required: true },
    tripDurationDays: { type: Number, default: 5 },
    seasonOrWeather: { type: String, default: 'Mild' },
    items: { type: [PackingItemSchema], default: [] },
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

export const PackingListModel: Model<IPackingList> =
  mongoose.models.PackingList || mongoose.model<IPackingList>('PackingList', PackingListSchema);
