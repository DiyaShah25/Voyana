import { worldCountries } from "../data/world-countries.js";
interface Feature {
  geometry?: { coordinates?: number[] };
  properties?: Record<string, string>;
}
interface FeatureCollection {
  features?: Feature[];
}
export function countryAtPoint(latitude: number, longitude: number) {
  const inside = (ring: number[][]) => {
    let result = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i],
        [xj, yj] = ring[j];
      if (
        yi > latitude !== yj > latitude &&
        longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi
      )
        result = !result;
    }
    return result;
  };
  for (const country of worldCountries) {
    const polygons =
      country.type === "Polygon"
        ? [country.coordinates as number[][][]]
        : (country.coordinates as number[][][][]);
    for (const rings of polygons)
      if (inside(rings[0]) && !rings.slice(1).some(inside)) return country.name;
  }
  return undefined;
}
const cache = new Map<string, { data: FeatureCollection; time: number }>();
let queue = Promise.resolve();
let queued = 0;
let nextRequestAt = 0;
export async function photonLookup(
  path: string,
  params: Record<string, string>,
): Promise<FeatureCollection> {
  const key = path + JSON.stringify(params);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < 4 * 3600000) return cached.data;
  if (queued >= 12) throw new Error("Place lookup is busy. Try again shortly.");
  queued++;
  const work = queue.then(async () => {
    const wait = Math.max(0, nextRequestAt - Date.now());
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    nextRequestAt = Date.now() + 1000;
    const base = (
      process.env.GEOCODER_URL || "https://photon.komoot.io"
    ).replace(/\/$/, "");
    const url = new URL(`${base}/${path}`);
    for (const [key, value] of Object.entries(params))
      url.searchParams.set(key, value);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Voyana/1.0 (travel planning)",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Place-name provider is unavailable.");
    const data = (await response.json()) as FeatureCollection;
    if (cache.size >= 512) cache.delete(cache.keys().next().value!);
    cache.set(key, { data, time: Date.now() });
    return data;
  });
  queue = work.then(
    () => {},
    () => {},
  );
  try {
    return await work;
  } finally {
    queued--;
  }
}
export function normalizePhoton(
  feature: Feature,
  point?: { latitude: number; longitude: number },
) {
  const p = feature.properties || {};
  const coords = feature.geometry?.coordinates || [];
  const latitude = point?.latitude ?? Number(coords[1]),
    longitude = point?.longitude ?? Number(coords[0]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const city =
    p.city ||
    (["city", "town", "village", "hamlet", "municipality"].includes(p.osm_value)
      ? p.name
      : undefined);
  const state = p.state;
  const country = p.country;
  const name = point
    ? city || state || country || p.name
    : p.name || city || state || country;
  if (!name) return null;
  const type = city
    ? "city"
    : p.osm_value === "country"
      ? "country"
      : p.osm_value === "state"
        ? "state"
        : "region";
  return {
    name,
    city,
    state,
    country,
    latitude,
    longitude,
    type,
    bookable: Boolean(city) || (!point && type === "region"),
  };
}
export async function lookupPoint(latitude: number, longitude: number) {
  try {
    const data = await photonLookup("reverse", {
      lat: latitude.toFixed(5),
      lon: longitude.toFixed(5),
      radius: "5",
      limit: "1",
      lang: "en",
    });
    const place =
      data.features?.[0] &&
      normalizePhoton(data.features[0], { latitude, longitude });
    if (place) return { ...place, source: "photon" };
  } catch {
    /* Country fallback preserves the clicked point without inventing a city. */
  }
  const country = countryAtPoint(latitude, longitude);
  return {
    name: country || "Open water or unmapped area",
    country,
    latitude,
    longitude,
    type: country ? "country" : "region",
    bookable: false,
    source: "country-outline",
  };
}
