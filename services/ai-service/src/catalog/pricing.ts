// Deterministic sample pricing shared by browser and server. These are estimates, not live supplier fares.
const CITIES: Record<string, [number, number, string]> = {
  ahmedabad: [23.0225, 72.5714, "IN"],
  mumbai: [19.076, 72.8777, "IN"],
  delhi: [28.6139, 77.209, "IN"],
  "new delhi": [28.6139, 77.209, "IN"],
  pune: [18.5204, 73.8567, "IN"],
  bengaluru: [12.9716, 77.5946, "IN"],
  jaipur: [26.9124, 75.7873, "IN"],
  paris: [48.8566, 2.3522, "FR"],
  london: [51.5074, -0.1278, "GB"],
  tokyo: [35.6762, 139.6503, "JP"],
  kyoto: [35.0116, 135.7681, "JP"],
  osaka: [34.6937, 135.5023, "JP"],
  dubai: [25.2048, 55.2708, "AE"],
  "new york": [40.7128, -74.006, "US"],
  "washington dc": [38.9072, -77.0369, "US"],
  sydney: [-33.8688, 151.2093, "AU"],
  singapore: [1.3521, 103.8198, "SG"],
  rome: [41.9028, 12.4964, "IT"],
  bangkok: [13.7563, 100.5018, "TH"],
  "rio de janeiro": [-22.9068, -43.1729, "BR"],
  bali: [-8.4095, 115.1889, "ID"],
  barcelona: [41.3874, 2.1686, "ES"],
  berlin: [52.52, 13.405, "DE"],
  zurich: [47.3769, 8.5417, "CH"],
  cairo: [30.0444, 31.2357, "EG"],
  "cape town": [-33.9249, 18.4241, "ZA"],
};
export function priceSeed(value: string) {
  let hash = 2166136261;
  for (const letter of value.toLowerCase().trim())
    hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619);
  return hash >>> 0;
}
export function cityLocation(value: string) {
  return CITIES[value.trim().toLowerCase()];
}
export function routeDistanceKm(origin: string, destination: string) {
  const a = cityLocation(origin),
    b = cityLocation(destination);
  if (origin.trim().toLowerCase() === destination.trim().toLowerCase())
    return 25;
  if (!a || !b)
    return 180 + (priceSeed([origin, destination].sort().join("|")) % 1100);
  const rad = (value: number) => (value * Math.PI) / 180;
  const latitude = rad(b[0] - a[0]),
    longitude = rad(b[1] - a[1]);
  const h =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(longitude / 2) ** 2;
  return Math.max(
    25,
    Math.round(6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))),
  );
}
export function travelDateFactor(date: string, market: string) {
  const parsed = new Date(date + "T12:00:00Z");
  if (!Number.isFinite(parsed.getTime())) return 1;
  const weekend = [5, 6].includes(parsed.getUTCDay()) ? 1.12 : 1;
  const season = [4, 5, 11].includes(parsed.getUTCMonth()) ? 1.08 : 1;
  return (
    weekend * season * (0.94 + (priceSeed(market + "|" + date) % 13) / 100)
  );
}
export function sampleTransportPrice(
  type: string,
  origin: string,
  destination: string,
  date: string,
  variant = 0,
) {
  const distance = routeDistanceKm(origin, destination);
  const india = cityLocation(destination)?.[2] === "IN";
  const market = india ? 1 : 2.5;
  const variation =
    1 +
    (priceSeed(origin + "|" + destination + "|" + type + variant) % 17) / 100;
  const fare =
    type === "train"
      ? (180 + distance * 1.8) * market
      : type === "bus"
        ? (100 + distance * 1.15) * market
        : type === "car_rental"
          ? (1800 + (priceSeed(destination) % 9) * 160) * market
          : type === "ferry"
            ? (220 + distance * 2) * market
            : (500 + distance * 13) * market;
  return Math.max(
    100,
    Math.round((fare * variation * travelDateFactor(date, destination)) / 10) *
      10,
  );
}
