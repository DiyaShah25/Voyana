import { toError } from '../../utils/errors.js';
/**
 * User Mongoose Model
 * Manages user accounts, credentials with secure bcrypt hashing,
 * traveler profiles, preferences, and roles for Voyana.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserPreferences {
  preferredCurrency: string;
  travelStyle: string;
  homeAirport?: string;
  emailNotifications: boolean;
  smsAlerts: boolean;
}

export interface IUser extends Document {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  googleSub?: string;
  role: 'traveler' | 'organizer' | 'admin';
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  preferences: IUserPreferences;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    preferredCurrency: { type: String, default: 'INR' },
    travelStyle: { type: String, default: 'Cultural & Historic' },
    homeAirport: { type: String },
    emailNotifications: { type: Boolean, default: true },
    smsAlerts: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    googleSub: { type: String, unique: true, sparse: true },
    role: {
      type: String,
      enum: ['traveler', 'organizer', 'admin'],
      default: 'traveler',
    },
    avatarUrl: { type: String },
    bio: { type: String },
    phone: { type: String },
    preferences: { type: UserPreferencesSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Password comparison method (supports both bcrypt hash and legacy plaintext during migration)
UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.passwordHash) return false;
  // If stored as bcrypt hash
  if (this.passwordHash.startsWith('$2a$') || this.passwordHash.startsWith('$2b$')) {
    return bcrypt.compare(candidate, this.passwordHash);
  }
  // Fallback for initial demo seed migration
  return this.passwordHash === candidate;
};

// Pre-save hook to hash password if modified
UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  try {
    if (!this.passwordHash.startsWith('$2a$') && !this.passwordHash.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    }
    next();
  } catch (caught) {
      const err = toError(caught);
    next(err);
  }
});

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
