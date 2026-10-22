/**
 * Destination Mongoose Model
 * Schema definition for world travel destinations, geographic coordinates,
 * regional groupings, visual imagery, and seasonal highlights.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type DestinationRegion = 'Europe' | 'Asia' | 'Americas' | 'Africa' | 'Middle East' | 'Oceania';

export interface IDestination extends Document {
  id: string;
  name: string;
  country: string;
  region: DestinationRegion;
  image: string;
  bestSeason: string;
  highlight: string;
  style: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DestinationSchema = new Schema<IDestination>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    region: {
      type: String,
      required: true,
      enum: ['Europe', 'Asia', 'Americas', 'Africa', 'Middle East', 'Oceania'],
      index: true,
    },
    image: { type: String, required: true },
    bestSeason: { type: String, required: true },
    highlight: { type: String, required: true },
    style: { type: String, required: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
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

export const DestinationModel: Model<IDestination> =
  mongoose.models.Destination || mongoose.model<IDestination>('Destination', DestinationSchema, 'destinations');
