import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
const base = process.env.VOYANA_URL || "http://localhost:5173";
const api = process.env.VOYANA_API_URL || "http://localhost:3001";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(30000);
const value = (text) => Number(text.replace(/[^0-9.]/g, ""));
async function open(service) {
  await page.goto(`${base}/#/${service}`, { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Continue solo", exact: true })
    .click();
}
async function photo(kind) {
  const image = page.locator(`[data-booking-image="${kind}"] img`).first();
  await image.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      image.evaluate((image) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  assert.ok((await image.getAttribute("src")).startsWith("/images/booking/"));
}
try {
  const signed = await page.request.post(`${api}/api/auth/signup`, {
    data: {
      name: "Booking Price Reviewer",
      email: `booking-prices-${Date.now()}@voyana.test`,
      password: "BookingPrice123!",
      role: "traveler",
    },
  });
  assert.equal(signed.status(), 201);
  const { session } = await signed.json();
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.evaluate(async (session) => {
    localStorage.setItem("voyana.active_session", JSON.stringify(session));
    const context = await import("/src/services/planningContext.ts");
    context.selectPlanningDestination("Ahmedabad");
  }, session);
  const date = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    out = new Date(Date.parse(date) + 2 * 86400000).toISOString().slice(0, 10);
  await open("hotel");
  await page.locator("input[type=date]").nth(0).fill(date);
  await page.locator("input[type=date]").nth(1).fill(out);
  await page.getByRole("button", { name: /^Search Hotels/ }).click();
  await photo("hotel");
  await page.screenshot({ path: ".artifacts/hotel-booking-fixed.png" });
  await open("flight");
  await page.getByPlaceholder("City or Airport code").first().fill("JFK");
  await page.locator("input[type=date]").fill(date);
  await page
    .getByRole("button", { name: "Search Flights", exact: true })
    .click();
  await photo("flight");
  await page.screenshot({ path: ".artifacts/flight-booking-fixed.png" });
  await open("transport");
  await page.getByRole("button", { name: /High-Speed Rail/ }).click();
  await photo("train");
  assert.equal(
    await page.locator("[data-booking-image=private_transfer]").count(),
    0,
  );
  await page.screenshot({ path: ".artifacts/train-booking-fixed.png" });
  await page.getByRole("button", { name: /Car Rental/ }).click();
  await photo("car_rental");
  await page.screenshot({ path: ".artifacts/car-booking-fixed.png" });
  console.log(
    "PASS: hotel, flight, passenger-train and car screens load category-correct local photos",
  );
  await open("bundle");
  const dialog = page.getByRole("dialog", {
    name: "Destination travel bundle",
  });
  const total = dialog.getByTestId("package-total");
  await total.waitFor();
  const initial = await total.innerText();
  await dialog.getByRole("spinbutton", { name: "Package nights" }).fill("5");
  await expect(total).not.toHaveText(initial);
  const fiveNights = await total.innerText();
  assert.ok(value(fiveNights) > value(initial));
  await dialog.getByRole("spinbutton", { name: "Package travelers" }).fill("3");
  await expect(total).not.toHaveText(fiveNights);
  assert.equal(
    await dialog
      .getByRole("spinbutton", { name: "Package rooms" })
      .inputValue(),
    "2",
  );
  const standard = await total.innerText();
  await dialog
    .getByRole("combobox", { name: "Package tier" })
    .selectOption("premium");
  await expect(total).not.toHaveText(standard);
  assert.ok(value(await total.innerText()) > value(standard));
  await photo("flight");
  await photo("hotel");
  await photo("car_rental");
  const expected = await page.evaluate(() => {
    const items = [...document.querySelectorAll("[data-package-price]")]
      .filter(
        (element) => element.closest("label").querySelector("input").checked,
      )
      .map((element) => Number(element.textContent.replace(/[^0-9.]/g, "")));
    const subtotal = items.reduce((a, b) => a + b, 0);
    const discount = Math.round(
      subtotal * (items.length >= 3 ? 0.15 : items.length === 2 ? 0.1 : 0),
    );
    return subtotal - discount + Math.round((subtotal - discount) * 0.05);
  });
  assert.equal(value(await total.innerText()), expected);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page.screenshot({
    path: ".artifacts/package-booking-fixed-mobile.png",
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: ".artifacts/package-booking-fixed.png" });
  const response = page.waitForResponse(
    (response) =>
      response.url().includes("/api/payments/orders") &&
      response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: /Continue to payment/ }).click();
  const order = await response;
  const payload = await order.json();
  assert.equal(order.status(), 200, payload.message);
  assert.equal(payload.amount, expected * 100);
  assert.equal(payload.currency, "INR");
  console.log(
    "PASS: nights, travelers, rooms and premium tier update the package total; server payment order matches the displayed total",
  );
} catch (error) {
  await page.screenshot({ path: ".artifacts/booking-pricing-failure.png" });
  throw error;
} finally {
  await browser.close();
}
