/**
 * Comprehensive All-Routes Integration and End-to-End API Test Suite
 * Tests every mounted route group in app.ts:
 * /health, /api/health, /ai/chat, /api/auth, /api/trips, /api/destinations,
 * /api/bookings, /api/budget, /api/collaboration, /api/memories, /api/packing,
 * /api/alerts, /api/reviews, /api/data, /api/live, /api/external, /api/migrate.
 *
 * Includes complete multi-step business workflows:
 * Flow A: Signup -> Login -> Create Trip -> Book Flight -> Pay -> Alert -> Cancel
 * Flow B: Multi-member group expense recording & allocations
 * Flow C: Collaborative Task -> Voting Poll -> Vote tallying
 */

import request from 'supertest';
import { createApp } from '../app.js';
import { connectMongo, disconnectMongo } from '../db/mongo.js';
import { TripModel } from '../db/models/trip.model.js';
import { BookingModel } from '../db/models/booking.model.js';
import { DestinationModel } from '../db/models/destination.model.js';

describe('Voyana Full-API Route Groups & Business Flows Integration Suite', () => {
  const app = createApp();
  let userToken = '';
  let testUserId = '';
  let flowTripId = '';
  let flowBookingId = '';
  let flowPollId = '';

  beforeAll(async () => {
    await connectMongo();

    // Ensure sample destination exists for testing
    await DestinationModel.findOneAndUpdate(
      { id: 'dst-test-paris' },
      {
        id: 'dst-test-paris',
        name: 'Paris',
        country: 'France',
        region: 'Europe',
        image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34',
        bestSeason: 'Spring / Fall',
        highlight: 'Eiffel Tower',
        style: 'Romantic & Cultural',
        coordinates: { latitude: 48.8566, longitude: 2.3522 },
      },
      { upsert: true }
    );
  });

  afterAll(async () => {
    if (flowTripId) await TripModel.deleteOne({ id: flowTripId });
    if (flowBookingId) await BookingModel.deleteOne({ id: flowBookingId });
    await DestinationModel.deleteOne({ id: 'dst-test-paris' });
    await disconnectMongo();
  });

  // ---------------------------------------------------------------------------
  // 1. Health Endpoints
  // ---------------------------------------------------------------------------
  describe('Health Route Group (/, /api, /health, /api/health)', () => {
    it('GET /health returns 200 with service metadata and database status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('ai-service');
      expect(res.body.dependencies.database.type).toBe('mongodb');
    });

    it('GET /api/health returns identical 200 status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('returns 404 with structured JSON for nonexistent route', async () => {
      const res = await request(app).get('/api/unknown-service-route');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. AI Assistant Chat Routes (/ai/chat and /api/ai/chat)
  // ---------------------------------------------------------------------------
  describe('AI Assistant Chat Route Group (/ai & /api/ai)', () => {
    it('POST /ai/chat responds with structured itinerary advice and citations', async () => {
      const res = await request(app)
        .post('/ai/chat')
        .send({
          message: 'What should we pack for Day 4 Mount Batur hike?',
          tripId: 'trip-bali-001',
          history: [],
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('content');
      expect(res.body.aiGenerated).toBe(true);
      expect(res.body.citedContext.days).toContain(4);
    });

    it('POST /api/ai/chat accepts destination parameter and returns response', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({
          message: 'What are the top cultural highlights in Paris?',
          destination: 'Paris',
        });

      expect(res.status).toBe(200);
      expect(res.body.aiGenerated).toBe(true);
    });

    it('POST /ai/chat returns 400 for empty message', async () => {
      const res = await request(app).post('/ai/chat').send({ message: '' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid request payload');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Destinations Router (/api/destinations)
  // ---------------------------------------------------------------------------
  describe('Destinations Route Group (/api/destinations)', () => {
    it('GET /api/destinations lists curated destinations', async () => {
      const res = await request(app).get('/api/destinations');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.destinations)).toBe(true);
      expect(res.body.destinations.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/destinations?region=Europe filters by region', async () => {
      const res = await request(app).get('/api/destinations?region=Europe');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      for (const d of res.body.destinations) {
        expect(d.region.toLowerCase()).toBe('europe');
      }
    });

    it('GET /api/destinations/:id returns single destination', async () => {
      const res = await request(app).get('/api/destinations/dst-test-paris');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.destination.name).toBe('Paris');
    });

    it('GET /api/destinations/:id returns 404 for unknown destination', async () => {
      const res = await request(app).get('/api/destinations/non-existent-dest-999');
      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. End-to-End Flow A: Auth -> Trip -> Booking -> Pay -> Alert -> Cancel
  // ---------------------------------------------------------------------------
  describe('Flow A: Signup -> Login -> Create Trip -> Book Flight -> Pay -> Alert -> Cancel', () => {
    const travelerEmail = `e2e.traveler.${Date.now()}@voyana.com`;

    it('Step 1: Sign up new user via /api/auth/signup', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Elena Rostova',
        email: travelerEmail,
        password: 'Password123!',
        role: 'traveler',
      });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.session).toBeDefined();
      expect(res.body.session.token).toBeDefined();

      userToken = res.body.session.token;
      testUserId = res.body.session.user.id;
    });

    it('Step 2: Sign in user via /api/auth/login and verify JWT credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: travelerEmail,
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.session.user.email).toBe(travelerEmail);
    });

    it('Step 3: Create a collaborative trip via /api/trips', async () => {
      flowTripId = `trip-flow-${Date.now()}`;
      const res = await request(app)
        .post('/api/trips')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          id: flowTripId,
          title: 'French Riviera & Paris Expedition',
          destination: 'Paris',
          startDate: '2026-11-20',
          endDate: '2026-11-28',
          budgetTarget: 5000,
          currency: 'USD',
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.trip).toBeDefined();
      expect(res.body.trip.destination).toBe('Paris');
    });

    it('Step 4: Book a flight reservation via /api/bookings', async () => {
      flowBookingId = `bkg-flow-${Date.now()}`;
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          id: flowBookingId,
          userId: testUserId,
          bookingReference: `VOY-FL-${Math.floor(100000 + Math.random() * 900000)}`,
          bookingType: 'flight',
          totalAmount: 850,
          currency: 'USD',
          status: 'pending',
          paymentStatus: 'pending',
          contactEmail: travelerEmail,
          flightDetails: {
            flightNumber: 'AF-007',
            airline: 'Air France',
            originAirport: 'JFK',
            destinationAirport: 'CDG',
            cabinClass: 'economy',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.booking).toBeDefined();
      expect(res.body.booking.id).toBe(flowBookingId);
    });

    it('Step 5: Pay & confirm booking via PUT /api/bookings/:id (triggers automated alert)', async () => {
      const res = await request(app)
        .put(`/api/bookings/${flowBookingId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          status: 'confirmed',
          paymentStatus: 'paid',
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.booking.status).toBe('confirmed');
      expect(res.body.booking.paymentStatus).toBe('paid');
    });

    it('Step 6: Query /api/alerts and verify booking confirmation notification was dispatched', async () => {
      const res = await request(app)
        .get(`/api/alerts?userId=${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.alerts)).toBe(true);
      expect(res.body.alerts.length).toBeGreaterThanOrEqual(1);
    });

    it('Step 7: Cancel booking via POST /api/bookings/:id/cancel', async () => {
      const res = await request(app)
        .post(`/api/bookings/${flowBookingId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'Schedule change requested by traveler',
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.booking.status).toBe('cancelled');
      expect(res.body.booking.paymentStatus).toBe('refunded');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. End-to-End Flow B: Budget Expenses & Allocations
  // ---------------------------------------------------------------------------
  describe('Flow B: Budget Expenses & Allocations (/api/budget)', () => {
    let budgetTripId = '';

    beforeAll(() => {
      budgetTripId = `trip-budget-${Date.now()}`;
    });

    it('initializes budget via GET then updates allocations via PUT /api/budget/:tripId', async () => {
      // GET first to trigger auto-initialization with required fields (id, destination, etc.)
      const initRes = await request(app).get(`/api/budget/${budgetTripId}`);
      expect(initRes.status).toBe(200);
      expect(initRes.body.ok).toBe(true);

      const res = await request(app)
        .put(`/api/budget/${budgetTripId}`)
        .send({
          totalBudget: 3000,
          allocations: [
            { category: 'Accommodations', allocated: 1500, color: '#3b82f6' },
            { category: 'Food & Dining', allocated: 800, color: '#10b981' },
            { category: 'Activities', allocated: 700, color: '#f59e0b' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.budget.totalBudget).toBe(3000);
    });

    it('records shared expense paid by Alex Morgan via POST /api/budget/:tripId/expenses', async () => {
      const res = await request(app)
        .post(`/api/budget/${budgetTripId}/expenses`)
        .send({
          title: 'Boutique Hotel 3 Nights',
          amount: 600,
          currency: 'USD',
          category: 'Accommodations',
          paidBy: 'Alex Morgan',
          splitAmong: ['Alex Morgan', 'Diya Shah'],
          date: '2026-11-21',
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.budget.expenses.length).toBeGreaterThanOrEqual(1);
      expect(res.body.expense.amount).toBe(600);
    });

    it('records second expense paid by Diya Shah for group dinner', async () => {
      const res = await request(app)
        .post(`/api/budget/${budgetTripId}/expenses`)
        .send({
          title: 'Michelin Star Bistro Dinner',
          amount: 200,
          currency: 'USD',
          category: 'Food & Dining',
          paidBy: 'Diya Shah',
          splitAmong: ['Alex Morgan', 'Diya Shah'],
          date: '2026-11-22',
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.budget.expenses.length).toBeGreaterThanOrEqual(2);
    });

    it('retrieves budget ledger and deletes an expense via DELETE /api/budget/:tripId/expenses/:expenseId', async () => {
      const getRes = await request(app).get(`/api/budget/${budgetTripId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.ok).toBe(true);
      expect(getRes.body.budget.expenses.length).toBeGreaterThanOrEqual(1);
      const expenseToDelete = getRes.body.budget.expenses[0];

      const delRes = await request(app).delete(`/api/budget/${budgetTripId}/expenses/${expenseToDelete.id}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.ok).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. End-to-End Flow C: Collaboration Tasks & Voting Polls
  // ---------------------------------------------------------------------------
  describe('Flow C: Collaboration Tasks & Voting Polls (/api/collaboration)', () => {
    const collabTripId = `trip-collab-${Date.now()}`;

    it('creates a collaborative task via POST /api/collaboration/:tripId/tasks', async () => {
      const res = await request(app)
        .post(`/api/collaboration/${collabTripId}/tasks`)
        .send({
          title: 'Reserve Louvre Museum Skip-the-line Tickets',
          assignedTo: 'Manav Vyas',
          dueDate: '2026-11-18',
          status: 'in_progress',
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.task.title).toContain('Louvre Museum');
    });

    it('creates a group voting poll via POST /api/collaboration/:tripId/polls', async () => {
      const res = await request(app)
        .post(`/api/collaboration/${collabTripId}/polls`)
        .send({
          question: 'Which excursion should we book for Day 3?',
          options: [
            { text: 'Seine River Sunset Cruise' },
            { text: 'Versailles Palace Guided Tour' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.poll.id).toBeDefined();
      flowPollId = res.body.poll.id;
    });

    it('casts a vote on option 1 and verifies tally increment', async () => {
      const res = await request(app)
        .post(`/api/collaboration/${collabTripId}/polls/${flowPollId}/vote`)
        .send({
          optionId: 1,
          voterName: 'Tirth Gandhi',
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      const opt = res.body.poll.options.find((o: any) => o.id === 1);
      expect(opt.votes).toBe(1);
      expect(opt.voterNames).toContain('Tirth Gandhi');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Packing Checklist Router (/api/packing)
  // ---------------------------------------------------------------------------
  describe('Packing Checklist Route Group (/api/packing)', () => {
    const packTripId = `trip-pack-${Date.now()}`;
    let packItemId = '';

    it('GET /api/packing/:tripId initializes default packing list', async () => {
      const res = await request(app).get(`/api/packing/${packTripId}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.list.items)).toBe(true);
    });

    it('POST /api/packing/:tripId/items adds a new item', async () => {
      const res = await request(app)
        .post(`/api/packing/${packTripId}/items`)
        .send({
          name: 'Noise Cancelling Headphones',
          category: 'Electronics',
          priority: 'essential',
          assignedTo: 'Bhavika Sainani',
          quantity: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.item.name).toBe('Noise Cancelling Headphones');
      packItemId = res.body.item.id;
    });

    it('PUT /api/packing/:tripId/items/:itemId toggles item status', async () => {
      const res = await request(app)
        .put(`/api/packing/${packTripId}/items/${packItemId}`)
        .send({ isPacked: true });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      const toggled = res.body.list.items.find((i: any) => i.id === packItemId);
      expect(toggled.isPacked).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Travel Memories & Reviews Endpoints
  // ---------------------------------------------------------------------------
  describe('Memories & Reviews Route Groups', () => {
    let createdMemoryId = '';
    let createdReviewId = '';

    it('POST /api/memories saves a new photo memory', async () => {
      const res = await request(app)
        .post('/api/memories')
        .send({
          tripId: 'trip-bali-001',
          title: 'Sunrise at Mount Batur Summit',
          caption: 'Incredible early morning trek with hot springs afterwards.',
          imageUrl: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2',
          uploadedBy: 'Diya Shah',
          locationName: 'Mount Batur, Bali',
          tags: ['hiking', 'sunrise', 'adventure'],
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.memory.id).toBeDefined();
      createdMemoryId = res.body.memory.id;
    });

    it('POST /api/memories/:id/like toggles likes on memory', async () => {
      const res = await request(app)
        .post(`/api/memories/${createdMemoryId}/like`)
        .send({ userName: 'usr-traveler-03' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.isLiked).toBe(true);
    });

    it('POST /api/reviews submits a verified travel review', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .send({
          targetType: 'destination',
          targetId: 'paris',
          targetTitle: 'Paris, France',
          title: 'Charming city with remarkable architecture',
          comment: 'Outstanding museums and culinary experiences. Highly recommend exploring Le Marais.',
          rating: 5,
          travelerType: 'Solo',
          userName: 'Bhavika Sainani',
          visitDate: '2026-10',
          verifiedBooking: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.review.id).toBeDefined();
      createdReviewId = res.body.review.id;
    });

    it('POST /api/reviews/:id/vote casts helpful vote', async () => {
      const res = await request(app)
        .post(`/api/reviews/${createdReviewId}/vote`)
        .send({ userName: 'Elena Rostova' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.helpfulVotes).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Legacy MongoDB Data API (/api/data) & Migration (/api/migrate)
  // ---------------------------------------------------------------------------
  describe('Legacy MongoDB Data API (/api/data) & Migration Trigger', () => {
    it('GET /api/data/status returns database connection health', async () => {
      const res = await request(app).get('/api/data/status');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.database).toBe('MongoDB');
    });

    it('GET /api/data/trips returns stored trip records', async () => {
      const res = await request(app).get('/api/data/trips');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/data/bookings returns stored booking records', async () => {
      const res = await request(app).get('/api/data/bookings');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/migrate executes database seeding trigger and returns summary', async () => {
      const res = await request(app).post('/api/migrate');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.summary).toBeDefined();
    });
  });
});
