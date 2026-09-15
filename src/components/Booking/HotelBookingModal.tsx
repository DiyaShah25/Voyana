import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, MapPin, Calendar, Users, ArrowRight, Search,
  Filter, X, CheckCircle2, Star, Wifi, Coffee, Sparkles,
  BedDouble, BedSingle, ShieldCheck, Heart, Bath,
} from 'lucide-react';
import {
  searchHotels,
  bookHotel,
  calculateNights,
  formatDateRange,
  formatShortDate,
  SEED_HOTELS,
  type Hotel,
  type RoomType,
  type GuestDetails,
} from '@/services/hotelService';
import { PaymentView } from '@/components/Payment/PaymentModal';

// ─── Step types ─────────────────────────────────────────────────────────────
type Step = 'search' | 'results' | 'guest' | 'payment' | 'confirming' | 'success';

// ─── Room Type Config ───────────────────────────────────────────────────────
const ROOM_TYPES: { value: RoomType; label: string; icon: string; desc: string }[] = [
  { value: 'Standard', label: 'Standard Room', icon: '🛏️', desc: 'Cozy queen bed & city view' },
  { value: 'Deluxe', label: 'Deluxe Room', icon: '✨', desc: 'Spacious king bed with luxury bath' },
  { value: 'Executive Suite', label: 'Executive Suite', icon: '🛋️', desc: 'Separate lounge & panoramic view' },
  { value: 'Presidential Suite', label: 'Presidential Suite', icon: '👑', desc: 'Full luxury suite with butler service' },
];

const POPULAR_DESTINATIONS = [
  { city: 'Paris', country: 'France', hotelCount: '4 luxury properties' },
  { city: 'Tokyo', country: 'Japan', hotelCount: '3 prime stays' },
  { city: 'Dubai', country: 'UAE', hotelCount: '3 iconic resorts' },
  { city: 'New York', country: 'USA', hotelCount: '3 landmark hotels' },
  { city: 'Ahmedabad', country: 'India', hotelCount: '3 heritage & modern stays' },
  { city: 'London', country: 'UK', hotelCount: 'River Thames luxury' },
];

