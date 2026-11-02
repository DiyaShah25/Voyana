/**
 * In-memory MongoDB test helper for Voyana backend tests.
 * Uses mongodb-memory-server to spin up an isolated MongoDB instance.
 * Falls back to real Atlas when VOYANA_TEST_REAL_DB=true is set.
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer | null = null;

/**
 * Start an isolated in-memory MongoDB server (unless VOYANA_TEST_REAL_DB=true)
 */
export async function startMemoryMongo(): Promise<void> {
  if (process.env.VOYANA_TEST_REAL_DB === 'true') {
    console.log('[TestDB] Using real MongoDB Atlas (VOYANA_TEST_REAL_DB=true)');
    return;
  }

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri, {
    dbName: 'voyana_test',
    serverSelectionTimeoutMS: 5000,
  });

  console.log('[TestDB] In-memory MongoDB started:', uri);
}

/**
 * Stop and clean up the in-memory server
 */
export async function stopMemoryMongo(): Promise<void> {
  if (process.env.VOYANA_TEST_REAL_DB === 'true') {
    return;
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }

  console.log('[TestDB] In-memory MongoDB stopped.');
}

/**
 * Drop all collections (reset between tests if needed)
 */
export async function clearMemoryMongo(): Promise<void> {
  if (process.env.VOYANA_TEST_REAL_DB === 'true') return;

  const collections = await mongoose.connection.db.collections();
  for (const col of collections) {
    await col.deleteMany({});
  }
}

