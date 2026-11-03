import { randomUUID } from "crypto";
import { TripModel } from "../db/models/trip.model.js";
import { UserModel } from "../db/models/user.model.js";
import { AlertModel } from "../db/models/alert.model.js";
export async function notifyTrip(
  tripId: string,
  title: string,
  message: string,
  eventId: string = randomUUID(),
) {
  const trip = await TripModel.findOne({ id: tripId });
  if (!trip) return;
  const users = await UserModel.find({
    $or: [
      { id: trip.ownerId },
      { email: { $in: trip.members.map((member) => member.email) } },
    ],
  });
  for (const user of users)
    await AlertModel.updateOne(
      { id: `${eventId}-${user.id}` },
      {
        $setOnInsert: {
          id: `${eventId}-${user.id}`,
          user_id: user.id,
          title,
          message,
          severity: "info",
          new_status: "confirmed",
          is_read: false,
        },
      },
      { upsert: true },
    );
}
