import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const base = process.env.VOYANA_URL || "http://127.0.0.1:5174";
const api = process.env.VOYANA_API_URL || "http://127.0.0.1:3101";
const a = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
const b = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
const leader = await a.newPage();
const member = await b.newPage();
const stamp = Date.now();
let tripId;
const errors = [];
leader.on("pageerror", (error) => errors.push(error.message));
member.on("pageerror", (error) => errors.push(error.message));
member.on("response", async (response) => {
  if (
    response.url().includes("/api/budget/") &&
    response.request().method() === "POST"
  ) {
    const data = await response.json().catch(() => ({}));
    console.log(
      "Member expense API:",
      response.status(),
      data.message || "",
      data.error || "",
    );
  }
});
async function signIn(page, role) {
  const result = await page.request.post(`${api}/api/auth/signup`, {
    data: {
      name: `Journey ${role}`,
      email: `journey-ui-${role}-${stamp}@voyana.test`,
      password: "JourneyPassword123!",
      role: "traveler",
    },
  });
  assert.equal(result.status(), 201);
  const { session } = await result.json();
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    (session) =>
      localStorage.setItem("voyana.active_session", JSON.stringify(session)),
    session,
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  return session;
}
const headers = (session) => ({ Authorization: `Bearer ${session.token}` });
async function openGroup(page) {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Workspace", exact: true })
    .click();
  const group = page
    .getByRole("button")
    .filter({ hasText: `Shared adventure ${stamp}` });
  await group.click();
  await page
    .getByRole("button", { name: "Trip dashboard", exact: true })
    .waitFor();
}
try {
  leader.setDefaultTimeout(30000);
  member.setDefaultTimeout(30000);
  const owner = await signIn(leader, "leader");
  const friend = await signIn(member, "member");
  await leader
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Workspace", exact: true })
    .click();
  await leader
    .getByRole("textbox", { name: "Workspace name" })
    .fill(`Shared adventure ${stamp}`);
  await leader
    .getByRole("textbox", { name: "Destination (decide together later)" })
    .fill("Ahmedabad");
  await leader
    .getByRole("button", { name: "Create planning workspace" })
    .click();
  await leader.getByText("You are the group leader", { exact: true }).waitFor();
  console.log("PASS: group workspace created");
  tripId = await leader.evaluate(
    () => JSON.parse(localStorage.getItem("voyana.planning_context")).trip.id,
  );
  await leader
    .getByText("People, invitations and AI suggestions", { exact: true })
    .click();
  await leader
    .getByRole("textbox", { name: "Invite member email" })
    .fill(friend.user.email);
  await leader
    .getByRole("button", { name: "Invite member", exact: true })
    .click();
  await leader.getByText(/Email sender is not configured/).waitFor();
  console.log("PASS: member invitation pending without sender");
  await openGroup(member);
  const memberPanel = member.getByRole("region", { name: "Trip management" });
  await member
    .getByText("Group member · bookings managed by the leader")
    .waitFor();
  assert.equal(
    await memberPanel
      .getByRole("button", { name: "Flights", exact: true })
      .isDisabled(),
    true,
  );
  await member.getByRole("button", { name: /Group Chat/ }).click();
  const message = member.getByRole("textbox", { name: "Group message" });
  await message.fill("Let us explore Ahmedabad together.");
  await message.press("Enter");
  await member
    .getByText("Let us explore Ahmedabad together.", { exact: true })
    .waitFor();
  await leader.getByRole("button", { name: /Group Chat/ }).click();
  await leader
    .getByText("Let us explore Ahmedabad together.", { exact: true })
    .waitFor();
  const booking = leader.evaluate(async () => {
    const { recordBooking } = await import("/src/services/bookingService.ts");
    const { generateMockHotels } = await import(
      "/src/services/hotelService.ts"
    );
    const start = new Date(Date.now() + 30 * 86400000)
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
      guests: 2,
    })[0];
    return recordBooking({
      bookingReference: "draft",
      bookingType: "hotel",
      status: "confirmed",
      paymentStatus: "paid",
      totalAmount: hotel.baseNightlyRate,
      currency: "INR",
      contactEmail: JSON.parse(localStorage.getItem("voyana.active_session"))
        .user.email,
      hotelDetails: { city: "Ahmedabad", guestName: "Journey leader" },
      choices: [
        {
          type: "hotel",
          id: hotel.id,
          checkIn: start,
          checkOut: end,
          roomType: "Standard",
          rooms: 1,
          guests: 2,
        },
      ],
    });
  });
  const otp = leader.getByRole("dialog", { name: "Demo OTP payment" });
  await otp.waitFor();
  await otp.getByRole("button", { name: "Use demo OTP" }).click();
  await otp.getByRole("button", { name: "Confirm demo payment" }).click();
  const confirmed = await booking;
  console.log("PASS: leader completed checkout");
  assert.equal(confirmed.tripId, tripId);
  await member
    .getByRole("button", { name: "Trip dashboard", exact: true })
    .click();
  await member
    .locator(".journey-row")
    .filter({ hasText: confirmed.bookingReference })
    .waitFor();
  await member.getByText(/Shared expense tracker/).click();
  await member
    .getByRole("textbox", { name: "Expense title" })
    .fill("Shared dinner");
  await member.getByRole("spinbutton", { name: "Expense amount" }).fill("1600");
  await member
    .getByRole("button", { name: "Add expense", exact: true })
    .click();
  await member.getByText("Shared dinner", { exact: false }).waitFor();
  await leader
    .getByRole("button", { name: "Trip dashboard", exact: true })
    .click();
  await leader.getByText(/Shared expense tracker/).click();
  await leader.getByText("Shared dinner", { exact: false }).waitFor();
  await leader
    .getByText("Expense added", { exact: true })
    .first()
    .waitFor({ timeout: 15000 });
  const alerts = await leader.request.get(`${api}/api/alerts`, {
    headers: headers(owner),
  });
  assert.ok(
    (await alerts.json()).alerts.some((item) => item.title === "Expense added"),
  );
  await leader
    .getByRole("button", { name: "Mark trip completed", exact: true })
    .click();
  await leader
    .getByRole("status")
    .filter({ hasText: "Trip completed" })
    .waitFor();
  const jpeg = await leader.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#08a";
    ctx.fillRect(0, 0, 100, 100);
    return canvas.toDataURL("image/jpeg");
  });
  await leader
    .getByLabel("Upload memory photos")
    .setInputFiles({
      name: "trip-photo.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from(jpeg.split(",")[1], "base64"),
    });
  await leader
    .getByText("AI travel memories · 1/50 photos", { exact: true })
    .waitFor();
  console.log(
    "PASS: shared expenses, notifications, completion and photo upload",
  );
  if (process.env.VOYANA_SKIP_AI !== "true") {
    await leader
      .getByRole("button", { name: "Generate AI travel memories", exact: true })
      .click();
    await Promise.race([
      leader
        .getByRole("heading", { name: "Your AI travel journal", exact: true })
        .waitFor({ timeout: 150000 }),
      leader
        .getByText(/AI provider returned HTTP/)
        .waitFor({ timeout: 150000 })
        .then(async () => {
          throw new Error(
            await leader.getByText(/AI provider returned HTTP/).textContent(),
          );
        }),
    ]);
    console.log(
      "PASS: real Groq vision captions and AI journal generated from an uploaded photo",
    );
  }
  await leader.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await leader.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await leader.screenshot({
    path: ".artifacts/group-journey-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: group creation, pending-email invitation, member chat, leader booking, shared reservations/expenses, notifications, trip completion, photo upload and mobile layout",
  );
} catch (error) {
  await member.screenshot({ path: ".artifacts/journey-member-failure.png" });
  await leader.screenshot({
    path: ".artifacts/journey-ui-failure.png",
    fullPage: true,
  });
  throw error;
} finally {
  await browser.close();
}
