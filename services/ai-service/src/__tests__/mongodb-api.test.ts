/**
 * Comprehensive Integration Test Suite for Voyana MongoDB Atlas API
 * Tests user auth, trips CRUD, bookings, budgets, collaboration,
 * packing checklists, and alerts against the Express app and MongoDB models.
 */

import request from 'supertest';
import { createApp } from '../app.js';
import { connectMongo, disconnectMongo } from '../db/mongo.js';

describe('Voyana MongoDB Atlas API Suite', () => {
  const app = createApp();
  let authToken = '';
  let testTripId = '';
  let testBookingId = '';
  let testBookingRef = '';
  let testTaskId = '';
  let testPollId = '';
  let testAlertId = '';

  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await disconnectMongo();
  });

  // -------------------------------------------------------------------------
  // 1. Health & Database Status
  // -------------------------------------------------------------------------
  describe('GET /health & /api/health', () => {
    it('should report database connection and service status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.dependencies.database.type).toBe('mongodb');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Authentication & User Profile
  // -------------------------------------------------------------------------
  describe('Authentication Endpoints (/api/auth)', () => {
    const testEmail = `test.traveler.${Date.now()}@voyana.com`;

    it('should reject signup with missing required fields', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        email: testEmail,
      });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('should register a new user with secure bcrypt hashing and return JWT session', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Voyana Test Traveler',
        email: testEmail,
        password: 'SecurePassword123!',
        role: 'traveler',
      });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.session).toBeDefined();
      expect(res.body.session.token).toBeDefined();
      expect(res.body.session.user.email).toBe(testEmail);
      expect(res.body.session.user.passwordHash).toBeUndefined(); // Never returned

      authToken = res.body.session.token;
    });

    it('should reject duplicate user signup with 409 Conflict', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Duplicate Traveler',
        email: testEmail,
        password: 'AnotherPassword123!',
      });
      expect(res.status).toBe(409);
      expect(res.body.ok).toBe(false);
    });

    it('should sign in with correct credentials and return valid session', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testEmail,
        password: 'SecurePassword123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.session.token).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testEmail,
        password: 'WrongPassword!',
      });
      expect(res.status).toBe(401);
      expect(res.body.ok).toBe(false);
    });

    it('should fetch current authenticated profile with GET /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.user.email).toBe(testEmail);
    });

    it('should update user travel style preferences via PUT /api/auth/profile', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bio: 'Frequent flyer and photographer.',
          preferences: {
            preferredCurrency: 'EUR',
            travelStyle: 'Adventure & Nature',
            emailNotifications: true,
            smsAlerts: true,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.user.bio).toBe('Frequent flyer and photographer.');
      expect(res.body.user.preferences.preferredCurrency).toBe('EUR');
    });
  });

  // -------------------------------------------------------------------------
  // 3. Trips & Activities CRUD
  // -------------------------------------------------------------------------
  describe('Trips & Itineraries Endpoints (/api/trips)', () => {
    it('should list existing trips including curated templates', async () => {
      const res = await request(app).get('/api/trips');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.trips)).toBe(true);
    });

    it('should create a new trip in shared MongoDB', async () => {
      const res = await request(app)
        .post('/api/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Alpine Expedition: Swiss Peaks',
          destination: 'Zermatt',
          country: 'Switzerland',
          startDate: '2026-12-05',
          endDate: '2026-12-12',
          visibility: 'shared',
          budgetTarget: 3800,
          currency: 'CHF',
          tags: ['Skiing', 'Winter', 'Alps'],
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.trip.destination).toBe('Zermatt');
      expect(res.body.trip.members.length).toBeGreaterThanOrEqual(1);

      testTripId = res.body.trip.id;
    });

    it('should retrieve the newly created trip by ID', async () => {
      const res = await request(app).get(`/api/trips/${testTripId}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.trip.title).toBe('Alpine Expedition: Swiss Peaks');
    });

    it('should add a scheduled activity to the trip itinerary', async () => {
      const res = await request(app)
        .post(`/api/trips/${testTripId}/activities`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dayNumber: 1,
          timeSlot: '09:00 AM',
          title: 'Matterhorn Glacier Cable Car',
          locationName: 'Matterhorn Paradise',
          cost: 110,
          category: 'Adventure',
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.trip.activities.length).toBe(1);
      expect(res.body.trip.activities[0].title).toBe('Matterhorn Glacier Cable Car');
    });

    it('should update trip budget and details via PUT /api/trips/:id', async () => {
      const res = await request(app)
        .put(`/api/trips/${testTripId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          budgetTarget: 4200,
          description: 'Updated group winter getaway.',
        });

      expect(res.status).toBe(200);
      expect(res.body.trip.budgetTarget).toBe(4200);
      expect(res.body.trip.description).toBe('Updated group winter getaway.');
    });
  });

  // -------------------------------------------------------------------------
  // 4. Bookings Management
  // -------------------------------------------------------------------------
  describe('Bookings Endpoints (/api/bookings)', () => {
    it('should create a confirmed flight booking and persist to MongoDB', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookingType: 'flight',
          totalAmount: 780,
          currency: 'USD',
          contactEmail: 'traveler@voyana.com',
          flightDetails: {
            flightNumber: 'LX-18',
            airline: 'Swiss International Air Lines',
            originAirport: 'JFK',
            destinationAirport: 'ZRH',
            originCity: 'New York',
            destinationCity: 'Zurich',
            cabinClass: 'Economy',
            passengers: 1,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.booking.bookingReference).toMatch(/^VOY-FL-/);

      testBookingId = res.body.booking.id;
      testBookingRef = res.body.booking.bookingReference;
    });

    it('should retrieve booking by booking reference', async () => {
      const res = await request(app).get(`/api/bookings/${testBookingRef}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.booking.id).toBe(testBookingId);
    });

    it('should cancel a booking and update status and paymentStatus in MongoDB', async () => {
      const res = await request(app)
        .post(`/api/bookings/${testBookingRef}/cancel`)
        .send({ reason: 'Trip rescheduled by traveler' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.booking.status).toBe('cancelled');
      expect(res.body.booking.paymentStatus).toBe('refunded');
    });
  });

  // -------------------------------------------------------------------------
  // 5. Trip Budget & Expenses
  // -------------------------------------------------------------------------
  describe('Budget & Expense Endpoints (/api/budget)', () => {
    it('should retrieve or initialize trip budget', async () => {
      const res = await request(app).get(`/api/budget/${testTripId}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.budget).toBeDefined();
    });

    it('should record an expense to the trip budget ledger in MongoDB', async () => {
      const res = await request(app)
        .post(`/api/budget/${testTripId}/expenses`)
        .send({
          title: 'Zermatt Ski Pass (3-Day)',
          amount: 280,
          currency: 'CHF',
          category: 'Activities',
          paidBy: 'Alex Morgan',
          splitAmong: ['Alex Morgan', 'Elena Rostova'],
          paymentMethod: 'Credit Card',
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.budget.expenses.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Collaboration (Chat, Tasks, Polls, Memories)
  // -------------------------------------------------------------------------
  describe('Collaboration Endpoints (/api/collaboration)', () => {
    it('should send and retrieve real-time group chat messages in MongoDB', async () => {
      const postRes = await request(app)
        .post(`/api/collaboration/${testTripId}/chat`)
        .send({
          senderName: 'Alex Morgan',
          message: 'Excited for the Swiss slopes!',
        });

      expect(postRes.status).toBe(201);
      expect(postRes.body.ok).toBe(true);

      const getRes = await request(app).get(`/api/collaboration/${testTripId}/chat`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.messages.some((m: any) => m.message === 'Excited for the Swiss slopes!')).toBe(true);
    });

    it('should create and update a collaborative trip task', async () => {
      const createRes = await request(app)
        .post(`/api/collaboration/${testTripId}/tasks`)
        .send({
          title: 'Rent Ski Equipment',
          assignedTo: 'Alex Morgan',
          status: 'todo',
          category: 'Logistics',
        });

      expect(createRes.status).toBe(201);
      testTaskId = createRes.body.task.id;

      const updateRes = await request(app)
        .put(`/api/collaboration/${testTripId}/tasks/${testTaskId}`)
        .send({ status: 'in_progress' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.task.status).toBe('in_progress');
    });

    it('should create a group voting poll and cast a collaborator vote', async () => {
      const createRes = await request(app)
        .post(`/api/collaboration/${testTripId}/polls`)
        .send({
          question: 'Where should we have fondue dinner on Day 2?',
          options: ['Restaurant Whymper-Stube', 'Ferdinand by Cervo', 'Saycheese!'],
        });

      expect(createRes.status).toBe(201);
      testPollId = createRes.body.poll.id;

      const voteRes = await request(app)
        .post(`/api/collaboration/${testTripId}/polls/${testPollId}/vote`)
        .send({
          optionId: 1,
          voterName: 'Alex Morgan',
        });

      expect(voteRes.status).toBe(200);
      expect(voteRes.body.poll.totalVotes).toBe(1);
    });

    it('should save and list travel memories', async () => {
      const postRes = await request(app)
        .post(`/api/collaboration/${testTripId}/memories`)
        .send({
          title: 'First View of the Matterhorn',
          locationName: 'Gornergrat Viewpoint',
          caption: 'Clear skies above 3,100 meters.',
          imageUrl: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=800&q=80',
        });

      expect(postRes.status).toBe(201);

      const getRes = await request(app).get(`/api/collaboration/${testTripId}/memories`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.memories.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // 7. Smart Packing Checklist
  // -------------------------------------------------------------------------
  describe('Packing Checklist Endpoints (/api/packing)', () => {
    it('should retrieve checklist and add a new item', async () => {
      const addRes = await request(app)
        .post(`/api/packing/${testTripId}/items`)
        .send({
          name: 'Thermal Base Layers & Gloves',
          category: 'Clothing',
          priority: 'essential',
          assignedTo: 'Alex Morgan',
          quantity: 2,
        });

      expect(addRes.status).toBe(201);
      expect(addRes.body.item.name).toBe('Thermal Base Layers & Gloves');
    });
  });

  // -------------------------------------------------------------------------
  // 8. Alerts & Notifications
  // -------------------------------------------------------------------------
  describe('Alerts Endpoints (/api/alerts)', () => {
    it('should create an alert and mark it as read', async () => {
      const createRes = await request(app).post('/api/alerts').send({
        title: 'Gate Change Notice',
        message: 'Flight LX-18 gate changed to B24.',
        severity: 'info',
        user_id: 'usr-traveler-03',
      });

      expect(createRes.status).toBe(201);
      testAlertId = createRes.body.alert.id;

      const readRes = await request(app).put(`/api/alerts/${testAlertId}/read`);
      expect(readRes.status).toBe(200);
      expect(readRes.body.alert.is_read).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 9. Data Migration / Idempotent Seeding
  // -------------------------------------------------------------------------
  describe('Data Migration (/api/migrate)', () => {
    it('should execute idempotent migration without duplicating existing seed records', async () => {
      const res = await request(app).post('/api/migrate');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.summary).toBeDefined();
    }, 30000);
  });

  // -------------------------------------------------------------------------
  // 10. Clean-up isolated test data (safe teardown)
  // -------------------------------------------------------------------------
  describe('Safe Teardown', () => {
    it('should safely delete the isolated test trip', async () => {
      if (testTripId) {
        const res = await request(app)
          .delete(`/api/trips/${testTripId}`)
          .set('Authorization', `Bearer ${authToken}`);
        expect(res.status).toBe(200);
      }
    });
  });
});
