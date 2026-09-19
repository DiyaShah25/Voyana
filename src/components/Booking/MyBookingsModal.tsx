import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Plane, Building2, Car, Calendar, Users, MapPin,
  Clock, ArrowRight, X, CheckCircle2, AlertCircle, Search,
  Filter, SlidersHorizontal, Trash2, Edit3, ShieldCheck,
  RefreshCw, ChevronRight, Check, CreditCard, Sparkles,
  Info, QrCode
} from 'lucide-react';
import {
  getUserBookings,
  modifyBooking,
  cancelBooking,
  type UnifiedBooking,
  type BookingType,
  type BookingStatus,
  type BookingModificationInput,
} from '@/services/bookingService';
import { PaymentView } from '@/components/Payment/PaymentModal';

export interface MyBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onOpenFlightModal?: () => void;
  onOpenHotelModal?: () => void;
  onOpenTransportModal?: () => void;
}

type TabType = 'all' | 'flight' | 'hotel' | 'transport';
type StatusFilter = 'all' | 'confirmed' | 'pending' | 'cancelled';

export default function MyBookingsModal({
  isOpen,
  onClose,
  userId = 'usr-demo-01',
  onOpenFlightModal,
  onOpenHotelModal,
  onOpenTransportModal,
}: MyBookingsModalProps) {
  // State
  const [bookings, setBookings] = useState<UnifiedBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modifying State
  const [modifyingBooking, setModifyingBooking] = useState<UnifiedBooking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<UnifiedBooking | null>(null);
  const [voucherTarget, setVoucherTarget] = useState<UnifiedBooking | null>(null);

  // Modification Form Fields
  const [modCabinClass, setModCabinClass] = useState<string>('economy');
  const [modPassengers, setModPassengers] = useState<number>(1);
  const [modSpecialRequests, setModSpecialRequests] = useState<string>('');

  const [modCheckIn, setModCheckIn] = useState<string>('');
  const [modCheckOut, setModCheckOut] = useState<string>('');
  const [modRoomType, setModRoomType] = useState<string>('Standard');
  const [modRooms, setModRooms] = useState<number>(1);
  const [modGuests, setModGuests] = useState<number>(1);

  const [modTrpClass, setModTrpClass] = useState<string>('Standard');
  const [modTrpDate, setModTrpDate] = useState<string>('');
  const [modTrpPax, setModTrpPax] = useState<number>(1);
  const [modPickupNotes, setModPickupNotes] = useState<string>('');

  // Modification Sub-step & Payment Handshake
  const [modifyStep, setModifyStep] = useState<'form' | 'payment' | 'success'>('form');
  const [pendingDiff, setPendingDiff] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUserBookings(userId);
      setBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      loadBookings();
    }
  }, [isOpen, loadBookings]);

  if (!isOpen) return null;

  // Open Modification Dialog
  const handleOpenModify = (booking: UnifiedBooking) => {
    setModifyingBooking(booking);
    setModifyStep('form');

    if (booking.bookingType === 'flight' && booking.flightDetails) {
      setModCabinClass(booking.flightDetails.cabinClass || 'economy');
      setModPassengers(booking.flightDetails.passengers || 1);
      setModSpecialRequests(booking.specialRequests || '');
    } else if (booking.bookingType === 'hotel' && booking.hotelDetails) {
      setModCheckIn(booking.hotelDetails.checkInDate || '');
      setModCheckOut(booking.hotelDetails.checkOutDate || '');
      setModRoomType(booking.hotelDetails.roomType || 'Standard');
      setModRooms(booking.hotelDetails.numberOfRooms || 1);
      setModGuests(booking.hotelDetails.numberOfGuests || 1);
    } else if (booking.bookingType === 'transport' && booking.transportDetails) {
      setModTrpClass(booking.transportDetails.vehicleClass || 'Standard');
      setModTrpDate(booking.transportDetails.scheduledDeparture.split('T')[0] || '');
      setModTrpPax(booking.transportDetails.passengerCount || 1);
      setModPickupNotes(booking.transportDetails.pickupNotes || '');
    }
  };

  // Calculate live price difference preview
  const calculatePreviewDifference = (): number => {
    if (!modifyingBooking) return 0;

    if (modifyingBooking.bookingType === 'flight' && modifyingBooking.flightDetails) {
      const cabinMultiplier: Record<string, number> = {
        economy: 1,
        premium_economy: 1.5,
        business: 2.5,
        first: 4.0,
      };
      const oldMultiplier = cabinMultiplier[modifyingBooking.flightDetails.cabinClass] || 1;
      const newMultiplier = cabinMultiplier[modCabinClass] || 1;
      const baseFare = modifyingBooking.totalAmount / oldMultiplier / (modifyingBooking.flightDetails.passengers || 1);
      const newEst = Math.round(baseFare * newMultiplier * modPassengers);
      return newEst - modifyingBooking.totalAmount;
    }

    if (modifyingBooking.bookingType === 'hotel' && modifyingBooking.hotelDetails) {
      const roomTypeMultiplier: Record<string, number> = {
        'Standard': 1,
        'Deluxe': 1.4,
        'Executive Suite': 2.1,
        'Presidential Suite': 3.5,
      };
      const start = new Date(modCheckIn || modifyingBooking.hotelDetails.checkInDate).getTime();
      const end = new Date(modCheckOut || modifyingBooking.hotelDetails.checkOutDate).getTime();
      const nights = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      const baseNightly = modifyingBooking.hotelDetails.nightlyRate || 200;
      const mult = roomTypeMultiplier[modRoomType] || 1;
      const newEst = Math.round(baseNightly * mult * nights * modRooms);
      return newEst - modifyingBooking.totalAmount;
    }

    if (modifyingBooking.bookingType === 'transport' && modifyingBooking.transportDetails) {
      const classMultiplier: Record<string, number> = {
        'Standard': 1,
        'Standard Premier': 1.3,
        'Executive Luxury': 1.6,
        'VIP Luxury SUV': 2.0,
        'Green Car (First Class)': 1.8,
      };
      if (modifyingBooking.transportDetails.transportType === 'train' || modifyingBooking.transportDetails.transportType === 'bus') {
        const base = modifyingBooking.totalAmount / (modifyingBooking.transportDetails.passengerCount || 1);
        const newEst = Math.round(base * modTrpPax * (classMultiplier[modTrpClass] ? classMultiplier[modTrpClass] / 1.3 : 1));
        return newEst - modifyingBooking.totalAmount;
      }
      const newEst = Math.round(modifyingBooking.totalAmount * (classMultiplier[modTrpClass] ? 1.2 : 1));
      return newEst - modifyingBooking.totalAmount;
    }

    return 0;
  };

  const previewDiff = calculatePreviewDifference();

  // Submit Modification
  const handleSaveModification = async () => {
    if (!modifyingBooking) return;

    if (previewDiff > 0) {
      // Additional payment required -> open Payment View
      setPendingDiff(previewDiff);
      setModifyStep('payment');
      return;
    }

    // Apply directly (same price or refund)
    setIsProcessing(true);
    const updates: BookingModificationInput = {};
    if (modifyingBooking.bookingType === 'flight') {
      updates.cabinClass = modCabinClass as any;
      updates.passengerCount = modPassengers;
      updates.specialRequests = modSpecialRequests;
    } else if (modifyingBooking.bookingType === 'hotel') {
      updates.checkInDate = modCheckIn;
      updates.checkOutDate = modCheckOut;
      updates.roomType = modRoomType;
      updates.numberOfRooms = modRooms;
      updates.numberOfGuests = modGuests;
    } else if (modifyingBooking.bookingType === 'transport') {
      updates.scheduledDate = modTrpDate;
      updates.vehicleClass = modTrpClass;
      updates.transportPassengerCount = modTrpPax;
      updates.pickupNotes = modPickupNotes;
    }

    const res = await modifyBooking(modifyingBooking.id, updates, userId);
    setIsProcessing(false);
    if (res.success) {
      setModifyStep('success');
      loadBookings();
    }
  };

  const handlePaymentSuccess = async () => {
    if (!modifyingBooking) return;
    setIsProcessing(true);
    const updates: BookingModificationInput = {};
    if (modifyingBooking.bookingType === 'flight') {
      updates.cabinClass = modCabinClass as any;
      updates.passengerCount = modPassengers;
      updates.specialRequests = modSpecialRequests;
    } else if (modifyingBooking.bookingType === 'hotel') {
      updates.checkInDate = modCheckIn;
      updates.checkOutDate = modCheckOut;
      updates.roomType = modRoomType;
      updates.numberOfRooms = modRooms;
      updates.numberOfGuests = modGuests;
    } else if (modifyingBooking.bookingType === 'transport') {
      updates.scheduledDate = modTrpDate;
      updates.vehicleClass = modTrpClass;
      updates.transportPassengerCount = modTrpPax;
      updates.pickupNotes = modPickupNotes;
    }

    await modifyBooking(modifyingBooking.id, updates, userId);
    setIsProcessing(false);
    setModifyStep('success');
    loadBookings();
  };

  // Cancel Booking
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setIsProcessing(true);
    await cancelBooking(cancelTarget.id, 'Customer requested via My Bookings portal', userId);
    setIsProcessing(false);
    setCancelTarget(null);
    loadBookings();
  };

  // Filter Bookings
  const filteredBookings = bookings.filter((b) => {
    if (selectedTab !== 'all' && b.bookingType !== selectedTab) return false;
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = b.bookingReference.toLowerCase().includes(q);
      const matchCity =
        b.flightDetails?.originCity.toLowerCase().includes(q) ||
        b.flightDetails?.destinationCity.toLowerCase().includes(q) ||
        b.hotelDetails?.city.toLowerCase().includes(q) ||
        b.hotelDetails?.hotelName.toLowerCase().includes(q) ||
        b.transportDetails?.originLocation.toLowerCase().includes(q) ||
        b.transportDetails?.destinationLocation.toLowerCase().includes(q);
      if (!matchRef && !matchCity) return false;
    }
    return true;
  });

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'confirmed':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">Confirmed</span>;
      case 'pending':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">Pending</span>;
      case 'delayed':
        return <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">Schedule Delayed</span>;
      case 'cancelled':
        return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">Cancelled & Refunded</span>;
      default:
        return <span className="bg-slate-500/20 text-slate-300 border border-slate-500/30 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">{status}</span>;
    }
  };

  const getCategoryIcon = (type: BookingType) => {
    switch (type) {
      case 'flight': return <Plane size={16} className="text-blue-400" />;
      case 'hotel': return <Building2 size={16} className="text-amber-400" />;
      case 'transport': return <Car size={16} className="text-indigo-400" />;
      default: return <Briefcase size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Briefcase size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">My Travel Bookings</h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {bookings.length} reservations
                </span>
              </div>
              <p className="text-xs text-slate-400">Manage flights, hotel stays, ground transport & live modifications</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-6 border-b border-white/10 bg-slate-950/40 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {[
                { id: 'all', label: 'All Categories', icon: '🌐' },
                { id: 'flight', label: 'Flights', icon: '✈️' },
                { id: 'hotel', label: 'Hotels', icon: '🏨' },
                { id: 'transport', label: 'Transport', icon: '🚆' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] border border-white/5'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reference or city..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Bookings List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-16 text-center">
              <RefreshCw size={24} className="animate-spin mx-auto text-indigo-400 mb-2" />
              <p className="text-xs text-slate-400">Loading your travel bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-2xl p-8">
              <Briefcase size={40} className="mx-auto text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-white">No bookings found</h3>
              <p className="text-xs text-slate-400 mt-1 mb-6 max-w-sm mx-auto">
                You don't have any bookings matching this category. Start exploring flights, hotels, or transport!
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {onOpenFlightModal && (
                  <button
                    onClick={() => { onClose(); onOpenFlightModal(); }}
                    className="px-4 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 text-xs font-semibold"
                  >
                    + Book Flight
                  </button>
                )}
                {onOpenHotelModal && (
                  <button
                    onClick={() => { onClose(); onOpenHotelModal(); }}
                    className="px-4 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/30 text-xs font-semibold"
                  >
                    + Book Hotel
                  </button>
                )}
                {onOpenTransportModal && (
                  <button
                    onClick={() => { onClose(); onOpenTransportModal(); }}
                    className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-semibold"
                  >
                    + Book Transport
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredBookings.map((b) => (
              <div
                key={b.id}
                className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-2xl p-5 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left Meta & Summary */}
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center flex-shrink-0">
                    {getCategoryIcon(b.bookingType)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-400/30 px-2 py-0.5 rounded-md">
                        {b.bookingReference}
                      </span>
                      {getStatusBadge(b.status)}
                      <span className="text-[11px] text-slate-500">
                        Booked {new Date(b.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Flight Detail */}
                    {b.bookingType === 'flight' && b.flightDetails && (
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {b.flightDetails.airline} · {b.flightDetails.flightNumber}
                        </h4>
                        <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                          <span>{b.flightDetails.originCity} ({b.flightDetails.originAirport})</span>
                          <ArrowRight size={12} className="text-slate-500" />
                          <span>{b.flightDetails.destinationCity} ({b.flightDetails.destinationAirport})</span>
                          <span className="text-slate-500 mx-1">·</span>
                          <span className="capitalize text-indigo-300">{b.flightDetails.cabinClass.replace('_', ' ')} Class</span>
                        </p>
                      </div>
                    )}

                    {/* Hotel Detail */}
                    {b.bookingType === 'hotel' && b.hotelDetails && (
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {b.hotelDetails.hotelName}
                        </h4>
                        <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                          <span>{b.hotelDetails.city}</span>
                          <span className="text-slate-500 mx-1">·</span>
                          <span className="text-amber-300">{b.hotelDetails.roomType}</span>
                          <span className="text-slate-500 mx-1">·</span>
                          <span>{b.hotelDetails.checkInDate} to {b.hotelDetails.checkOutDate}</span>
                        </p>
                      </div>
                    )}

                    {/* Transport Detail */}
                    {b.bookingType === 'transport' && b.transportDetails && (
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {b.transportDetails.providerName}
                        </h4>
                        <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                          <span>{b.transportDetails.originLocation}</span>
                          <ArrowRight size={12} className="text-slate-500" />
                          <span>{b.transportDetails.destinationLocation}</span>
                          <span className="text-slate-500 mx-1">·</span>
                          <span className="text-indigo-300">{b.transportDetails.vehicleClass}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Amount & Actions */}
                <div className="flex md:flex-col items-center md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                  <div className="text-left md:text-right">
                    <p className="text-lg font-bold text-white">${b.totalAmount} {b.currency}</p>
                    <span className="text-[10px] text-emerald-400 capitalize">
                      ● {b.paymentStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {b.status !== 'cancelled' && (
                      <>
                        <button
                          onClick={() => handleOpenModify(b)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all"
                        >
                          <Edit3 size={13} />
                          <span>Modify</span>
                        </button>

                        <button
                          onClick={() => setCancelTarget(b)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
                        >
                          <Trash2 size={13} />
                          <span>Cancel</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setVoucherTarget(b)}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10 text-xs font-semibold transition-all"
                    >
                      Voucher
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── MODIFICATION SUB-MODAL ─────────────────────────────────────────── */}
      {modifyingBooking && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl p-6 overflow-hidden my-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Modify Reservation</h3>
                  <p className="text-xs text-slate-400 font-mono">{modifyingBooking.bookingReference} · {modifyingBooking.bookingType.toUpperCase()}</p>
                </div>
              </div>
              <button
                onClick={() => setModifyingBooking(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step: Form Input */}
            {modifyStep === 'form' && (
              <div className="py-5 space-y-4">
                {/* FLIGHT MODIFICATION FIELDS */}
                {modifyingBooking.bookingType === 'flight' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Cabin Class</label>
                        <select
                          value={modCabinClass}
                          onChange={(e) => setModCabinClass(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                        >
                          <option value="economy">Economy</option>
                          <option value="premium_economy">Premium Economy (+50%)</option>
                          <option value="business">Business Class (+150%)</option>
                          <option value="first">First Class (+300%)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Passengers</label>
                        <input
                          type="number"
                          min={1}
                          max={9}
                          value={modPassengers}
                          onChange={(e) => setModPassengers(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Special Meal / Requests</label>
                      <input
                        type="text"
                        value={modSpecialRequests}
                        onChange={(e) => setModSpecialRequests(e.target.value)}
                        placeholder="e.g. Vegetarian meal, aisle seat preference"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>
                )}

                {/* HOTEL MODIFICATION FIELDS */}
                {modifyingBooking.bookingType === 'hotel' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Check-in Date</label>
                        <input
                          type="date"
                          value={modCheckIn}
                          onChange={(e) => setModCheckIn(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Check-out Date</label>
                        <input
                          type="date"
                          value={modCheckOut}
                          onChange={(e) => setModCheckOut(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Room Tier</label>
                        <select
                          value={modRoomType}
                          onChange={(e) => setModRoomType(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                        >
                          <option value="Standard">Standard</option>
                          <option value="Deluxe">Deluxe (+40%)</option>
                          <option value="Executive Suite">Executive Suite (+110%)</option>
                          <option value="Presidential Suite">Presidential Suite (+250%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Number of Rooms</label>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={modRooms}
                          onChange={(e) => setModRooms(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Number of Guests</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={modGuests}
                          onChange={(e) => setModGuests(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TRANSPORT MODIFICATION FIELDS */}
                {modifyingBooking.bookingType === 'transport' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Scheduled Date</label>
                        <input
                          type="date"
                          value={modTrpDate}
                          onChange={(e) => setModTrpDate(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Vehicle Class</label>
                        <select
                          value={modTrpClass}
                          onChange={(e) => setModTrpClass(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                        >
                          <option value="Standard">Standard</option>
                          <option value="Standard Premier">Standard Premier</option>
                          <option value="Executive Luxury">Executive Luxury</option>
                          <option value="VIP Luxury SUV">VIP Luxury SUV</option>
                          <option value="Green Car (First Class)">Green Car First Class</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Passengers</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={modTrpPax}
                          onChange={(e) => setModTrpPax(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Pickup Notes / Driver Requests</label>
                      <input
                        type="text"
                        value={modPickupNotes}
                        onChange={(e) => setModPickupNotes(e.target.value)}
                        placeholder="Terminal pickup gate, child seat, flight delay note"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>
                )}

                {/* Live Fare Difference Banner */}
                <div className="mt-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">Pricing Impact</span>
                    <span className="text-xs font-bold text-white">
                      Original: ${modifyingBooking.totalAmount} → New: ${modifyingBooking.totalAmount + previewDiff}
                    </span>
                  </div>
                  <div className="text-right">
                    {previewDiff > 0 ? (
                      <span className="text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                        +${previewDiff} Upgrade Surcharge
                      </span>
                    ) : previewDiff < 0 ? (
                      <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                        -${Math.abs(previewDiff)} Refund Credit
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg">
                        No Fare Difference
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setModifyingBooking(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveModification}
                    disabled={isProcessing}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                  >
                    {isProcessing ? 'Saving...' : previewDiff > 0 ? `Proceed to Pay (+$${previewDiff})` : 'Confirm Modification'}
                  </button>
                </div>
              </div>
            )}

            {/* Step: Payment Handshake if Upgrade Surcharge > 0 */}
            {modifyStep === 'payment' && (
              <div className="py-4">
                <button
                  onClick={() => setModifyStep('form')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 mb-3 flex items-center gap-1"
                >
                  ← Back to modification options
                </button>
                <PaymentView
                  bookingId={modifyingBooking.id}
                  bookingReference={modifyingBooking.bookingReference}
                  bookingType={modifyingBooking.bookingType}
                  title={`Modification Surcharge: ${modifyingBooking.bookingReference}`}
                  subtitle="Fare adjustment for upgraded cabin/stay/capacity"
                  amount={pendingDiff}
                  lineItems={[
                    { label: 'Original Booking Credit', amount: -modifyingBooking.totalAmount },
                    { label: 'Updated Reservation Total', amount: modifyingBooking.totalAmount + pendingDiff },
                    { label: 'Net Fare Difference Payable', amount: pendingDiff },
                  ]}
                  onPaymentSuccess={handlePaymentSuccess}
                  onCancel={() => setModifyStep('form')}
                  userId={userId}
                />
              </div>
            )}

            {/* Step: Success */}
            {modifyStep === 'success' && (
              <div className="py-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={30} />
                </div>
                <h3 className="text-lg font-bold text-white">Reservation Modified Successfully!</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Your updated itinerary has been confirmed and a notification alert has been sent.
                </p>
                <button
                  onClick={() => setModifyingBooking(null)}
                  className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── CANCELLATION CONFIRMATION DIALOG ──────────────────────────────── */}
      {cancelTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-bold text-white">Cancel Reservation?</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Are you sure you want to cancel <span className="font-mono text-indigo-300 font-bold">{cancelTarget.bookingReference}</span>? A full refund of <span className="text-white font-bold">${cancelTarget.totalAmount}</span> will be credited.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Keep Booking
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-lg shadow-rose-600/30"
              >
                {isProcessing ? 'Cancelling...' : 'Confirm & Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DIGITAL VOUCHER MODAL ─────────────────────────────────────────── */}
      {voucherTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getCategoryIcon(voucherTarget.bookingType)}</span>
                <h3 className="text-sm font-bold text-white">Digital Travel Voucher</h3>
              </div>
              <button onClick={() => setVoucherTarget(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 text-left space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block">Booking Reference</span>
                  <span className="font-mono font-bold text-indigo-300 text-sm">{voucherTarget.bookingReference}</span>
                </div>
                {getStatusBadge(voucherTarget.status)}
              </div>

              <div className="pt-2 border-t border-white/5 text-xs text-slate-300">
                <p className="font-semibold text-white">
                  {voucherTarget.flightDetails?.airline || voucherTarget.hotelDetails?.hotelName || voucherTarget.transportDetails?.providerName}
                </p>
                <p className="text-[11px] text-slate-400">
                  {voucherTarget.flightDetails?.originCity ? `${voucherTarget.flightDetails.originCity} → ${voucherTarget.flightDetails.destinationCity}` : (voucherTarget.hotelDetails?.city || voucherTarget.transportDetails?.originLocation)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Total Amount</span>
                  <span className="font-bold text-white">${voucherTarget.totalAmount} {voucherTarget.currency}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Payment</span>
                  <span className="text-emerald-400 font-medium capitalize">{voucherTarget.paymentStatus}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-center">
              <button
                onClick={() => setVoucherTarget(null)}
                className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Close Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
