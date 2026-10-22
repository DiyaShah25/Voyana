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
  dbName: process.env.MONGODB_DB_NAME || 'voyana',
  jwtSecret: process.env.JWT_SECRET || 'voyana-team-shared-secret-key-2026',
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
};
