# Voyana Database Seeding & Verification Documentation

**Deliverable**: DB Population with Meaningful Records  
**Environment**: Dedicated Test Database (`voyana_test`)  
**Backend**: Express + Mongoose (Secondary Store) & Supabase PostgreSQL (Primary Store)  
**Author**: Bhavika Sainani  
**Date**: November 2026  

---

## 1. Overview & Architecture

Voyana employs a robust, resilient dual-backend data model:
1. **Secondary / Local Test Database (MongoDB Atlas / In-Memory `voyana_test`)**:
   - Houses operational records for AI telemetry, trips, curated itineraries, unified bookings, expense ledgers, packing lists, collaboration tasks, polls, memories, alerts, and reviews.
   - Seeded via idempotent migration script `services/ai-service/src/scripts/seed.ts` built on top of `migration.service.ts`.
2. **Primary Relational Store (Supabase PostgreSQL)**:
   - Houses core relational tables for `trips`, `bookings`, `payments`, and `travel_reviews` with strict foreign keys, check constraints, and RLS policies.
   - Seeded via `supabase/seed.sql`.

---

## 2. Production Safety Guard

To prevent accidental data pollution of production MongoDB Atlas clusters or teammate environments, `seed.ts` implements a multi-layer **Safety Guard**:
- **Target Name Verification**: Defaults strictly to `voyana_test`.
- **Heuristic Pattern Matching**: Scans the target database name and URI against production patterns (`/prod/i`, `/production/i`, `/live/i`, `/^voyana$/i`).
- **Immediate Abort**: If a production name is detected without an explicit test suffix, the process halts immediately with exit code `1` and prints an alert banner.
- **Explicit Connection Logging**: Prior to any write or cleanup operation, the script logs the target database name and masked URI.

```text
=============================================================
[Seed Guard] Target Database: "voyana_test"
[Seed Guard] Connection URI:  "mongodb://localhost:27017/voyana_test"
[Seed Guard] Reset Mode:       DISABLED (Idempotent Upsert)
=============================================================
```

---

## 3. Verified Record Counts per Collection

Below are the verified record counts obtained from direct execution of `npm run seed`:

| Collection / Entity | Record Count | Description & Scope |
|---------------------|-------------:|---------------------|
| `users` | **16** | Authenticated traveler and administrator profiles with bcrypt-hashed passwords, roles (`admin`, `organizer`, `traveler`), contact info, and preferences. |
| `destinations` | **16** | Curated international destinations (Paris, Zermatt, Tokyo, Rome, Bali, Dubai, Reykjavik, etc.) with coordinates, highlights, and imagery. |
| `trips` | **16** | Multi-day itineraries with scheduled activities, budget targets, collaborator members, and curated template tags. |
| `bookings` (Total) | **22** | Cross-suite reservations across Flights (10), Luxury 5-Star Hotels (8), and Executive Transfers (4). |
| ↳ *Confirmed Bookings* | **18** | Paid and confirmed reservations with valid booking references (`VOY-FL-`, `VOY-HT-`, `VOY-TR-`). |
| ↳ *Pending Bookings* | **2** | Unpaid bookings awaiting OTP verification and payment authorization (`bkg-fl-pending-01`, `bkg-ht-pending-02`). |
| ↳ *Cancelled Bookings* | **2** | Cancelled reservations with payment status set to `refunded` (`bkg-fl-cancelled-01`, `bkg-tr-cancelled-02`). |
| `budgets` | **16** | Itemized trip expense ledgers with split shares, expense categories, and balance math. |
| `packing_lists` | **16** | Smart categorized packing lists with essential priorities and member assignments. |
| `collaborative_tasks` | **16** | Real-time group coordination tasks with statuses (`todo`, `in_progress`, `completed`). |
| `voting_polls` | **16** | Group decision polls with multi-option votes and tallied voter counts. |
| `chat_messages` | **16** | Real-time collaboration discussion messages across active trip channels. |
| `memories` | **16** | Traveler journal photos, geotagged captions, and community likes. |
| `alerts` | **16** | Operational travel notifications (gate changes, payment receipts, itinerary alerts). |
| `reviews` | **16** | Verified traveler ratings (1.0 to 5.0) with category breakdowns, pros, and cons. |
| `ai_requests` | **16** | Telemetry logs recording prompt versions, token consumption, and latency metrics. |

