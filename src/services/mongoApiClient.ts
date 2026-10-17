/**
 * MongoDB Backend REST API Client
 * Facilitates direct communication between the React frontend
 * and the Express/Mongoose MongoDB backend server (services/ai-service).
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Check if the MongoDB backend is reachable
 */
export async function checkMongoBackend(): Promise<{ reachable: boolean; mongoStatus?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${API_BASE}/status`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      return { reachable: true, mongoStatus: data.mongoConnection };
    }
    return { reachable: false };
  } catch {
    return { reachable: false };
  }
}

// ─── Trips ──────────────────────────────────────────────────────────────────
export async function getTripsFromMongo(): Promise<any[] | null> {
  try {
    const res = await fetch(`${API_BASE}/trips`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    const body = await res.json();
    return body.data || null;
  } catch {
    return null;
  }
}

export async function saveTripToMongo(trip: any): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trip),
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Bookings ───────────────────────────────────────────────────────────────
export async function getBookingsFromMongo(userId?: string): Promise<any[] | null> {
  try {
    const url = userId ? `${API_BASE}/bookings?userId=${encodeURIComponent(userId)}` : `${API_BASE}/bookings`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    const body = await res.json();
    return body.data || null;
  } catch {
    return null;
  }
}

export async function createBookingInMongo(booking: any): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking),
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.data || null;
  } catch {
    return null;
  }
}

export async function updateBookingStatusInMongo(bookingId: string, status: string, note?: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Expenses & Budget ──────────────────────────────────────────────────────
export async function getExpensesFromMongo(tripId: string): Promise<any[] | null> {
  try {
    const res = await fetch(`${API_BASE}/expenses/${tripId}`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    const body = await res.json();
    return body.data || null;
  } catch {
    return null;
  }
}

export async function createExpenseInMongo(expense: any): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Packing Checklists ─────────────────────────────────────────────────────
export async function getPackingFromMongo(tripId: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/packing/${tripId}`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    const body = await res.json();
    return body.data || null;
  } catch {
    return null;
  }
}

export async function savePackingToMongo(tripId: string, payload: any): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/packing/${tripId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Alerts ─────────────────────────────────────────────────────────────────
export async function getAlertsFromMongo(userId?: string): Promise<any[] | null> {
  try {
    const url = userId ? `${API_BASE}/alerts?userId=${encodeURIComponent(userId)}` : `${API_BASE}/alerts`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    const body = await res.json();
    return body.data || null;
  } catch {
    return null;
  }
}

export async function createAlertInMongo(alert: any): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function markAlertReadInMongo(alertId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/alerts/${alertId}/read`, {
      method: 'PUT',
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
