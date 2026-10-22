/**
 * Transport Booking Modal
 * Handles ground transport reservations including taxis, private cars,
 * and airport transfers with route, vehicle type, and price selection.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Car, Train, Bus, MapPin, Calendar, Users, ArrowRight, Search,
  Filter, X, CheckCircle2, Star, ShieldCheck, Sparkles,
  Clock, Navigation, Shield, Check, Luggage, KeyRound,
  ArrowUpDown, SlidersHorizontal, RefreshCw, AlertCircle
} from 'lucide-react';
import {
  searchTransport,
  bookTransport,
  cancelTransportBooking,
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

// ─── Step types matching FlightBookingModal & HotelBookingModal ─────────────
type Step = 'search' | 'results' | 'passenger' | 'payment' | 'confirming' | 'success';

// ─── Mode Options ───────────────────────────────────────────────────────────
const TRANSPORT_MODES: { value: TransportModeFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'All Modes', icon: '🌐' },
  { value: 'train', label: 'High-Speed Rail', icon: '🚆' },
  { value: 'private_transfer', label: 'Airport & VIP Transfer', icon: '🚘' },
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
      case 'train': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'private_transfer': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'car_rental': return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'bus': return 'bg-sky-50 text-sky-800 border-sky-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      onClick={() => onSelect(item)}
      className="group relative bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-emerald-500/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md flex flex-col md:flex-row shadow-sm"
    >
      {/* Thumbnail */}
      {item.imageUrl && (
        <div className="relative md:w-52 h-44 md:h-auto flex-shrink-0 overflow-hidden">
          <img
            src={item.imageUrl}
            alt={item.providerName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-200 text-xs font-semibold text-amber-700 shadow-sm">
            <Star size={12} className="fill-amber-500 text-amber-500" />
            <span>{item.operatorRating.toFixed(1)}</span>
          </div>
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-800 shadow-sm flex items-center gap-1.5">
            <span>{getTransportIcon(item.transportType)}</span>
            <span>{getTransportTypeLabel(item.transportType)}</span>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getModeBadgeClass(item.transportType)}`}>
                  {item.vehicleClass}
                </span>
                {item.vehicleModel && (
                  <span className="text-xs text-slate-500 font-mono">
                    {item.vehicleModel}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                {item.providerName}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">${totalPrice.toLocaleString()}</p>
              <p className="text-[11px] text-slate-500">
                {item.transportType === 'car_rental' ? 'per day' : (item.transportType === 'train' || item.transportType === 'bus' ? (passengers > 1 ? `$${item.basePrice}/pax` : 'total fare') : 'all-inclusive')}
              </p>
            </div>
          </div>

          {/* Route Overview */}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <MapPin size={13} className="text-emerald-700 flex-shrink-0" />
              <span className="truncate font-medium">{item.originLocation}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400 flex-shrink-0 px-1">
              <ArrowRight size={13} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Navigation size={13} className="text-emerald-700 flex-shrink-0" />
              <span className="truncate font-medium">{item.destinationLocation}</span>
            </div>
          </div>

          {/* Meta Badges */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              <Clock size={12} className="text-emerald-700" />
              {formatTransportDuration(item.durationMinutes)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              <Users size={12} className="text-emerald-700" />
              Up to {item.maxPassengers} passengers
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              <Luggage size={12} className="text-emerald-700" />
              {item.baggageCapacity} Bags
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {item.amenities.slice(0, 3).map((amenity) => (
              <span key={amenity} className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                ✓ {amenity}
              </span>
            ))}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-700/20 transition-all"
          >
            <span>Reserve</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Modal Component ───────────────────────────────────────────────────
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
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'duration'>('price');

  // Results & Selection
  const [searchResults, setSearchResults] = useState<TransportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<TransportItem | null>(null);

  // Passenger & Lead Details
  const [passengerDetails, setPassengerDetails] = useState<TransportBookingDetails>({
    passengerName: '',
    contactEmail: '',
    contactPhone: '',
    passengerCount: 1,
    pickupNotes: '',
    dropoffNotes: '',
    driverNotes: '',
  });

  // Booking Result
  const [bookingResult, setBookingResult] = useState<{
    reference: string;
    bookingId: string;
  } | null>(null);

  // Synchronize on open
  useEffect(() => {
    if (isOpen) {
      if (defaultOrigin) setOrigin(defaultOrigin);
      if (defaultDestination) setDestination(defaultDestination);
      triggerSearch(defaultOrigin, defaultDestination, 'all');
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

      // Sort
      results.sort((a, b) => {
        if (sortBy === 'price') return a.basePrice - b.basePrice;
        if (sortBy === 'rating') return b.operatorRating - a.operatorRating;
        if (sortBy === 'duration') return a.durationMinutes - b.durationMinutes;
        return 0;
      });

      setSearchResults(results);
      setStep('results');
    } catch (err) {
      console.error(err);
      setSearchResults(SEED_TRANSPORTS);
      setStep('results');
    } finally {
      setIsLoading(false);
    }
  }, [origin, destination, date, modeFilter, sortBy]);

  if (!isOpen) return null;

  const handleSelectTransport = (item: TransportItem) => {
    setSelectedTransport(item);
    setPassengerDetails((prev) => ({
      ...prev,
      passengerCount: passengers,
    }));
    setStep('passenger');
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerDetails.passengerName.trim() || !passengerDetails.contactEmail.trim()) return;
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
    ? (selectedTransport.transportType === 'train' || selectedTransport.transportType === 'bus'
        ? selectedTransport.basePrice * passengers
        : selectedTransport.basePrice)
    : 0;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-900/65 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl shadow-slate-950/20 overflow-hidden my-auto flex flex-col max-h-[88vh]">
        {/* Step Flow Breadcrumb Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shadow-sm">
              <Car size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Local Transport & Transfers</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Transfers & Rentals
                </span>
              </div>
              <p className="text-xs text-slate-500">High-speed rail, airport chauffeurs, car rentals & coaches</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Step badges */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              {(['results', 'passenger', 'payment', 'success'] as const).map((st, i) => (
                <div key={st} className="flex items-center gap-1">
                  <span
                    className={`px-2 py-0.5 rounded-md font-medium capitalize ${
                      step === st || (step === 'search' && st === 'results') || (step === 'confirming' && st === 'payment')
                        ? 'bg-emerald-700 text-white font-semibold shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    {i + 1}. {st === 'passenger' ? 'Details' : st}
                  </span>
                  {i < 3 && <span className="text-slate-400">›</span>}
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search & Mode Filters Bar */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          {/* Mode Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex flex-wrap gap-2">
              {TRANSPORT_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => {
                    setModeFilter(mode.value);
                    triggerSearch(origin, destination, mode.value);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    modeFilter === mode.value
                      ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{mode.icon}</span>
                  <span>{mode.label}</span>
                </button>
              ))}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <SlidersHorizontal size={13} />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  triggerSearch(origin, destination, modeFilter);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              >
                <option value="price">Lowest Price</option>
                <option value="rating">Highest Rating</option>
                <option value="duration">Fastest Route</option>
              </select>
            </div>
          </div>

          {/* Form Input Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Origin */}
            <div className="relative">
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Pick-up / Origin</label>
              <div className="relative flex items-center">
                <MapPin size={15} className="absolute left-3 text-emerald-700 pointer-events-none" />
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g. Paris, Tokyo, CDG Airport"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Destination */}
            <div className="relative">
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Drop-off / Destination</label>
              <div className="relative flex items-center">
                <Navigation size={15} className="absolute left-3 text-emerald-700 pointer-events-none" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. London, Kyoto, Hotel"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Date */}
            <div className="relative">
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Date</label>
              <div className="relative flex items-center">
                <Calendar size={15} className="absolute left-3 text-amber-500 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Passengers & Search */}
            <div className="flex items-end gap-2">
              <div className="w-28 relative">
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Passengers</label>
                <div className="relative flex items-center">
                  <Users size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
                  <select
                    value={passengers}
                    onChange={(e) => setPassengers(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                      <option key={n} value={n} className="bg-white text-slate-900">
                        {n} {n === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => triggerSearch(origin, destination, modeFilter)}
                disabled={isLoading}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold py-2 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw size={14} className="animate-spin" />
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

        {/* Modal View Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP: RESULTS LIST */}
          {(step === 'results' || step === 'search') && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium text-slate-500">
                  Showing <span className="text-slate-900 font-bold">{searchResults.length}</span> curated routes
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck size={14} className="text-emerald-700" />
                  <span>Instant Voucher · Free Cancellation</span>
                </div>
              </div>

              {searchResults.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <Car size={36} className="mx-auto text-slate-400 mb-3" />
                  <p className="text-sm font-semibold text-slate-900">No direct routes found for this filter</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Try clearing filters or switching the transport mode.</p>
                  <button
                    onClick={() => {
                      setOrigin('');
                      setDestination('');
                      setModeFilter('all');
                      triggerSearch('', '', 'all');
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-700/20"
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

          {/* STEP: PASSENGER DETAILS */}
          {step === 'passenger' && selectedTransport && (
            <div className="max-w-2xl mx-auto">
              <button
                onClick={() => setStep('results')}
                className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center gap-1 mb-4 font-semibold"
              >
                ← Back to transport options
              </button>

              {/* Selected Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getTransportIcon(selectedTransport.transportType)}</span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedTransport.providerName}</h3>
                    <p className="text-xs text-slate-500">{selectedTransport.originLocation} → {selectedTransport.destinationLocation}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">${computedTotal.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-500">{passengers} {passengers === 1 ? 'passenger' : 'passengers'}</p>
                </div>
              </div>

              <form onSubmit={handleProceedToPayment} className="space-y-4 bg-slate-50/70 border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Users size={16} className="text-emerald-700" />
                  <span>Lead Passenger & Contact Information</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Full Legal Name *</label>
                    <input
                      type="text"
                      required
                      value={passengerDetails.passengerName}
                      onChange={(e) => setPassengerDetails({ ...passengerDetails, passengerName: e.target.value })}
                      placeholder="e.g. Bhavika Sainani"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={passengerDetails.contactEmail}
                      onChange={(e) => setPassengerDetails({ ...passengerDetails, contactEmail: e.target.value })}
                      placeholder="bhavika@example.com"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Contact Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={passengerDetails.contactPhone}
                      onChange={(e) => setPassengerDetails({ ...passengerDetails, contactPhone: e.target.value })}
                      placeholder="+1 (555) 019-2834"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Flight / Train Arrival Number (Optional)</label>
                    <input
                      type="text"
                      value={passengerDetails.pickupNotes}
                      onChange={(e) => setPassengerDetails({ ...passengerDetails, pickupNotes: e.target.value })}
                      placeholder="e.g. AF 022 for flight delay tracking"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Driver Notes & Special Requests</label>
                  <textarea
                    rows={2}
                    value={passengerDetails.driverNotes}
                    onChange={(e) => setPassengerDetails({ ...passengerDetails, driverNotes: e.target.value })}
                    placeholder="Child seat request, excess luggage, terminal gate pickup preference..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 resize-none"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-200">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Shield size={14} className="text-emerald-700" />
                    <span>256-bit Encrypted Checkout</span>
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-700/20 flex items-center gap-2 transition-all"
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
                onClick={() => setStep('passenger')}
                className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center gap-1 mb-4 font-semibold"
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
                  { label: `Passenger Surcharge (${passengers} pax)`, amount: computedTotal - selectedTransport.basePrice },
                  { label: 'Tolls & Airport Surcharges', amount: 0 },
                ]}
                onPaymentSuccess={handlePaymentSuccess}
                onCancel={() => setStep('passenger')}
                userId={userId}
              />
            </div>
          )}

          {/* STEP: CONFIRMING */}
          {step === 'confirming' && (
            <div className="py-16 text-center">
              <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900">Finalizing your transport reservation...</h3>
              <p className="text-xs text-slate-500 mt-1">Issuing voucher & dispatching booking alert...</p>
            </div>
          )}

          {/* STEP: SUCCESS VOUCHER */}
          {step === 'success' && selectedTransport && bookingResult && (
            <div className="max-w-lg mx-auto text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <CheckCircle2 size={36} />
              </div>

              <h2 className="text-xl font-bold text-slate-900">Transport Booking Confirmed!</h2>
              <p className="text-xs text-slate-500 mt-1">
                Your confirmation alert has been broadcast and your digital voucher is ready.
              </p>

              {/* Digital Ticket Card */}
              <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-700 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                  CONFIRMED
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{getTransportIcon(selectedTransport.transportType)}</span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{selectedTransport.providerName}</h4>
                    <p className="text-[11px] text-slate-500">{getTransportTypeLabel(selectedTransport.transportType)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Booking Reference</span>
                    <span className="font-mono font-bold text-emerald-800">{bookingResult.reference}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Lead Passenger</span>
                    <span className="font-medium text-slate-900">{passengerDetails.passengerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Pick-up Location</span>
                    <span className="text-slate-700 truncate block font-medium">{selectedTransport.originLocation}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Drop-off Destination</span>
                    <span className="text-slate-700 truncate block font-medium">{selectedTransport.destinationLocation}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-700/20 transition-all"
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