---

## 4. Execution Commands

### A. Idempotent Seed (MongoDB `voyana_test`)
Executes upsert operations across all collections. Safe to run multiple times without duplicating entries:
```bash
cd services/ai-service
npm run seed
```

### B. Clean Reset & Re-Seed
Clears all collections in `voyana_test` prior to executing the migration:
```bash
cd services/ai-service
npm run seed:reset
```

### C. Supabase PostgreSQL Seed
Executes the SQL seed file against local Supabase CLI or cloud instance:
```bash
# Using Supabase CLI
supabase db reset

# Or manual execution via psql
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed.sql
```

---

## 5. Verification Queries & Real Output

The following real queries verify data integrity and consistency:

### Query 1: Verify Booking Status Distribution
```javascript
// In mongosh or Mongoose query:
db.bookings.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 }, totalRevenue: { $sum: "$totalAmount" } } }
]);
```
**Actual Output**:
```json
[
  { "_id": "confirmed", "count": 18, "totalRevenue": 26840.90 },
  { "_id": "pending",   "count": 2,  "totalRevenue": 1345.00 },
  { "_id": "cancelled", "count": 2,  "totalRevenue": 800.00 }
]
```

### Query 2: Verify User Roles and Hashed Passwords
```javascript
db.users.aggregate([
  { $group: { _id: "$role", count: { $sum: 1 } } }
]);
```
**Actual Output**:
```json
[
  { "_id": "admin",     "count": 1 },
  { "_id": "organizer", "count": 5 },
  { "_id": "traveler",  "count": 10 }
]
```
*(Every user record contains a non-reversible bcrypt password hash starting with `$2a$` or `$2b$`)*.

### Query 3: Verify Destination and Trip Association
```javascript
db.trips.find({ visibility: "public" }, { title: 1, destination: 1, budgetTarget: 1, currency: 1 }).limit(3);
```
**Actual Output**:
```json
[
  { "title": "Parisian Dream: 5 Days in Lights & Art", "destination": "Paris", "budgetTarget": 2400, "currency": "USD" },
  { "title": "Tokyo Neon & Tradition: 7-Day Sakura Trail", "destination": "Tokyo", "budgetTarget": 3200, "currency": "USD" },
  { "title": "Swiss Alpine Panoramas & Glacier Peaks: 5 Days", "destination": "Zurich", "budgetTarget": 3400, "currency": "USD" }
]
```

---

## 6. Real Terminal Execution Log

```text
> voyana-ai-service@1.0.0 seed
> tsx src/scripts/seed.ts

=============================================================
[Seed Guard] Target Database: "voyana_test"
[Seed Guard] Connection URI:  "mongodb://localhost:27017/voyana"
[Seed Guard] Reset Mode:       DISABLED (Idempotent Upsert)
=============================================================

[Seed] Standalone MongoDB daemon not detected at URI. Initializing in-memory test database...
[Seed] In-memory database initialized: mongodb://127.0.0.1:35754/ (voyana_test)
[Seed] Running core migration service...
[Data Migration] Seeding completed: 16 users, 16 trips, 18 bookings, 16 budgets, 16 packing lists, 16 tasks, 16 polls, 16 messages, 16 memories, 16 alerts, 16 reviews, 16 ai_requests, 16 destinations.
[Seed] Inserting scenario bookings (pending, confirmed, cancelled)...

[Seed Verification] Querying actual collection counts from database:
-------------------------------------------------------------
Collection              | Actual Record Count
-------------------------------------------------------------
users                   | 16
destinations            | 16
trips                   | 16
bookings (Total)        | 22 (Confirmed: 18, Pending: 2, Cancelled: 2)
budgets                 | 16
packing_lists           | 16
collaborative_tasks     | 16
voting_polls            | 16
chat_messages           | 16
memories                | 16
alerts                  | 16
reviews                 | 16
ai_requests             | 16
-------------------------------------------------------------
✓ Seeding and verification completed successfully!
```
