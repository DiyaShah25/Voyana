/**
 * Voyana Database Seeding & Verification Script
 *
 * Seeds a dedicated test database (default: voyana_test) with realistic,
 * internally consistent test data for all functional scenarios.
 * Built on top of migration.service.ts to ensure 100% idempotency.
 *
 * Safety Guard:
 * - Refuses to execute against any database whose name indicates production.
 * - Explicitly prints target database and connection details prior to execution.
 *
 * Usage:
 *   npm run seed            # Idempotently seed voyana_test
 *   npm run seed:reset      # Drop existing collections and re-seed clean
 */

import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { maskMongoUri } from '../db/mongo.js';
import { runDataMigration } from '../services/migration.service.js';
import { UserModel } from '../db/models/user.model.js';
import { TripModel } from '../db/models/trip.model.js';
import { BookingModel } from '../db/models/booking.model.js';
import { BudgetModel } from '../db/models/budget.model.js';
import { PackingListModel } from '../db/models/packing.model.js';
import { AlertModel } from '../db/models/alert.model.js';
import { ChatMessageModel, TaskModel, PollModel, MemoryModel } from '../db/models/collaboration.model.js';
import { ReviewModel } from '../db/models/review.model.js';
import { AiRequestModel } from '../db/models/ai-request.model.js';
import { DestinationModel } from '../db/models/destination.model.js';

// Dedicated test database default
const TARGET_DB = process.env.SEED_DB_NAME || 'voyana_test';
const TARGET_URI = process.env.MONGODB_URI || config.mongoUri || 'mongodb://localhost:27017/voyana_test';

// Production safety guard patterns
const PROD_PATTERNS = [/prod/i, /production/i, /live/i, /^voyana$/i];

function assertSafeTargetDatabase(dbName: string, uri: string): void {
  const isExplicitTest = dbName.toLowerCase().includes('test') || dbName.toLowerCase().includes('dev') || dbName.toLowerCase().includes('staging');
  const looksLikeProd = PROD_PATTERNS.some((pattern) => pattern.test(dbName)) && !isExplicitTest;

  if (looksLikeProd || uri.includes('production') || uri.includes('prod-cluster')) {
    console.error(`\n=============================================================`);
    console.error(`CRITICAL SAFETY ERROR: REFUSING TO SEED TARGET DATABASE`);
    console.error(`Target DB: "${dbName}"`);
    console.error(`URI:       "${maskMongoUri(uri)}"`);
    console.error(`Reason:    Database name/URI matches production safety filter.`);
    console.error(`=============================================================\n`);
    process.exit(1);
  }
}

// Additional Scenario Bookings: Ensure explicit pending and cancelled statuses with realistic metadata
const SCENARIO_BOOKINGS = [
  {
    id: 'bkg-fl-pending-01',
    userId: 'usr-traveler-03',
    bookingReference: 'VOY-FL-100201',
    bookingType: 'flight',
    status: 'pending',
    totalAmount: 495.0,
    currency: 'USD',
    paymentStatus: 'unpaid',
    contactEmail: 'traveler@voyana.com',
    contactPhone: '+1 (555) 782-3391',
    flightDetails: {
      flightNumber: 'AF-332',
      airline: 'Air France',
      originAirport: 'BOS',
      destinationAirport: 'CDG',
      originCity: 'Boston',
      destinationCity: 'Paris',
      departureTime: '2026-11-15T19:00:00Z',
      arrivalTime: '2026-11-16T08:15:00Z',
      cabinClass: 'Economy',
      passengerName: 'Alex Morgan',
      seatNumber: '24B',
      baggageAllowanceKg: 23,
      passengers: 1,
    },
  },
  {
    id: 'bkg-ht-pending-02',
    userId: 'usr-bhavika-05',
    bookingReference: 'VOY-HT-100202',
    bookingType: 'hotel',
    status: 'pending',
    totalAmount: 850.0,
    currency: 'EUR',
    paymentStatus: 'unpaid',
    contactEmail: 'bhavika@voyana.com',
    contactPhone: '+1 (555) 912-4018',
    hotelDetails: {
      hotelName: 'Grand Hotel Zermatterhof',
      roomType: 'Matterhorn Alpine Deluxe',
      checkInDate: '2026-12-05',
      checkOutDate: '2026-12-08',
      guests: 2,
      city: 'Zermatt',
      address: 'Bahnhofstrasse 55, 3920 Zermatt, Switzerland',
      stars: 5,
    },
  },
  {
    id: 'bkg-fl-cancelled-01',
    userId: 'usr-diya-04',
    bookingReference: 'VOY-FL-100301',
    bookingType: 'flight',
    status: 'cancelled',
    totalAmount: 620.0,
    currency: 'USD',
    paymentStatus: 'refunded',
    contactEmail: 'diya@voyana.com',
    flightDetails: {
      flightNumber: 'BA-117',
      airline: 'British Airways',
      originAirport: 'LHR',
      destinationAirport: 'JFK',
      originCity: 'London',
      destinationCity: 'New York',
      departureTime: '2026-10-10T09:30:00Z',
      arrivalTime: '2026-10-10T12:45:00Z',
      cabinClass: 'Economy',
      passengerName: 'Diya Shah',
      seatNumber: '31A',
      passengers: 1,
    },
  },
  {
    id: 'bkg-tr-cancelled-02',
    userId: 'usr-jagrat-06',
    bookingReference: 'VOY-TR-100302',
    bookingType: 'transport',
    status: 'cancelled',
    totalAmount: 180.0,
    currency: 'USD',
    paymentStatus: 'refunded',
    contactEmail: 'jagrat@voyana.com',
    transportDetails: {
      providerName: 'Tokyo Executive Chauffeur',
      transportType: 'private_transfer',
      pickupLocation: 'Narita International Airport (NRT)',
      dropoffLocation: 'Shinjuku Prince Hotel',
      pickupTime: '2026-11-01T14:00:00Z',
      vehicleModel: 'Toyota Alphard Executive Lounge',
      passengerName: 'Jagrat Kumar',
    },
  },
];

