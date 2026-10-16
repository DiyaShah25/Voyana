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

// ---------------------------------------------------------------------------
// Supabase Client Initialization (Matching flightService & paymentService pattern)
// ---------------------------------------------------------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

// ---------------------------------------------------------------------------
// Types & Interfaces for VPM-145
// ---------------------------------------------------------------------------
export interface BundledBookingItem {
  type: 'flight' | 'hotel' | 'transport';
  id: string;
  title: string;
  subTitle: string;
  price: number;
  date: string;
  referenceCode: string;
  details: Record<string, any>;
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

const BUNDLE_STORAGE_KEY = 'voyana.unified_bundles';
const UNIFIED_BOOKINGS_STORAGE_KEY = 'voyana.unified_bookings';

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
  const discountPercentage = distinctTypes >= 3 ? 15 : distinctTypes >= 2 ? 10 : 0;

  const discountAmount = Math.round((subtotal * discountPercentage) / 100);
  const taxableSubtotal = subtotal - discountAmount;
  const taxAmount = Math.round(taxableSubtotal * 0.05); // 5% standard travel GST/VAT
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
export async function searchIntegratedOffers(
  destination: string,
  departureDate: string = '2026-10-15'
): Promise<IntegratedPackageOffer[]> {
  const destClean = destination.trim().toLowerCase();
  const destAirportCode = resolveAirportCode(destClean) || 'CDG';

  // 1. Flight search integration
  const flights = generateMockFlights({
    originCode: 'JFK',
    destinationCode: destAirportCode,
    departureDate,
    passengers: 1,
    cabinClass: 'economy',
  });
  const bestFlight = flights[0];

  // 2. Hotel search integration
  const hotels = await searchHotels(destination, departureDate, '2026-10-18');
  const bestHotel = hotels[0];

  // 3. Ground Transport search integration
  const transportList = await searchTransport(undefined, destination, departureDate, 'all');
  const bestTransport = transportList[0];

  const packages: IntegratedPackageOffer[] = [];

  if (bestFlight && bestHotel && bestTransport) {
    const flightItem: BundledBookingItem = {
      type: 'flight',
      id: bestFlight.id,
      title: `${bestFlight.airline} ${bestFlight.flightNumber} (${bestFlight.originAirport.code} → ${bestFlight.destinationAirport.code})`,
      subTitle: `${bestFlight.aircraft} • Economy`,
      price: bestFlight.prices.economy,
      date: departureDate,
      referenceCode: `FLT-${bestFlight.flightNumber}`,
      details: { flight: bestFlight },
    };

    const hotelItem: BundledBookingItem = {
      type: 'hotel',
      id: bestHotel.id,
      title: bestHotel.name,
      subTitle: `${bestHotel.city}, ${bestHotel.country} • Standard Room`,
      price: bestHotel.baseNightlyRate * 3, // 3 nights estimate
      date: `${departureDate} (3 nights)`,
      referenceCode: `HTL-${bestHotel.id.substring(0, 6).toUpperCase()}`,
      details: { hotel: bestHotel, nights: 3 },
    };

    const transportItem: BundledBookingItem = {
      type: 'transport',
      id: bestTransport.id,
      title: `${bestTransport.providerName} (${bestTransport.transportType.toUpperCase()})`,
      subTitle: `${bestTransport.originLocation} → ${bestTransport.destinationLocation}`,
      price: bestTransport.basePrice,
      date: departureDate,
      referenceCode: `TRP-${bestTransport.id.substring(0, 6).toUpperCase()}`,
      details: { transport: bestTransport },
    };

    const items = [flightItem, hotelItem, transportItem];
    const pricing = calculateBundlePricing(items);

    packages.push({
      id: `pkg-${destClean}-deluxe`,
      name: `${bestHotel.city} All-in-One Explorer Pass`,
      destination: bestHotel.city,
      flight: bestFlight,
      hotel: bestHotel,
      transport: bestTransport,
      originalPrice: pricing.subtotal,
      discountPercentage: pricing.discountPercentage,
      bundlePrice: pricing.totalAmount,
      savings: pricing.discountAmount,
      items,
    });
  }

  return packages;
}

// ---------------------------------------------------------------------------
// 3. Process Unified Bundle Checkout & Workspace Integration (VPM-145)
// ---------------------------------------------------------------------------
export async function processUnifiedBundleCheckout(
  req: UnifiedBundleCheckoutRequest
): Promise<UnifiedBundleBookingResult> {
  if (!req.items || req.items.length === 0) {
    return {
      success: false,
      bundleReference: '',
      totalOriginalPrice: 0,
      discountAmount: 0,
      finalPaidAmount: 0,
      bookedItems: [],
      tripSynced: false,
      bookingDate: new Date().toISOString(),
      error: 'No items provided in bundle checkout',
    };
  }

  const pricing = calculateBundlePricing(req.items);
  const bundleReference = `VY-BDL-${Date.now().toString().substring(6)}`;

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
      amount: pricing.totalAmount,
      currency: 'USD',
      paymentMethod: mappedPaymentMethod,
      userId: req.userId,
      metadata: {
        bundle_reference: bundleReference,
        item_count: req.items.length,
        items: req.items.map((i) => ({ type: i.type, id: i.id, ref: i.referenceCode })),
      },
    });

    if (payInit.success && payInit.paymentId) {
      await confirmPayment(payInit.paymentId, bundleReference, {
        bookingReference: bundleReference,
        bookingType: 'package',
        title: `Unified Travel Bundle (${bundleReference})`,
        description: `Payment of $${pricing.totalAmount.toLocaleString()} authorized for unified bundle.`,
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
        total_amount: pricing.totalAmount,
        currency: 'USD',
        payment_status: 'paid',
        contact_email: req.customerEmail,
        metadata: {
          items: req.items,
          customer_name: req.customerName,
          discount_amount: pricing.discountAmount,
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

  // 6. Auto-Sync to Trip Workspace if tripId provided
  let tripSynced = false;
  if (req.tripId) {
    try {
      const trips = getStoredTrips();
      const targetTrip = trips.find((t) => t.id === req.tripId);
      if (targetTrip) {
        // Add each item as a scheduled activity in Trip Workspace
        for (let idx = 0; idx < req.items.length; idx++) {
          const item = req.items[idx];
          await addTripActivity(req.tripId, {
            dayNumber: Math.min(idx + 1, 5),
            timeSlot: item.type === 'flight' ? '09:00 AM' : item.type === 'transport' ? '12:00 PM' : '03:00 PM',
            title: `${item.title} (${item.type.toUpperCase()})`,
            locationName: item.subTitle,
            category: item.type === 'flight' || item.type === 'transport' ? 'Transport' : 'Sightseeing',
            cost: item.price,
            bookingReference: item.referenceCode,
            description: `Auto-synced from Unified Booking Bundle ${bundleReference}`,
          });
        }

        // Add overall bundled cost to Expense Splitter
        await addTripExpense(req.tripId, {
          title: `Unified Travel Bundle (${req.items.length} services)`,
          amount: pricing.totalAmount,
          currency: 'USD',
          paidBy: req.customerName,
          splitAmong: targetTrip.members?.map((m) => m.name) || [req.customerName],
          category: 'Transport',
          date: new Date().toISOString(),
        });

        tripSynced = true;
      }
    } catch {}
  }

  return {
    success: true,
    bundleReference,
    totalOriginalPrice: pricing.subtotal,
    discountAmount: pricing.discountAmount,
    finalPaidAmount: pricing.totalAmount,
    bookedItems: req.items,
    tripSynced,
    bookingDate: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// 4. Get User Unified Booking Bundles
// ---------------------------------------------------------------------------
export async function getUserBookingBundles(userId: string): Promise<any[]> {
  try {
    const raw = localStorage.getItem(BUNDLE_STORAGE_KEY);
    const bundles = raw ? JSON.parse(raw) : [];
    return bundles.filter((b: any) => !userId || b.userId === userId || userId === 'usr-demo-01');
  } catch {
    return [];
  }
}
