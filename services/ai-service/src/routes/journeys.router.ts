import { pendingBookings } from '../services/pending-bookings.service.js';
import { UserModel } from "../db/models/user.model.js";
import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { TripModel } from "../db/models/trip.model.js";
import { BookingModel } from "../db/models/booking.model.js";
import { BudgetModel } from "../db/models/budget.model.js";
import {
  JourneyPhotoModel,
  TripInvitationModel,
} from "../db/models/journey-photo.model.js";
import { requireTripMember } from "../middleware/booked-trip.middleware.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { notifyTrip } from "../services/trip-notifications.service.js";
import { deliverInvitation } from "../services/invitation-mail.service.js";
import {
  generateJourneyAlbum,
  journeyAI,
} from "../services/journey-ai.service.js";
export const journeysRouter = Router();
journeysRouter.use("/:tripId", requireTripMember);
journeysRouter.get("/:tripId", async (req: AuthenticatedRequest, res, next) => {
  try {
    const trip = await TripModel.findOne({ id: req.params.tripId });
    const [bookings, budget, photos, invitations] = await Promise.all([
      BookingModel.find({ tripId: trip!.id }),
      BudgetModel.findOne({ id: trip!.id }),
      JourneyPhotoModel.find({ tripId: trip!.id }).select("-dataUrl"),
      TripInvitationModel.find({ tripId: trip!.id }).select("email status"),
    ]);
    res.json({
      trip,
      bookings: [...bookings, ...await pendingBookings({ 'reservation.tripId': trip!.id })],
      budget,
      photos,
      invitations,
      emailConfigured: Boolean(
        process.env.RESEND_API_KEY && process.env.INVITATION_FROM,
      ),
    });
  } catch (error) {
    next(error);
  }
});
journeysRouter.patch(
  "/:tripId/plan",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const trip = await TripModel.findOne({ id: req.params.tripId });
      if (trip!.ownerId !== req.user!.id) {
        res
          .status(403)
          .json({
            message:
              "Only the leader can choose the destination or complete the trip.",
          });
        return;
      }
      if (trip!.lifecycle === "completed") {
        res
          .status(409)
          .json({ message: "Completed trips cannot be replanned." });
        return;
      }
      const input = z
        .object({
          destination: z.string().trim().min(2).max(120).optional(),
          startDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
          endDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
          complete: z.boolean().optional(),
        })
        .parse(req.body);
      if (input.destination && input.destination !== trip!.destination) {
        if (
          await BookingModel.exists({
            tripId: trip!.id,
            status: "confirmed",
            paymentStatus: "paid",
          })
        ) {
          res
            .status(409)
            .json({
              message:
                "Cancel existing reservations before changing the destination.",
            });
          return;
        }
        trip!.destination = input.destination;
      }
      if (input.startDate) trip!.startDate = input.startDate;
      if (input.endDate) trip!.endDate = input.endDate;
      if (trip!.endDate < trip!.startDate) {
        res
          .status(400)
          .json({ message: "End date must follow the start date." });
        return;
      }
      if (input.complete) {
        if (
          !(await BookingModel.exists({
            tripId: trip!.id,
            status: "confirmed",
            paymentStatus: "paid",
          }))
        ) {
          res
            .status(409)
            .json({
              message: "Complete a booking before marking this trip complete.",
            });
          return;
        }
        trip!.lifecycle = "completed";
      }
      await trip!.save();
      await notifyTrip(
        trip!.id,
        input.complete ? "Trip completed" : "Trip plan updated",
        `${req.user!.name} ${input.complete ? "completed the trip. Upload photos to create your AI journal." : `updated the plan for ${trip!.destination}.`}`,
      );
      res.json({ trip });
    } catch (error) {
      next(error);
    }
  },
);
journeysRouter.post(
  "/:tripId/invitations",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const trip = await TripModel.findOne({ id: req.params.tripId });
      if (trip!.ownerId !== req.user!.id || trip!.travelMode === "solo") {
        res
          .status(403)
          .json({ message: "Only a group leader can invite members." });
        return;
      }
      const email = z.string().email().parse(req.body.email).toLowerCase();
      const account = await UserModel.findOne({ email });
      const name = account?.name || email.split("@")[0];
      await TripModel.updateOne(
        { id: trip!.id, "members.email": { $ne: email } },
        {
          $push: {
            members: {
              id: randomUUID(),
              userId: account?.id,
              name,
              email,
              role: "editor",
              joinedAt: new Date().toISOString(),
            },
          },
        },
      );
      await BudgetModel.updateOne(
        { id: trip!.id },
        { $addToSet: { members: name } },
      );
      const delivery = await deliverInvitation(trip!.id, email, trip!.title);
      await notifyTrip(
        trip!.id,
        "Group invitation",
        `${req.user!.name} invited ${email} to the group.`,
      );
      res.status(201).json(delivery);
    } catch (error) {
      next(error);
    }
  },
);
journeysRouter.post(
  "/:tripId/suggestions",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const trip = await TripModel.findOne({ id: req.params.tripId });
      const question = z
        .string()
        .trim()
        .min(2)
        .max(1500)
        .parse(req.body.question);
      const result = JSON.parse(
        await journeyAI(
          `Return JSON {"suggestion":"helpful travel planning advice, 150 words maximum"}. Group trip: ${trip!.title}, destination: ${trip!.destination}, dates: ${trip!.startDate} to ${trip!.endDate}. Traveler question: ${question}`,
        ),
      );
      if (typeof result.suggestion !== "string" || !result.suggestion.trim())
        throw new Error("AI did not return a suggestion.");
      const { ChatMessageModel } = await import(
        "../db/models/collaboration.model.js"
      );
      await ChatMessageModel.create({
        id: randomUUID(),
        tripId: trip!.id,
        senderId: "voyabot",
        senderName: "VoyaBot",
        message: String(result.suggestion),
        messageType: "text",
      });
      await notifyTrip(
        trip!.id,
        "VoyaBot shared a suggestion",
        String(result.suggestion).slice(0, 180),
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);
journeysRouter.post(
  "/:tripId/photos",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const trip = await TripModel.findOne({ id: req.params.tripId });
      if (trip!.lifecycle !== "completed") {
        res
          .status(409)
          .json({ message: "Finish the trip before uploading memory photos." });
        return;
      }
      const dataUrl = z
        .string()
        .max(1400000)
        .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/)
        .parse(req.body.dataUrl);
      const bytes = Buffer.from(dataUrl.split(",")[1], "base64");
      if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) {
        res.status(400).json({ message: "Upload a valid JPEG photo." });
        return;
      }
      const reserved = await TripModel.findOneAndUpdate(
        {
          id: trip!.id,
          photoCount: { $lt: 50 },
          albumStatus: { $ne: "generating" },
        },
        {
          $inc: { photoCount: 1 },
          $set: { albumStatus: "photos", albumStory: "" },
        },
        { new: true },
      );
      if (!reserved) {
        res
          .status(409)
          .json({
            message:
              "The trip already has 50 photos or AI generation is in progress.",
          });
        return;
      }
      const photoId = randomUUID();
      try {
        const photo = await JourneyPhotoModel.create({
          id: photoId,
          tripId: trip!.id,
          uploadedBy: req.user!.id,
          dataUrl,
        });
        await notifyTrip(
          trip!.id,
          "Trip photo uploaded",
          `${req.user!.name} added a photo (${reserved.photoCount}/50).`,
        );
        res.status(201).json({ id: photo.id, photoCount: reserved.photoCount });
      } catch (error) {
        if (!(await JourneyPhotoModel.exists({ id: photoId })))
          await TripModel.updateOne(
            { id: trip!.id },
            { $inc: { photoCount: -1 } },
          );
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },
);
journeysRouter.get("/:tripId/photos/:photoId", async (req, res, next) => {
  try {
    const photo = await JourneyPhotoModel.findOne({
      id: req.params.photoId,
      tripId: req.params.tripId,
    });
    if (!photo) {
      res.status(404).json({ message: "Photo not found." });
      return;
    }
    res.json({ dataUrl: photo.dataUrl, caption: photo.caption });
  } catch (error) {
    next(error);
  }
});
journeysRouter.post(
  "/:tripId/album",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const trip = await TripModel.findOne({ id: req.params.tripId });
      if (trip!.lifecycle !== "completed" || !trip!.photoCount) {
        res
          .status(409)
          .json({
            message: "Complete your trip and upload 1 to 50 photos first.",
          });
        return;
      }
      const locked = await TripModel.findOneAndUpdate(
        {
          id: trip!.id,
          $or: [
            { albumStatus: { $ne: "generating" } },
            { albumStartedAt: { $lt: new Date(Date.now() - 15 * 60000) } },
          ],
        },
        {
          $set: {
            albumStatus: "generating",
            albumError: "",
            albumStartedAt: new Date(),
          },
        },
        { new: true },
      );
      if (!locked) {
        res
          .status(409)
          .json({ message: "Your memories are already being generated." });
        return;
      }
      res.status(202).json({ status: "generating" });
      void generateJourneyAlbum(trip!.id);
    } catch (error) {
      next(error);
    }
  },
);
