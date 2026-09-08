import React, { useState, useEffect, useCallback } from 'react';
import {
  Plane, MapPin, Calendar, Users, ArrowRight, Search,
  Filter, X, CheckCircle2,
  Luggage, Wifi, Coffee,
} from 'lucide-react';
import {
  generateMockFlights,
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

// ─── Step types ─────────────────────────────────────────────────────────────
type Step = 'search' | 'results' | 'passenger' | 'confirming' | 'success';

// ─── Cabin Badge ─────────────────────────────────────────────────────────────
const CABIN_COLORS: Record<CabinClass, string> = {
  economy: 'bg-slate-600/40 text-slate-300 border-slate-600/50',
  premium_economy: 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40',
  business: 'bg-amber-600/25 text-amber-300 border-amber-500/40',
  first: 'bg-violet-600/25 text-violet-300 border-violet-500/40',
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
      className="group relative bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-indigo-400/40 rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10"
    >
      {/* Airline info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AirlineBadge code={flight.airlineCode} name={flight.airline} />
          <div>
            <p className="text-sm font-semibold text-white">{flight.airline}</p>
            <p className="text-xs text-slate-400 font-mono">{flight.flightNumber} · {flight.aircraft}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-white">${price.toLocaleString()}</p>
          {passengers > 1 && <p className="text-xs text-slate-400">${perPax.toLocaleString()} / person</p>}
        </div>
      </div>

      {/* Route timeline */}
      <div className="mt-4 flex items-center gap-3">
        <div className="text-center flex-shrink-0">
          <p className="text-2xl font-bold text-white font-mono">{formatTime(flight.departureTime)}</p>
          <p className="text-xs text-slate-400 font-bold">{flight.originAirport.code}</p>
        </div>

        <div className="flex-1 flex flex-col items-center gap-1">
          <p className="text-xs text-slate-400">{formatDuration(flight.durationMinutes)}</p>
          <div className="w-full flex items-center gap-1">
            <div className="h-px bg-gradient-to-r from-indigo-500/50 to-transparent flex-1" />
            <Plane size={14} className="text-indigo-400 -rotate-0 flex-shrink-0" />
            <div className="h-px bg-gradient-to-l from-indigo-500/50 to-transparent flex-1" />
          </div>
          <p className="text-xs text-slate-400">
            {flight.stops === 0 ? (
              <span className="text-emerald-400 font-semibold">Nonstop</span>
            ) : (
              <span className="text-amber-400">{flight.stops} stop</span>
            )}
          </p>
        </div>

        <div className="text-center flex-shrink-0">
          <p className="text-2xl font-bold text-white font-mono">{formatTime(flight.arrivalTime)}</p>
          <p className="text-xs text-slate-400 font-bold">{flight.destinationAirport.code}</p>
        </div>
      </div>

      {/* Cabin + Seats + Amenities */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${CABIN_COLORS[cabin]}`}>
            {getCabinLabel(cabin)}
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Luggage size={11} />
            {cabin === 'economy' ? '23kg' : cabin === 'premium_economy' ? '32kg' : '50kg'}
          </span>
          {cabin !== 'economy' && (
            <span className="text-xs text-slate-400 flex items-center gap-1"><Wifi size={11} />WiFi</span>
          )}
          {(cabin === 'business' || cabin === 'first') && (
            <span className="text-xs text-slate-400 flex items-center gap-1"><Coffee size={11} />Meal</span>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onSelect(flight); }}
          className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1 transition"
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
  { from: 'BOM', to: 'LHR', fromCity: 'Mumbai', toCity: 'London' },
  { from: 'CDG', to: 'HND', fromCity: 'Paris', toCity: 'Tokyo' },
  { from: 'JFK', to: 'LHR', fromCity: 'New York', toCity: 'London' },
  { from: 'SIN', to: 'SYD', fromCity: 'Singapore', toCity: 'Sydney' },
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
  const [passengerErrors, setPassengerErrors] = useState<Partial<Record<keyof PassengerDetails, string>>>({});

  // Set min date to today
  const today = new Date().toISOString().split('T')[0];

  // Pre-fill destination when initialDestination changes
  useEffect(() => {
    if (initialDestination) {
      const code = resolveAirportCode(initialDestination) || initialDestination.toUpperCase().slice(0, 3);
      setDestination(code);
    }
  }, [initialDestination]);

  const handleSearch = useCallback(() => {
    const resolvedOrigin = resolveAirportCode(origin) || origin.toUpperCase().slice(0, 3);
    const resolvedDest = resolveAirportCode(destination) || destination.toUpperCase().slice(0, 3);

    if (!AIRPORTS[resolvedOrigin] || !AIRPORTS[resolvedDest]) return;
    if (!departureDate) return;

    const results = generateMockFlights({
      originCode: resolvedOrigin,
      destinationCode: resolvedDest,
      departureDate,
      passengers,
      cabinClass: cabin,
    });
    setFlights(results);
    setStep('results');
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

  const handleConfirmBooking = async () => {
    if (!selectedFlight || !validatePassenger()) return;
    setStep('confirming');
    const result = await createFlightBooking(selectedFlight, passenger, cabin, passengers);
    if (result.success && result.bookingReference) {
      setBookingRef(result.bookingReference);
      setStep('success');
    }
  };

  const handleClose = () => {
    setStep('search');
    setFlights([]);
    setSelectedFlight(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden animate-in fade-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
              <Plane size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                {step === 'search' && 'Search Flights'}
                {step === 'results' && 'Available Flights'}
                {step === 'passenger' && 'Passenger Details'}
                {step === 'confirming' && 'Confirming Booking...'}
                {step === 'success' && 'Booking Confirmed!'}
              </h2>
              <p className="text-xs text-slate-400">
                {step === 'search' && 'Find the best fares worldwide'}
                {step === 'results' && `${sortedFlights.length} flights found · ${formatDate(departureDate)}`}
                {step === 'passenger' && `${selectedFlight?.airline} ${selectedFlight?.flightNumber}`}
                {step === 'confirming' && 'Securing your reservation...'}
                {step === 'success' && 'Bon voyage! Your ticket is ready'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(step === 'results' || step === 'passenger') && (
              <button
                onClick={() => setStep(step === 'passenger' ? 'results' : 'search')}
                className="text-xs text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
              >
                ← Back
              </button>
            )}
            <button onClick={handleClose} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition">
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
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={11} className="text-indigo-400" /> From
                  </label>
                  <div className="relative">
                    <input
                      value={origin}
                      onChange={e => setOrigin(e.target.value)}
                      placeholder="City or Airport code"
                      list="origin-list"
                      className="w-full bg-white/5 border border-white/10 focus:border-indigo-400/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition"
                    />
                    <datalist id="origin-list">
                      {Object.keys(CITY_TO_AIRPORT).map(c => (
                        <option key={c} value={c.charAt(0).toUpperCase() + c.slice(1)} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Plane size={11} className="text-indigo-400" /> To
                  </label>
                  <input
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    placeholder="City or Airport code"
                    list="destination-list"
                    className="w-full bg-white/5 border border-white/10 focus:border-indigo-400/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition"
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
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={11} className="text-indigo-400" /> Departure Date
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={departureDate}
                    onChange={e => setDepartureDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 focus:border-indigo-400/60 rounded-xl px-4 py-3 text-sm text-white outline-none transition [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={11} className="text-indigo-400" /> Passengers
                  </label>
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 gap-4">
                    <button onClick={() => setPassengers(p => Math.max(1, p - 1))} className="text-slate-400 hover:text-white text-lg w-7 h-7 rounded-lg hover:bg-white/10 transition flex items-center justify-center font-bold">−</button>
                    <span className="flex-1 text-center text-sm font-semibold text-white">{passengers}</span>
                    <button onClick={() => setPassengers(p => Math.min(9, p + 1))} className="text-slate-400 hover:text-white text-lg w-7 h-7 rounded-lg hover:bg-white/10 transition flex items-center justify-center font-bold">+</button>
                  </div>
                </div>
              </div>

              {/* Cabin Class */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Cabin Class</label>
                <div className="grid grid-cols-4 gap-2">
                  {CABIN_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setCabin(opt.value)}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all text-center ${
                        cabin === opt.value
                          ? 'bg-indigo-600/40 border-indigo-400/60 text-white shadow-lg shadow-indigo-500/20'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
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
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Popular Routes</p>
                <div className="grid grid-cols-2 gap-2">
                  {POPULAR_ROUTES.map(r => (
                    <button
                      key={`${r.from}-${r.to}`}
                      onClick={() => { setOrigin(r.fromCity); setDestination(r.toCity); }}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/8 hover:border-white/20 transition text-left"
                    >
                      <span className="text-xs font-mono text-indigo-400 font-bold">{r.from}</span>
                      <ArrowRight size={11} className="text-slate-500 flex-shrink-0" />
                      <span className="text-xs font-mono text-indigo-400 font-bold">{r.to}</span>
                      <span className="text-xs text-slate-400 truncate">{r.toCity}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Button */}
              <button
                onClick={handleSearch}
                disabled={!origin || !destination || !departureDate}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm tracking-wide hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Search size={17} />
                Search Flights
              </button>
            </div>
          )}

          {/* ─── STEP: RESULTS ─── */}
          {step === 'results' && (
            <div className="flex flex-col h-full">
              {/* Filter / Sort Bar */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-white/8 bg-white/[0.02] flex-shrink-0">
                <Filter size={13} className="text-slate-400" />
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  {(['price', 'duration', 'departure'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setSortBy(s)}
                      className={`text-xs px-3 py-1 rounded-lg font-medium transition ${sortBy === s ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/40' : 'text-slate-400 hover:text-white bg-white/5 border border-transparent'}`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                  <div className="w-px h-4 bg-white/15" />
                  <button
                    onClick={() => setFilterStops(f => f === 'any' ? 'nonstop' : 'any')}
                    className={`text-xs px-3 py-1 rounded-lg font-medium transition ${filterStops === 'nonstop' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white bg-white/5 border border-transparent'}`}
                  >
                    Nonstop only
                  </button>
                </div>
              </div>

              {/* Flight List */}
              <div className="p-4 space-y-3 overflow-y-auto">
                {sortedFlights.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Plane size={36} className="mx-auto mb-3 opacity-30" />
                    <p>No flights found for this route on the selected date.</p>
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
              <div className="bg-indigo-600/10 border border-indigo-400/25 rounded-2xl p-3.5 flex items-center gap-3">
                <AirlineBadge code={selectedFlight.airlineCode} name={selectedFlight.airline} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{selectedFlight.airline} · {selectedFlight.flightNumber}</p>
                  <p className="text-xs text-slate-300">{selectedFlight.originAirport.code} → {selectedFlight.destinationAirport.code} · {formatTime(selectedFlight.departureTime)} – {formatTime(selectedFlight.arrivalTime)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-indigo-300">${(selectedFlight.prices[cabin] * passengers).toLocaleString()}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${CABIN_COLORS[cabin]}`}>{getCabinLabel(cabin)}</span>
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
                    <label className="text-xs font-semibold text-slate-300">{field.label}</label>
                    <input
                      type={field.type}
                      value={passenger[field.id as keyof PassengerDetails] as string}
                      onChange={e => setPassenger(prev => ({ ...prev, [field.id]: e.target.value }))}
                      placeholder={field.placeholder}
                      className={`w-full bg-white/5 border rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition [color-scheme:dark] ${passengerErrors[field.id as keyof PassengerDetails] ? 'border-rose-500/60' : 'border-white/10 focus:border-indigo-400/60'}`}
                    />
                    {passengerErrors[field.id as keyof PassengerDetails] && (
                      <p className="text-xs text-rose-400">{passengerErrors[field.id as keyof PassengerDetails]}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Seat Preference</label>
                  <select
                    value={passenger.seatPreference}
                    onChange={e => setPassenger(prev => ({ ...prev, seatPreference: e.target.value as PassengerDetails['seatPreference'] }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none transition [color-scheme:dark]"
                  >
                    <option value="window">Window</option>
                    <option value="aisle">Aisle</option>
                    <option value="middle">Middle</option>
                    <option value="no_preference">No Preference</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Meal Preference</label>
                  <select
                    value={passenger.mealPreference}
                    onChange={e => setPassenger(prev => ({ ...prev, mealPreference: e.target.value as PassengerDetails['mealPreference'] }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none transition [color-scheme:dark]"
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
                onClick={handleConfirmBooking}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm tracking-wide hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={17} />
                Confirm Booking — ${(selectedFlight.prices[cabin] * passengers).toLocaleString()}
              </button>
            </div>
          )}

          {/* ─── STEP: CONFIRMING ─── */}
          {step === 'confirming' && (
            <div className="py-20 flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-600/30 border-t-indigo-500 animate-spin" />
                <Plane size={22} className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
              </div>
              <p className="text-white font-semibold">Securing your seat...</p>
              <p className="text-slate-400 text-sm">Please wait while we confirm your reservation</p>
            </div>
          )}

          {/* ─── STEP: SUCCESS ─── */}
          {step === 'success' && selectedFlight && (
            <div className="p-5 space-y-5">
              {/* Success header */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={30} className="text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Booking Confirmed!</h3>
                <p className="text-slate-400 text-sm">Your ticket has been issued. Check your alerts for updates.</p>
              </div>

              {/* E-Ticket */}
              <div className="relative bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-violet-950/80 border border-indigo-400/30 rounded-3xl overflow-hidden">
                {/* Perforation line */}
                <div className="flex items-center gap-0 py-0">
                  <div className="w-6 h-6 rounded-full bg-slate-900 -ml-3 flex-shrink-0" />
                  <div className="flex-1 border-t border-dashed border-white/15" />
                  <div className="w-6 h-6 rounded-full bg-slate-900 -mr-3 flex-shrink-0" />
                </div>

                <div className="px-6 py-4 space-y-4">
                  {/* Booking ref */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-widest">Booking Reference</p>
                      <p className="text-2xl font-black text-white font-mono tracking-widest">{bookingRef}</p>
                    </div>
                    <div className="bg-white p-2 rounded-xl">
                      <div className="w-14 h-14 grid grid-cols-7 gap-0.5">
                        {Array.from({ length: 49 }).map((_, i) => (
                          <div key={i} className={`rounded-[1px] ${Math.random() > 0.5 ? 'bg-black' : 'bg-white'}`} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Flight Route */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-black text-white font-mono">{selectedFlight.originAirport.code}</p>
                      <p className="text-xs text-slate-400">{selectedFlight.originAirport.city}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Plane size={20} className="text-indigo-400" />
                      <p className="text-xs text-slate-400">{formatDuration(selectedFlight.durationMinutes)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-white font-mono">{selectedFlight.destinationAirport.code}</p>
                      <p className="text-xs text-slate-400">{selectedFlight.destinationAirport.city}</p>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    {[
                      { label: 'Flight', value: selectedFlight.flightNumber },
                      { label: 'Date', value: formatDate(selectedFlight.departureTime) },
                      { label: 'Departure', value: formatTime(selectedFlight.departureTime) },
                      { label: 'Arrival', value: formatTime(selectedFlight.arrivalTime) },
                      { label: 'Cabin', value: getCabinLabel(cabin) },
                      { label: 'Passenger', value: passenger.fullName.split(' ')[0] || 'Traveler' },
                    ].map(d => (
                      <div key={d.label}>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{d.label}</p>
                        <p className="text-xs font-semibold text-white truncate">{d.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Airline */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-3">
                    <div className="flex items-center gap-2">
                      <AirlineBadge code={selectedFlight.airlineCode} name={selectedFlight.airline} />
                      <div>
                        <p className="text-xs font-semibold text-white">{selectedFlight.airline}</p>
                        <p className="text-xs text-slate-400">{selectedFlight.aircraft}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Total Paid</p>
                      <p className="text-lg font-black text-emerald-400">${(selectedFlight.prices[cabin] * passengers).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close */}
              <button
                onClick={handleClose}
                className="w-full py-3 rounded-2xl bg-white/8 hover:bg-white/15 border border-white/10 text-white font-semibold text-sm transition"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlightBookingModal;
