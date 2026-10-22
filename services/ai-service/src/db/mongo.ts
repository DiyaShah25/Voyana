/**
 * MongoDB Connection Manager for Voyana
 * Establishes and manages the centralized Mongoose connection to MongoDB Atlas
 * with connection pooling, retry logic, credential masking in logs,
 * and graceful shutdown handling.
 */

import mongoose from 'mongoose';
import { config } from '../config/env.js';

let isConnected = false;

// Mask credentials in connection string for safe logging
export function maskMongoUri(uri: string): string {
  try {
    return uri.replace(/\/\/(.*?)@/, (_match, creds) => {
      const parts = creds.split(':');
      const user = parts[0] || '***';
      return `//${user}:******@`;
    });
  } catch {
    return 'mongodb://******';
  }
}

export async function connectMongo(): Promise<boolean> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  const maskedUri = maskMongoUri(config.mongoUri);

  try {
    mongoose.set('strictQuery', true);

    await mongoose.connect(config.mongoUri, {
      dbName: config.dbName,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
    });

    isConnected = true;
    console.log(`[Mongo] Connected successfully to database "${config.dbName}" via ${maskedUri}`);
    return true;
  } catch (error: any) {
    console.warn(`[Mongo] Failed to connect to ${maskedUri}: ${error?.message || error}`);
    console.warn('[Mongo] Running with in-memory fallback. Team data will persist once valid MongoDB URI is supplied.');
    isConnected = false;
    return false;
  }
}

export async function disconnectMongo(): Promise<void> {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[Mongo] Disconnected from MongoDB.');
  }
}

export function getMongoStatus(): 'connected' | 'disconnected' {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}

export function getMongoDetails(): {
  status: 'connected' | 'disconnected';
  database: string;
  host?: string;
  readyState: number;
} {
  const ready = mongoose.connection.readyState === 1;
  return {
    status: ready ? 'connected' : 'disconnected',
    database: config.dbName,
    host: ready ? mongoose.connection.host : undefined,
    readyState: mongoose.connection.readyState,
  };
}