// ─── Hotel Card Component ───────────────────────────────────────────────────
function HotelCard({
  hotel,
  roomType,
  nights,
  rooms,
  guests,
  onSelect,
}: {
  hotel: Hotel;
  roomType: RoomType;
  nights: number;
  rooms: number;
  guests: number;
  onSelect: (h: Hotel) => void;
}) {
  const nightlyRate = hotel.roomRates[roomType] || hotel.baseNightlyRate;
  const totalPrice = nightlyRate * nights * rooms;

  return (
    <div
      onClick={() => onSelect(hotel)}
      className="group relative bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-indigo-400/40 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10 flex flex-col md:flex-row"
    >
      {/* Hotel Image */}
      <div className="relative md:w-56 h-48 md:h-auto flex-shrink-0 overflow-hidden">
        <img
          src={hotel.imageUrl}
          alt={hotel.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 text-xs font-semibold text-amber-300">
          <Star size={12} className="fill-amber-400 text-amber-400" />
          <span>{hotel.starRating.toFixed(1)}</span>
        </div>
        <div className="absolute bottom-3 left-3 bg-indigo-950/80 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-indigo-400/30 text-[11px] font-medium text-indigo-300">
          {hotel.city}
        </div>
      </div>

      {/* Hotel Details */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                {hotel.name}
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin size={12} className="text-indigo-400 flex-shrink-0" />
                <span className="truncate">{hotel.address}</span>
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-emerald-400 text-xs font-bold">
                <span>{hotel.reviewScore}</span>
                <span className="text-[10px] text-emerald-400/80">/10</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{hotel.reviewCount} reviews</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 mt-2.5 line-clamp-2 leading-relaxed">
            {hotel.description}
          </p>

          {/* Amenities Pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {hotel.amenities.slice(0, 4).map((amenity) => (
              <span
                key={amenity}
                className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-slate-300"
              >
                {amenity}
              </span>
            ))}
            {hotel.amenities.length > 4 && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-md text-slate-400">
                +{hotel.amenities.length - 4} more
              </span>
            )}
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">
              <span className="text-white font-bold text-lg">${nightlyRate.toLocaleString()}</span> / night
            </p>
            <p className="text-[11px] text-indigo-300 font-medium">
              ${totalPrice.toLocaleString()} total for {nights} night{nights > 1 ? 's' : ''}, {rooms} room{rooms > 1 ? 's' : ''}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(hotel);
            }}
            className="text-xs font-semibold text-white bg-indigo-600/80 hover:bg-indigo-600 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            Select Room <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Modal Component ───────────────────────────────────────────────────
interface HotelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDestination?: string;
}

export const HotelBookingModal: React.FC<HotelBookingModalProps> = ({
  isOpen,
  onClose,
  initialDestination,
}) => {
  const [step, setStep] = useState<Step>('search');
  const [location, setLocation] = useState(initialDestination || 'Paris');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [roomType, setRoomType] = useState<RoomType>('Standard');
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [bookingRef, setBookingRef] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'name'>('rating');
  const [filterStars, setFilterStars] = useState<number | null>(null);

  const [guest, setGuest] = useState<GuestDetails>({
    fullName: '',
    passportOrId: '',
    contactEmail: '',
    contactPhone: '',
    nationality: '',
    bedPreference: 'king',
    specialRequests: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof GuestDetails, string>>>({});

  // Setup default dates: check-in in 2 days, check-out in 5 days
  useEffect(() => {
    const now = new Date();
    const inD = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2);
    const outD = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 5);
    setCheckInDate(inD.toISOString().split('T')[0]);
    setCheckOutDate(outD.toISOString().split('T')[0]);
  }, []);

  // Update location when initialDestination changes
  useEffect(() => {
    if (initialDestination) {
      setLocation(initialDestination);
    }
  }, [initialDestination]);

  const nights = calculateNights(checkInDate, checkOutDate);
  const today = new Date().toISOString().split('T')[0];

  const handleSearch = useCallback(async () => {
    if (!location.trim() || !checkInDate || !checkOutDate) return;
    const results = await searchHotels(location, checkInDate, checkOutDate, guests, rooms, roomType);
    setHotels(results);
    setStep('results');
  }, [location, checkInDate, checkOutDate, guests, rooms, roomType]);

  const sortedHotels = [...hotels]
    .filter((h) => (filterStars ? h.starRating >= filterStars : true))
    .sort((a, b) => {
      if (sortBy === 'price') {
        const rateA = a.roomRates[roomType] || a.baseNightlyRate;
        const rateB = b.roomRates[roomType] || b.baseNightlyRate;
        return rateA - rateB;
      }
      if (sortBy === 'rating') {
        return b.starRating - a.starRating || b.reviewScore - a.reviewScore;
      }
      return a.name.localeCompare(b.name);
    });

  const handleHotelSelect = (h: Hotel) => {
    setSelectedHotel(h);
    setStep('guest');
  };

  const validateGuest = (): boolean => {
    const errs: Partial<Record<keyof GuestDetails, string>> = {};
    if (!guest.fullName.trim()) errs.fullName = 'Full name is required.';
    if (!guest.passportOrId.trim()) errs.passportOrId = 'ID or passport number is required.';
    if (!guest.contactEmail.includes('@')) errs.contactEmail = 'A valid email is required.';
    if (!guest.contactPhone.trim()) errs.contactPhone = 'Phone number is required.';
    if (!guest.nationality.trim()) errs.nationality = 'Nationality is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProceedToPayment = () => {
    if (!selectedHotel || !validateGuest()) return;
    setStep('payment');
  };

  const handleClose = () => {
    setStep('search');
    setHotels([]);
    setSelectedHotel(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden animate-in fade-in zoom-in-95 duration-300">

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                {step === 'search' && 'Search Hotels & Resorts'}
                {step === 'results' && 'Available Accommodations'}
                {step === 'guest' && 'Guest & Reservation Details'}
                {step === 'payment' && 'Payment & Checkout'}
                {step === 'confirming' && 'Securing Hotel Reservation...'}
                {step === 'success' && 'Hotel Reservation Confirmed!'}
              </h2>
              <p className="text-xs text-slate-400">
                {step === 'search' && 'Handpicked luxury and boutique stays across the globe'}
                {step === 'results' && `${sortedHotels.length} properties found · ${formatDateRange(checkInDate, checkOutDate)}`}
                {step === 'guest' && `${selectedHotel?.name} · ${roomType}`}
                {step === 'payment' && `Pay securely for your stay at ${selectedHotel?.name}`}
                {step === 'confirming' && 'Locking in your room and dates...'}
                {step === 'success' && 'Your luxury stay is confirmed and voucher issued'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(step === 'results' || step === 'guest' || step === 'payment') && (
              <button
                onClick={() => {
                  if (step === 'payment') setStep('guest');
                  else if (step === 'guest') setStep('results');
                  else setStep('search');
                }}
                className="text-xs text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
              >
                ← Back
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ─── STEP: SEARCH ─── */}
          {step === 'search' && (
            <div className="p-5 space-y-5">
              {/* Destination Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={11} className="text-indigo-400" /> Destination City
                </label>
                <div className="relative">
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter city name (e.g. Paris, Tokyo, Dubai, New York, Ahmedabad)"
                    list="hotel-dest-list"
                    className="w-full bg-white/5 border border-white/10 focus:border-indigo-400/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition"
                  />
                  <datalist id="hotel-dest-list">
                    {Object.keys(SEED_HOTELS).map((city) => (
                      <option key={city} value={city} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Check-In / Check-Out Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={11} className="text-indigo-400" /> Check-in Date
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={checkInDate}
                    onChange={(e) => {
                      setCheckInDate(e.target.value);
                      if (e.target.value >= checkOutDate) {
                        const nextD = new Date(new Date(e.target.value).getTime() + 1000 * 60 * 60 * 24 * 2);
                        setCheckOutDate(nextD.toISOString().split('T')[0]);
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 focus:border-indigo-400/60 rounded-xl px-4 py-3 text-sm text-white outline-none transition [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={11} className="text-indigo-400" /> Check-out Date
                  </label>
                  <input
                    type="date"
                    min={checkInDate || today}
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 focus:border-indigo-400/60 rounded-xl px-4 py-3 text-sm text-white outline-none transition [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Rooms & Guests */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={11} className="text-indigo-400" /> Guests
                  </label>
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 gap-4">
                    <button
                      type="button"
                      onClick={() => setGuests((g) => Math.max(1, g - 1))}
                      className="text-slate-400 hover:text-white text-lg w-7 h-7 rounded-lg hover:bg-white/10 transition flex items-center justify-center font-bold"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center text-sm font-semibold text-white">
                      {guests} Guest{guests > 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => setGuests((g) => Math.min(10, g + 1))}
                      className="text-slate-400 hover:text-white text-lg w-7 h-7 rounded-lg hover:bg-white/10 transition flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <BedDouble size={11} className="text-indigo-400" /> Rooms
                  </label>
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 gap-4">
                    <button
                      type="button"
                      onClick={() => setRooms((r) => Math.max(1, r - 1))}
                      className="text-slate-400 hover:text-white text-lg w-7 h-7 rounded-lg hover:bg-white/10 transition flex items-center justify-center font-bold"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center text-sm font-semibold text-white">
                      {rooms} Room{rooms > 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRooms((r) => Math.min(5, r + 1))}
                      className="text-slate-400 hover:text-white text-lg w-7 h-7 rounded-lg hover:bg-white/10 transition flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Room Category Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Preferred Room Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ROOM_TYPES.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRoomType(opt.value)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        roomType === opt.value
                          ? 'bg-indigo-600/40 border-indigo-400/60 text-white shadow-lg shadow-indigo-500/20'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="text-base">{opt.icon}</div>
                      <div className="mt-1 text-xs font-semibold leading-tight text-white">{opt.label}</div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Popular Hotel Destinations */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Popular Hotel Destinations
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {POPULAR_DESTINATIONS.map((d) => (
                    <button
                      key={d.city}
                      type="button"
                      onClick={() => setLocation(d.city)}
                      className="flex flex-col p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/8 hover:border-white/20 transition text-left"
                    >
                      <span className="text-xs font-bold text-indigo-300">{d.city}</span>
                      <span className="text-[10px] text-slate-400">{d.country} · {d.hotelCount}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Button */}
              <button
                type="button"
                onClick={handleSearch}
                disabled={!location.trim() || !checkInDate || !checkOutDate}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm tracking-wide hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Search size={17} />
                Search Hotels ({nights} night{nights > 1 ? 's' : ''})
              </button>
            </div>
          )}

          {/* ─── STEP: RESULTS ─── */}
          {step === 'results' && (
            <div className="flex flex-col h-full">
              {/* Filter / Sort Bar */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-white/8 bg-white/[0.02] flex-shrink-0 flex-wrap">
                <Filter size={13} className="text-slate-400" />
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  {(['rating', 'price', 'name'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSortBy(s)}
                      className={`text-xs px-3 py-1 rounded-lg font-medium transition ${
                        sortBy === s
                          ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/40'
                          : 'text-slate-400 hover:text-white bg-white/5 border border-transparent'
                      }`}
                    >
                      {s === 'rating' ? 'Top Rated' : s === 'price' ? 'Price: Low to High' : 'Name'}
                    </button>
                  ))}
                  <div className="w-px h-4 bg-white/15" />
                  <button
                    type="button"
                    onClick={() => setFilterStars((curr) => (curr === 5 ? null : 5))}
                    className={`text-xs px-3 py-1 rounded-lg font-medium transition ${
                      filterStars === 5
                        ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-white bg-white/5 border border-transparent'
                    }`}
                  >
                    ⭐ 5-Star Only
                  </button>
                </div>
              </div>

              {/* Hotels List */}
              <div className="p-4 space-y-3 overflow-y-auto">
                {sortedHotels.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Building2 size={36} className="mx-auto mb-3 opacity-30" />
                    <p>No hotels found in "{location}". Try searching for Paris, Tokyo, Dubai, New York, or Ahmedabad.</p>
                  </div>
                ) : (
                  sortedHotels.map((h) => (
                    <HotelCard
                      key={h.id}
                      hotel={h}
                      roomType={roomType}
                      nights={nights}
                      rooms={rooms}
                      guests={guests}
                      onSelect={handleHotelSelect}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* ─── STEP: GUEST DETAILS ─── */}
          {step === 'guest' && selectedHotel && (
            <div className="p-5 space-y-4">
              {/* Selected Hotel Summary Card */}
              <div className="bg-indigo-600/10 border border-indigo-400/25 rounded-2xl p-3.5 flex items-center gap-3">
                <img
                  src={selectedHotel.imageUrl}
                  alt={selectedHotel.name}
                  className="w-16 h-16 rounded-xl object-cover border border-white/10"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{selectedHotel.name}</p>
                  <p className="text-xs text-slate-300">
                    {roomType} · {formatDateRange(checkInDate, checkOutDate)} ({nights} night{nights > 1 ? 's' : ''})
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {rooms} room{rooms > 1 ? 's' : ''}, {guests} guest{guests > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-indigo-300">
                    ${((selectedHotel.roomRates[roomType] || selectedHotel.baseNightlyRate) * nights * rooms).toLocaleString()}
                  </p>
                  <span className="text-[11px] px-2 py-0.5 rounded-full border bg-indigo-600/30 text-indigo-300 border-indigo-500/40">
                    ${(selectedHotel.roomRates[roomType] || selectedHotel.baseNightlyRate).toLocaleString()} / night
                  </span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'fullName', label: 'Primary Guest Full Name', placeholder: 'Alexander Wright', type: 'text' },
                  { id: 'passportOrId', label: 'Passport / Government ID', placeholder: 'P1239847', type: 'text' },
                  { id: 'contactEmail', label: 'Contact Email', placeholder: 'guest@voyana.com', type: 'email' },
                  { id: 'contactPhone', label: 'Mobile Phone', placeholder: '+1 555-0149', type: 'tel' },
                  { id: 'nationality', label: 'Nationality', placeholder: 'United States', type: 'text' },
                ].map((field) => (
                  <div key={field.id} className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">{field.label}</label>
                    <input
                      type={field.type}
                      value={guest[field.id as keyof GuestDetails] as string}
                      onChange={(e) => setGuest((prev) => ({ ...prev, [field.id]: e.target.value }))}
                      placeholder={field.placeholder}
                      className={`w-full bg-white/5 border rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition [color-scheme:dark] ${
                        errors[field.id as keyof GuestDetails] ? 'border-rose-500/60' : 'border-white/10 focus:border-indigo-400/60'
                      }`}
                    />
                    {errors[field.id as keyof GuestDetails] && (
                      <p className="text-xs text-rose-400">{errors[field.id as keyof GuestDetails]}</p>
                    )}
                  </div>
                ))}

                {/* Bed Preference */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Bed Preference</label>
                  <select
                    value={guest.bedPreference}
                    onChange={(e) =>
                      setGuest((prev) => ({ ...prev, bedPreference: e.target.value as GuestDetails['bedPreference'] }))
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none transition [color-scheme:dark]"
                  >
                    <option value="king">1 King Bed</option>
                    <option value="twin">2 Twin Beds</option>
                    <option value="single">Single Bed</option>
                    <option value="no_preference">No Preference</option>
                  </select>
                </div>
              </div>

              {/* Special Requests */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Special Requests / Check-in Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={guest.specialRequests}
                  onChange={(e) => setGuest((prev) => ({ ...prev, specialRequests: e.target.value }))}
                  placeholder="Late check-in, high floor, quiet room, honeymoon setup..."
                  className="w-full bg-white/5 border border-white/10 focus:border-indigo-400/60 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleProceedToPayment}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm tracking-wide hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
              >
                <span>Continue to Payment</span>
                <ArrowRight size={17} />
              </button>
            </div>
          )}

          {/* ─── STEP: PAYMENT ─── */}
          {step === 'payment' && selectedHotel && (
            <div className="p-5">
              <PaymentView
                bookingId={selectedHotel.id}
                bookingReference={bookingRef || `VYN-HT${selectedHotel.id.replace(/\D/g, '').slice(-4) || '9231'}`}
                bookingType="hotel"
                title={selectedHotel.name}
                subtitle={`${roomType} · ${formatDateRange(checkInDate, checkOutDate)} (${nights} night${nights > 1 ? 's' : ''}, ${rooms} room${rooms > 1 ? 's' : ''})`}
                amount={(selectedHotel.roomRates[roomType] || selectedHotel.baseNightlyRate) * nights * rooms}
                currency="USD"
                lineItems={[
                  {
                    label: `${roomType} (${nights} night${nights > 1 ? 's' : ''} × ${rooms} room${rooms > 1 ? 's' : ''})`,
                    amount: (selectedHotel.roomRates[roomType] || selectedHotel.baseNightlyRate) * nights * rooms,
                  },
                  { label: 'City Occupancy Tax & Service Charges', amount: 0 },
                ]}
                onCancel={() => setStep('guest')}
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
                <div className="w-16 h-16 rounded-full border-4 border-indigo-600/30 border-t-indigo-500 animate-spin" />
                <Building2 size={22} className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
              </div>
              <p className="text-white font-semibold">Reserving your hotel room...</p>
              <p className="text-slate-400 text-sm">Please wait while we confirm your reservation with the property</p>
            </div>
          )}

          {/* ─── STEP: SUCCESS ─── */}
          {step === 'success' && selectedHotel && (
            <div className="p-5 space-y-5">
              {/* Success Header */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={30} className="text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Hotel Booking Confirmed!</h3>
                <p className="text-slate-400 text-sm">Your reservation has been locked in. Check your alerts panel for updates.</p>
              </div>

              {/* Luxury Hotel Voucher Card */}
              <div className="relative bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-violet-950/80 border border-indigo-400/30 rounded-3xl overflow-hidden">
                {/* Perforation Line */}
                <div className="flex items-center gap-0 py-0">
                  <div className="w-6 h-6 rounded-full bg-slate-900 -ml-3 flex-shrink-0" />
                  <div className="flex-1 border-t border-dashed border-white/15" />
                  <div className="w-6 h-6 rounded-full bg-slate-900 -mr-3 flex-shrink-0" />
                </div>

                <div className="px-6 py-4 space-y-4">
                  {/* Voucher Header & Ref */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-widest">Reservation Voucher</p>
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

                  {/* Property Banner */}
                  <div className="flex items-center justify-between border-y border-white/10 py-3">
                    <div>
                      <p className="text-xl font-bold text-white">{selectedHotel.name}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={11} className="text-indigo-400" /> {selectedHotel.address}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-500/30 text-amber-300 text-xs font-semibold">
                      <Star size={12} className="fill-amber-400 text-amber-400" /> {selectedHotel.starRating.toFixed(1)}
                    </div>
                  </div>

                  {/* Stay Details Grid */}
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    {[
                      { label: 'Check-In', value: formatShortDate(checkInDate) },
                      { label: 'Check-Out', value: formatShortDate(checkOutDate) },
                      { label: 'Duration', value: `${nights} Night${nights > 1 ? 's' : ''}` },
                      { label: 'Room Type', value: roomType },
                      { label: 'Rooms / Guests', value: `${rooms} Room · ${guests} Guests` },
                      { label: 'Lead Guest', value: guest.fullName.split(' ')[0] || 'Traveler' },
                    ].map((d) => (
                      <div key={d.label}>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{d.label}</p>
                        <p className="text-xs font-semibold text-white truncate">{d.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Total Paid */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-300">Status: Guaranteed</p>
                      <p className="text-[11px] text-slate-400">Free cancellation up to 24h prior to check-in</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Total Paid</p>
                      <p className="text-lg font-black text-emerald-400">
                        ${((selectedHotel.roomRates[roomType] || selectedHotel.baseNightlyRate) * nights * rooms).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close / Done */}
              <button
                type="button"
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

export default HotelBookingModal;
