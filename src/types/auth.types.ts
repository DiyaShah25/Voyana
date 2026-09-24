/**
 * Voyana Authentication & User Domain Models
 * Defines roles (Traveler, Organizer, Admin), user profile, session, and credentials.
 */

export type UserRole = 'traveler' | 'organizer' | 'admin';

export interface UserPreferences {
  preferredCurrency: string; // e.g. 'USD', 'EUR', 'INR'
  travelStyle: string;       // e.g. 'Cultural & Historic', 'Adventure & Nature', 'Luxury & Wellness'
  homeAirport?: string;      // e.g. 'JFK', 'CDG', 'HND'
  emailNotifications: boolean;
  smsAlerts: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
  expiresAt: number; // Unix timestamp ms
}

export interface AuthResult {
  ok: boolean;
  message: string;
  session?: AuthSession;
  fieldErrors?: {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
}

export interface StoredUserRecord extends UserProfile {
  passwordHash: string;
}
