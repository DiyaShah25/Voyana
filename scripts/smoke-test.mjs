import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined), headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(process.env.VOYANA_URL || 'http://127.0.0.1:5173');
  const created = await page.evaluate(async () => {
    const auth = await import('/src/services/authService.ts');
    return auth.signUp('Service Tester', `service.${Date.now()}@voyana.test`, 'ServicePassword123!', 'traveler');
  });
  assert.equal(created.ok, true, created.message);
  await page.reload();
  const serviceWork = page.evaluate(async () => {
    const auth = await import('/src/services/authService.ts');
    const { apiRequest, API_BASE_URL } = await import('/src/services/apiClient.ts');
    const trips = await import('/src/services/tripService.ts');
    const planning = await import('/src/services/planningContext.ts');
    const budget = await import('/src/services/budgetService.ts');
    const packing = await import('/src/services/packingService.ts');
    const collaboration = await import('/src/services/collaborationService.ts');
    const flight = await import('/src/services/flightService.ts');
    const hotel = await import('/src/services/hotelService.ts');
    const transport = await import('/src/services/transportService.ts');
    const booking = await import('/src/services/bookingService.ts');
    const session = auth.restoreSession();
    const me = await apiRequest('/api/auth/me');
    if (!me.ok) throw new Error(`Authenticated profile failed: ${me.status}`);
    planning.selectPlanningDestination('Tokyo');
    const flights = flight.generateMockFlights({ originCode: 'JFK', destinationCode: 'HND', departureDate: '2026-12-01', passengers: 1, cabinClass: 'economy' });
    const bookedFlight = await flight.createFlightBooking(flights[0], { fullName: session.user.name, passportNumber: 'SMOKE-TEST', dateOfBirth: '1995-01-01', nationality: 'India', seatPreference: 'window', mealPreference: 'standard', contactEmail: session.user.email, contactPhone: '1234567890' }, 'economy', 1);
    const trip = planning.getPlanningContext().trip;
    const id = trip.id;
    const added = await trips.addTripActivity(id, { dayNumber: 1, title: 'Tokyo Museum Test', cost: 40 });
    await trips.toggleActivityCompleted(id, added.activity.id);
    const serverTrip = await apiRequest(`/api/trips/${id}`);
    if (!serverTrip.data.trip.activities.find(item => item.id === added.activity.id).isCompleted) throw new Error('Activity completion did not persist');
    await budget.fetchTripBudget();
    await collaboration.addTripExpense(id, { title: 'Museum tickets', amount: 40, currency: 'USD', paidBy: session.user.name, splitAmong: [session.user.name], category: 'Activities', date: '2026-12-01' });
    const expenses = (await budget.fetchTripBudget()).expenses;
    if (!expenses.some(expense => expense.title === 'Museum tickets')) throw new Error('Shared expense missing');
    const checklist = await packing.fetchPackingList();
    packing.toggleItemPacked(checklist.items[0].id);
    const reloaded = await packing.fetchPackingList();
    if (!reloaded.items[0].isPacked) throw new Error('Packing toggle not persisted');
    planning.selectPlanningDestination('Rome');
    if (budget.getTripBudget().expenses.length) throw new Error('Expenses leaked into another trip');
    planning.selectPlanningTrip(trip);
    const hotels = await hotel.searchHotels('Tokyo', '2026-12-01', '2026-12-05');
    const bookedHotel = await hotel.bookHotel(hotels[0], { fullName: session.user.name, passportOrId: 'SMOKE-TEST', contactEmail: session.user.email, contactPhone: '1234567890', nationality: 'India', bedPreference: 'king' }, '2026-12-01', '2026-12-05');
    const transfers = await transport.searchTransport(undefined, 'Tokyo', '2026-12-01', 'all');
    const bookedTransport = await transport.bookTransport(transfers[0], { passengerName: session.user.name, contactEmail: session.user.email, contactPhone: '1234567890', passengerCount: 1 });
    const bundles = await import('/src/services/bookingIntegrationService.ts');
    const offers = await bundles.searchIntegratedOffers('Tokyo', '2026-12-01');
    const bundle = await bundles.processUnifiedBundleCheckout({ userId: session.user.id, customerName: session.user.name, customerEmail: session.user.email, items: offers[0].items, paymentMethod: 'card' });
    if (!bundle.success || !bundle.tripSynced) throw new Error(bundle.error || 'Bundle did not sync');
    const allBookings = await booking.getUserBookings(session.user.id);
    const savedBundle = allBookings.find(item => item.bookingReference === bundle.bundleReference);
    if (!savedBundle || savedBundle.tripId !== id) throw new Error('Bundle workspace mismatch');
    await booking.cancelBooking(savedBundle.id, 'Smoke cleanup', session.user.id);
    await trips.deleteTrip(id);
    for (const result of [bookedFlight, bookedHotel, bookedTransport]) {
      if (!result.success || !allBookings.some(item => item.bookingReference === result.bookingReference)) throw new Error('Checkout missing from My Bookings');
      await booking.cancelBooking(result.bookingId, 'Automated smoke test cleanup', session.user.id);
    }
    return { base: API_BASE_URL, email: me.data.user.email, expenses: expenses.length, bookings: 4 };
  });
  for(let payment=0;payment<4;payment++){
    const otp=page.getByRole('dialog',{name:'Demo OTP payment'});
    await otp.waitFor({timeout:30000});
    await otp.getByRole('button',{name:'Use demo OTP'}).click();
    await otp.getByRole('button',{name:'Confirm demo payment'}).click();
    await otp.waitFor({state:'hidden'});
  }
  const result=await serviceWork;
  console.log('PASS: authenticated API, trip CRUD, activity completion, shared expenses, packing persistence, trip isolation, flight/hotel/transport/bundle checkout and cancellation', result);
  await page.reload();
  await page.getByRole('button', { name: 'Open AI Travel Assistant', exact: true }).click();
  await page.locator('textarea').waitFor();
  const chatCount = await page.locator('textarea').count();
  assert.equal(chatCount, 1, 'VoyaBot must mount once');
  assert.deepEqual(errors, [], 'No uncaught browser errors');
  console.log('PASS: single VoyaBot instance, no uncaught browser errors');
} finally {
  await browser.close();
}
