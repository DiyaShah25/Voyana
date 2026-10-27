import { useEffect, useState } from "react";
import { X, Check, Package } from "lucide-react";
import {
  calculateBundlePricing,
  processUnifiedBundleCheckout,
  searchIntegratedOffers,
  type BundledBookingItem,
  type UnifiedBundleBookingResult,
  type BundleSearchOptions,
} from "@/services/bookingIntegrationService";
import { AIRPORTS, resolveAirportCode } from "@/services/flightService";
import { getPlanningContext } from "@/services/planningContext";
import { formatMoney } from "@/services/money";
import type { TransportItem } from "@/services/transportService";
import type { Hotel } from "@/services/hotelService";
import BookingImage from "./BookingImage";
export interface UnifiedBundleBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: string;
  currentUser: { id?: string; name: string; email: string };
  onBookingConfirmed?: (result: UnifiedBundleBookingResult) => void;
}
const bounded = (value: string, max: number) =>
  Math.min(max, Math.max(1, Math.floor(Number(value) || 1)));
export default function UnifiedBundleBookingModal({
  isOpen,
  onClose,
  destination,
  currentUser,
  onBookingConfirmed,
}: UnifiedBundleBookingModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const context = getPlanningContext();
  const [date, setDate] = useState(
    context.trip?.startDate && context.trip.startDate >= today
      ? context.trip.startDate
      : new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  );
  const [origin, setOrigin] = useState(
    resolveAirportCode(destination) === "DEL" ? "BOM" : "DEL",
  );
  const [passengers, setPassengers] = useState(
    context.trip?.travelMode === "group"
      ? Math.min(20, Math.max(1, context.members.length))
      : 1,
  );
  const [rooms, setRooms] = useState(Math.ceil(passengers / 2));
  const [nights, setNights] = useState(3);
  const [tier, setTier] = useState<BundleSearchOptions["tier"]>("essential");
  const [items, setItems] = useState<BundledBookingItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<UnifiedBundleBookingResult | null>(
    null,
  );
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void searchIntegratedOffers(destination, date, {
      originCode: origin,
      passengers,
      rooms,
      nights,
      tier,
    })
      .then((offers) => {
        if (!cancelled) {
          const result = offers[0]?.items || [];
          setItems(result);
          setSelected(result.map((item) => item.id));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not price this package. Please try again.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [destination, date, origin, passengers, rooms, nights, tier]);
  if (!isOpen) return null;
  const chosen = items.filter((item) => selected.includes(item.id));
  const pricing = calculateBundlePricing(chosen);
  const checkout = async () => {
    setProcessing(true);
    setError("");
    try {
      const result = await processUnifiedBundleCheckout({
        userId: currentUser.id || "",
        customerName: currentUser.name,
        customerEmail: currentUser.email,
        items: chosen,
        paymentMethod: "card",
      });
      if (!result.success)
        throw new Error(result.error || "The package could not be confirmed.");
      setSuccess(result);
      onBookingConfirmed?.(result);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Booking failed.");
    } finally {
      setProcessing(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <section
        className="workflow-bundle-dialog booking-package-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Destination travel bundle"
      >
        <header>
          <div>
            <Package />
            <h2>{destination} travel package</h2>
          </div>
          <button aria-label="Close bundle" onClick={onClose}>
            <X />
          </button>
        </header>
        {success ? (
          <div role="status">
            <Check />
            <h3>Package confirmed</h3>
            <p>{success.bundleReference}</p>
            <p>
              Paid {formatMoney(success.finalPaidAmount, "INR")}. Your trip and
              expense ledger are ready.
            </p>
            <button className="workflow-primary" onClick={onClose}>
              Continue to my trip
            </button>
          </div>
        ) : (
          <>
            <p className="workflow-hint">
              Build your package for {destination}. Prices below reflect your
              selected dates, class and quantities. Sample inventory; payments
              use test money.
            </p>
            <fieldset
              disabled={processing}
              className="booking-package-controls"
            >
              <label>
                Departure airport
                <select
                  aria-label="Package departure airport"
                  value={origin}
                  onChange={(event) => setOrigin(event.target.value)}
                >
                  {Object.values(AIRPORTS)
                    .filter(
                      (airport) =>
                        airport.code !== resolveAirportCode(destination),
                    )
                    .map((airport) => (
                      <option key={airport.code} value={airport.code}>
                        {airport.city} ({airport.code})
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Travel date
                <input
                  aria-label="Package travel date"
                  type="date"
                  min={today}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>
              <label>
                Package tier
                <select
                  aria-label="Package tier"
                  value={tier}
                  onChange={(event) =>
                    setTier(event.target.value as BundleSearchOptions["tier"])
                  }
                >
                  <option value="essential">
                    Essential · Economy + Standard room
                  </option>
                  <option value="comfort">
                    Comfort · Premium economy + Deluxe
                  </option>
                  <option value="premium">Premium · Business + Suite</option>
                </select>
              </label>
              <label>
                Travelers
                <input
                  aria-label="Package travelers"
                  type="number"
                  min={1}
                  max={20}
                  value={passengers}
                  onChange={(event) => {
                    const count = bounded(event.target.value, 20);
                    setPassengers(count);
                    setRooms(Math.ceil(count / 2));
                  }}
                />
              </label>
              <label>
                Nights
                <input
                  aria-label="Package nights"
                  type="number"
                  min={1}
                  max={60}
                  value={nights}
                  onChange={(event) =>
                    setNights(bounded(event.target.value, 60))
                  }
                />
              </label>
              <label>
                Rooms
                <input
                  aria-label="Package rooms"
                  type="number"
                  min={1}
                  max={20}
                  value={rooms}
                  onChange={(event) =>
                    setRooms(bounded(event.target.value, 20))
                  }
                />
              </label>
            </fieldset>
            {loading ? (
              <p role="status">Updating your package price…</p>
            ) : !items.length ? (
              <p role="status">
                This combination is unavailable. Try a different departure,
                class or traveler count, or book individual services.
              </p>
            ) : (
              <>
                <div className="booking-package-items">
                  {items.map((item) => {
                    const transport = item.details.transport as
                      | TransportItem
                      | undefined;
                    const hotel = item.details.hotel as Hotel | undefined;
                    return (
                      <label className="booking-package-item" key={item.id}>
                        <input
                          aria-label={`Include ${item.type}`}
                          type="checkbox"
                          checked={selected.includes(item.id)}
                          disabled={processing}
                          onChange={() =>
                            setSelected((previous) =>
                              previous.includes(item.id)
                                ? previous.filter((id) => id !== item.id)
                                : [...previous, item.id],
                            )
                          }
                        />
                        <BookingImage
                          kind={
                            item.type === "flight"
                              ? "flight"
                              : item.type === "hotel"
                                ? "hotel"
                                : transport!.transportType
                          }
                          src={hotel?.imageUrl || transport?.imageUrl}
                          className="booking-package-photo"
                        />
                        <span className="booking-package-item-copy">
                          <strong>{item.title}</strong>
                          <small>{item.subTitle}</small>
                          <small>{item.priceBasis}</small>
                        </span>
                        <strong data-package-price={item.type}>
                          {formatMoney(item.price, "INR")}
                        </strong>
                      </label>
                    );
                  })}
                </div>
                <div className="workflow-bundle-total">
                  <p>
                    Selected services subtotal
                    <strong>{formatMoney(pricing.subtotal, "INR")}</strong>
                  </p>
                  <p>
                    Package savings ({pricing.discountPercentage}%)
                    <strong>
                      −{formatMoney(pricing.discountAmount, "INR")}
                    </strong>
                  </p>
                  <p>
                    Demo service charge (5%)
                    <strong>{formatMoney(pricing.taxAmount, "INR")}</strong>
                  </p>
                  <p>
                    Total for your package
                    <strong data-testid="package-total">
                      {formatMoney(pricing.totalAmount, "INR")}
                    </strong>
                  </p>
                  <button
                    className="workflow-primary"
                    disabled={processing || !chosen.length}
                    onClick={() => void checkout()}
                  >
                    {processing
                      ? "Opening checkout…"
                      : `Continue to payment · ${formatMoney(pricing.totalAmount, "INR")}`}
                  </button>
                </div>
              </>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
