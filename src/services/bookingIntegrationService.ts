import type { Flight } from './flightService';
import type { Hotel } from './hotelService';
import type { TransportOption } from './transportService';
import { createAlert } from './alertService';
import { addTripActivity, getStoredTrips, saveStoredTrips } from './tripService';
import { addTripExpense } from './collaborationService';

// ---------------------------------------------------------------------------
// Types & Interfaces for VPM-204: Unified Booking Integration
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

const BUNDLE_STORAGE_KEY = 'voyana.unified_bundles';

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
// 2. Process Unified Bundle Checkout & Workspace Integration (VPM-204)
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

  // Store in LocalStorage bundle history
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

  // 1. Send Unified Confirmation Alert
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

  // 2. Auto-Sync to Trip Workspace if tripId provided
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
          paidBy: req.customerName,
          splitBetween: targetTrip.members?.map((m) => m.name) || [req.customerName],
          category: 'Transport',
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
// 3. Get User Unified Booking Bundles
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
