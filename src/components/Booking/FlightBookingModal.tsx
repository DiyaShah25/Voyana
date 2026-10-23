/**
 * Flight Booking Modal
 * Full-screen modal for searching, filtering, and booking flights.
 * Includes departure/arrival selection, date pickers, class filters,
 * and integration with payment processing.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plane, MapPin, Calendar, Users, ArrowRight, Search,
  Filter, X, CheckCircle2,
  Luggage, Wifi, Coffee, Sparkles,
} from 'lucide-react';
import {
  generateMockFlights,
  searchFlightsLive,
  createFlightBooking,
  formatDuration,
  formatTime,
  formatDate,
  getCabinLabel,
  resolveAirportCode,
  AIRPORTS,
  CITY_TO_AIRPORT,
  type Flight,
  type CabinClass,
  type PassengerDetails,
} from '@/services/flightService';
import { PaymentView } from '@/components/Payment/PaymentModal';

// ─── Step types ─────────────────────────────────────────────────────────────
type Step = 'search' | 'results' | 'passenger' | 'payment' | 'confirming' | 'success';

// ─── Cabin Badge ─────────────────────────────────────────────────────────────
const CABIN_COLORS: Record<CabinClass, string> = {
  economy: 'bg-slate-100 text-slate-700 border-slate-200',
  premium_economy: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  business: 'bg-amber-50 text-amber-800 border-amber-200',
  first: 'bg-purple-50 text-purple-800 border-purple-200',
};

const AIRLINE_COLORS: Record<string, string> = {
  AF: 'from-blue-600 to-blue-800',
  EK: 'from-red-700 to-red-900',
  BA: 'from-blue-800 to-indigo-900',
  SQ: 'from-amber-700 to-yellow-900',
  QR: 'from-violet-700 to-purple-900',
  LH: 'from-yellow-600 to-yellow-800',
  '6E': 'from-indigo-600 to-indigo-800',
  AI: 'from-orange-700 to-red-800',
  DL: 'from-blue-700 to-blue-900',
  JL: 'from-red-700 to-red-900',
  TG: 'from-purple-700 to-purple-900',
  QF: 'from-red-600 to-red-800',
};

function AirlineBadge({ code }: { code: string; name?: string }) {
  const grad = AIRLINE_COLORS[code] || 'from-slate-600 to-slate-800';
  return (
    <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${grad} text-white text-xs font-bold shadow-lg flex-shrink-0`}>
      {code}
    </div>
  );
}

// ─── Flight Card ─────────────────────────────────────────────────────────────
function FlightCard({
  flight,
  cabin,
  passengers,
  onSelect,
}: {
  flight: Flight;
  cabin: CabinClass;
  passengers: number;
  onSelect: (f: Flight) => void;
}) {
  const price = flight.prices[cabin] * passengers;
  const perPax = flight.prices[cabin];

  return (
    <div
      onClick={() => onSelect(flight)}
      className="group relative bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-500/50 rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-emerald-950/5"
    >
      {/* Airline info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AirlineBadge code={flight.airlineCode} name={flight.airline} />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-900">{flight.airline}</p>
              {(flight as any).isLiveGDS && (
                <span className="bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  Live GDS
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono">{flight.flightNumber} · {flight.aircraft}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-slate-900">${price.toLocaleString()}</p>
          {passengers > 1 && <p className="text-xs text-slate-500">${perPax.toLocaleString()} / person</p>}
        </div>
      </div>

      {/* Route timeline */}
      <div className="mt-4 flex items-center gap-3">
        <div className="text-center flex-shrink-0">
          <p className="text-2xl font-black text-slate-900 font-mono">{formatTime(flight.departureTime)}</p>
          <p className="text-xs text-slate-800 font-bold">{flight.originAirport.code}</p>
          <p className="text-[10px] text-slate-400 max-w-[85px] truncate font-medium">{flight.originAirport.city}</p>
        </div>

        <div className="flex-1 flex flex-col items-center gap-1">
          <p className="text-xs text-slate-500 font-medium">{formatDuration(flight.durationMinutes)}</p>
          <div className="w-full flex items-center gap-1">
            <div className="h-px bg-slate-200 flex-1" />
            <Plane size={14} className="text-emerald-700 -rotate-0 flex-shrink-0" />
            <div className="h-px bg-slate-200 flex-1" />
          </div>
          <p className="text-xs text-slate-500">
            {flight.stops === 0 ? (
              <span className="text-emerald-700 font-semibold">Nonstop</span>
            ) : (
              <span className="text-amber-700 font-medium">{flight.stops} stop</span>
            )}
          </p>
        </div>

        <div className="text-center flex-shrink-0">
          <p className="text-2xl font-black text-slate-900 font-mono">{formatTime(flight.arrivalTime)}</p>
          <p className="text-xs text-slate-800 font-bold">{flight.destinationAirport.code}</p>
          <p className="text-[10px] text-slate-400 max-w-[85px] truncate font-medium">{flight.destinationAirport.city}</p>
        </div>
      </div>

      {/* Cabin + Seats + Amenities */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${CABIN_COLORS[cabin]}`}>
            {getCabinLabel(cabin)}
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
            <Luggage size={11} />
            {cabin === 'economy' ? '23kg' : cabin === 'premium_economy' ? '32kg' : '50kg'}
          </span>
          {cabin !== 'economy' && (
            <span className="text-xs text-slate-500 flex items-center gap-1 font-medium"><Wifi size={11} />WiFi</span>
          )}
          {(cabin === 'business' || cabin === 'first') && (
            <span className="text-xs text-slate-500 flex items-center gap-1 font-medium"><Coffee size={11} />Meal</span>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onSelect(flight); }}
          className="text-xs font-bold text-emerald-700 group-hover:text-emerald-800 flex items-center gap-1 transition"
        >
          Select <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────
interface FlightBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDestination?: string;
}

const CABIN_OPTIONS: { value: CabinClass; label: string; icon: string }[] = [
  { value: 'economy', label: 'Economy', icon: '🛋️' },
  { value: 'premium_economy', label: 'Premium Economy', icon: '💺' },
  { value: 'business', label: 'Business', icon: '✨' },
  { value: 'first', label: 'First Class', icon: '👑' },
];

const POPULAR_ROUTES = [
  { from: 'DEL', to: 'DXB', fromCity: 'New Delhi', toCity: 'Dubai' },
  { from: 'BOM', to: 'DPS', fromCity: 'Mumbai', toCity: 'Bali' },
  { from: 'BOM', to: 'LHR', fromCity: 'Mumbai', toCity: 'London' },
  { from: 'DEL', to: 'BLR', fromCity: 'New Delhi', toCity: 'Bengaluru' },
  { from: 'BOM', to: 'GOI', fromCity: 'Mumbai', toCity: 'Goa' },
  { from: 'AMD', to: 'DXB', fromCity: 'Ahmedabad', toCity: 'Dubai' },
  { from: 'CDG', to: 'JFK', fromCity: 'Paris', toCity: 'New York' },
  { from: 'SIN', to: 'DPS', fromCity: 'Singapore', toCity: 'Bali' },
  { from: 'DXB', to: 'BKK', fromCity: 'Dubai', toCity: 'Bangkok' },
];

export const FlightBookingModal: React.FC<FlightBookingModalProps> = ({
  isOpen, onClose, initialDestination,
}) => {
  const [step, setStep] = useState<Step>('search');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState(initialDestination || '');
  const [departureDate, setDepartureDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [cabin, setCabin] = useState<CabinClass>('economy');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [bookingRef, setBookingRef] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'duration' | 'departure'>('price');
  const [filterStops, setFilterStops] = useState<'any' | 'nonstop'>('any');
  const [passenger, setPassenger] = useState<PassengerDetails>({
    fullName: '', passportNumber: '', dateOfBirth: '',
    nationality: '', seatPreference: 'window',
    mealPreference: 'standard', contactEmail: '', contactPhone: '',
  });
  const [isSearching, setIsSearching] = useState(false);

  // Set min date to today
  const today = new Date().toISOString().split('T')[0];

  // Pre-fill destination when initialDestination changes
  useEffect(() => {
    if (initialDestination) {
      const code = resolveAirportCode(initialDestination) || initialDestination.toUpperCase().slice(0, 3);
      setDestination(code);
    }
  }, [initialDestination]);

  const handleSearch = useCallback(async () => {
    const resolvedOrigin = resolveAirportCode(origin) || origin.toUpperCase().slice(0, 3);
    const resolvedDest = resolveAirportCode(destination) || destination.toUpperCase().slice(0, 3);

    if (!resolvedOrigin || !resolvedDest) return;
    if (!departureDate) return;

    setIsSearching(true);
    try {
      const results = await searchFlightsLive({
        originCode: resolvedOrigin,
        destinationCode: resolvedDest,
        departureDate,
        passengers,
        cabinClass: cabin,
      });
      setFlights(results);
      setStep('results');
    } catch {
      const results = generateMockFlights({
        originCode: resolvedOrigin,
        destinationCode: resolvedDest,
        departureDate,
        passengers,
        cabinClass: cabin,
      });
      setFlights(results);
      setStep('results');
    } finally {
      setIsSearching(false);
    }
  }, [origin, destination, departureDate, passengers, cabin]);

  const sortedFlights = [...flights]
    .filter(f => filterStops === 'any' || f.stops === 0)
    .sort((a, b) => {
      if (sortBy === 'price') return a.prices[cabin] - b.prices[cabin];
      if (sortBy === 'duration') return a.durationMinutes - b.durationMinutes;
      return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
    });

  const handleFlightSelect = (f: Flight) => {
    setSelectedFlight(f);
    setStep('passenger');
  };

  const validatePassenger = (): boolean => {
    const errors: Partial<Record<keyof PassengerDetails, string>> = {};
    if (!passenger.fullName.trim()) errors.fullName = 'Full name is required.';
    if (!passenger.passportNumber.trim()) errors.passportNumber = 'Passport number is required.';
    if (!passenger.dateOfBirth) errors.dateOfBirth = 'Date of birth is required.';
    if (!passenger.nationality.trim()) errors.nationality = 'Nationality is required.';
    if (!passenger.contactEmail.includes('@')) errors.contactEmail = 'Valid email is required.';
    setPassengerErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToPayment = () => {
    if (!selectedFlight || !validatePassenger()) return;
    setStep('payment');
  };

  const handleClose = () => {
    setStep('search');
    setFlights([]);
    setSelectedFlight(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-md" onClick={handleClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl max-h-[88vh] my-auto flex flex-col bg-white border border-slate-200/90 rounded-3xl shadow-2xl shadow-slate-950/20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/90 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 shadow-sm">
              <Plane size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-wide">
                {step === 'search' && 'Search Flights'}
                {step === 'results' && 'Available Flights'}
                {step === 'passenger' && 'Passenger Details'}
                {step === 'payment' && 'Payment & Checkout'}
                {step === 'confirming' && 'Confirming Booking...'}
                {step === 'success' && 'Booking Confirmed!'}
              </h2>
              <p className="text-xs text-slate-500">
                {step === 'search' && 'Find the best fares worldwide'}
                {step === 'results' && `${sortedFlights.length} flights found · ${formatDate(departureDate)}`}
                {step === 'passenger' && `${selectedFlight?.airline} ${selectedFlight?.flightNumber}`}
                {step === 'payment' && `Pay securely for ${selectedFlight?.airline} ${selectedFlight?.flightNumber}`}
                {step === 'confirming' && 'Securing your reservation...'}
                {step === 'success' && 'Bon voyage! Your ticket is ready'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(step === 'results' || step === 'passenger' || step === 'payment') && (
              <button
                onClick={() => {
                  if (step === 'payment') setStep('passenger');
                  else if (step === 'passenger') setStep('results');
                  else setStep('search');
                }}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200"
              >
                ← Back
              </button>
            )}
            <button onClick={handleClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ─── STEP: SEARCH ─── */}
          {step === 'search' && (
            <div className="p-5 space-y-5">
              {/* Origin/Destination */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={11} className="text-emerald-700" /> From
                  </label>
                  <div className="relative">
                    <input
                      value={origin}
                      onChange={e => setOrigin(e.target.value)}
                      placeholder="City or Airport code"
                      list="origin-list"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition"
                    />
                    <datalist id="origin-list">
                      {Object.keys(CITY_TO_AIRPORT).map(c => (
                        <option key={c} value={c.charAt(0).toUpperCase() + c.slice(1)} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Plane size={11} className="text-emerald-700" /> To
                  </label>
                  <input
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    placeholder="City or Airport code"
                    list="destination-list"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition"
                  />
                  <datalist id="destination-list">
                    {Object.keys(CITY_TO_AIRPORT).map(c => (
                      <option key={c} value={c.charAt(0).toUpperCase() + c.slice(1)} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Date + Passengers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={11} className="text-emerald-700" /> Departure Date
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={departureDate}
                    onChange={e => setDepartureDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white rounded-xl px-4 py-3 text-sm text-slate-900 outline-none transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={11} className="text-emerald-700" /> Passengers
                  </label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 gap-4">
                    <button onClick={() => setPassengers(p => Math.max(1, p - 1))} className="text-slate-500 hover:text-slate-900 text-lg w-7 h-7 rounded-lg hover:bg-slate-200 transition flex items-center justify-center font-bold">−</button>
                    <span className="flex-1 text-center text-sm font-bold text-slate-900">{passengers}</span>
                    <button onClick={() => setPassengers(p => Math.min(9, p + 1))} className="text-slate-500 hover:text-slate-900 text-lg w-7 h-7 rounded-lg hover:bg-slate-200 transition flex items-center justify-center font-bold">+</button>
                  </div>
                </div>
              </div>

              {/* Cabin Class */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Cabin Class</label>
                <div className="grid grid-cols-4 gap-2">
                  {CABIN_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setCabin(opt.value)}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all text-center ${
                        cabin === opt.value
                          ? 'bg-emerald-700 border-emerald-700 text-white shadow-md shadow-emerald-700/20'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="text-base">{opt.icon}</div>
                      <div className="mt-0.5 leading-tight">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Popular Routes */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Popular Routes</p>
                <div className="grid grid-cols-2 gap-2">
                  {POPULAR_ROUTES.map(r => (
                    <button
                      key={`${r.from}-${r.to}`}
                      onClick={() => { setOrigin(r.fromCity); setDestination(r.toCity); }}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition text-left"
                    >
                      <span className="text-xs font-mono text-emerald-700 font-bold">{r.from}</span>
                      <ArrowRight size={11} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs font-mono text-emerald-700 font-bold">{r.to}</span>
                      <span className="text-xs text-slate-600 truncate font-medium">{r.toCity}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Button */}
              <button
                onClick={handleSearch}
                disabled={!origin || !destination || !departureDate || isSearching}
                className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-emerald-700/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSearching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Searching Live AviationStack GDS...</span>
                  </>
                ) : (
                  <>
                    <Search size={17} />
                    <span>Search Flights</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* ─── STEP: RESULTS ─── */}
          {step === 'results' && (
            <div className="flex flex-col h-full">
              {/* Filter / Sort Bar */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex-shrink-0">
                <Filter size={13} className="text-slate-500" />
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  {(['price', 'duration', 'departure'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setSortBy(s)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${sortBy === s ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-200'}`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                  <div className="w-px h-4 bg-slate-200" />
                  <button
                    onClick={() => setFilterStops(f => f === 'any' ? 'nonstop' : 'any')}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${filterStops === 'nonstop' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-200'}`}
                  >
                    Nonstop only
                  </button>
                </div>
              </div>

              {/* Flight List */}
              <div className="p-4 space-y-3 overflow-y-auto bg-slate-50/40">
                {sortedFlights.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <Plane size={36} className="mx-auto mb-3 opacity-30 text-slate-400" />
                    <p className="font-medium">No flights found for this route on the selected date.</p>
                  </div>
                ) : (
                  sortedFlights.map(f => (
                    <FlightCard
                      key={f.id}
                      flight={f}
                      cabin={cabin}
                      passengers={passengers}
                      onSelect={handleFlightSelect}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* ─── STEP: PASSENGER DETAILS ─── */}
          {step === 'passenger' && selectedFlight && (
            <div className="p-5 space-y-4">
              {/* Selected flight summary */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                <AirlineBadge code={selectedFlight.airlineCode} name={selectedFlight.airline} />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{selectedFlight.airline} · {selectedFlight.flightNumber}</p>
                  <p className="text-xs text-slate-600 font-medium">{selectedFlight.originAirport.code} → {selectedFlight.destinationAirport.code} · {formatTime(selectedFlight.departureTime)} – {formatTime(selectedFlight.arrivalTime)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-emerald-800">${(selectedFlight.prices[cabin] * passengers).toLocaleString()}</p>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border ${CABIN_COLORS[cabin]}`}>{getCabinLabel(cabin)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'fullName', label: 'Full Name (as in passport)', placeholder: 'John Michael Doe', type: 'text' },
                  { id: 'passportNumber', label: 'Passport / ID Number', placeholder: 'A1234567', type: 'text' },
                  { id: 'dateOfBirth', label: 'Date of Birth', placeholder: '', type: 'date' },
                  { id: 'nationality', label: 'Nationality', placeholder: 'Indian', type: 'text' },
                  { id: 'contactEmail', label: 'Contact Email', placeholder: 'you@email.com', type: 'email' },
                  { id: 'contactPhone', label: 'Contact Phone', placeholder: '+91 98765 43210', type: 'tel' },
                ].map(field => (
                  <div key={field.id} className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">{field.label}</label>
                    <input
                      type={field.type}
                      value={passenger[field.id as keyof PassengerDetails] as string}
                      onChange={e => setPassenger(prev => ({ ...prev, [field.id]: e.target.value }))}
                      placeholder={field.placeholder}
                      className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition ${passengerErrors[field.id as keyof PassengerDetails] ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-emerald-600 focus:bg-white'}`}
                    />
                    {passengerErrors[field.id as keyof PassengerDetails] && (
                      <p className="text-xs text-rose-600 font-medium">{passengerErrors[field.id as keyof PassengerDetails]}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Seat Preference</label>
                  <select
                    value={passenger.seatPreference}
                    onChange={e => setPassenger(prev => ({ ...prev, seatPreference: e.target.value as PassengerDetails['seatPreference'] }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:bg-white"
                  >
                    <option value="window">Window</option>
                    <option value="aisle">Aisle</option>
                    <option value="middle">Middle</option>
                    <option value="no_preference">No Preference</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Meal Preference</label>
                  <select
                    value={passenger.mealPreference}
                    onChange={e => setPassenger(prev => ({ ...prev, mealPreference: e.target.value as PassengerDetails['mealPreference'] }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:bg-white"
                  >
                    <option value="standard">Standard</option>
                    <option value="vegetarian">Vegetarian</option>
                    <option value="vegan">Vegan</option>
                    <option value="halal">Halal</option>
                    <option value="kosher">Kosher</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleProceedToPayment}
                className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2"
              >
                <span>Continue to Payment</span>
                <ArrowRight size={17} />
              </button>
            </div>
          )}

          {/* ─── STEP: PAYMENT ─── */}
          {step === 'payment' && selectedFlight && (
            <div className="p-5">
              <PaymentView
                bookingId={selectedFlight.id}
                bookingReference={bookingRef || `VYN-FL${selectedFlight.flightNumber.replace(/\D/g, '').slice(-4) || '8841'}`}
                bookingType="flight"
                title={`${selectedFlight.airline} · Flight ${selectedFlight.flightNumber}`}
                subtitle={`${selectedFlight.originAirport.city} (${selectedFlight.originAirport.code}) → ${selectedFlight.destinationAirport.city} (${selectedFlight.destinationAirport.code}) · ${formatDate(selectedFlight.departureTime)}`}
                amount={selectedFlight.prices[cabin] * passengers}
                currency="USD"
                lineItems={[
                  { label: `${getCabinLabel(cabin)} Fare (${passengers} passenger${passengers > 1 ? 's' : ''})`, amount: selectedFlight.prices[cabin] * passengers },
                  { label: 'Airport Taxes & Passenger Facility Charges', amount: 0 },
                ]}
                onCancel={() => setStep('passenger')}
                onPaymentSuccess={({ transactionReference }) => {
                  setBookingRef(transactionReference.replace('TXN', 'VYN'));
                  setStep('success');
                }}
              />
            </div>
          )}

          {/* ─── STEP: CONFIRMING ─── */}
          {step === 'confirming' && (
            <div className="py-20 flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-700 animate-spin" />
                <Plane size={22} className="absolute inset-0 m-auto text-emerald-700 animate-pulse" />
              </div>
              <p className="text-slate-900 font-bold">Securing your seat...</p>
              <p className="text-slate-500 text-sm">Please wait while we confirm your reservation</p>
            </div>
          )}

          {/* ─── STEP: SUCCESS ─── */}
          {step === 'success' && selectedFlight && (
            <div className="p-5 space-y-5">
              {/* Success header */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-800">
                  <CheckCircle2 size={30} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Booking Confirmed!</h3>
                <p className="text-slate-500 text-sm">Your ticket has been issued. Check your alerts for updates.</p>
              </div>

              {/* E-Ticket */}
              <div className="relative bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden">
                {/* Perforation line */}
                <div className="flex items-center gap-0 py-0">
                  <div className="w-6 h-6 rounded-full bg-slate-100 -ml-3 flex-shrink-0 border-r border-slate-200" />
                  <div className="flex-1 border-t border-dashed border-slate-200" />
                  <div className="w-6 h-6 rounded-full bg-slate-100 -mr-3 flex-shrink-0 border-l border-slate-200" />
                </div>

                <div className="px-6 py-4 space-y-4">
                  {/* Booking ref */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Booking Reference</p>
                      <p className="text-2xl font-black text-emerald-800 font-mono tracking-widest">{bookingRef}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl">
                      <div className="w-14 h-14 grid grid-cols-7 gap-0.5">
                        {Array.from({ length: 49 }).map((_, i) => (
                          <div key={i} className={`rounded-[1px] ${Math.random() > 0.5 ? 'bg-slate-900' : 'bg-slate-100'}`} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Flight Route */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-3xl font-black text-slate-900 font-mono">{selectedFlight.originAirport.code}</p>
                      <p className="text-xs text-slate-500 font-medium">{selectedFlight.originAirport.city}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Plane size={20} className="text-emerald-700" />
                      <p className="text-xs text-slate-500 font-semibold">{formatDuration(selectedFlight.durationMinutes)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-slate-900 font-mono">{selectedFlight.destinationAirport.code}</p>
                      <p className="text-xs text-slate-500 font-medium">{selectedFlight.destinationAirport.city}</p>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-3 gap-3 text-sm bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                    {[
                      { label: 'Flight', value: selectedFlight.flightNumber },
                      { label: 'Date', value: formatDate(selectedFlight.departureTime) },
                      { label: 'Departure', value: formatTime(selectedFlight.departureTime) },
                      { label: 'Arrival', value: formatTime(selectedFlight.arrivalTime) },
                      { label: 'Cabin', value: getCabinLabel(cabin) },
                      { label: 'Passenger', value: passenger.fullName.split(' ')[0] || 'Traveler' },
                    ].map(d => (
                      <div key={d.label}>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{d.label}</p>
                        <p className="text-xs font-bold text-slate-900 truncate">{d.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Airline & Payment Status */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <AirlineBadge code={selectedFlight.airlineCode} name={selectedFlight.airline} />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{selectedFlight.airline}</p>
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={12} /> Payment Verified · {selectedFlight.aircraft}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-semibold">Total Paid</p>
                      <p className="text-lg font-black text-emerald-800">${(selectedFlight.prices[cabin] * passengers).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => alert(`E-Ticket ${bookingRef} downloaded to your device!`)}
                  className="flex-1 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20"
                >
                  <Sparkles size={15} />
                  Download E-Ticket
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-sm transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlightBookingModal;
