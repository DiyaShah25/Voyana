jest.setTimeout(30000);
import request from "supertest";
import { createApp } from "../app.js";
import { connectMongo, disconnectMongo } from "../db/mongo.js";
import { TripModel } from "../db/models/trip.model.js";
import { AlertModel } from "../db/models/alert.model.js";
import { JourneyPhotoModel } from "../db/models/journey-photo.model.js";
import { config } from "../config/env.js";
import { generateMockHotels } from "../catalog/hotels.js";

describe("Solo and group journey lifecycle", () => {
  const app = createApp();
  const stamp = Date.now();
  let leaderToken = "",
    memberToken = "",
    outsiderToken = "",
    leaderId = "",
    memberId = "",
    groupId = "",
    soloId = "";
  let expenseId = "";
  const memberEmail = `journey-member-${stamp}@voyana.test`;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const date = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const out = new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10);
  const hotel = generateMockHotels({
    location: "Ahmedabad",
    checkInDate: date,
    checkOutDate: out,
    rooms: 1,
    guests: 1,
  })[0];
  const reservation = (tripId: string, travelMode: string) => ({
    tripId,
    travelMode,
    destination: "Ahmedabad",
    bookingType: "hotel",
    currency: "INR",
    totalAmount: hotel.baseNightlyRate,
    contactEmail: "journey@voyana.test",
    hotelDetails: { guestName: "Journey leader" },
    choices: [
      {
        type: "hotel",
        id: hotel.id,
        checkIn: date,
        checkOut: out,
        roomType: "Standard",
        rooms: 1,
        guests: 1,
      },
    ],
  });
  const photo = "data:image/jpeg;base64,/9j/2Q==";
  beforeAll(async () => {
    await connectMongo();
    for (const role of ["leader", "member", "outsider"]) {
      const result = await request(app)
        .post("/api/auth/signup")
        .send({
          name: `Journey ${role}`,
          email:
            role === "member"
              ? memberEmail
              : `journey-${role}-${stamp}@voyana.test`,
          password: "SecurePassword123!",
          role: "traveler",
        });
      expect(result.status).toBe(201);
      if (role === "leader") {
        leaderToken = result.body.session.token;
        leaderId = result.body.session.user.id;
      } else if (role === "member") {
        memberToken = result.body.session.token;
        memberId = result.body.session.user.id;
      } else outsiderToken = result.body.session.token;
    }
  });
  afterAll(async () => {
    jest.restoreAllMocks();
    await disconnectMongo();
  });
  it("creates independent solo and group journeys with one leader", async () => {
    for (const mode of ["solo", "group"]) {
      const result = await request(app)
        .post("/api/trips")
        .set(auth(leaderToken))
        .send({
          title: `${mode} journey`,
          travelMode: mode,
          destination: "Ahmedabad",
          startDate: date,
          endDate: out,
          visibility: "private",
          currency: "INR",
        });
      expect(result.status).toBe(201);
      expect(result.body.trip.travelMode).toBe(mode);
      expect(result.body.trip.ownerId).toBe(leaderId);
      if (mode === "group") groupId = result.body.trip.id;
      else soloId = result.body.trip.id;
    }
  });
  it("invites a group member, reports pending email honestly and forbids solo invites", async () => {
    const invited = await request(app)
      .post(`/api/journeys/${groupId}/invitations`)
      .set(auth(leaderToken))
      .send({ email: memberEmail });
    expect(invited.status).toBe(201);
    expect(invited.body.status).toBe("pending");
    expect(invited.body.link).toContain(groupId);
    expect(
      (
        await request(app)
          .post(`/api/journeys/${soloId}/invitations`)
          .set(auth(leaderToken))
          .send({ email: memberEmail })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get(`/api/journeys/${groupId}`)
          .set(auth(memberToken))
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .get(`/api/journeys/${groupId}`)
          .set(auth(outsiderToken))
      ).status,
    ).toBe(403);
  });
  it("enforces leader-only destination changes and checkout before money is requested", async () => {
    expect(
      (
        await request(app)
          .patch(`/api/journeys/${groupId}/plan`)
          .set(auth(memberToken))
          .send({ destination: "Paris" })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post("/api/payments/orders")
          .set(auth(memberToken))
          .send(reservation(groupId, "group"))
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post("/api/payments/orders")
          .set(auth(leaderToken))
          .send(reservation(groupId, "solo"))
      ).status,
    ).toBe(400);
  });
  it("confirms the leader booking into the same group workspace and notifies every member", async () => {
    const order = await request(app)
      .post("/api/payments/orders")
      .set(auth(leaderToken))
      .send(reservation(groupId, "group"));
    expect(order.status).toBe(200);
    for (const token of [leaderToken, memberToken]) {
      const pending = await request(app).get('/api/bookings?status=pending').set(auth(token));
      expect(pending.status).toBe(200);
      expect(pending.body.bookings).toEqual(expect.arrayContaining([expect.objectContaining({
        id: `pending-${order.body.intentId}`, status: 'pending', paymentStatus: 'unpaid', tripId: groupId,
      })]));
    }
    const privateList = await request(app).get('/api/bookings').set(auth(outsiderToken));
    expect(privateList.body.bookings.some((b: { tripId: string }) => b.tripId === groupId)).toBe(false);
    const pendingJourney = await request(app).get(`/api/journeys/${groupId}`).set(auth(memberToken));
    expect(pendingJourney.body.trip.lifecycle).toBe('planning');
    expect(pendingJourney.body.bookings[0].status).toBe('pending');
    expect(pendingJourney.body.budget?.expenses || []).toHaveLength(0);
    const confirmation = await request(app)
      .post("/api/payments/demo/confirm")
      .set(auth(leaderToken))
      .send({ intentId: order.body.intentId, otp: order.body.demoOtp });
    expect(confirmation.status).toBe(200);
    expect(confirmation.body.trip.id).toBe(groupId);
    expect(confirmation.body.trip.members).toHaveLength(2);
    expect(confirmation.body.trip.lifecycle).toBe("booked");
    const afterPayment = await request(app).get('/api/bookings').set(auth(memberToken));
    const tripBookings = afterPayment.body.bookings.filter((b: { tripId: string }) => b.tripId === groupId);
    expect(tripBookings).toHaveLength(1);
    expect(tripBookings[0]).toMatchObject({ status: 'confirmed', paymentStatus: 'paid' });
    expect(
      (
        await request(app)
          .get(`/api/bookings/${confirmation.body.booking.id}`)
          .set(auth(memberToken))
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post(`/api/bookings/${confirmation.body.booking.id}/cancel`)
          .set(auth(memberToken))
          .send({ reason: "not leader" })
      ).status,
    ).toBe(404);
    expect(
      await AlertModel.exists({
        user_id: memberId,
        title: "Booking confirmed",
      }),
    ).toBeTruthy();
    const visible = await request(app)
      .get("/api/bookings")
      .set(auth(memberToken));
    expect(
      visible.body.bookings.some(
        (booking: { tripId: string }) => booking.tripId === groupId,
      ),
    ).toBe(true);
  });
  it("adds, edits and deletes shared expenses with member notifications", async () => {
    const added = await request(app)
      .post(`/api/budget/${groupId}/expenses`)
      .set(auth(memberToken))
      .send({
        title: "Group lunch",
        amount: 1200,
        paidBy: "Journey member",
        splitAmong: ["Journey leader", "Journey member"],
      });
    expect(added.status).toBe(201);
    expenseId = added.body.expense.id;
    expect(
      (
        await request(app)
          .patch(`/api/budget/${groupId}/expenses/${expenseId}`)
          .set(auth(leaderToken))
          .send({ title: "Group dinner", amount: 1400 })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .delete(`/api/budget/${groupId}/expenses/${expenseId}`)
          .set(auth(memberToken))
      ).status,
    ).toBe(200);
    for (const title of ["Expense added", "Expense updated", "Expense deleted"])
      expect(
        await AlertModel.exists({ user_id: leaderId, title }),
      ).toBeTruthy();
  });
  it("rejects memory uploads before completion and only lets the leader complete a paid trip", async () => {
    expect(
      (
        await request(app)
          .post(`/api/journeys/${groupId}/photos`)
          .set(auth(memberToken))
          .send({ dataUrl: photo })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app)
          .patch(`/api/journeys/${groupId}/plan`)
          .set(auth(memberToken))
          .send({ complete: true })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .patch(`/api/journeys/${groupId}/plan`)
          .set(auth(leaderToken))
          .send({ complete: true })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post("/api/payments/orders")
          .set(auth(leaderToken))
          .send(reservation(groupId, "group"))
      ).status,
    ).toBe(409);
  });
  it("enforces one atomic 50-photo limit shared by the entire group", async () => {
    await TripModel.updateOne({ id: groupId }, { $set: { photoCount: 49 } });
    const results = await Promise.all(
      [leaderToken, memberToken].map((token) =>
        request(app)
          .post(`/api/journeys/${groupId}/photos`)
          .set(auth(token))
          .send({ dataUrl: photo }),
      ),
    );
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect((await TripModel.findOne({ id: groupId }))!.photoCount).toBe(50);
    const saved = await JourneyPhotoModel.findOne({ tripId: groupId });
    expect(
      (
        await request(app)
          .get(`/api/journeys/${groupId}/photos/${saved!.id}`)
          .set(auth(outsiderToken))
      ).status,
    ).toBe(403);
  });
  it("generates AI-only captions and a saved journal using the provider contract", async () => {
    const savedKey = config.groqApiKey;
    config.groqApiKey = "test-ai-key";
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation(async (_url, options) => {
        const body = JSON.parse(String(options?.body));
        const content = body.messages[1].content;
        const response = Array.isArray(content)
          ? {
              captions: content
                .filter((item: { type: string }) => item.type === "image_url")
                .map(() => "A sunny street with trees."),
            }
          : {
              story:
                "Our Ahmedabad trip, remembered through a sunny street lined with trees.",
            };
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: JSON.stringify(response) } }],
          }),
        } as Response;
      });
    try {
      expect(
        (
          await request(app)
            .post(`/api/journeys/${groupId}/album`)
            .set(auth(memberToken))
        ).status,
      ).toBe(202);
      for (let i = 0; i < 40; i++) {
        const trip = await TripModel.findOne({ id: groupId });
        if (
          trip!.albumStatus === "ready" &&
          (await AlertModel.exists({
            user_id: memberId,
            title: "Your AI travel memories are ready",
          }))
        )
          break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      const trip = await TripModel.findOne({ id: groupId });
      expect(trip!.albumStatus).toBe("ready");
      expect(trip!.albumStory).toContain("Ahmedabad");
      expect(
        await AlertModel.exists({
          user_id: memberId,
          title: "Your AI travel memories are ready",
        }),
      ).toBeTruthy();
    } finally {
      fetchMock.mockRestore();
      config.groqApiKey = savedKey;
    }
  });
  it("keeps solo reservations, expenses and memories private to the solo traveler", async () => {
    const order = await request(app)
      .post("/api/payments/orders")
      .set(auth(leaderToken))
      .send(reservation(soloId, "solo"));
    expect(order.status).toBe(200);
    const pendingSolo = await request(app).get('/api/bookings?status=pending').set(auth(leaderToken));
    expect(pendingSolo.body.bookings).toEqual(expect.arrayContaining([expect.objectContaining({ tripId: soloId, status: 'pending' })]));
    const memberPending = await request(app).get('/api/bookings?status=pending').set(auth(memberToken));
    expect(memberPending.body.bookings.some((b: { tripId: string }) => b.tripId === soloId)).toBe(false);
    const confirmation = await request(app)
      .post("/api/payments/demo/confirm")
      .set(auth(leaderToken))
      .send({ intentId: order.body.intentId, otp: order.body.demoOtp });
    expect(confirmation.status).toBe(200);
    expect(confirmation.body.trip.travelMode).toBe("solo");
    expect(confirmation.body.trip.id).toBe(soloId);
    expect(
      (await request(app).get(`/api/journeys/${soloId}`).set(auth(memberToken)))
        .status,
    ).toBe(403);
    expect(
      (await request(app).get(`/api/budget/${soloId}`).set(auth(memberToken)))
        .status,
    ).toBe(403);
  });
});
