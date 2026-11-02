import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createHmac } from 'crypto';
import { createApp } from '../app.js';
import { config } from '../config/env.js';
import { PaymentIntentModel } from '../db/models/payment-intent.model.js';
import { generateMockHotels } from '../catalog/hotels.js';
import * as gateway from '../services/razorpay.service.js';
import { createBookedWorkspace } from '../services/booking-workspace.service.js';

jest.mock('../services/razorpay.service.js', () => ({ ...jest.requireActual('../services/razorpay.service.js'), razorpayEnabled: jest.fn(), createRazorpayOrder: jest.fn(), fetchRazorpayPayment: jest.fn() }));
jest.mock('../services/booking-workspace.service.js', () => ({ createBookedWorkspace: jest.fn() }));
const app = createApp();
const token = jwt.sign({ sub: 'payment-user', name: 'Payment Tester', email: 'pay@example.com', role: 'traveler' }, config.jwtSecret);
const date = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
const end = new Date(Date.parse(date) + 3 * 86400000).toISOString().slice(0, 10);
const hotel = generateMockHotels({ location: 'Ahmedabad', checkInDate: date, checkOutDate: end, rooms: 1, guests: 1 })[0];
const reservation = { destination: 'Ahmedabad', bookingType: 'hotel', totalAmount: hotel.baseNightlyRate * 3, currency: 'INR', contactEmail: 'pay@example.com', choices: [{ type: 'hotel', id: hotel.id, checkIn: date, checkOut: end, roomType: 'Standard', rooms: 1, guests: 1 }] };
const proof = () => ({ intentId: 'intent-test', razorpay_order_id: 'order_test', razorpay_payment_id: 'pay_testPayment', razorpay_signature: createHmac('sha256', config.razorpayKeySecret).update('order_test|pay_testPayment').digest('hex') });
const intent = () => ({ id: 'intent-test', userId: 'payment-user', orderId: 'order_test', amountPaise: reservation.totalAmount * 100, status: 'created', reservation, save: jest.fn().mockResolvedValue(undefined) });

describe('Verified Razorpay checkout boundary', () => {
  const oldSecret = config.razorpayKeySecret;
  const oldProvider=config.paymentProvider;
  beforeEach(() => { config.razorpayKeySecret = 'unit-test-secret'; config.paymentProvider='razorpay'; jest.mocked(gateway.razorpayEnabled).mockReturnValue(true); });
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); config.razorpayKeySecret = oldSecret; config.paymentProvider=oldProvider; });
  it('requires an account and blocks setup-free or tampered checkout', async () => {
    expect((await request(app).post('/api/payments/orders').send(reservation)).status).toBe(401);
    jest.mocked(gateway.razorpayEnabled).mockReturnValue(false);
    expect((await request(app).post('/api/payments/orders').set('Authorization', `Bearer ${token}`).send(reservation)).status).toBe(503);
    jest.mocked(gateway.razorpayEnabled).mockReturnValue(true);
    expect((await request(app).post('/api/payments/orders').set('Authorization', `Bearer ${token}`).send({ ...reservation, totalAmount: 1 })).status).toBe(409);
    expect(gateway.createRazorpayOrder).not.toHaveBeenCalled();
  });
  it('creates an INR order in paise from the trusted quote', async () => {
    jest.spyOn(PaymentIntentModel, 'findOne').mockReturnValue({ sort: jest.fn().mockResolvedValue(null) } as never);
    jest.spyOn(PaymentIntentModel, 'create').mockResolvedValue(intent() as never);
    jest.mocked(gateway.createRazorpayOrder).mockResolvedValue({ id: 'order_test', amount: reservation.totalAmount * 100, currency: 'INR' });
    const result = await request(app).post('/api/payments/orders').set('Authorization', `Bearer ${token}`).send(reservation);
    expect(result.status).toBe(200);
    expect(gateway.createRazorpayOrder).toHaveBeenCalledWith(reservation.totalAmount * 100, expect.any(String));
    expect(result.body.currency).toBe('INR');
  });
  it('rejects forged signatures, wrong orders and access from another account', async () => {
    jest.spyOn(PaymentIntentModel, 'findOne').mockResolvedValue(intent() as never);
    const bad = { ...proof(), razorpay_signature: '0'.repeat(64) };
    expect((await request(app).post('/api/payments/verify').set('Authorization', `Bearer ${token}`).send(bad)).status).toBe(400);
    expect((await request(app).post('/api/payments/verify').set('Authorization', `Bearer ${token}`).send({ ...proof(), razorpay_order_id: 'order_other' })).status).toBe(400);
    expect(createBookedWorkspace).not.toHaveBeenCalled();
    jest.spyOn(PaymentIntentModel, 'findOne').mockResolvedValue(null);
    expect((await request(app).post('/api/payments/verify').set('Authorization', `Bearer ${token}`).send(proof())).status).toBe(404);
  });
  it('checks captured status, amount and currency before creating any workspace', async () => {
    jest.spyOn(PaymentIntentModel, 'findOne').mockResolvedValue(intent() as never);
    for (const changed of [{ status: 'authorized' }, { amount: 1 }, { currency: 'USD' }, { order_id: 'order_other' }, { refunded: true }]) {
      jest.mocked(gateway.fetchRazorpayPayment).mockResolvedValue({ id: 'pay_testPayment', order_id: 'order_test', amount: reservation.totalAmount * 100, currency: 'INR', status: 'captured', ...changed });
      expect((await request(app).post('/api/payments/verify').set('Authorization', `Bearer ${token}`).send(proof())).status).toBe(409);
    }
    expect(createBookedWorkspace).not.toHaveBeenCalled();
  });
  it('creates the reservation from the stored quote after capture and signature verification', async () => {
    const saved = intent();
    jest.spyOn(PaymentIntentModel, 'findOne').mockResolvedValue(saved as never);
    jest.mocked(gateway.fetchRazorpayPayment).mockResolvedValue({ id: 'pay_testPayment', order_id: 'order_test', amount: reservation.totalAmount * 100, currency: 'INR', status: 'captured' });
    jest.mocked(createBookedWorkspace).mockResolvedValue({ booking: { id: 'booking-test' }, trip: { id: 'trip-test' } } as never);
    const result = await request(app).post('/api/payments/verify').set('Authorization', `Bearer ${token}`).send({ ...proof(), totalAmount: 1, destination: 'Paris' });
    expect(result.status).toBe(200);
    expect(createBookedWorkspace).toHaveBeenCalledWith(expect.objectContaining({ id: 'payment-user' }), expect.objectContaining({ destination: 'Ahmedabad', totalAmount: reservation.totalAmount, paymentReference: 'intent-test' }));
  });
});
