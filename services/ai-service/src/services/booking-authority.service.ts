import { TripModel } from "../db/models/trip.model.js";
import { destinationKey } from "../utils/destination.js";
import type { AuthUser } from "../middleware/auth.middleware.js";
export async function validateBookingTrip(
  user: AuthUser,
  reservation: { tripId?: string; travelMode?: string; destination: string },
) {
  if (reservation.destination.trim().toLowerCase() === "destination undecided")
    throw Object.assign(new Error("Choose a destination before booking."), {
      statusCode: 400,
    });
  if (!reservation.tripId) {
    if (reservation.travelMode === "group")
      throw Object.assign(
        new Error("Select your group workspace before booking."),
        { statusCode: 400 },
      );
    return;
  }
  const trip = await TripModel.findOne({ id: reservation.tripId });
  if (!trip || trip.ownerId !== user.id)
    throw Object.assign(
      new Error("Only the trip leader can book for this group."),
      { statusCode: 403 },
    );
  if (trip.lifecycle === "completed")
    throw Object.assign(
      new Error("This trip is completed. Create a new journey before booking."),
      { statusCode: 409 },
    );
  if (reservation.travelMode && reservation.travelMode !== trip.travelMode)
    throw Object.assign(
      new Error("Booking mode must match the selected trip."),
      { statusCode: 400 },
    );
  if (
    destinationKey(trip.destination) !== destinationKey(reservation.destination)
  )
    throw Object.assign(
      new Error("Booking destination must match the group destination."),
      { statusCode: 400 },
    );
}
