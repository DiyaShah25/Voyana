import { TripInvitationModel } from "../db/models/journey-photo.model.js";
import { randomUUID } from "crypto";
export async function deliverInvitation(
  tripId: string,
  email: string,
  title: string,
) {
  const invitation = await TripInvitationModel.create({
    id: randomUUID(),
    tripId,
    email,
    status: "pending",
  });
  const origin = (
    process.env.PUBLIC_APP_URL || "http://localhost:5173"
  ).replace(/\/$/, "");
  const link = `${origin}/#/trip-share?tripId=${encodeURIComponent(tripId)}`;
  if (!process.env.RESEND_API_KEY || !process.env.INVITATION_FROM)
    return {
      status: "pending",
      link,
      message:
        "Email sender is not configured. Share this invitation link directly.",
    };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.INVITATION_FROM,
        to: [email],
        subject: `Join ${title} on Voyana`,
        text: `You have been invited to plan a trip together on Voyana. Sign in using ${email}, then open ${link}`,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("Email provider rejected delivery.");
    invitation.status = "sent";
    await invitation.save();
    return { status: "sent", link };
  } catch {
    invitation.status = "failed";
    await invitation.save();
    return {
      status: "failed",
      link,
      message:
        "Email delivery failed. Share the link or retry after configuring the sender.",
    };
  }
}
