/**
 * Travel Review Mongoose Model
 * Manages destination, hotel, flight, transport and activity reviews,
 * ratings, verified booking badges, and helpful votes in MongoDB Atlas.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type ReviewTargetType = 'destination' | 'hotel' | 'flight' | 'transport' | 'activity' | 'trip';
export type TravelerType = 'Solo' | 'Couples' | 'Family' | 'Friends' | 'Business';

export interface IReviewCategoryRatings {
  cleanliness: number;
  service: number;
  valueForMoney: number;
  location: number;
  safety: number;
}

export interface IReview extends Document {
  id: string;
  targetType: ReviewTargetType;
  targetId: string;
  targetTitle: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  categoryRatings: IReviewCategoryRatings;
  title: string;
  comment: string;
  pros: string[];
  cons: string[];
  travelerType: TravelerType;
  visitDate: string;
  photos: string[];
  helpfulVotes: number;
  votedUsers: string[];
  verifiedBooking: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategoryRatingsSchema = new Schema<IReviewCategoryRatings>(
  {
    cleanliness: { type: Number, default: 5 },
    service: { type: Number, default: 5 },
    valueForMoney: { type: Number, default: 5 },
    location: { type: Number, default: 5 },
    safety: { type: Number, default: 5 },
  },
  { _id: false }
);

const ReviewSchema = new Schema<IReview>(
  {
    id: { type: String, required: true, unique: true, index: true },
    targetType: {
      type: String,
      enum: ['destination', 'hotel', 'flight', 'transport', 'activity', 'trip'],
      required: true,
      index: true,
    },
    targetId: { type: String, required: true, index: true },
    targetTitle: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userAvatar: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    categoryRatings: { type: CategoryRatingsSchema, required: true },
    title: { type: String, required: true },
    comment: { type: String, required: true },
    pros: [{ type: String }],
    cons: [{ type: String }],
    travelerType: {
      type: String,
      enum: ['Solo', 'Couples', 'Family', 'Friends', 'Business'],
      default: 'Couples',
    },
    visitDate: { type: String, required: true },
    photos: [{ type: String }],
    helpfulVotes: { type: Number, default: 0 },
    votedUsers: [{ type: String }],
    verifiedBooking: { type: Boolean, default: true },
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

export const ReviewModel: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
