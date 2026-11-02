import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 1000 } });
page.setDefaultTimeout(30000);
let session;
try {
  const response = await page.request.post(
    "http://localhost:3001/api/auth/signup",
    {
      data: {
        name: "Razorpay Test Traveler",
        email: `razorpay-ui-${Date.now()}@voyana.test`,
        password: "RazorpayTest123!",
        role: "traveler",
      },
    },
  );
  assert.equal(response.status(), 201);
  session = (await response.json()).session;
  await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    (session) =>
      localStorage.setItem("voyana.active_session", JSON.stringify(session)),
    session,
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  const config = await (
    await page.request.get("http://localhost:3001/api/payments/config")
  ).json();
  assert.deepEqual(config, {
    enabled: true,
    provider: "razorpay",
    mode: "test",
    currency: "INR",
  });
  const checkout = page.evaluate(async () => {
    const { selectPlanningDestination } = await import(
      "/src/services/planningContext.ts"
    );
    selectPlanningDestination("Ahmedabad");
    const { recordBooking } = await import("/src/services/bookingService.ts");
    const { generateMockHotels } = await import(
      "/src/services/hotelService.ts"
    );
    const start = new Date(Date.now() + 35 * 86400000)
      .toISOString()
      .slice(0, 10);
    const end = new Date(Date.parse(start) + 86400000)
      .toISOString()
      .slice(0, 10);
    const hotel = generateMockHotels({
      location: "Ahmedabad",
      checkInDate: start,
      checkOutDate: end,
      rooms: 1,
      guests: 1,
    })[0];
    try {
      await recordBooking({
        bookingReference: "draft",
        bookingType: "hotel",
        status: "confirmed",
        paymentStatus: "paid",
        totalAmount: hotel.baseNightlyRate,
        currency: "INR",
        contactEmail: JSON.parse(localStorage.getItem("voyana.active_session"))
          .user.email,
        hotelDetails: {
          city: "Ahmedabad",
          guestName: "Razorpay Test Traveler",
        },
        choices: [
          {
            type: "hotel",
            id: hotel.id,
            checkIn: start,
            checkOut: end,
            roomType: "Standard",
            rooms: 1,
            guests: 1,
          },
        ],
      });
      return "unexpected-confirmation";
    } catch (error) {
      return error.message;
    }
  });
  void checkout.catch(() => {});
  await page
    .locator("iframe.razorpay-checkout-frame")
    .waitFor({ timeout: 60000 });
  const frame = page.frameLocator("iframe.razorpay-checkout-frame");
  await frame.locator("body").waitFor();
  await frame
    .getByText(/UPI|Netbanking|Contact Details|Phone|Card/i)
    .first()
    .waitFor({ timeout: 45000 })
    .catch(() => {});
  await page.screenshot({
    path: ".artifacts/razorpay-test-checkout.png",
    fullPage: true,
  });
  console.log(
    "PASS: real Razorpay SDK opens with a server-created INR test order",
  );
  console.log(
    "Checkout text:",
    (await frame.locator("body").innerText()).slice(0, 1400),
  );
  await page.keyboard.press("Escape");
  // The gateway can prompt before closing; closing the page still must not confirm a reservation.
  const bookings = await (
    await page.request.get("http://localhost:3001/api/bookings", {
      headers: { Authorization: `Bearer ${session.token}` },
    })
  ).json();
  assert.equal(bookings.bookings.length, 0);
  console.log(
    "PASS: opening an unpaid Razorpay checkout creates no confirmed booking",
  );
  await page.close();
  await checkout.catch(() => {});
} finally {
  await browser.close();
}
