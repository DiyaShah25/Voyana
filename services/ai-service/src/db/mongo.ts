import mongoose from 'mongoose';
import { config } from '../config/env.js';

let isConnected = false;

export async function connectMongo(): Promise<boolean> {
  if (isConnected) return true;

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 3000,
    });
    isConnected = true;
    console.log('[Mongo] Connected to MongoDB successfully.');
    return true;
  } catch (error: any) {
    console.warn(`[Mongo] MongoDB connection skipped/unavailable: ${error?.message || error}. Falling back to in-memory telemetry.`);
    isConnected = false;
    return false;
  }
}

export async function disconnectMongo(): Promise<void> {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
  }
}

export function getMongoStatus(): 'connected' | 'disconnected' {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}
