import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.VOYANA_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined), headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
page.setDefaultTimeout(20000);
const errors = [];
page.on('pageerror', error => { errors.push(error.message); console.error('PAGE ERROR:', error.message); });
page.on('console', message => { if (message.type() === 'error') console.error('BROWSER:', message.text().slice(0, 250)); });
await mkdir('.artifacts', { recursive: true });
const choose = async city => {
  await page.getByRole('textbox', { name: 'Destination search' }).fill(city);
  await page.getByRole('button', { name: 'Explore Destination', exact: true }).click();
  await page.getByRole('button', { name: `Book flights to ${city}`, exact: true }).waitFor();
};
try {
  await page.goto(base);
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  assert.equal(await nav.getByRole('button', { name: 'Workspace', exact: true }).count(), 1);
  await choose('Ahmedabad');
  await page.waitForFunction(() => Math.abs(Number(document.querySelector('.globe-canvas-mount')?.dataset.focusZ) - 1) < 0.002);
  const globe = await page.locator('.globe-canvas-mount').evaluate(el => ({ ...el.dataset }));
  assert.equal(Number(globe.latitude), 23.0225);
  assert.equal(Number(globe.longitude), 72.5714);
  assert.ok(Math.abs(Number(globe.focusX)) < 0.002);
  await page.screenshot({ path: '.artifacts/ahmedabad-desktop.png', fullPage: true });
  console.log('PASS: Ahmedabad coordinates and camera-facing globe marker');
  const geography = await page.evaluate(async () => {
    const { SphereGeometry, Vector3 } = await import('/node_modules/.vite/deps/three.js');
    const { latLngToVector3, vector3ToLatLng, makeFocusQuaternion } = await import('/src/components/Globe/globe.utils.ts');
    const geometry = new SphereGeometry(1, 360, 180);
    const positions = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    for (const [lat, lon] of [[23, 73], [36, 140], [41, -74], [-34, 151], [0, 0], [0, 90], [0, -90]]) {
      let best = Infinity;
      let index = 0;
      for (let i = 0; i < uv.count; i++) {
        const distance = Math.abs(uv.getX(i) - (lon + 180) / 360) + Math.abs(uv.getY(i) - (lat + 90) / 180);
        if (distance < best) { best = distance; index = i; }
      }
      const actual = new Vector3().fromBufferAttribute(positions, index);
      const point = latLngToVector3(lat, lon, 1);
      if (actual.distanceTo(point) > 0.0001) return false;
      const inverse = vector3ToLatLng(actual);
      if (Math.abs(inverse.latitude - lat) > 0.001 || Math.abs(inverse.longitude - lon) > 0.001) return false;
      if (point.applyQuaternion(makeFocusQuaternion(lat, lon)).distanceTo(new Vector3(0, 0, 1)) > 0.0001) return false;
    }
    geometry.dispose();
    return true;
  });
  assert.equal(geography, true, 'Geographic markers must match actual Earth texture UV coordinates');
  console.log('PASS: seven geographic positions match SphereGeometry texture coordinates');

  const signedUp = await page.evaluate(async () => {
    const auth = await import('/src/services/authService.ts');
    return auth.signUp('Destination Tester', `flow.${Date.now()}@voyana.test`, 'FlowPassword123!', 'traveler');
  });
  assert.equal(signedUp.ok, true, signedUp.message);
  console.log('PASS: test account created');
  await page.reload();
  await nav.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
  await page.goto(`${base}/#/budget`);
  await page.getByText(/Confirm a booking for Ahmedabad to unlock/).waitFor();
  assert.equal(await nav.getByRole('button', { name: 'Split expenses', exact: true }).count(), 0);
  await page.goto(base);
  await page.getByRole('button', { name: 'Book flights to Ahmedabad', exact: true }).click();
  await page.getByRole('button',{name:'Continue solo',exact:true}).click();
  const arrival = page.getByLabel('Selected destination airport');
  await arrival.waitFor();
  assert.equal(await arrival.inputValue(), 'AMD');
  assert.equal(await arrival.getAttribute('readonly'), '');
  await page.getByPlaceholder('City or Airport code').first().fill('JFK');
  const future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  await page.locator('input[type="date"]').fill(future);
  await page.getByRole('button', { name: 'Search Flights', exact: true }).click();
  await page.getByRole('button', { name: 'Select', exact: true }).first().click();
  await page.getByPlaceholder('John Michael Doe').fill('Destination Tester');
  await page.getByPlaceholder('A1234567').fill('TEST123456');
  await page.locator('input[type="date"]').fill('1995-01-01');
  await page.getByPlaceholder('Indian', { exact: true }).fill('Indian');
  await page.getByPlaceholder('you@email.com').fill(signedUp.session.user.email);
  await page.getByPlaceholder('+91 98765 43210').fill('1234567890');
  await page.getByRole('button', { name: 'Continue to Payment' }).click();
  await page.getByRole('button', { name: /Continue to OTP/ }).click();
  const otpDialog=page.getByRole('dialog',{name:'Demo OTP payment'});
  await otpDialog.waitFor();
  await otpDialog.getByRole('textbox',{name:'Payment OTP'}).fill('000000');
  await otpDialog.getByRole('button',{name:'Confirm demo payment'}).click();
  await otpDialog.getByRole('alert').filter({hasText:'Incorrect OTP'}).waitFor();
  await otpDialog.getByRole('button',{name:'Use demo OTP'}).click();
  await otpDialog.screenshot({path:'.artifacts/demo-otp-payment.png'});
  await otpDialog.getByRole('button',{name:'Confirm demo payment'}).click();
  await page.getByRole('heading', { name: 'Booking Confirmed!', exact: true, level: 3 }).waitFor({ timeout: 25000 });
  await page.getByRole('button', { name: 'Close flight booking', exact: true }).click();
  await nav.getByRole('button', { name: 'Workspace', exact: true }).waitFor();
  console.log('PASS: destination-locked flight checkout unlocks workspace and expense tools');

  const result = await page.evaluate(async () => {
    const { apiRequest } = await import('/src/services/apiClient.ts');
    const { getPlanningContext } = await import('/src/services/planningContext.ts');
    const { getUserBookings } = await import('/src/services/bookingService.ts');
    const { searchHotels } = await import('/src/services/hotelService.ts');
    const { searchTransport } = await import('/src/services/transportService.ts');
    const trip = getPlanningContext();
    const bookings = await getUserBookings();
    const booking = bookings.find(item => item.status === 'confirmed');
    const budget = await apiRequest(`/api/budget/${trip.id}`);
    const chatPost = await apiRequest(`/api/collaboration/${trip.id}/chat`, { method: 'POST', body: JSON.stringify({ senderName: 'Destination Tester', message: 'Ahmedabad group is ready' }) });
    const chat = await apiRequest(`/api/collaboration/${trip.id}/chat`);
    const role = await apiRequest('/api/auth/profile', { method: 'PUT', body: JSON.stringify({ role: 'organizer' }) });
    const admin = await apiRequest('/api/auth/users');
    const hotels = await searchHotels('UnknownPlaceExample', '2027-01-01', '2027-01-04');
    const transport = await searchTransport(undefined, 'Ahmedabad', '2027-01-01', 'all');
    return { trip, booking, budget: budget.data, chatStatus: chatPost.status, messages: chat.data.messages, role: role.status, admin: admin.status, unknownHotels: hotels.length, transportCities: transport.map(item => item.destinationCity) };
  });
  assert.equal(result.booking.tripId, result.trip.id);
  assert.equal(result.trip.destination, 'Ahmedabad');
  assert.equal(result.booking.currency,'INR');
  assert.equal(result.budget.budget.currency,'INR');
  assert.equal(result.budget.budget.expenses.filter(item => item.notes === result.booking.bookingReference).length, 1);
  assert.equal(result.chatStatus, 201);
  assert.ok(result.messages.some(item => item.message === 'Ahmedabad group is ready'));
  assert.equal(result.role, 403);
  assert.equal(result.admin, 403);
  assert.equal(result.unknownHotels, 0);
  assert.ok(result.transportCities.every(city => city === 'Ahmedabad'));
  console.log('PASS: one booking ledger entry, group chat persistence, role protection, inventory isolation');

  await choose('Paris');
  assert.equal(await nav.getByRole('button', { name: 'Workspace', exact: true }).count(), 1);
  assert.equal(await nav.getByRole('button', { name: 'Split expenses', exact: true }).count(), 0);
  await choose('Ahmedabad');
  await nav.getByRole('button', { name: 'Workspace', exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.artifacts/ahmedabad-mobile.png', fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Mobile layout must not overflow');
  await page.setViewportSize({ width: 1440, height: 1100 });
  await nav.getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.getByRole('button').filter({ hasText: 'Ahmedabad trip' }).first().click();
  await page.getByText('Ahmedabad trip', { exact: true }).first().waitFor();
  await page.screenshot({ path: '.artifacts/booked-workspace.png', fullPage: true });
  console.log('PASS: destination switching hides unrelated trip tools; responsive layout; workspace opens');
  assert.deepEqual(errors, []);
  console.log('PASS: no uncaught browser errors');
} catch (error) {
  await page.screenshot({ path: '.artifacts/destination-flow-failure.png', fullPage: true });
  console.error((await page.locator('body').innerText()).slice(0, 4500));
  throw error;
} finally {
  await browser.close();
}
