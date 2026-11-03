import { useEffect, useState } from "react";
import { Users, UserRound, X } from "lucide-react";
import { apiRequest } from "@/services/apiClient";
import type { Trip } from "@/services/tripService";
export default function BookingModeDialog({
  userId,
  destination,
  onContinue,
  onGroups,
  onClose,
}: {
  userId: string;
  destination: string;
  onContinue: (trip?: Trip) => void;
  onGroups: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"solo" | "group">("solo");
  const [groups, setGroups] = useState<Trip[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setLoading(true);
    setError("");
    void apiRequest<{ trips: Trip[] }>("/api/trips", {}, 15000).then((result) => {
      setLoading(false);
      if (!result.ok) setError(result.error || "Groups could not be loaded.");
      else
        setGroups(
          (result.data?.trips || []).filter(
            (trip) =>
              trip.travelMode === "group" && trip.lifecycle !== "completed",
          ),
        );
    });
  }, [retry]);
  const group = groups.find((trip) => trip.id === selected);
  return (
    <div className="fixed inset-0 z-[1200] bg-slate-950/60 flex items-center justify-center p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-mode-title"
        className="bg-white text-slate-900 w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-3xl p-5 sm:p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="booking-mode-title" className="text-xl sm:text-2xl font-bold">
            Who are you traveling with?
          </h2>
          <button className="shrink-0 p-1 text-slate-600" onClick={onClose} aria-label="Close booking mode">
            <X />
          </button>
        </div>
        <p className="text-slate-600 mt-2">
          Choose how to book your trip to {destination}.
        </p>
        <div className="grid grid-cols-2 gap-3 my-5">
          {(["solo", "group"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={`border-2 rounded-2xl p-3 sm:p-5 text-left min-w-0 text-slate-900 ${mode === value ? "border-emerald-700 bg-emerald-50" : "border-slate-200"}`}
            >
              {value === "solo" ? <UserRound /> : <Users />}
              <strong className="block mt-2">
                {value === "solo" ? "Solo traveler" : "Group traveler"}
              </strong>
              <span className="text-xs text-slate-600">
                {value === "solo"
                  ? "Your bookings, budget and memories."
                  : "The leader books. Everyone plans together."}
              </span>
            </button>
          ))}
        </div>
        {mode === "group" && (
          <div className="grid gap-3">
            <label className="text-sm font-semibold">
              Group workspace
              <select
                aria-label="Group workspace"
                disabled={loading}
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
                className="block w-full min-w-0 bg-white text-slate-900 border border-slate-300 rounded-xl p-3 mt-1"
              >
                <option value="">{loading ? "Loading your groups…" : "Choose a group"}</option>
                {groups.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.title} ·{" "}
                    {trip.ownerId === userId ? "Leader" : "Member"} ·{" "}
                    {trip.destination}
                  </option>
                ))}
              </select>
            </label>
            {group?.ownerId !== userId && group && (
              <p role="status" className="text-amber-800">
                Only this group’s leader can book. You can discuss plans and
                view reservations in its workspace.
              </p>
            )}
            {groups.length === 0 && !loading && !error && <p className="text-sm text-slate-600">Create a group workspace, invite your friends, and select its destination before booking.</p>}
            <button
              className="text-emerald-800 underline text-sm text-left"
              onClick={onGroups}
            >
              Create or manage a group workspace
            </button>
          </div>
        )}
        {error && <div role="alert" className="text-sm text-red-700 mt-3">{error} <button className="underline font-semibold" onClick={() => setRetry(value => value + 1)}>Retry loading groups</button></div>}
        <button
          disabled={
            mode === "group" &&
            (!group ||
              group.ownerId !== userId ||
              group.destination.toLowerCase() !== destination.toLowerCase())
          }
          onClick={() => onContinue(mode === "group" ? group : undefined)}
          className="bg-emerald-700 text-white w-full rounded-xl p-3 mt-5 font-semibold disabled:opacity-40"
        >
          Continue {mode === "solo" ? "solo" : "with group"}
        </button>
        {mode === "group" &&
          group &&
          group.destination.toLowerCase() !== destination.toLowerCase() && (
            <p className="text-sm mt-2">
              Choose {group.destination} on the globe, or update the group
              destination before booking.
            </p>
          )}
      </section>
    </div>
  );
}
