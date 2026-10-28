import { useEffect, useState } from "react";
import { MessageSquare, Plus, Users, X } from "lucide-react";
import { apiRequest } from "@/services/apiClient";
import type { Trip } from "@/services/tripService";

export default function WorkspaceLobby({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (trip: Trip) => void;
}) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [mode, setMode] = useState<"solo" | "group">("group");
  const [destination, setDestination] = useState("");
  const [title, setTitle] = useState("");
  const [emails, setEmails] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void apiRequest<{ trips: Trip[] }>("/api/trips").then((result) => {
      if (!active) return;
      if (result.ok)
        setTrips((result.data?.trips || []).filter((trip) => !trip.isTemplate));
      else setError(result.error || "Could not load workspaces.");
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [retry]);
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const today = new Date().toISOString().slice(0, 10);
    const result = await apiRequest<{ trip: Trip }>("/api/trips", {
      method: "POST",
      body: JSON.stringify({
        travelMode: mode,
        title: title.trim(),
        destination: destination.trim() || "Destination undecided",
        startDate: today,
        endDate: today,
        description:
          "Discuss destinations and decide your travel plans together. Dates are provisional.",
        currency: "INR",
        visibility: "private",
        invitedEmails:
          mode === "group"
            ? emails
                .split(",")
                .map((email) => email.trim())
                .filter(Boolean)
            : [],
      }),
    });
    setBusy(false);
    if (result.ok && result.data?.trip) onOpen(result.data.trip);
    else setError(result.error || "Could not create workspace.");
  };
  return (
    <div className="fixed inset-0 z-[1100] bg-slate-950/50 flex items-center justify-center p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-lobby-title"
        className="bg-white text-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-700 font-bold">
              Voyana · trip pe aana
            </p>
            <h2 id="workspace-lobby-title" className="text-2xl font-bold mt-2">
              Your people. Your next plan.
            </h2>
          </div>
          <button aria-label="Close workspaces" onClick={onClose}>
            <X />
          </button>
        </div>
        <p className="text-slate-600 mt-3">
          Start with a conversation. Invite your group, discuss destinations and
          vote on where to go. No destination or booking required.
        </p>
        {error && (
          <div role="alert" className="text-red-700 mt-3">
            {error}
            <button
              className="ml-3 underline"
              onClick={() => setRetry((value) => value + 1)}
            >
              Retry loading workspaces
            </button>
          </div>
        )}
        <form
          onSubmit={create}
          className="my-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 grid gap-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              aria-pressed={mode === "solo"}
              onClick={() => setMode("solo")}
              className={`border-2 p-3 rounded-xl ${mode === "solo" ? "border-emerald-700 bg-white" : "border-transparent"}`}
            >
              Solo traveler
            </button>
            <button
              type="button"
              aria-pressed={mode === "group"}
              onClick={() => setMode("group")}
              className={`border-2 p-3 rounded-xl ${mode === "group" ? "border-emerald-700 bg-white" : "border-transparent"}`}
            >
              Group traveler
            </button>
          </div>
          <label className="text-sm font-semibold">
            Destination {mode === "group" ? "(decide together later)" : ""}
            <input
              required={mode === "solo"}
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="Ahmedabad, Bali, Paris…"
              className="block w-full border rounded-xl p-3 mt-1 bg-white"
            />
          </label>
          <label className="text-sm font-semibold">
            Workspace name
            <input
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Our next adventure"
              className="block w-full border rounded-xl p-3 mt-1 bg-white"
            />
          </label>
          {mode === "group" && (
            <label className="text-sm font-semibold">
              Invite by email (optional)
              <input
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="friend@example.com, another@example.com"
                className="block w-full border rounded-xl p-3 mt-1 bg-white"
              />
            </label>
          )}
          <p className="text-xs text-slate-600">
            Invited people can open this workspace after signing in with that
            email. Email delivery is pending until a sender is configured; a
            share link is available in the trip dashboard.
          </p>
          <button
            disabled={busy}
            className="bg-emerald-700 text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            {busy ? "Creating…" : "Create planning workspace"}
          </button>
        </form>
        <h3 className="font-semibold flex items-center gap-2">
          <Users size={18} /> Your workspaces
        </h3>
        {loading ? (
          <p role="status" className="mt-3">
            Loading workspaces…
          </p>
        ) : trips.length === 0 ? (
          <p className="text-slate-500 mt-3">
            Create your first space and start the conversation.
          </p>
        ) : (
          <div className="grid gap-3 mt-3">
            {trips.map((trip) => (
              <button
                key={trip.id}
                onClick={() => onOpen(trip)}
                className="text-left border rounded-xl p-4 hover:border-emerald-600 flex items-center gap-3"
              >
                <MessageSquare
                  className="text-emerald-700 shrink-0"
                  size={22}
                />
                <span>
                  <strong className="block">{trip.title}</strong>
                  <span className="text-sm text-slate-500">
                    {trip.destination} · {trip.members?.length || 1} people
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
