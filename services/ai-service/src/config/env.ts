/**
 * Environment Configuration
 * Loads environment variables from .env and exports typed config
 * for server port, MongoDB Atlas URI, JWT secrets, and LLM model settings.
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  llmProvider: (process.env.LLM_PROVIDER || 'mock').toLowerCase(),
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/voyana',
  dbName: process.env.NODE_ENV === 'test' ? 'voyana_test' : process.env.MONGODB_DB_NAME || 'voyana',
  seedOnStart: process.env.SEED_ON_START === 'true',
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'voyana-tests-only-signing-secret' : ''),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  // Payment secrets are backend-only; only rzp_test_ IDs are accepted by the adapter.
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  paymentProvider: process.env.PAYMENT_PROVIDER?.trim().toLowerCase() || 'demo',
  frontendOrigins: (process.env.FRONTEND_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(value => value.trim()),
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
};

if (!config.jwtSecret) throw new Error("JWT_SECRET must be configured in the backend environment.");
