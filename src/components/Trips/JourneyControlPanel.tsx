import { bookingServiceName, bookingStatusLabel } from '@/services/bookingStatus';
import { resolveLocation } from "@/services/locationService";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/services/apiClient";
import type { Trip } from "@/services/tripService";
import { formatMoney } from "@/services/money";
type Expense = {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
};
type Snapshot = {
  trip: Trip;
  bookings: {
    id: string;
    bookingReference: string;
    bookingType: string;
    transportDetails?: { transportType: string };
    totalAmount: number;
    currency: string;
    status: string;
  }[];
  budget?: { expenses: Expense[] };
  photos: { id: string; caption?: string }[];
  invitations: { email: string; status: string }[];
  emailConfigured: boolean;
};
export type JourneyBookingService = "flight" | "hotel" | "transport" | "bundle";
async function preparePhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose JPEG, PNG or WebP photos.");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Each original photo must be smaller than 20 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const result = canvas.toDataURL("image/jpeg", 0.8);
  if (result.length > 1400000)
    throw new Error(
      "This photo is too large after resizing. Try a smaller image.",
    );
  return result;
}
export default function JourneyControlPanel({
  trip,
  user,
  onChange,
  onBook,
}: {
  trip: Trip;
  user: { id?: string; name: string; email: string };
  onChange: (trip: Trip) => void;
  onBook?: (service: JourneyBookingService) => void;
}) {
  const [data, setData] = useState<Snapshot>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [destination, setDestination] = useState(trip.destination);
  const [start, setStart] = useState(trip.startDate);
  const [end, setEnd] = useState(trip.endDate);
  const [invite, setInvite] = useState("");
  const [question, setQuestion] = useState("");
  const [expenseTitle, setExpenseTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [editing, setEditing] = useState("");
  const [images, setImages] = useState<Record<string, string>>({});
  const changed = useRef(onChange);
  changed.current = onChange;
  const lastTrip = useRef("");
  const load = useCallback(async () => {
    const result = await apiRequest<Snapshot>(
      `/api/journeys/${encodeURIComponent(trip.id)}`,
    );
    if (!result.ok) {
      setError(result.error || "Could not refresh trip.");
      return;
    }
    const next = result.data!;
    next.trip.hasConfirmedBooking = next.bookings.some(
      (booking) => booking.status === "confirmed",
    );
    setData(next);
    const serialized = JSON.stringify(next.trip);
    if (serialized !== lastTrip.current) {
      lastTrip.current = serialized;
      changed.current(next.trip);
    }
  }, [trip.id]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [load]);
  const current = data?.trip || trip;
  const leader =
    current.ownerId === user.id ||
    current.members?.some(
      (member) => member.role === "owner" && member.email === user.email,
    );
  const viewer = current.members?.some(
    (member) => member.email === user.email && member.role === "viewer",
  );
  const completed = current.lifecycle === "completed";
  const booked = Boolean(
    data?.bookings.some((booking) => booking.status === "confirmed"),
  );
  const request = async (path: string, body: unknown, method = "POST") => {
    const result = await apiRequest<Record<string, unknown>>(
      path,
      { method, body: method === "GET" ? undefined : JSON.stringify(body) },
      65000,
    );
    if (!result.ok) throw new Error(result.error || "Request failed.");
    return result.data!;
  };
  const action = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      await load();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const base = `/api/journeys/${encodeURIComponent(trip.id)}`;
  const expenseBase = `/api/budget/${encodeURIComponent(trip.id)}/expenses`;
  return (
    <section className="journey-control-panel" aria-label="Trip management">
      <div className="journey-status-line">
        <strong>
          {current.travelMode === "solo" ? "Solo traveler" : "Group traveler"}
        </strong>
        <span>
          {leader
            ? current.travelMode === "solo"
              ? "Your private trip"
              : "You are the group leader"
            : "Group member · bookings managed by the leader"}
        </span>
        <span className="journey-status">
          {current.lifecycle || "planning"}
        </span>
      </div>
      {error && (
        <p role="alert" className="journey-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="journey-notice">
          {notice}
        </p>
      )}
      <details open>
        <summary>Destination, dates and booking</summary>
        <div className="journey-fields">
          <label>
            Destination
            <input
              aria-label="Trip destination"
              value={leader ? destination : current.destination}
              onChange={(event) => setDestination(event.target.value)}
              disabled={!leader || completed}
            />
          </label>
          <label>
            Start date
            <input
              type="date"
              value={leader ? start : current.startDate}
              onChange={(event) => setStart(event.target.value)}
              disabled={!leader || completed}
            />
          </label>
          <label>
            End date
            <input
              type="date"
              value={leader ? end : current.endDate}
              onChange={(event) => setEnd(event.target.value)}
              disabled={!leader || completed}
            />
          </label>
        </div>
        {leader && !completed && (
          <button
            disabled={busy}
            onClick={() =>
              void action(async () => {
                const location = await resolveLocation(destination);
                if (
                  !location ||
                  ["country", "state"].includes(location.type || "")
                )
                  throw new Error(
                    "Choose a city or destination that can be located on the globe.",
                  );
                await request(
                  `${base}/plan`,
                  {
                    destination: location.name,
                    startDate: start,
                    endDate: end,
                  },
                  "PATCH",
                );
                setDestination(location.name);
                setNotice("Trip plan saved.");
              })
            }
          >
            Save trip plan
          </button>
        )}
        <div className="journey-book-actions">
          {(["flight", "hotel", "transport", "bundle"] as const).map(
            (service) => (
              <button
                key={service}
                disabled={
                  !leader ||
                  completed ||
                  busy ||
                  current.destination === "Destination undecided"
                }
                onClick={() => onBook?.(service)}
              >
                {service === "transport"
                  ? "Trains, buses & cabs"
                  : service === "flight"
                    ? "Flights"
                    : service === "hotel"
                      ? "Hotels"
                      : "Travel bundle"}
              </button>
            ),
          )}
        </div>
        <p className="journey-muted">
          {current.travelMode === "group"
            ? "Only the leader can book or cancel group reservations. Every member can view confirmations below."
            : "Choose your destination before booking. Your confirmed expenses stay with this trip."}
        </p>
        {data?.bookings.map((booking) => (
          <div className="journey-row" key={booking.id}>
            <span>
              {bookingServiceName(booking)} booking: {bookingStatusLabel(booking)} · {booking.bookingReference}
            </span>
            <strong>
              {formatMoney(booking.totalAmount, booking.currency)}
            </strong>
          </div>
        ))}
        {leader && booked && !completed && (
          <button
            className="journey-secondary"
            disabled={busy}
            onClick={() =>
              void action(async () => {
                await request(`${base}/plan`, { complete: true }, "PATCH");
                setNotice("Trip completed. You can now upload memory photos.");
              })
            }
          >
            Mark trip completed
          </button>
        )}
      </details>
      {current.travelMode === "group" && (
        <details>
          <summary>People, invitations and AI suggestions</summary>
          <div className="journey-members">
            {current.members?.map((member) => (
              <span key={member.id}>
                {member.name} ·{" "}
                {member.userId === current.ownerId || member.role === "owner"
                  ? "Leader"
                  : "Member"}
              </span>
            ))}
          </div>
          {leader && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void action(async () => {
                  const result = await request(`${base}/invitations`, {
                    email: invite,
                  });
                  setInvite("");
                  setNotice(
                    result.status === "sent"
                      ? "Invitation email sent."
                      : `${result.message} Link: ${result.link}`,
                  );
                });
              }}
              className="journey-inline"
            >
              <input
                type="email"
                required
                placeholder="friend@example.com"
                aria-label="Invite member email"
                value={invite}
                onChange={(event) => setInvite(event.target.value)}
              />
              <button disabled={busy}>Invite member</button>
            </form>
          )}
          {!data?.emailConfigured && (
            <p className="journey-muted">
              Email delivery needs an email sender. Members can sign in with
              their invited email and open the shared link now.
            </p>
          )}
          {data?.invitations.map((item, index) => (
            <p className="journey-muted" key={index}>
              {item.email} · email {item.status}
            </p>
          ))}
          <form
            className="journey-inline"
            onSubmit={(event) => {
              event.preventDefault();
              void action(async () => {
                await request(`${base}/suggestions`, { question });
                setQuestion("");
                setNotice("VoyaBot posted its suggestion in Group Chat.");
              });
            }}
          >
            <input
              aria-label="Ask group AI"
              placeholder="Ask AI where to go, what to do or how to plan…"
              required
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button disabled={busy || viewer}>Ask VoyaBot</button>
          </form>
        </details>
      )}
      {booked && (
        <details>
          <summary>
            {current.travelMode === "solo"
              ? "Personal expense tracker"
              : "Shared expense tracker"}{" "}
            ·{" "}
            {formatMoney(
              (data?.budget?.expenses || []).reduce(
                (total, item) => total + item.amount,
                0,
              ),
              current.currency,
            )}
          </summary>
          <p className="journey-muted">
            Changes sync every five seconds and notify everyone in this trip.
          </p>
          <form
            className="journey-inline"
            onSubmit={(event) => {
              event.preventDefault();
              void action(async () => {
                const body = {
                  title: expenseTitle,
                  amount: Number(amount),
                  paidBy: user.name,
                  splitAmong: current.members?.map((member) => member.name) || [
                    user.name,
                  ],
                  currency: current.currency,
                };
                await request(
                  editing ? `${expenseBase}/${editing}` : expenseBase,
                  body,
                  editing ? "PATCH" : "POST",
                );
                setEditing("");
                setExpenseTitle("");
                setAmount("");
              });
            }}
          >
            <input
              aria-label="Expense title"
              placeholder="Expense description"
              required
              value={expenseTitle}
              onChange={(event) => setExpenseTitle(event.target.value)}
            />
            <input
              aria-label="Expense amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="₹ Amount"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <button disabled={busy || viewer}>
              {editing ? "Save expense" : "Add expense"}
            </button>
          </form>
          {data?.budget?.expenses.map((expense) => (
            <div className="journey-row" key={expense.id}>
              <span>
                {expense.title}
                <small>
                  Paid by {expense.paidBy} · split{" "}
                  {expense.splitAmong?.length || 1} ways
                </small>
              </span>
              <strong>{formatMoney(expense.amount, current.currency)}</strong>
              {!expense.id.startsWith("booking-") && (
                <>
                  <button
                    disabled={busy || viewer}
                    onClick={() => {
                      setEditing(expense.id);
                      setExpenseTitle(expense.title);
                      setAmount(String(expense.amount));
                    }}
                  >
                    Edit
                  </button>
                  <button
                    disabled={busy || viewer}
                    className="journey-danger"
                    onClick={() =>
                      void action(async () => {
                        await request(
                          `${expenseBase}/${expense.id}`,
                          {},
                          "DELETE",
                        );
                      })
                    }
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}
        </details>
      )}
      <details open={completed}>
        <summary>
          AI travel memories · {current.photoCount || 0}/50 photos
        </summary>
        {!completed ? (
          <p className="journey-muted">
            After your trip is completed, upload up to 50 photos. AI will write
            captions and create the trip journal for you.
          </p>
        ) : (
          <>
            <p className="journey-muted">
              Upload photos only. AI creates the captions and journal. For a
              group, the limit is 50 photos in total. Photos are resized and
              sent to the configured AI provider when you generate memories.
            </p>
            <input
              aria-label="Upload memory photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={
                busy ||
                viewer ||
                current.albumStatus === "generating" ||
                (current.photoCount || 0) >= 50
              }
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                event.target.value = "";
                void action(async () => {
                  if (files.length + (current.photoCount || 0) > 50)
                    throw new Error(
                      "Choose fewer photos. This trip has a shared limit of 50.",
                    );
                  let count = 0;
                  for (const file of files) {
                    await request(`${base}/photos`, {
                      dataUrl: await preparePhoto(file),
                    });
                    setNotice(`Uploaded ${++count} of ${files.length} photos.`);
                  }
                  setNotice(
                    "Photos saved. Generate your AI travel memories when ready.",
                  );
                });
              }}
            />
            <button
              disabled={
                busy ||
                viewer ||
                !current.photoCount ||
                current.albumStatus === "generating"
              }
              onClick={() =>
                void action(async () => {
                  await request(`${base}/album`, {});
                  setNotice(
                    "AI is creating your memories. You can leave this workspace; a notification will appear when ready.",
                  );
                })
              }
            >
              {current.albumStatus === "generating"
                ? "AI is creating your memories…"
                : "Generate AI travel memories"}
            </button>
            {current.albumError && (
              <p role="alert" className="journey-error">
                {current.albumError} Your photos remain saved; retry generation.
              </p>
            )}
            {current.albumStory && (
              <article className="journey-story">
                <h3>Your AI travel journal</h3>
                <p>{current.albumStory}</p>
              </article>
            )}
            <div className="journey-photo-grid">
              {data?.photos.map((photo) => (
                <article key={photo.id}>
                  {images[photo.id] ? (
                    <img
                      src={images[photo.id]}
                      alt={photo.caption || "Trip photo"}
                    />
                  ) : (
                    <button
                      onClick={() =>
                        void action(async () => {
                          const result = await request(
                            `${base}/photos/${photo.id}`,
                            undefined,
                            "GET",
                          );
                          setImages((previous) => ({
                            ...previous,
                            [photo.id]: String(result.dataUrl),
                          }));
                        })
                      }
                    >
                      View photo
                    </button>
                  )}
                  <p>{photo.caption || "Waiting for AI caption"}</p>
                </article>
              ))}
            </div>
          </>
        )}
      </details>
    </section>
  );
}
