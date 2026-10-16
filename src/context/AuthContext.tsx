/**
 * Authentication Context & Provider
 * Manages global user authentication state, active sessions,
 * role permissions (traveler, organizer, admin), and login/signup/logout actions.
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type {
  AuthResult,
  UserProfile,
  UserRole,
} from '@/types/auth.types';
import {
  signIn as apiSignIn,
  signUp as apiSignUp,
  signOut as apiSignOut,
  restoreSession,
  updateUserProfile as apiUpdateProfile,
  switchUserRole as apiSwitchRole,
} from '@/services/authService';

// Shape of values exposed by the auth context
interface AuthContextValue {
  user: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string, role?: UserRole) => Promise<AuthResult>;
  signOut: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  switchRole: (newRole: UserRole) => Promise<void>;
  isAdmin: boolean;
  isOrganizer: boolean;
  isTraveler: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Auth Provider - wraps the app to supply auth state globally
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on initial application load
  useEffect(() => {
    try {
      const session = restoreSession();
      if (session) {
        setUser(session.user);
        setToken(session.token);
      }
    } catch (err) {
      console.error('Failed to restore auth session:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    const result = await apiSignIn(email, password);
    if (result.ok && result.session) {
      setUser(result.session.user);
      setToken(result.session.token);
    }
    return result;
  };

  // Register a new user account
  const signUp = async (
    name: string,
    email: string,
    password: string,
    role: UserRole = 'traveler'
  ): Promise<AuthResult> => {
    const result = await apiSignUp(name, email, password, role);
    if (result.ok && result.session) {
      setUser(result.session.user);
      setToken(result.session.token);
    }
    return result;
  };

  // Clear auth state and end session
  const signOut = () => {
    apiSignOut();
    setUser(null);
    setToken(null);
  };

  // Update current user's profile data
  const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!user) return false;
    const updated = await apiUpdateProfile(user.id, updates);
    if (updated) {
      setUser(updated);
      return true;
    }
    return false;
  };

  // Switch user's active role
  const switchRole = async (newRole: UserRole) => {
    if (!user) return;
    const updated = await apiSwitchRole(user.id, newRole);
    if (updated) {
      setUser(updated);
    }
  };

  // Derived role flags for quick permission checks
  const role: UserRole = user?.role || 'traveler';
  const isAuthenticated = Boolean(user && token);

  // Memoized context value to avoid unnecessary re-renders
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      isAuthenticated,
      token,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      switchRole,
      isAdmin: role === 'admin',
      isOrganizer: role === 'organizer',
      isTraveler: role === 'traveler',
    }),
    [user, role, isAuthenticated, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to consume auth context
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
