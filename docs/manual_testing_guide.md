# Manual Testing Guide: Booking Services & Alert Pipeline

**Project**: Voyana — Travel Planning Web Application  
**Author**: Bhavika Sainani (Backend — Booking Services & Payment Integration)  
**Jira Issue**: VPM-93 (Send Alerts) & VPM-28 (Review Database Design)  
**Date**: September 2026  

---

## 1. Scope & Overview

This document provides step-by-step test instructions for verifying the **Booking Services domain schema** and the **Realtime Booking Alert Pipeline** implemented in Voyana.

Because Voyana supports both a **Supabase-connected production mode** and an **offline/preview mode** (for local evaluation without immediate database provisioning), test procedures are provided for both environments.

---

## 2. Test Case Matrix

| Test ID | Description | Component | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-ALT-01** | Alerts Panel Mount & Indicator | `AlertsPanel.tsx` | Bell icon appears in top navigation with unread count badge. | Pass |
| **TC-ALT-02** | Flyout Dropdown & Filtering | `AlertsPanel.tsx` | Clicking bell opens glassmorphic panel with tabs (`All` vs `Unread`). | Pass |
| **TC-ALT-03** | Mark Single Alert as Read | `alertService.ts` | Clicking an unread alert card marks it as read, clears the unread dot, and decrements the badge. | Pass |
| **TC-ALT-04** | Mark All Alerts as Read | `alertService.ts` | Clicking "Mark all read" marks all alerts as read, hiding the unread counter badge. | Pass |
| **TC-ALT-05** | Live Status Change Simulation | `AlertsPanel.tsx` | Clicking "Delay", "Confirm", or "Cancel" buttons triggers status transition, inserts new alert, and plays toast. | Pass |
| **TC-ALT-06** | Realtime Toast Banner | `AlertsPanel.tsx` | New alert slides down from top-right corner with auto-dismiss after 6 seconds. | Pass |
| **TC-DB-01** | Postgres Migration Execution | `20260908000000_booking_schema.sql` | Migration executes cleanly with custom enums, tables, indexes, and triggers. | Pass |
| **TC-DB-02** | Automated DB Trigger Check | PostgreSQL Function | `UPDATE bookings SET status = 'delayed'` automatically populates `booking_alerts` and `booking_status_history`. | Pass |
| **TC-DB-03** | Row Level Security (RLS) Isolation | PostgreSQL Policies | Customer `auth.uid()` can only read their own bookings and alerts; catalog tables are publicly readable. | Pass |

---

## 3. Step-by-Step UI Verification (Preview & Local Mode)

### Step 1: Launch Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Step 2: Observe Bell Icon in Navigation
1. Notice the bell icon in the top-right header area next to the "Sign In" and "Sign Up" buttons.
2. Verify that an animated red pill badge displays the number of unread alerts (default: 2 unread).

### Step 3: Open the Alerts Panel
1. Click the notification bell.
2. A glassmorphic modal slides open with the dark space theme.
3. Review the default mock alerts:
   - **Warning (Amber)**: Flight delay notification (Air France Paris $\rightarrow$ Tokyo).
   - **Success (Green)**: Hotel reservation confirmed (Hotel Ritz Paris).
   - **Info (Sky)**: Private transfer scheduled.
4. Toggle between the **All** and **Unread** filter buttons to confirm filtering behavior.

### Step 4: Test Interactive Status Transitions
In the top utility bar of the panel, locate the **Simulate** buttons:
1. Click **"Delay"**:
   - A new flight delay alert is dispatched.
   - An interactive toast banner immediately animates in from the top-right corner.
   - The unread counter increments.
2. Click **"Confirm"**:
   - A new hotel confirmation alert is generated and displayed.
3. Click **"Cancel"**:
   - A critical cancellation alert with refund details is generated.

### Step 5: Test Read State Management
1. Click on an unread alert card $\rightarrow$ notice that its highlight fades and the unread indicator dot disappears.
2. Click **"Mark all read"** $\rightarrow$ all alerts are marked as read, and the red badge disappears from the bell icon.
3. Refresh the browser page $\rightarrow$ notice that read states persist seamlessly in `localStorage`.

---

## 4. Supabase Database & Trigger Verification (Production Mode)

When applying the migration to a live Supabase project:

### Step 1: Run the Migration
Using the Supabase CLI:
```bash
supabase db push
# or run the SQL directly in the Supabase Dashboard SQL Editor:
# supabase/migrations/20260908000000_booking_schema.sql
```

### Step 2: Verify Created Tables
In the Supabase Table Editor, verify the creation of:
- `public.bookings`
- `public.flights` & `public.flight_bookings`
- `public.hotels` & `public.hotel_bookings`
- `public.transport` & `public.transport_bookings`
- `public.booking_status_history`
- `public.booking_alerts`

### Step 3: Test Trigger-Driven Alert Generation
Execute the following SQL in the Supabase SQL Editor:
```sql
-- 1. Insert sample booking
INSERT INTO public.bookings (
    user_id,
    booking_reference,
    booking_type,
    status,
    total_amount,
    currency,
    contact_email
) VALUES (
    auth.uid(),
    'VYN-TEST-001',
    'flight',
    'pending',
    450.00,
    'USD',
    'traveler@voyana.com'
) RETURNING id;

-- 2. Update status to 'confirmed'
UPDATE public.bookings 
SET status = 'confirmed' 
WHERE booking_reference = 'VYN-TEST-001';

-- 3. Verify automatic alert creation in booking_alerts
SELECT * FROM public.booking_alerts 
WHERE booking_id = (SELECT id FROM public.bookings WHERE booking_reference = 'VYN-TEST-001');

-- 4. Verify audit trail in booking_status_history
SELECT * FROM public.booking_status_history 
WHERE booking_id = (SELECT id FROM public.bookings WHERE booking_reference = 'VYN-TEST-001');
```

**Observed Result**:
- `booking_alerts` row is created with `severity = 'success'`, title `"Booking Confirmed"`, and `is_read = false`.
- `booking_status_history` row is created logging `old_status = 'pending'` and `new_status = 'confirmed'`.
- If client browser is connected via Supabase Realtime, the alert is pushed via WebSocket with zero latency.
