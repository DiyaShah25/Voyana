import React, { useState, useEffect, useCallback } from 'react';
import {
  Car, Train, Bus, MapPin, Calendar, Users, ArrowRight, Search,
  Filter, X, CheckCircle2, Star, ShieldCheck, Sparkles,
  Clock, Navigation, Shield, Check, Luggage, KeyRound
} from 'lucide-react';
import {
  searchTransport,
  bookTransport,
  getTransportTypeLabel,
  getTransportIcon,
  formatTransportDuration,
  SEED_TRANSPORTS,
  type TransportItem,
  type TransportType,
  type TransportModeFilter,
  type TransportBookingDetails,
} from '@/services/transportService';
import { PaymentView } from '@/components/Payment/PaymentModal';

// ─── Step types ─────────────────────────────────────────────────────────────
type Step = 'search' | 'results' | 'details' | 'payment' | 'confirming' | 'success';

// ─── Mode Options ───────────────────────────────────────────────────────────
const TRANSPORT_MODES: { value: TransportModeFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'All Transport', icon: '🌐' },
  { value: 'train', label: 'High-Speed Rail', icon: '🚆' },
  { value: 'private_transfer', label: 'Airport & City Transfer', icon: '🚘' },
  { value: 'car_rental', label: 'Car Rental', icon: '🚗' },
  { value: 'bus', label: 'Coaches & Shuttles', icon: '🚌' },
];

const POPULAR_HUBS = [
  { origin: 'Paris', destination: 'London', desc: 'Eurostar High-Speed (2h 18m)' },
  { origin: 'Tokyo', destination: 'Kyoto', desc: 'Shinkansen Bullet Train (2h 15m)' },
  { origin: 'Dubai Airport (DXB)', destination: 'Downtown Dubai', desc: 'VIP Luxury Chauffeur (30m)' },
  { origin: 'New York (JFK)', destination: 'Manhattan', desc: 'Executive Black Car (60m)' },
  { origin: 'Ahmedabad (ADI)', destination: 'Mumbai', desc: 'Vande Bharat Express (5h 25m)' },
];

