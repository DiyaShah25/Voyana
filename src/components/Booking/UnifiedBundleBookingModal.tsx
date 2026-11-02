import { useEffect, useState } from "react";
import { X, Check, Package } from "lucide-react";
import {
  calculateBundlePricing,
  processUnifiedBundleCheckout,
  searchIntegratedOffers,
  type BundledBookingItem,
  type UnifiedBundleBookingResult
} from '@/services/bookingIntegrationService';
import { getStoredTrips } from '@/services/tripService';
import { useCurrency } from '@/context/CurrencyContext';
import OtpVerificationView from '@/components/Payment/OtpVerificationView';

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
  const { currency, formatUSD } = useCurrency();
  const [selectedItems, setSelectedItems] = useState<BundledBookingItem[]>(SAMPLE_BUNDLE_ITEMS);
  const [selectedTripId, setSelectedTripId] = useState<string>('trip-user-01');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'wallet' | 'netbanking'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<UnifiedBundleBookingResult | null>(null);
  const [showOtp, setShowOtp] = useState(false);

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

  const handleProceedToOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setShowOtp(true);
  };

  const handleCheckoutAfterOtp = async () => {
    setIsProcessing(true);

    const result = await processUnifiedBundleCheckout({
      userId: currentUser.id || 'usr-demo-01',
      customerName: currentUser.name,
      customerEmail: currentUser.email,
      items: selectedItems,
      tripId: selectedTripId || undefined,
      paymentMethod,
      currency,
    });

    setIsProcessing(false);
    if (result.success) {
      setShowOtp(false);
      setBookingSuccess(result);
      if (onBookingConfirmed) onBookingConfirmed(result);
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
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {bookingSuccess ? (
            <div className="text-center py-8 space-y-5 animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">Unified Travel Bundle Confirmed!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  All selected reservations have been booked together and auto-synced with your Trip Workspace itinerary & split ledger.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-w-lg mx-auto text-left space-y-3 shadow-sm">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Bundle Booking Reference</span>
                  <span className="font-mono font-bold text-emerald-800">{bookingSuccess.bundleReference}</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Total Services Booked</span>
                  <span className="font-bold text-slate-900">{bookingSuccess.bookedItems.length} Services</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Bundle Discount Saved</span>
                  <span className="font-bold text-emerald-700">-{formatUSD(bookingSuccess.discountAmount)} (15% OFF)</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-1 font-bold">
                  <span className="text-slate-900">Total Amount Paid</span>
                  <span className="text-slate-900">{formatUSD(bookingSuccess.finalPaidAmount)}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-700/20"
              >
                Back to Dashboard
              </button>
            </div>
          ) : showOtp ? (
            <div className="max-w-lg mx-auto py-4">
              <OtpVerificationView
                userId={currentUser.id || 'usr-demo-01'}
                amount={pricing.totalAmount}
                currency={currency}
                bookingReference="BDL-CHECKOUT"
                onVerified={handleCheckoutAfterOtp}
                onCancel={() => setShowOtp(false)}
                isProcessing={isProcessing}
              />
            </div>
          ) : (
            <form onSubmit={handleProceedToOtp} className="space-y-6">
              {/* Bundle Items Selector */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Included Travel Services ({selectedItems.length} selected)
                  </h4>
                  {pricing.discountPercentage > 0 && (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <Percent size={12} />
                      <span>{pricing.discountPercentage}% Multi-Service Bundle Discount Applied</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {SAMPLE_BUNDLE_ITEMS.map((item) => {
                    const isSelected = selectedItems.some((i) => i.id === item.id);
                    const Icon = item.type === 'flight' ? Plane : item.type === 'hotel' ? Hotel : Car;

                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(item)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                            : 'bg-slate-50/80 border-slate-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-xl bg-emerald-100/70 text-emerald-800 border border-emerald-200">
                              <Icon size={16} />
                            </div>
                            <span className="text-xs font-bold text-slate-900">{formatUSD(item.price)}</span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-900">{item.title}</h5>
                          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <MapPin size={10} className="text-emerald-700 flex-shrink-0" />
                            <span className="truncate">{item.subTitle}</span>
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                          <span>{item.date}</span>
                          <span className={`px-2 py-0.5 rounded font-bold ${isSelected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                            {isSelected ? 'Included' : '+ Add'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Workspace Sync Dropdown */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-700" />
                    <span>Auto-Sync Itinerary to Trip Workspace</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                </div>
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
              </div>

              {/* Cost Summary & Pay Button */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Total Services Subtotal</span>
                  <span className="font-bold text-slate-900">{formatUSD(pricing.subtotal)}</span>
                </div>
                {pricing.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
                    <span>Bundle Saver Discount ({pricing.discountPercentage}%)</span>
                    <span>-{formatUSD(pricing.discountAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Taxes & Service GST (5%)</span>
                  <span className="font-bold text-slate-900">{formatUSD(pricing.taxAmount)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 block">Final Bundle Total</span>
                    <span className="text-xl font-black text-slate-900">{formatUSD(pricing.totalAmount)}</span>
                  </div>

                  <button
                    className="workflow-primary"
                    disabled={processing || !chosen.length}
                    onClick={() => void checkout()}
                  >
                    <span>{isProcessing ? 'Processing...' : 'Proceed to Security Verification'}</span>
                    <ArrowRight size={14} />
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
