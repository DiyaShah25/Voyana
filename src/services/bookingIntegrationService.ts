import { getPlanningContext } from "./planningContext";
import { matchesDestination } from "./destinationPolicy";
import { recordBooking } from "./bookingService";
/**
 * VPM-145: Booking API Integration Service
 * Assignee: Bhavika Sainani (202512053) <bhavikasainani2608@gmail.com>
 * Cross-service booking API orchestration, multi-service inventory aggregation,
 * bundle package checkout, payment gateway settlement, and workspace synchronization.
 */
import type { Flight } from "./flightService";
import { generateMockFlights, resolveAirportCode } from "./flightService";
import type { Hotel } from "./hotelService";
import { searchHotels } from "./hotelService";
import type { TransportItem } from "./transportService";
import { searchTransport } from "./transportService";

import type { ReservationChoice } from "./paymentService";

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
  paymentMethod: "card" | "upi" | "wallet" | "netbanking";
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
  const context = getPlanningContext();
  if (!req.items.length) throw new Error("Choose at least one travel service.");
  const choices = req.items.map((item): ReservationChoice => {
    const flight = item.details.flight as Flight | undefined;
    const hotel = item.details.hotel as Hotel | undefined;
    const transport = item.details.transport as TransportItem | undefined;
    const target =
      flight?.destinationAirport.city ||
      hotel?.city ||
      transport?.destinationCity;
    if (!target || !matchesDestination(context.destination, target))
      throw new Error(
        "Every bundle item must match your selected destination.",
      );
    if (item.choice) return item.choice;
    const date = item.date.slice(0, 10);
    if (flight)
      return {
        type: "flight",
        id: flight.id,
        origin: flight.originAirport.code,
        destination: flight.destinationAirport.code,
        date,
        cabin: "economy",
        passengers: 1,
      };
    if (hotel)
      return {
        type: "hotel",
        id: hotel.id,
        checkIn: date,
        checkOut: new Date(Date.parse(date) + 3 * 86400000)
          .toISOString()
          .slice(0, 10),
        roomType: "Standard",
        rooms: 1,
        guests: 1,
      };
    if (transport)
      return {
        type: "transport",
        id: transport.id,
        origin: transport.originCity,
        date,
        passengers: 1,
      };
    throw new Error("Invalid bundle item.");
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