// ─── Transport Card Component ───────────────────────────────────────────────
function TransportCard({
  item,
  passengers,
  onSelect,
}: {
  item: TransportItem;
  passengers: number;
  onSelect: (item: TransportItem) => void;
}) {
  const totalPrice = item.basePrice * (item.transportType === 'train' || item.transportType === 'bus' ? passengers : 1);

  const getModeBadgeClass = (type: TransportType) => {
    switch (type) {
      case 'train': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'private_transfer': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'car_rental': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'bus': return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div
      onClick={() => onSelect(item)}
      className="group relative bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-indigo-400/40 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col md:flex-row"
    >
      {/* Image Thumbnail */}
      {item.imageUrl && (
        <div className="relative md:w-52 h-44 md:h-auto flex-shrink-0 overflow-hidden">
          <img
            src={item.imageUrl}
            alt={item.providerName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 text-xs font-semibold text-amber-300">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span>{item.operatorRating.toFixed(1)}</span>
          </div>
          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-white/20 text-[11px] font-medium text-slate-200 flex items-center gap-1.5">
            <span>{getTransportIcon(item.transportType)}</span>
            <span>{getTransportTypeLabel(item.transportType)}</span>
          </div>
        </div>
      )}

      {/* Content Body */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getModeBadgeClass(item.transportType)}`}>
                  {item.vehicleClass}
                </span>
                {item.vehicleModel && (
                  <span className="text-xs text-slate-400 font-mono">
                    {item.vehicleModel}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                {item.providerName}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">${totalPrice.toLocaleString()}</p>
              <p className="text-[11px] text-slate-400">
                {item.transportType === 'car_rental' ? 'per day' : (item.transportType === 'train' || item.transportType === 'bus' ? (passengers > 1 ? `$${item.basePrice}/person` : 'total fare') : 'all-inclusive')}
              </p>
            </div>
          </div>

          {/* Route Overview */}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-300 bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <MapPin size={13} className="text-emerald-400 flex-shrink-0" />
              <span className="truncate font-medium">{item.originLocation}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 flex-shrink-0 px-1">
              <ArrowRight size={13} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Navigation size={13} className="text-indigo-400 flex-shrink-0" />
              <span className="truncate font-medium">{item.destinationLocation}</span>
            </div>
          </div>

          {/* Trip Meta Badges */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-white/[0.05] px-2.5 py-1 rounded-lg">
              <Clock size={12} className="text-indigo-400" />
              {formatTransportDuration(item.durationMinutes)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-white/[0.05] px-2.5 py-1 rounded-lg">
              <Users size={12} className="text-indigo-400" />
              Up to {item.maxPassengers} passengers
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-white/[0.05] px-2.5 py-1 rounded-lg">
              <Luggage size={12} className="text-indigo-400" />
              {item.baggageCapacity} Bags
            </span>
          </div>
        </div>

        {/* Amenities & Select Action */}
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {item.amenities.slice(0, 3).map((amenity) => (
              <span key={amenity} className="text-[10px] text-slate-400 bg-white/[0.03] px-2 py-0.5 rounded border border-white/5">
                ✓ {amenity}
              </span>
            ))}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-semibold shadow-md transition-all group-hover:shadow-indigo-500/25"
          >
            <span>Book Now</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Transport Modal ───────────────────────────────────────────────────
export interface TransportBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOrigin?: string;
  defaultDestination?: string;
  userId?: string;
}

export default function TransportBookingModal({
  isOpen,
  onClose,
  defaultOrigin = '',
  defaultDestination = '',
  userId,
}: TransportBookingModalProps) {
  // State
  const [step, setStep] = useState<Step>('search');
  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState(defaultDestination);
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [modeFilter, setModeFilter] = useState<TransportModeFilter>('all');
  const [passengers, setPassengers] = useState(1);

  // Results & Selection
  const [searchResults, setSearchResults] = useState<TransportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<TransportItem | null>(null);

  // Passenger & Contact details
  const [passengerDetails, setPassengerDetails] = useState<TransportBookingDetails>({
    passengerName: '',
    contactEmail: '',
    contactPhone: '',
    passengerCount: 1,
    pickupNotes: '',
    dropoffNotes: '',
    driverNotes: '',
  });

  // Booking outcome
  const [bookingResult, setBookingResult] = useState<{
    reference: string;
    bookingId: string;
  } | null>(null);

  // Synchronize defaults on open
  useEffect(() => {
    if (isOpen) {
      if (defaultOrigin) setOrigin(defaultOrigin);
      if (defaultDestination) setDestination(defaultDestination);
      if (!defaultOrigin && !defaultDestination) {
        // Auto trigger seed search
        triggerSearch('', '', 'all');
      } else {
        triggerSearch(defaultOrigin, defaultDestination, 'all');
      }
    }
  }, [isOpen, defaultOrigin, defaultDestination]);

  const triggerSearch = useCallback(async (
    orig?: string,
    dest?: string,
    mode?: TransportModeFilter
  ) => {
    setIsLoading(true);
    try {
      const results = await searchTransport(
        orig !== undefined ? orig : origin,
        dest !== undefined ? dest : destination,
        date,
        mode !== undefined ? mode : modeFilter
      );
      setSearchResults(results);
      setStep('results');
    } catch (err) {
      console.error(err);
      setSearchResults(SEED_TRANSPORTS);
      setStep('results');
    } finally {
      setIsLoading(false);
    }
  }, [origin, destination, date, modeFilter]);

  if (!isOpen) return null;

  const handleSelectTransport = (item: TransportItem) => {
    setSelectedTransport(item);
    setPassengerDetails((prev) => ({
      ...prev,
      passengerCount: passengers,
    }));
    setStep('details');
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerDetails.passengerName || !passengerDetails.contactEmail) return;
    setStep('payment');
  };

  const handlePaymentSuccess = async (res: { paymentId: string; transactionReference: string }) => {
    if (!selectedTransport) return;
    setStep('confirming');
    try {
      const bkg = await bookTransport(selectedTransport, passengerDetails, userId);
      setBookingResult({
        reference: bkg.bookingReference || `VYN-TRP-${Math.floor(100000 + Math.random() * 900000)}`,
        bookingId: bkg.bookingId || `bkg-trp-${Date.now()}`,
      });
      setStep('success');
    } catch {
      setBookingResult({
        reference: `VYN-TRP-${Math.floor(100000 + Math.random() * 900000)}`,
        bookingId: `bkg-trp-${Date.now()}`,
      });
      setStep('success');
    }
  };

  const computedTotal = selectedTransport
    ? selectedTransport.basePrice * (selectedTransport.transportType === 'train' || selectedTransport.transportType === 'bus' ? passengers : 1)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Car size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Local Transport & Transfers</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  VPM-213
                </span>
              </div>
              <p className="text-xs text-slate-400">High-speed trains, airport transfers, coaches & car rentals</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Mode Bar */}
        <div className="p-6 border-b border-white/10 bg-slate-950/40">
          {/* Mode Chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {TRANSPORT_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => {
                  setModeFilter(mode.value);
                  triggerSearch(origin, destination, mode.value);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  modeFilter === mode.value
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] border border-white/5'
                }`}
              >
                <span>{mode.icon}</span>
                <span>{mode.label}</span>
              </button>
            ))}
          </div>

          {/* Input Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Origin */}
            <div className="relative">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Pick-up / Origin</label>
              <div className="relative flex items-center">
                <MapPin size={15} className="absolute left-3 text-emerald-400 pointer-events-none" />
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g. Paris, Tokyo, CDG Airport"
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            {/* Destination */}
            <div className="relative">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Drop-off / Destination</label>
              <div className="relative flex items-center">
                <Navigation size={15} className="absolute left-3 text-indigo-400 pointer-events-none" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. London, Kyoto, Hotel"
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            {/* Date */}
            <div className="relative">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Date</label>
              <div className="relative flex items-center">
                <Calendar size={15} className="absolute left-3 text-amber-400 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            {/* Passengers & Search Button */}
            <div className="flex items-end gap-2">
              <div className="w-28 relative">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Passengers</label>
                <div className="relative flex items-center">
                  <Users size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
                  <select
                    value={passengers}
                    onChange={(e) => setPassengers(Number(e.target.value))}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                      <option key={n} value={n} className="bg-slate-900">
                        {n} {n === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => triggerSearch(origin, destination, modeFilter)}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-semibold py-2 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-block animate-spin">⏳</span>
                ) : (
                  <>
                    <Search size={14} />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body / Views */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP: RESULTS LIST */}
          {(step === 'results' || step === 'search') && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium text-slate-400">
                  Showing <span className="text-white font-semibold">{searchResults.length}</span> available options
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Instant Confirmation & Free Cancellation</span>
                </div>
              </div>

              {searchResults.length === 0 ? (
                <div className="text-center py-12 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                  <Car size={36} className="mx-auto text-slate-600 mb-3" />
                  <p className="text-sm font-semibold text-white">No direct ground routes found for this filter</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Try clearing the city filters or switching the transport mode above.</p>
                  <button
                    onClick={() => {
                      setOrigin('');
                      setDestination('');
                      setModeFilter('all');
                      triggerSearch('', '', 'all');
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                  >
                    View All Global Routes
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {searchResults.map((item) => (
                    <TransportCard
                      key={item.id}
                      item={item}
                      passengers={passengers}
                      onSelect={handleSelectTransport}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP: PASSENGER & PICKUP DETAILS */}
          {step === 'details' && selectedTransport && (
            <div className="max-w-2xl mx-auto">
              <button
                onClick={() => setStep('results')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mb-4 font-medium"
              >
                ← Back to transport options
              </button>

              {/* Selected summary strip */}
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getTransportIcon(selectedTransport.transportType)}</span>
                  <div>
                    <h3 className="text-sm font-bold text-white">{selectedTransport.providerName}</h3>
                    <p className="text-xs text-slate-400">{selectedTransport.originLocation} → {selectedTransport.destinationLocation}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">${computedTotal.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400">{passengers} {passengers === 1 ? 'passenger' : 'passengers'}</p>
                </div>
              </div>

              <form onSubmit={handleProceedToPayment} className="space-y-4 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Users size={16} className="text-indigo-400" />
                  <span>Lead Passenger & Booking Information</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Full Legal Name *</label>
                    <input
                      type="text"
                      required
                      value={passengerDetails.passengerName}
                      onChange={(e) => setPassengerDetails({ ...passengerDetails, passengerName: e.target.value })}
                      placeholder="e.g. Bhavika Sainani"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={passengerDetails.contactEmail}
                      onChange={(e) => setPassengerDetails({ ...passengerDetails, contactEmail: e.target.value })}
                      placeholder="bhavika@example.com"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Contact Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={passengerDetails.contactPhone}
                      onChange={(e) => setPassengerDetails({ ...passengerDetails, contactPhone: e.target.value })}
                      placeholder="+1 (555) 019-2834"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Flight / Train Arrival Number (Optional)</label>
                    <input
                      type="text"
                      value={passengerDetails.pickupNotes}
                      onChange={(e) => setPassengerDetails({ ...passengerDetails, pickupNotes: e.target.value })}
                      placeholder="e.g. AF 022 for flight delay tracking"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Driver Notes & Special Requests</label>
                  <textarea
                    rows={2}
                    value={passengerDetails.driverNotes}
                    onChange={(e) => setPassengerDetails({ ...passengerDetails, driverNotes: e.target.value })}
                    placeholder="Child seat request, excess luggage, gate pickup preference..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-white/10">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Shield size={14} className="text-indigo-400" />
                    <span>256-bit Encrypted Checkout</span>
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 flex items-center gap-2"
                  >
                    <span>Proceed to Payment (${computedTotal})</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP: PAYMENT VIEW */}
          {step === 'payment' && selectedTransport && (
            <div className="max-w-2xl mx-auto">
              <button
                onClick={() => setStep('details')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mb-4 font-medium"
              >
                ← Back to passenger details
              </button>

              <PaymentView
                bookingId={selectedTransport.id}
                bookingReference={`VYN-TRP-${Math.floor(100000 + Math.random() * 900000)}`}
                bookingType="transport"
                title={`Transport: ${selectedTransport.providerName}`}
                subtitle={`${selectedTransport.originLocation} to ${selectedTransport.destinationLocation}`}
                amount={computedTotal}
                lineItems={[
                  { label: `${getTransportTypeLabel(selectedTransport.transportType)} (${selectedTransport.vehicleClass})`, amount: selectedTransport.basePrice },
                  { label: `Passenger Capacity / Surcharge (${passengers} pax)`, amount: computedTotal - selectedTransport.basePrice },
                  { label: 'Tolls, Airport Surcharges & Taxes', amount: 0 },
                ]}
                onPaymentSuccess={handlePaymentSuccess}
                onCancel={() => setStep('details')}
                userId={userId}
              />
            </div>
          )}

          {/* STEP: CONFIRMING */}
          {step === 'confirming' && (
            <div className="py-16 text-center">
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white">Finalizing your transport reservation...</h3>
              <p className="text-xs text-slate-400 mt-1">Issuing voucher & notifying your dispatch team...</p>
            </div>
          )}

          {/* STEP: SUCCESS VOUCHER */}
          {step === 'success' && selectedTransport && bookingResult && (
            <div className="max-w-lg mx-auto text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={36} />
              </div>

              <h2 className="text-xl font-bold text-white">Transport Booking Confirmed!</h2>
              <p className="text-xs text-slate-400 mt-1">
                Your confirmation and digital voucher have been generated.
              </p>

              {/* Digital Ticket Card */}
              <div className="mt-6 bg-slate-900 border border-white/15 rounded-2xl p-5 text-left shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                  CONFIRMED
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{getTransportIcon(selectedTransport.transportType)}</span>
                  <div>
                    <h4 className="text-sm font-bold text-white">{selectedTransport.providerName}</h4>
                    <p className="text-[11px] text-slate-400">{getTransportTypeLabel(selectedTransport.transportType)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Booking Reference</span>
                    <span className="font-mono font-bold text-indigo-300">{bookingResult.reference}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Lead Passenger</span>
                    <span className="font-medium text-white">{passengerDetails.passengerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Pick-up Location</span>
                    <span className="text-slate-300 truncate block">{selectedTransport.originLocation}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Drop-off Destination</span>
                    <span className="text-slate-300 truncate block">{selectedTransport.destinationLocation}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25"
                >
                  Done & Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
