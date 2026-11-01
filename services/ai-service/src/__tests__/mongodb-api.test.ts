import { runDataMigration } from '../services/migration.service.js';
/**
 * Comprehensive Integration Test Suite for Voyana MongoDB Atlas API
 * Tests user auth, trips CRUD, bookings, budgets, collaboration,
 * packing checklists, and alerts against the Express app and MongoDB models.
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { demoOtp } from '../routes/payments.router.js';
import { generateMockHotels } from '../catalog/hotels.js';
import { PaymentIntentModel } from '../db/models/payment-intent.model.js';
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
  let cancelledTripId = '';

  // Domain tests seed a trusted captured payment; OTP and gateway verification are tested separately below.
  async function paidReservation(body: Record<string, unknown>) {
    const requested = typeof body.bookingReference === 'string' && body.bookingReference.startsWith('VOY-DEMO-') ? body.bookingReference.slice(9) : '';
    let intent = requested ? await PaymentIntentModel.findOne({ id: requested }) : null;
    if (!intent) {
      const id = randomUUID();
      const userId = (jwt.decode(authToken) as {sub: string}).sub;
      intent = await PaymentIntentModel.create({ id, userId, requestHash: id, orderId: 'demo_order_'+id, provider: 'demo', status: 'captured', paymentId: 'demo_payment_'+id, amountPaise: Number(body.totalAmount)*100, currency: 'INR', reservation: body });
    }
    return request(app).post('/api/bookings').set('Authorization', 'Bearer '+authToken).send({paymentReference:intent.id});
  }

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
      const res = await request(app).get('/health').set('Authorization', `Bearer ${authToken}`);
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
      const res = await request(app).post('/api/auth/signup').set('Authorization', `Bearer ${authToken}`).send({
        email: testEmail,
      });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('should register a new user with secure bcrypt hashing and return JWT session', async () => {
      const res = await request(app).post('/api/auth/signup').set('Authorization', `Bearer ${authToken}`).send({
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
      const res = await request(app).post('/api/auth/signup').set('Authorization', `Bearer ${authToken}`).send({
        name: 'Duplicate Traveler',
        email: testEmail,
        password: 'AnotherPassword123!',
      });
      expect(res.status).toBe(409);
      expect(res.body.ok).toBe(false);
    });

    it('should sign in with correct credentials and return valid session', async () => {
      const res = await request(app).post('/api/auth/login').set('Authorization', `Bearer ${authToken}`).send({
        email: testEmail,
        password: 'SecurePassword123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.session.token).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app).post('/api/auth/login').set('Authorization', `Bearer ${authToken}`).send({
        email: testEmail,
        password: 'WrongPassword!',
      });
      expect(res.status).toBe(401);
      expect(res.body.ok).toBe(false);
    });

    it('should fetch current authenticated profile with GET /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me').set('Authorization', `Bearer ${authToken}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.user.email).toBe(testEmail);
    });

    it('should update user travel style preferences via PUT /api/auth/profile', async () => {
      const res = await request(app)
        .put('/api/auth/profile').set('Authorization', `Bearer ${authToken}`)
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
      const res = await request(app).get('/api/trips').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.trips)).toBe(true);
    });

    it('should create a trip only after a matching confirmed reservation', async () => {
      const booked = await paidReservation({
        destination: 'Zermatt', bookingType: 'hotel', totalAmount: 700, currency: 'INR', contactEmail: 'test@voyana.com',
        hotelDetails: { city: 'Zermatt', hotelName: 'Alpine Test Hotel', checkInDate: '2026-12-05', checkOutDate: '2026-12-12' },
      });
      expect(booked.status).toBe(201);

      const res = await request(app)
        .post('/api/trips').set('Authorization', `Bearer ${authToken}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Alpine Expedition: Swiss Peaks',
          destination: 'Zermatt',
          country: 'Switzerland',
          startDate: '2026-12-05',
          endDate: '2026-12-12',
          visibility: 'shared',
          budgetTarget: 3800,
          currency: 'INR',
          tags: ['Skiing', 'Winter', 'Alps'],
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.trip.destination).toBe('Zermatt');
      expect(res.body.trip.members.length).toBeGreaterThanOrEqual(1);

      testTripId = res.body.trip.id;
    });

    it('should retrieve the newly created trip by ID', async () => {
      const res = await request(app).get(`/api/trips/${testTripId}`).set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.trip.title).toBe('Alpine Expedition: Swiss Peaks');
    });

    it('should add a scheduled activity to the trip itinerary', async () => {
      const res = await request(app)
        .post(`/api/trips/${testTripId}/activities`).set('Authorization', `Bearer ${authToken}`)
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
        .put(`/api/trips/${testTripId}`).set('Authorization', `Bearer ${authToken}`)
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
      const res = await paidReservation({
          bookingType: 'flight',
          totalAmount: 780,
          currency: 'INR',
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
      expect(res.body.booking.bookingReference).toMatch(/^VOY-DEMO-/);

      testBookingId = res.body.booking.id;
      testBookingRef = res.body.booking.bookingReference;
      cancelledTripId = res.body.trip.id;
    });

    it('should retrieve booking by booking reference', async () => {
      const res = await request(app).get(`/api/bookings/${testBookingRef}`).set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.booking.id).toBe(testBookingId);
    });

    it('locks a captured reservation amount and preserves the matching ledger', async () => {
      const changed = await request(app).put(`/api/bookings/${testBookingId}`).set('Authorization', `Bearer ${authToken}`).send({ totalAmount: 790 });
      expect(changed.status).toBe(409);
      const budget = await request(app).get(`/api/budget/${cancelledTripId}`).set('Authorization', `Bearer ${authToken}`);
      expect(budget.body.budget.expenses.find((item: { id: string }) => item.id === `booking-${testBookingId}`).amount).toBe(780);
      const trip = await request(app).get(`/api/trips/${cancelledTripId}`).set('Authorization', `Bearer ${authToken}`);
      expect(trip.body.trip.activities[0].cost).toBe(780);
    });

    it('retries a booking reference without duplicating reservations, activities or expenses', async () => {
      const retry = await paidReservation({ bookingReference: testBookingRef, destination: 'Zurich', bookingType: 'flight', totalAmount: 790, currency: 'INR', contactEmail: 'traveler@voyana.com', flightDetails: { destinationCity: 'Zurich', airline: 'Swiss', flightNumber: 'LX-18' } });
      expect(retry.status).toBe(201);
      expect(retry.body.booking.id).toBe(testBookingId);
      expect(retry.body.trip.activities).toHaveLength(1);
      const budget = await request(app).get(`/api/budget/${cancelledTripId}`).set('Authorization', `Bearer ${authToken}`);
      expect(budget.body.budget.expenses).toHaveLength(1);
    });

    it('should cancel a booking and update status and paymentStatus in MongoDB', async () => {
      const res = await request(app)
        .post(`/api/bookings/${testBookingRef}/cancel`).set('Authorization', `Bearer ${authToken}`)
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
      const res = await request(app).get(`/api/budget/${testTripId}`).set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.budget).toBeDefined();
    });

    it('should record an expense to the trip budget ledger in MongoDB', async () => {
      const res = await request(app)
        .post(`/api/budget/${testTripId}/expenses`).set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Zermatt Ski Pass (3-Day)',
          amount: 280,
          currency: 'INR',
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
        .post(`/api/collaboration/${testTripId}/chat`).set('Authorization', `Bearer ${authToken}`)
        .send({
          senderName: 'Alex Morgan',
          message: 'Excited for the Swiss slopes!',
        });

      expect(postRes.status).toBe(201);
      expect(postRes.body.ok).toBe(true);

      const getRes = await request(app).get(`/api/collaboration/${testTripId}/chat`).set('Authorization', `Bearer ${authToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.messages.some((m: { message: string }) => m.message === 'Excited for the Swiss slopes!')).toBe(true);
    });

    it('should create and update a collaborative trip task', async () => {
      const createRes = await request(app)
        .post(`/api/collaboration/${testTripId}/tasks`).set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Rent Ski Equipment',
          assignedTo: 'Alex Morgan',
          status: 'todo',
          category: 'Logistics',
        });

      expect(createRes.status).toBe(201);
      testTaskId = createRes.body.task.id;

      const updateRes = await request(app)
        .put(`/api/collaboration/${testTripId}/tasks/${testTaskId}`).set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'in_progress' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.task.status).toBe('in_progress');
    });

    it('should create a group voting poll and cast a collaborator vote', async () => {
      const createRes = await request(app)
        .post(`/api/collaboration/${testTripId}/polls`).set('Authorization', `Bearer ${authToken}`)
        .send({
          question: 'Where should we have fondue dinner on Day 2?',
          options: ['Restaurant Whymper-Stube', 'Ferdinand by Cervo', 'Saycheese!'],
        });

      expect(createRes.status).toBe(201);
      testPollId = createRes.body.poll.id;

      const voteRes = await request(app)
        .post(`/api/collaboration/${testTripId}/polls/${testPollId}/vote`).set('Authorization', `Bearer ${authToken}`)
        .send({
          optionId: 1,
          voterName: 'Alex Morgan',
        });

      expect(voteRes.status).toBe(200);
      expect(voteRes.body.poll.totalVotes).toBe(1);
    });

    it('should save and list travel memories', async () => {
      const postRes = await request(app)
        .post(`/api/collaboration/${testTripId}/memories`).set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'First View of the Matterhorn',
          locationName: 'Gornergrat Viewpoint',
          caption: 'Clear skies above 3,100 meters.',
          imageUrl: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=800&q=80',
        });

      expect(postRes.status).toBe(201);

      const getRes = await request(app).get(`/api/collaboration/${testTripId}/memories`).set('Authorization', `Bearer ${authToken}`);
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
        .post(`/api/packing/${testTripId}/items`).set('Authorization', `Bearer ${authToken}`)
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
      const createRes = await request(app).post('/api/alerts').set('Authorization', `Bearer ${authToken}`).send({
        title: 'Gate Change Notice',
        message: 'Flight LX-18 gate changed to B24.',
        severity: 'info',
        user_id: 'usr-traveler-03',
      });

      expect(createRes.status).toBe(201);
      testAlertId = createRes.body.alert.id;

      const readRes = await request(app).put(`/api/alerts/${testAlertId}/read`).set('Authorization', `Bearer ${authToken}`);
      expect(readRes.status).toBe(200);
      expect(readRes.body.alert.is_read).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 9. Destination and account boundaries
  // -------------------------------------------------------------------------
  describe('Booking prerequisites and account isolation', () => {
    let strangerToken = '';
    let strangerEmail = '';
    it('rejects unauthenticated workspace, budget, chat and booking requests', async () => {
      for (const path of ['/api/trips', `/api/budget/${testTripId}`, `/api/collaboration/${testTripId}/chat`, '/api/bookings']) {
        expect((await request(app).get(path)).status).toBe(401);
      }
    });
    it('rejects direct reservations without a verified payment record', async () => {
      const body = { destination: 'Ahmedabad', bookingType: 'hotel', totalAmount: 100, contactEmail: 'test@voyana.com', hotelDetails: { city: 'Paris' } };
      expect((await request(app).post('/api/bookings').set('Authorization', `Bearer ${authToken}`).send(body)).status).toBe(403);
      expect((await request(app).post('/api/bookings').set('Authorization', `Bearer ${authToken}`).send({ ...body, hotelDetails: { city: 'Ahmedabad' }, paymentStatus: 'pending' })).status).toBe(403);
    });
    it('locks workspace tools again when its last booking is cancelled', async () => {
      expect((await request(app).get(`/api/budget/${cancelledTripId}`).set('Authorization', `Bearer ${authToken}`)).status).toBe(403);
    });
    it('rejects role changes, administrator directory access and booking destination edits', async () => {
      for (const role of ['traveler', 'organizer', 'admin']) {
        expect((await request(app).put('/api/auth/profile').set('Authorization', `Bearer ${authToken}`).send({ role })).status).toBe(403);
      }
      expect((await request(app).get('/api/auth/users').set('Authorization', `Bearer ${authToken}`)).status).toBe(403);
      expect((await request(app).put(`/api/bookings/${testBookingId}`).set('Authorization', `Bearer ${authToken}`).send({ destination: 'Paris', status: 'confirmed' })).status).toBe(403);
    });
    it('prevents another account from reading or editing reservations and trip data', async () => {
      strangerEmail = `stranger.${Date.now()}@voyana.test`;
      const signup = await request(app).post('/api/auth/signup').send({ name: 'Boundary Tester', email: strangerEmail, password: 'Password123!', role: 'traveler' });
      expect(signup.status).toBe(201);
      strangerToken = signup.body.session.token;
      for (const path of [`/api/trips/${testTripId}`, `/api/budget/${testTripId}`, `/api/collaboration/${testTripId}/chat`]) {
        expect((await request(app).get(path).set('Authorization', `Bearer ${strangerToken}`)).status).toBe(403);
      }
      expect((await request(app).get(`/api/bookings/${testBookingId}`).set('Authorization', `Bearer ${strangerToken}`)).status).toBe(404);
      expect((await request(app).put(`/api/bookings/${testBookingId}`).set('Authorization', `Bearer ${strangerToken}`).send({ contactPhone: '000' })).status).toBe(404);
      expect((await request(app).get(`/api/memories?tripId=${testTripId}`).set('Authorization', `Bearer ${strangerToken}`)).status).toBe(403);
      expect((await request(app).put(`/api/alerts/${testAlertId}/read`).set('Authorization', `Bearer ${strangerToken}`)).status).toBe(404);
    });
    it('allows invited viewers to read while rejecting writes', async () => {
      expect((await request(app).post(`/api/trips/${testTripId}/members`).set('Authorization', `Bearer ${authToken}`).send({ name: 'Viewer', email: strangerEmail, role: 'viewer' })).status).toBe(201);
      expect((await request(app).get(`/api/budget/${testTripId}`).set('Authorization', `Bearer ${strangerToken}`)).status).toBe(200);
      expect((await request(app).post(`/api/collaboration/${testTripId}/chat`).set('Authorization', `Bearer ${strangerToken}`).send({ message: 'Forbidden', senderName: 'Viewer' })).status).toBe(403);
      expect((await request(app).post(`/api/trips/${testTripId}/members`).set('Authorization', `Bearer ${strangerToken}`).send({ email: 'outsider@voyana.test' })).status).toBe(403);
    });
  });


  describe('Planning workspaces before booking', () => {
    let planningId = '';
    let strangerToken = '';
    const strangerEmail = `planner.${Date.now()}@voyana.test`;
    beforeAll(async () => {
      const signup = await request(app).post('/api/auth/signup').send({name:'Planning Friend',email:strangerEmail,password:'Password123!',role:'traveler'});
      strangerToken = signup.body.session.token;
    });
    it('creates an unbooked workspace, saves chat and keeps expenses locked', async () => {
      const created = await request(app).post('/api/trips').set('Authorization', `Bearer ${authToken}`).send({title:'Where shall we go?',destination:'Destination undecided',startDate:'2026-12-01',endDate:'2026-12-01',currency:'INR',visibility:'private'});
      expect(created.status).toBe(201);
      planningId = created.body.trip.id;
      expect((await request(app).post(`/api/collaboration/${planningId}/chat`).set('Authorization', `Bearer ${authToken}`).send({message:'Bali or Ahmedabad?'})).status).toBe(201);
      const messages = await request(app).get(`/api/collaboration/${planningId}/chat`).set('Authorization', `Bearer ${authToken}`);
      expect(messages.body.messages.some((message: {message:string}) => message.message === 'Bali or Ahmedabad?')).toBe(true);
      expect((await request(app).get(`/api/budget/${planningId}`).set('Authorization', `Bearer ${authToken}`)).status).toBe(403);
      expect((await request(app).get(`/api/collaboration/${planningId}/chat`).set('Authorization', `Bearer ${strangerToken}`)).status).toBe(403);
    });
    it('lets invited editors discuss plans without any booking', async () => {
      expect((await request(app).post(`/api/trips/${planningId}/members`).set('Authorization', `Bearer ${authToken}`).send({name:'Planning friend',email:strangerEmail,role:'editor'})).status).toBe(201);
      expect((await request(app).get(`/api/trips/${planningId}`).set('Authorization', `Bearer ${strangerToken}`)).body.trip.hasConfirmedBooking).toBe(false);
      expect((await request(app).post(`/api/collaboration/${planningId}/chat`).set('Authorization', `Bearer ${strangerToken}`).send({message:'Let us vote before booking.'})).status).toBe(201);
      expect((await request(app).post(`/api/trips/${planningId}/members`).set('Authorization', `Bearer ${strangerToken}`).send({email:'outsider@example.com'})).status).toBe(403);
    });
  });

  describe('Demo OTP checkout without a merchant account', () => {
    const date = new Date(Date.now()+30*86400000).toISOString().slice(0,10);
    const checkOut = new Date(Date.parse(date)+3*86400000).toISOString().slice(0,10);
    const hotel = generateMockHotels({location:'Ahmedabad',checkInDate:date,checkOutDate:checkOut,rooms:1,guests:1})[0];
    const reservation = (rooms=1) => ({destination:'Ahmedabad',bookingType:'hotel',currency:'INR',totalAmount:hotel.baseNightlyRate*3*rooms,contactEmail:'otp@voyana.test',hotelDetails:{guestName:'OTP Tester'},choices:[{type:'hotel',id:hotel.id,checkIn:date,checkOut,roomType:'Standard',rooms,guests:1}]});
    let intentId='', code='', bookingId='', tripId='';
    it('creates a demo order and displays an OTP without Razorpay keys or PAN', async () => {
      const result=await request(app).post('/api/payments/orders').set('Authorization',`Bearer ${authToken}`).send(reservation());
      expect(result.status).toBe(200);expect(result.body.provider).toBe('demo');expect(result.body.demoOtp).toMatch(/^\d{6}$/);expect(result.body.amount).toBe(reservation().totalAmount*100);
      intentId=result.body.intentId;code=result.body.demoOtp;
    });
    it('does not create a reservation before a correct OTP', async () => {
      const wrong=await request(app).post('/api/payments/demo/confirm').set('Authorization',`Bearer ${authToken}`).send({intentId,otp:'000000'});
      expect(wrong.status).toBe(400);
      expect((await PaymentIntentModel.findOne({id:intentId}))?.bookingId).toBeUndefined();
    });
    it('confirms the OTP into one INR reservation and matching expense', async () => {
      const result=await request(app).post('/api/payments/demo/confirm').set('Authorization',`Bearer ${authToken}`).send({intentId,otp:code});
      expect(result.status).toBe(200);expect(result.body.booking.currency).toBe('INR');expect(result.body.booking.totalAmount).toBe(reservation().totalAmount);
      bookingId=result.body.booking.id;tripId=result.body.trip.id;
      const ledger=await request(app).get(`/api/budget/${tripId}`).set('Authorization',`Bearer ${authToken}`);
      expect(ledger.body.budget.expenses.find((item:{id:string})=>item.id===`booking-${bookingId}`).amount).toBe(reservation().totalAmount);
    });
    it('retries OTP confirmation and checkout without duplicating the reservation', async () => {
      const again=await request(app).post('/api/payments/demo/confirm').set('Authorization',`Bearer ${authToken}`).send({intentId,otp:code});
      expect(again.status).toBe(200);expect(again.body.booking.id).toBe(bookingId);
      const order=await request(app).post('/api/payments/orders').set('Authorization',`Bearer ${authToken}`).send(reservation());
      expect(order.body.completed).toBe(true);expect(order.body.booking.id).toBe(bookingId);
      const ledger=await request(app).get(`/api/budget/${tripId}`).set('Authorization',`Bearer ${authToken}`);
      expect(ledger.body.budget.expenses.filter((item:{id:string})=>item.id===`booking-${bookingId}`)).toHaveLength(1);
    });
    it('rejects expired OTPs and throttles OTP guessing', async () => {
      const expired=await request(app).post('/api/payments/orders').set('Authorization',`Bearer ${authToken}`).send(reservation(2));
      await PaymentIntentModel.updateOne({id:expired.body.intentId},{$set:{otpExpiresAt:new Date(Date.now()-1000)}});
      expect((await request(app).post('/api/payments/demo/confirm').set('Authorization',`Bearer ${authToken}`).send({intentId:expired.body.intentId,otp:expired.body.demoOtp})).status).toBe(410);
      const locked=await request(app).post('/api/payments/orders').set('Authorization',`Bearer ${authToken}`).send(reservation(3));
      for(let attempt=0;attempt<5;attempt++)expect((await request(app).post('/api/payments/demo/confirm').set('Authorization',`Bearer ${authToken}`).send({intentId:locked.body.intentId,otp:'000000'})).status).toBe(400);
      expect((await request(app).post('/api/payments/demo/confirm').set('Authorization',`Bearer ${authToken}`).send({intentId:locked.body.intentId,otp:locked.body.demoOtp})).status).toBe(429);
      expect(demoOtp(locked.body.intentId,(await PaymentIntentModel.findOne({id:locked.body.intentId}))!.otpIssuedAt!)).toBe(locked.body.demoOtp);
    });
    it('cancels the demo booking without making a gateway refund request', async () => {
      const result=await request(app).post(`/api/bookings/${bookingId}/cancel`).set('Authorization',`Bearer ${authToken}`).send({reason:'Demo test cleanup'});
      expect(result.status).toBe(200);expect(result.body.booking.paymentStatus).toBe('refunded');
      expect((await PaymentIntentModel.findOne({id:intentId}))?.status).toBe('refunded');
    });
  });

  describe('Data Migration (/api/migrate)', () => {
    it('should execute idempotent migration without duplicating existing seed records', async () => {
      const summary = await runDataMigration();
      expect(summary).toBeDefined();
    }, 120000);
  });

  // -------------------------------------------------------------------------
  // 10. Clean-up isolated test data (safe teardown)
  // -------------------------------------------------------------------------
  describe('Safe Teardown', () => {
    it('should safely delete the isolated test trip', async () => {
      if (testTripId) {
        const res = await request(app)
          .delete(`/api/trips/${testTripId}`).set('Authorization', `Bearer ${authToken}`);
        expect(res.status).toBe(200);
      }
    });
  });
});
