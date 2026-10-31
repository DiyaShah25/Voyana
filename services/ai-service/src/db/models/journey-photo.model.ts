import mongoose, { Schema } from "mongoose";
const schema = new Schema(
  {
    id: { type: String, unique: true, required: true },
    tripId: { type: String, index: true, required: true },
    uploadedBy: String,
    dataUrl: { type: String, required: true },
    caption: String,
  },
  { timestamps: true },
);
export const JourneyPhotoModel =
  mongoose.models.JourneyPhoto || mongoose.model("JourneyPhoto", schema);
const inviteSchema = new Schema(
  {
    id: { type: String, unique: true },
    tripId: { type: String, index: true },
    email: String,
    status: { type: String, default: "pending" },
    error: String,
  },
  { timestamps: true },
);
export const TripInvitationModel =
  mongoose.models.TripInvitation ||
  mongoose.model("TripInvitation", inviteSchema);
