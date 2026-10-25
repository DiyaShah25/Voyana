import request from "supertest";
import { createApp } from "../app.js";
import {
  countryAtPoint,
  normalizePhoton,
  lookupPoint,
} from "../services/place-lookup.service.js";
const app = createApp();
afterEach(() => jest.restoreAllMocks());
describe("Globe point place names", () => {
  it("keeps clicked coordinates while using city, state and country from the place result", () => {
    const result = normalizePhoton(
      {
        geometry: { coordinates: [75.8, 26.9] },
        properties: {
          name: "Nearby road",
          city: "Jaipur",
          state: "Rajasthan",
          country: "India",
          osm_value: "residential",
        },
      },
      { latitude: 26.9124, longitude: 75.7873 },
    );
    expect(result).toMatchObject({
      name: "Jaipur",
      city: "Jaipur",
      state: "Rajasthan",
      country: "India",
      latitude: 26.9124,
      longitude: 75.7873,
      bookable: true,
    });
  });
  it("finds countries at land points and does not assign a country to the open Pacific", () => {
    expect(countryAtPoint(23.0225, 72.5714)).toBe("India");
    expect(countryAtPoint(48.8566, 2.3522)).toBe("France");
    expect(countryAtPoint(0, -140)).toBeUndefined();
  });
  it("uses cached reverse lookups without moving the selected point", async () => {
    const fetch = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          features: [
            {
              properties: {
                city: "Test City",
                state: "Test State",
                country: "Test Country",
              },
              geometry: { coordinates: [20, 10] },
            },
          ],
        }),
      } as Response);
    const first = await lookupPoint(10.123401, 20.123401);
    const second = await lookupPoint(10.123402, 20.123402);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(first.name).toBe("Test City");
    expect(second.latitude).toBe(10.123402);
    expect(second.longitude).toBe(20.123402);
  });
  it("falls back to a country when the provider is down, without guessing a city", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("offline"));
    const result = await lookupPoint(24.2, 76.2);
    expect(result).toMatchObject({
      name: "India",
      country: "India",
      bookable: false,
      source: "country-outline",
    });
    expect("city" in result).toBe(false);
  });
  it("labels unpopulated/unmapped water without inventing a city or displaying coordinates as its name", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({ features: [] }),
      } as Response);
    const result = await lookupPoint(0, -141);
    expect(result.name).toBe("Open water or unmapped area");
    expect(result.bookable).toBe(false);
  });
  it("rejects invalid geographic coordinates before calling a provider", async () => {
    const fetch = jest.spyOn(global, "fetch");
    expect(
      (await request(app).get("/api/places/reverse?lat=100&lon=0")).status,
    ).toBe(400);
    expect(
      (await request(app).get("/api/places/reverse?lat=20&lon=hello")).status,
    ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
