import React, { useState } from 'react';
import {
  Package, Plane, Hotel, Car, Check, X, ShieldCheck,
  CreditCard, Sparkles, ArrowRight, DollarSign, Calendar,
  MapPin, Percent, FileText, CheckCircle2
} from 'lucide-react';
import {
  calculateBundlePricing,
  processUnifiedBundleCheckout,
  type BundledBookingItem,
  type UnifiedBundleBookingResult
} from '@/services/bookingIntegrationService';
import { getStoredTrips } from '@/services/tripService';

export interface UnifiedBundleBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { id?: string; name: string; email: string };
  onBookingConfirmed?: (result: UnifiedBundleBookingResult) => void;
}

const SAMPLE_BUNDLE_ITEMS: BundledBookingItem[] = [
  {
    type: 'flight',
    id: 'fl-bdl-01',
    title: 'Air France AF-228 (Economy Direct)',
    subTitle: 'JFK New York → CDG Paris',
    price: 680,
    date: '2026-10-12',
    referenceCode: 'FLT-AF228',
    details: { departure: '08:30 PM', arrival: '10:15 AM (+1)', seats: '14A, 14B' }
  },
  {
    type: 'hotel',
    id: 'ht-bdl-02',
    title: 'Hotel Ritz Paris (Deluxe Suite)',
    subTitle: 'Place Vendôme, 1st arr., Paris',
    price: 1150,
    date: '2026-10-13 to 2026-10-18',
    referenceCode: 'HTL-RITZ',
    details: { nights: 5, roomType: 'Deluxe King Suite', guests: 2 }
  },
  {
    type: 'transport',
    id: 'tr-bdl-03',
    title: 'SNCF TGV High-Speed Rail & Airport Transfer',
    subTitle: 'CDG Airport to Paris Centre + Metro Pass',
    price: 120,
    date: '2026-10-13',
    referenceCode: 'TRP-SNCF',
    details: { vehicle: 'TGV 1st Class & Unlimited Metro Pass' }
  }
];

export default function UnifiedBundleBookingModal({
  isOpen,
  onClose,
  currentUser = { id: 'usr-demo-01', name: 'Manav Vyas', email: 'manav.vyas@voyana.com' },
  onBookingConfirmed
}: UnifiedBundleBookingModalProps) {
  const [selectedItems, setSelectedItems] = useState<BundledBookingItem[]>(SAMPLE_BUNDLE_ITEMS);
  const [selectedTripId, setSelectedTripId] = useState<string>('trip-user-01');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'wallet' | 'netbanking'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<UnifiedBundleBookingResult | null>(null);

  if (!isOpen) return null;

  const availableTrips = getStoredTrips();
  const pricing = calculateBundlePricing(selectedItems);

  const toggleItem = (item: BundledBookingItem) => {
    if (selectedItems.some((i) => i.id === item.id)) {
      if (selectedItems.length === 1) return; // Keep at least 1
      setSelectedItems(selectedItems.filter((i) => i.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const result = await processUnifiedBundleCheckout({
      userId: currentUser.id || 'usr-demo-01',
      customerName: currentUser.name,
      customerEmail: currentUser.email,
      items: selectedItems,
      tripId: selectedTripId || undefined,
      paymentMethod,
    });

    setIsProcessing(false);
    if (result.success) {
      setBookingSuccess(result);
      if (onBookingConfirmed) onBookingConfirmed(result);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
              <Package size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Unified Trip Bundle Checkout</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  VPM-204 Integration
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Book Flights + Stays + Transport together & save up to 15% on cross-service bundles
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {bookingSuccess ? (
            <div className="text-center py-8 space-y-5 animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Unified Travel Bundle Confirmed!</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  All selected reservations have been booked together and auto-synced with your Trip Workspace itinerary & split ledger.
                </p>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 max-w-lg mx-auto text-left space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                  <span className="text-slate-400">Bundle Booking Reference</span>
                  <span className="font-mono font-bold text-indigo-300">{bookingSuccess.bundleReference}</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                  <span className="text-slate-400">Total Services Booked</span>
                  <span className="font-bold text-white">{bookingSuccess.bookedItems.length} Services</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                  <span className="text-slate-400">Bundle Discount Saved</span>
                  <span className="font-bold text-emerald-400">-${bookingSuccess.discountAmount} (15% OFF)</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-1 font-bold">
                  <span className="text-white">Total Amount Paid</span>
                  <span className="text-indigo-300">${bookingSuccess.finalPaidAmount}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg"
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleCheckout} className="space-y-6">
              {/* Bundle Items Selector */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Included Travel Services ({selectedItems.length} selected)
                  </h4>
                  {pricing.discountPercentage > 0 && (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
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
                            ? 'bg-indigo-950/40 border-indigo-500/40 shadow-lg shadow-indigo-600/10'
                            : 'bg-white/[0.02] border-white/5 opacity-50 hover:opacity-80'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                              <Icon size={16} />
                            </div>
                            <span className="text-xs font-bold text-white">${item.price}</span>
                          </div>
                          <h5 className="text-xs font-bold text-white">{item.title}</h5>
                          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                            <MapPin size={10} className="text-rose-400 flex-shrink-0" />
                            <span className="truncate">{item.subTitle}</span>
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                          <span>{item.date}</span>
                          <span className={`px-2 py-0.5 rounded font-bold ${isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5'}`}>
                            {isSelected ? 'Included' : '+ Add'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Workspace Sync Dropdown */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-400" />
                    <span>Auto-Sync Itinerary to Trip Workspace</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </div>
                <select
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="">Do not sync (Standalone booking)</option>
                  {availableTrips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.destination})
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method Selector */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Payment Method
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'card', label: 'Credit/Debit Card', icon: CreditCard },
                    { id: 'upi', label: 'UPI / QR Scan', icon: Sparkles },
                    { id: 'wallet', label: 'Voyana Wallet', icon: DollarSign },
                    { id: 'netbanking', label: 'Net Banking', icon: FileText },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                          paymentMethod === m.id
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                            : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.06]'
                        }`}
                      >
                        <Icon size={15} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cost Summary & Pay Button */}
              <div className="bg-gradient-to-r from-indigo-950/70 via-purple-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Services Subtotal</span>
                  <span className="font-bold text-white">${pricing.subtotal}</span>
                </div>
                {pricing.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-xs text-emerald-400">
                    <span>Bundle Saver Discount ({pricing.discountPercentage}%)</span>
                    <span>-${pricing.discountAmount}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Taxes & Service GST (5%)</span>
                  <span className="font-bold text-white">${pricing.taxAmount}</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">Final Bundle Total</span>
                    <span className="text-xl font-black text-white">${pricing.totalAmount}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <span>{isProcessing ? 'Processing...' : 'Confirm & Book Bundle'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
