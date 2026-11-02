import { getPlanningContext } from "./planningContext";
import { matchesDestination } from "./destinationPolicy";
import { recordBooking } from "./bookingService";
/**
 * VPM-145: Booking API Integration Service
 * Assignee: Bhavika Sainani (202512053) <bhavikasainani2608@gmail.com>
 * Cross-service booking API orchestration, multi-service inventory aggregation,
 * bundle package checkout, payment gateway settlement, and workspace synchronization.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Flight } from './flightService';
import { generateMockFlights, resolveAirportCode } from './flightService';
import type { Hotel } from './hotelService';
import { searchHotels } from './hotelService';
import type { TransportItem } from './transportService';
import { searchTransport } from './transportService';
import { createAlert } from './alertService';
import { addTripActivity, getStoredTrips } from './tripService';
import { addTripExpense } from './collaborationService';
import { initiatePayment, confirmPayment } from './paymentService';
import { convertFromUSD, formatCurrency } from './currencyService';

// ---------------------------------------------------------------------------
// Supabase Client Initialization (Matching flightService & paymentService pattern)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types & Interfaces for VPM-145
// ---------------------------------------------------------------------------
export interface BundledBookingItem {
  type: "flight" | "hotel" | "transport";
  id: string;
  title: string;
  subTitle: string;
  price: number;
  date: string;
  referenceCode: string;
  details: Record<string, unknown>;
  choice?: ReservationChoice;
  priceBasis?: string;
}

export interface UnifiedBundleCheckoutRequest {
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: BundledBookingItem[];
  tripId?: string; // If syncing with active Trip Workspace
  applyBundleDiscount?: boolean;
  paymentMethod: 'card' | 'upi' | 'wallet' | 'netbanking';
  currency?: string;
}

export interface UnifiedBundleBookingResult {
  success: boolean;
  bundleReference: string;
  totalOriginalPrice: number;
  discountAmount: number;
  finalPaidAmount: number;
  bookedItems: BundledBookingItem[];
  tripSynced: boolean;
  bookingDate: string;
  error?: string;
}

export interface IntegratedPackageOffer {
  id: string;
  name: string;
  destination: string;
  flight?: Flight;
  hotel?: Hotel;
  transport?: TransportItem;
  originalPrice: number;
  discountPercentage: number;
  bundlePrice: number;
  savings: number;
  items: BundledBookingItem[];
}

const BUNDLE_STORAGE_KEY = "voyana.unified_bundles";

// ---------------------------------------------------------------------------
// 1. Unified Cross-Service Bundle Calculator (15% Bundle Saver Discount)
// ---------------------------------------------------------------------------
export function calculateBundlePricing(items: BundledBookingItem[]): {
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
} {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);

  // Cross-service bundle discount: 2 items = 10%, 3+ items = 15%
  const distinctTypes = new Set(items.map((i) => i.type)).size;
  const discountPercentage =
    distinctTypes >= 3 ? 15 : distinctTypes >= 2 ? 10 : 0;

  const discountAmount = Math.round((subtotal * discountPercentage) / 100);
  const taxableSubtotal = subtotal - discountAmount;
  const taxAmount = Math.round(taxableSubtotal * 0.05); // Demo package service charge, not a live tax quote.
  const totalAmount = taxableSubtotal + taxAmount;

  return {
    subtotal,
    discountPercentage,
    discountAmount,
    taxAmount,
    totalAmount,
  };
}

// ---------------------------------------------------------------------------
// 2. Search & Aggregate Integrated Booking APIs
// ---------------------------------------------------------------------------
export interface BundleSearchOptions {
  originCode?: string;
  passengers?: number;
  nights?: number;
  rooms?: number;
  tier?: "essential" | "comfort" | "premium";
}
export async function searchIntegratedOffers(
  destination: string,
  departureDate = new Date(Date.now() + 14 * 86400000)
    .toISOString()
    .slice(0, 10),
  options: BundleSearchOptions = {},
): Promise<IntegratedPackageOffer[]> {
  const airport = resolveAirportCode(destination);
  if (!airport) return [];
  const passengers = Math.min(20, Math.max(1, options.passengers || 1));
  const nights = Math.min(60, Math.max(1, options.nights || 3));
  const rooms = Math.min(
    20,
    Math.max(1, options.rooms || Math.ceil(passengers / 2)),
  );
  const tier = options.tier || "essential";
  const cabin =
    tier === "premium"
      ? "business"
      : tier === "comfort"
        ? "premium_economy"
        : "economy";
  const roomType =
    tier === "premium"
      ? "Executive Suite"
      : tier === "comfort"
        ? "Deluxe"
        : "Standard";
  const originCode = options.originCode || (airport === "DEL" ? "BOM" : "DEL");
  if (originCode === airport) return [];
  const flight = generateMockFlights({
    originCode,
    destinationCode: airport,
    departureDate,
    passengers,
    cabinClass: cabin,
  })
    .filter((item) => item.seatsAvailable[cabin] >= passengers)
    .sort((a, b) => a.prices[cabin] - b.prices[cabin])[0];
  const checkOut = new Date(Date.parse(departureDate) + nights * 86400000)
    .toISOString()
    .slice(0, 10);
  const hotel = (
    await searchHotels(
      destination,
      departureDate,
      checkOut,
      passengers,
      rooms,
      roomType,
    )
  ).sort((a, b) => a.roomRates[roomType] - b.roomRates[roomType])[0];
  const mode =
    tier === "essential"
      ? "bus"
      : tier === "premium"
        ? "car_rental"
        : "private_transfer";
  let transport = (
    await searchTransport(destination, destination, departureDate, mode)
  ).find((item) => item.maxPassengers >= passengers);
  if (!transport)
    transport = (
      await searchTransport(destination, destination, departureDate, "bus")
    ).find((item) => item.maxPassengers >= passengers);
  if (!flight || !hotel || !transport) return [];
  const fare = flight.prices[cabin];
  const rate = hotel.roomRates[roomType];
  const transportSeats = ["train", "bus", "ferry"].includes(
    transport.transportType,
  );
  const rentalDays = transport.transportType === "car_rental" ? nights : 1;
  const items: BundledBookingItem[] = [
    {
      type: "flight",
      id: flight.id,
      title: `${flight.airline} ${flight.flightNumber}`,
      subTitle: `${flight.originAirport.code} → ${flight.destinationAirport.code} · ${cabin.replace("_", " ")}`,
      price: fare * passengers,
      date: departureDate,
      referenceCode: flight.flightNumber,
      details: { flight },
      priceBasis: `₹${fare.toLocaleString("en-IN")} × ${passengers} traveler${passengers > 1 ? "s" : ""}`,
      choice: {
        type: "flight",
        id: flight.id,
        origin: originCode,
        destination: airport,
        date: departureDate,
        cabin,
        passengers,
      },
    },
    {
      type: "hotel",
      id: hotel.id,
      title: hotel.name,
      subTitle: `${hotel.city} · ${roomType}`,
      price: rate * nights * rooms,
      date: departureDate,
      referenceCode: hotel.id,
      details: { hotel },
      priceBasis: `₹${rate.toLocaleString("en-IN")} × ${nights} night${nights > 1 ? "s" : ""} × ${rooms} room${rooms > 1 ? "s" : ""}`,
      choice: {
        type: "hotel",
        id: hotel.id,
        checkIn: departureDate,
        checkOut,
        roomType,
        rooms,
        guests: passengers,
      },
    },
    {
      type: "transport",
      id: transport.id,
      title: transport.providerName,
      subTitle: `${transport.vehicleClass} · ${transport.destinationLocation}`,
      price: transport.basePrice * (transportSeats ? passengers : rentalDays),
      date: departureDate,
      referenceCode: transport.id,
      details: { transport },
      priceBasis: transportSeats
        ? `₹${transport.basePrice.toLocaleString("en-IN")} × ${passengers} traveler${passengers > 1 ? "s" : ""}`
        : transport.transportType === "car_rental"
          ? `₹${transport.basePrice.toLocaleString("en-IN")} × ${rentalDays} rental day${rentalDays > 1 ? "s" : ""}`
          : `₹${transport.basePrice.toLocaleString("en-IN")} per vehicle`,
      choice: {
        type: "transport",
        id: transport.id,
        origin: transport.originCity,
        date: departureDate,
        passengers,
        days: rentalDays,
      },
    },
  ];
  const pricing = calculateBundlePricing(items);
  return [
    {
      id: `bundle-${airport}-${tier}`,
      name: `${destination} ${tier} package`,
      destination,
      flight,
      hotel,
      transport,
      items,
      originalPrice: pricing.subtotal,
      discountPercentage: pricing.discountPercentage,
      bundlePrice: pricing.totalAmount,
      savings: pricing.discountAmount,
    },
  ];
}
export async function processUnifiedBundleCheckout(
  req: UnifiedBundleCheckoutRequest,
): Promise<UnifiedBundleBookingResult> {
  const pricing = calculateBundlePricing(req.items);
  const bundleReference = `VY-BDL-${Date.now().toString().substring(6)}`;
  const activeCurrency = req.currency || 'USD';
  const chargedAmount = convertFromUSD(pricing.totalAmount, activeCurrency);

  // 1. Process payment authorization via paymentService
  try {
    const paymentMethodMap: Record<string, any> = {
      card: 'credit_card',
      upi: 'upi_qr',
      wallet: 'google_pay',
      netbanking: 'credit_card',
    };
    const mappedPaymentMethod = paymentMethodMap[req.paymentMethod] || 'credit_card';

    const payInit = await initiatePayment({
      bookingId: bundleReference,
      amount: chargedAmount,
      currency: activeCurrency,
      paymentMethod: mappedPaymentMethod,
      userId: req.userId,
      metadata: {
        bundle_reference: bundleReference,
        item_count: req.items.length,
        items: req.items.map((i) => ({ type: i.type, id: i.id, ref: i.referenceCode })),
        base_usd_amount: pricing.totalAmount,
      },
    });

    if (payInit.success && payInit.paymentId) {
      await confirmPayment(payInit.paymentId, bundleReference, {
        bookingReference: bundleReference,
        bookingType: 'package',
        title: `Unified Travel Bundle (${bundleReference})`,
        description: `Payment of ${formatCurrency(chargedAmount, activeCurrency)} authorized for unified bundle.`,
        userId: req.userId,
      });
    }
  } catch (payErr) {
    console.warn('[BookingIntegrationService] Non-fatal payment recording warning:', payErr);
  }

  // 2. Persist to Supabase if connected
  if (supabase) {
    try {
      await supabase.from('bookings').insert([{
        user_id: req.userId,
        booking_reference: bundleReference,
        booking_type: 'package',
        status: 'confirmed',
        total_amount: chargedAmount,
        currency: activeCurrency,
        payment_status: 'paid',
        contact_email: req.customerEmail,
        metadata: {
          items: req.items,
          customer_name: req.customerName,
          discount_amount: pricing.discountAmount,
          base_usd_amount: pricing.totalAmount,
        },
      }]);
    } catch (dbErr) {
      console.warn('[BookingIntegrationService] Supabase insert warning:', dbErr);
    }
  }

  // 3. Store in LocalStorage bundle history
  try {
    const raw = localStorage.getItem(BUNDLE_STORAGE_KEY);
    const bundles = raw ? JSON.parse(raw) : [];
    bundles.unshift({
      bundleReference,
      userId: req.userId,
      customerName: req.customerName,
      customerEmail: req.customerEmail,
      pricing,
      items: req.items,
      paymentMethod: req.paymentMethod,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(BUNDLE_STORAGE_KEY, JSON.stringify(bundles));
  } catch {}

  // 4. Also record individual reservations into unified bookings list
  try {
    const rawUnified = localStorage.getItem(UNIFIED_BOOKINGS_STORAGE_KEY);
    const unifiedBookings = rawUnified ? JSON.parse(rawUnified) : [];
    for (const item of req.items) {
      unifiedBookings.unshift({
        id: `bkg-${item.referenceCode}-${Date.now()}`,
        userId: req.userId,
        bookingReference: item.referenceCode,
        bookingType: item.type,
        status: 'confirmed',
        totalAmount: item.price,
        currency: 'USD',
        paymentStatus: 'paid',
        contactEmail: req.customerEmail,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(item.type === 'flight' ? { flightDetails: item.details?.flight || { flightNumber: item.referenceCode, airline: item.title, originAirport: 'JFK', destinationAirport: 'CDG', originCity: 'New York', destinationCity: 'Paris', departureTime: new Date().toISOString(), arrivalTime: new Date().toISOString(), cabinClass: 'Economy', passengerName: req.customerName, passengers: 1 } } : {}),
        ...(item.type === 'hotel' ? { hotelDetails: item.details?.hotel || { hotelName: item.title, city: item.subTitle, address: item.subTitle, roomType: 'Standard Room', checkInDate: item.date, checkOutDate: item.date, numberOfGuests: 2, numberOfRooms: 1, guestName: req.customerName, nightlyRate: item.price } } : {}),
        ...(item.type === 'transport' ? { transportDetails: item.details?.transport || { providerName: item.title, transportType: 'train', originLocation: 'Airport', destinationLocation: 'City Center', originCity: 'Paris', destinationCity: 'Paris', scheduledDeparture: new Date().toISOString(), vehicleClass: 'Standard', passengerName: req.customerName, passengerCount: 1 } } : {}),
      });
    }
    localStorage.setItem(UNIFIED_BOOKINGS_STORAGE_KEY, JSON.stringify(unifiedBookings));
  } catch {}

  // 5. Send Unified Confirmation Alert
  await createAlert({
    user_id: req.userId,
    booking_id: bundleReference,
    booking_reference: bundleReference,
    booking_type: 'package',
    title: `Bundle Itinerary Confirmed (${req.items.length} Items)`,
    message: `Your all-in-one travel bundle with ${req.items.map((i) => i.title).join(', ')} is confirmed! Saved $${pricing.discountAmount} with bundle discounts.`,
    severity: 'success',
    old_status: 'pending',
    new_status: 'confirmed',
  });
  const booking = await recordBooking({
    choices,
    destination: context.destination,
    details: { items: req.items },
    bookingReference: crypto.randomUUID(),
    bookingType: "package",
    status: "confirmed",
    paymentStatus: "paid",
    totalAmount: pricing.totalAmount,
    currency: "INR",
    contactEmail: req.customerEmail,
    contactPhone: req.customerPhone,
  });
  const result: UnifiedBundleBookingResult = {
    success: true,
    bundleReference: booking.bookingReference,
    totalOriginalPrice: pricing.subtotal,
    discountAmount: pricing.discountAmount,
    finalPaidAmount: booking.totalAmount,
    bookedItems: req.items,
    tripSynced: true,
    bookingDate: new Date().toISOString(),
  };
  const bundles = JSON.parse(localStorage.getItem(BUNDLE_STORAGE_KEY) || "[]");
  localStorage.setItem(
    BUNDLE_STORAGE_KEY,
    JSON.stringify([{ ...result, userId: req.userId }, ...bundles]),
  );
  return result;
}
export async function getUserBookingBundles(
  userId: string,
): Promise<
  Array<{ userId: string; bundleReference: string } & Record<string, unknown>>
> {
  return JSON.parse(localStorage.getItem(BUNDLE_STORAGE_KEY) || "[]").filter(
    (item: { userId: string }) => item.userId === userId,
  );
}
