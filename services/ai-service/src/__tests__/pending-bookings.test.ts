import { pendingBookings } from '../services/pending-bookings.service.js';
import { PaymentIntentModel } from '../db/models/payment-intent.model.js';

describe('Pending checkout booking projections', () => {
  afterEach(() => jest.restoreAllMocks());
  it.each(['flight', 'train', 'bus'])('preserves %s details and excludes gateway credentials', async kind => {
    const scope = { userId: 'owner' };
    const rows = [{ id: 'intent-one', userId: 'owner', amountPaise: 123450, currency: 'INR',
      orderId: 'private-order', provider: 'razorpay', createdAt: new Date(),
      reservation: { bookingType: kind === 'flight' ? 'flight' : 'transport', destination: 'Ahmedabad',
        contactEmail: 'owner@example.com', tripId: 'group-one',
        ...(kind === 'flight' ? { flightDetails: { airline: 'Air India' } } : { transportDetails: { transportType: kind } }) } }];
    const find = jest.spyOn(PaymentIntentModel, 'find').mockReturnValue({ sort: () => ({ limit: async () => rows }) } as never);
    const result = await pendingBookings(scope);
    expect(find).toHaveBeenCalledWith({ userId: 'owner', status: 'created' });
    expect(result[0]).toMatchObject({ status: 'pending', paymentStatus: 'unpaid', totalAmount: 1234.5, tripId: 'group-one' });
    expect(result[0]).not.toHaveProperty('orderId');
    if(kind !== 'flight') expect(result[0].transportDetails).toEqual({ transportType: kind });
  });
});