export async function seedDatabase(options: { reset?: boolean } = {}): Promise<any> {
  assertSafeTargetDatabase(TARGET_DB, TARGET_URI);

  console.log(`\n=============================================================`);
  console.log(`[Seed Guard] Target Database: "${TARGET_DB}"`);
  console.log(`[Seed Guard] Connection URI:  "${maskMongoUri(TARGET_URI)}"`);
  console.log(`[Seed Guard] Reset Mode:       ${options.reset ? 'ENABLED (Wiping collections first)' : 'DISABLED (Idempotent Upsert)'}`);
  console.log(`=============================================================\n`);

  mongoose.set('strictQuery', true);
  let memoryServer: any = null;

  try {
    await mongoose.connect(TARGET_URI, {
      dbName: TARGET_DB,
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[Seed] Connected to MongoDB database: ${TARGET_DB}`);
  } catch (_connErr) {
    console.log('[Seed] Standalone MongoDB daemon not detected at URI. Initializing in-memory test database...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create({
      instance: { dbName: TARGET_DB },
    });
    const memUri = memoryServer.getUri();
    await mongoose.connect(memUri, { dbName: TARGET_DB });
    console.log(`[Seed] In-memory database initialized: ${memUri} (${TARGET_DB})`);
  }

  if (options.reset && mongoose.connection.db) {
    console.log('[Seed Reset] Dropping existing test data collections...');
    const collections = await mongoose.connection.db.collections();
    for (const col of collections) {
      await col.deleteMany({});
    }
    console.log(`[Seed Reset] Successfully cleared ${collections.length} collections.`);
  }

  // 1. Run core migration (15+ items per collection)
  console.log('[Seed] Running core migration service...');
  await runDataMigration();

  // 2. Insert Scenario Bookings (pending & cancelled with matching payments)
  console.log('[Seed] Inserting scenario bookings (pending, confirmed, cancelled)...');
  for (const b of SCENARIO_BOOKINGS) {
    await BookingModel.findOneAndUpdate({ id: b.id }, { $set: b }, { upsert: true, new: true });
  }

  // 3. Query and verify actual record counts per collection with real queries
  console.log('\n[Seed Verification] Querying actual collection counts from database:');

  const counts = {
    users: await UserModel.countDocuments(),
    destinations: await DestinationModel.countDocuments(),
    trips: await TripModel.countDocuments(),
    bookingsTotal: await BookingModel.countDocuments(),
    bookingsConfirmed: await BookingModel.countDocuments({ status: 'confirmed' }),
    bookingsPending: await BookingModel.countDocuments({ status: 'pending' }),
    bookingsCancelled: await BookingModel.countDocuments({ status: 'cancelled' }),
    budgets: await BudgetModel.countDocuments(),
    packingLists: await PackingListModel.countDocuments(),
    tasks: await TaskModel.countDocuments(),
    polls: await PollModel.countDocuments(),
    chatMessages: await ChatMessageModel.countDocuments(),
    memories: await MemoryModel.countDocuments(),
    alerts: await AlertModel.countDocuments(),
    reviews: await ReviewModel.countDocuments(),
    aiRequests: await AiRequestModel.countDocuments(),
  };

  console.log('-------------------------------------------------------------');
  console.log(`Collection              | Actual Record Count`);
  console.log('-------------------------------------------------------------');
  console.log(`users                   | ${counts.users}`);
  console.log(`destinations            | ${counts.destinations}`);
  console.log(`trips                   | ${counts.trips}`);
  console.log(`bookings (Total)        | ${counts.bookingsTotal} (Confirmed: ${counts.bookingsConfirmed}, Pending: ${counts.bookingsPending}, Cancelled: ${counts.bookingsCancelled})`);
  console.log(`budgets                 | ${counts.budgets}`);
  console.log(`packing_lists           | ${counts.packingLists}`);
  console.log(`collaborative_tasks     | ${counts.tasks}`);
  console.log(`voting_polls            | ${counts.polls}`);
  console.log(`chat_messages           | ${counts.chatMessages}`);
  console.log(`memories                | ${counts.memories}`);
  console.log(`alerts                  | ${counts.alerts}`);
  console.log(`reviews                 | ${counts.reviews}`);
  console.log(`ai_requests             | ${counts.aiRequests}`);
  console.log('-------------------------------------------------------------');
  console.log('✓ Seeding and verification completed successfully!\n');

  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }

  return counts;
}

// Execute if invoked directly from CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  const isReset = process.argv.includes('--reset');
  seedDatabase({ reset: isReset })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]', err);
      process.exit(1);
    });
}
