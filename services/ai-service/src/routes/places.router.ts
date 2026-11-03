import { Router } from "express";
import { z } from "zod";
import {
  lookupPoint,
  photonLookup,
  normalizePhoton,
} from "../services/place-lookup.service.js";
export const placesRouter = Router();
placesRouter.get("/reverse", async (req, res, next) => {
  try {
    const { lat, lon } = z
      .object({
        lat: z.coerce.number().finite().min(-90).max(90),
        lon: z.coerce.number().finite().min(-180).max(180),
      })
      .parse(req.query);
    res.json({ location: await lookupPoint(lat, lon) });
  } catch (error) {
    next(error);
  }
});
placesRouter.get("/search", async (req, res, next) => {
  try {
    const query = z.string().trim().min(3).max(160).parse(req.query.q);
    const data = await photonLookup("api", {
      q: query,
      limit: "5",
      lang: "en",
    });
    res.json({
      locations: (data.features || [])
        .map((feature) => normalizePhoton(feature))
        .filter(Boolean),
    });
  } catch (error) {
    next(error);
  }
});
