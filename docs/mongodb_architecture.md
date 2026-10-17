# Voyana MongoDB Architecture & Schema Specification

| Metadata Field | Specification |
| :--- | :--- |
| **Project** | Voyana — Collaborative AI Travel Planning & Booking Platform |
| **Database Engine** | **MongoDB / Mongoose ODM** |
| **Backend Service** | Express.js API (`services/ai-service`) |
| **Default URI** | `mongodb://localhost:27017/voyana` or MongoDB Atlas URI |

---

## 1. Architecture Overview

Voyana utilizes **MongoDB** as its primary NoSQL document store, accessed through a high-performance Express.js service tier with Mongoose ODM.

```mermaid
graph TD
    Client[React + Vite Frontend] -->|REST API Requests| API[Express API Server (Port 3001)]
    API -->|Mongoose Connection| Mongo[(MongoDB Database)]
    
    subgraph MongoDB Collections
        ColTrips[(trips)]
        ColBookings[(bookings)]
        ColExpenses[(expenses)]
        ColPacking[(packing_lists)]
        ColAlerts[(booking_alerts)]
        ColAI[(ai_requests)]
    end
    
    Mongo --> ColTrips
    Mongo --> ColBookings
    Mongo --> ColExpenses
    Mongo --> ColPacking
    Mongo --> ColAlerts
    Mongo --> ColAI
```

---

## 2. Document Collections & Schema Definitions

### 2.1 Trips Collection (`trips`)
Stores collaborative multi-day itineraries, group member rosters, and activity schedules:
* **Fields**:
  * `tripId` (String, unique index): External trip identifier.
  * `title` (String): Trip display name.
  * `destination` (String, indexed): Target destination city.
  * `startDate` / `endDate` (String): Travel period.
  * `status` (Enum: `planning`, `active`, `completed`, `archived`).
  * `budgetTotal` (Number): Budget cap.
  * `members` (Array): Embedded member documents `{ userId, name, email, role, avatar }`.
  * `activities` (Array): Embedded activity schedules `{ id, dayNumber, timeSlot, title, category, locationName, cost, completed }`.

### 2.2 Bookings Collection (`bookings`)
Records flight, hotel, and transport reservations:
* **Fields**:
  * `bookingId` (String, unique index).
  * `userId` (String, indexed): Passenger / traveler account ID.
  * `bookingReference` (String, unique index): E.g. `VOY-982144`.
  * `bookingType` (Enum: `flight`, `hotel`, `transport`).
  * `title` / `description` (String): Booking summary.
  * `amount` / `currency` (Number, String): Transaction value.
  * `status` (Enum: `pending`, `confirmed`, `cancelled`, `delayed`, `refunded`).
  * `paymentStatus` (Enum: `pending`, `paid`, `failed`, `refunded`).
  * `details` (Mixed): Service-specific metadata (flight numbers, hotel check-in/out dates, cabin class).

### 2.3 Expenses Collection (`expenses`)
Transaction ledger for shared group spending and debt minimization:
* **Fields**:
  * `expenseId` (String, unique index).
  * `tripId` (String, indexed): Associated trip.
  * `title` / `amount` / `currency` (String, Number, String).
  * `category` (Enum: `Flights`, `Accommodations`, `Food & Dining`, `Activities`, `Transport`, `Shopping`, `Misc`).
  * `paidBy` (String): Name of payer.
  * `splitAmong` (Array of Strings): Travelers sharing the expense.
  * `date` (String): Payment date.
  * `paymentMethod` (String).

### 2.4 Packing Lists Collection (`packing_lists`)
Weather-aware packing gear checklists with member task assignments:
* **Fields**:
  * `tripId` (String, unique index).
  * `destination` / `seasonOrWeather` / `tripDurationDays`.
  * `items` (Array): Embedded items `{ id, name, category, isPacked, assignedTo, priority, quantity, notes, weatherTag }`.

### 2.5 Booking Alerts Collection (`booking_alerts`)
Real-time status updates and customer notification pipeline:
* **Fields**:
  * `alertId` (String, unique index).
  * `userId` (String, indexed).
  * `bookingId` / `bookingReference` / `bookingType`.
  * `title` / `message` (String).
  * `severity` (Enum: `info`, `warning`, `success`, `critical`).
  * `isRead` (Boolean, indexed).
  * `oldStatus` / `newStatus` (String).

### 2.6 AI Requests Collection (`ai_requests`)
Audit telemetry for conversational planning requests:
* **Fields**:
  * `feature` / `promptVersion` / `inputMessage`.
  * `tokens` (`promptTokens`, `completionTokens`, `totalTokens`).
  * `latencyMs` / `outcome` / `provider`.

---

## 3. MongoDB REST API Reference (`/api`)

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/status` | `GET` | Server health check and MongoDB connection status |
| `/api/trips` | `GET`, `POST` | List trips or create/upsert a trip |
| `/api/trips/:tripId` | `GET`, `DELETE` | Retrieve or delete specific trip |
| `/api/bookings` | `GET`, `POST` | Query user reservations or create new booking |
| `/api/bookings/:id/status` | `PUT` | Update booking status and auto-dispatch alert |
| `/api/expenses/:tripId` | `GET` | Fetch transaction ledger for a trip |
| `/api/expenses` | `POST` | Record a group expense |
| `/api/expenses/:id` | `DELETE` | Remove an expense entry |
| `/api/packing/:tripId` | `GET`, `POST` | Retrieve or upsert packing checklist |
| `/api/alerts` | `GET`, `POST` | Query notifications or dispatch new alert |
| `/api/alerts/:id/read` | `PUT` | Mark single alert as read |
| `/api/alerts/read-all` | `PUT` | Mark all alerts read for a user |

---

## 4. Running with MongoDB

### Option A: Local MongoDB Community Server
1. Start MongoDB:
   ```bash
   mongod --dbpath /data/db
   ```
2. Start the Voyana backend:
   ```bash
   cd services/ai-service
   npm run dev
   ```
3. Start the Voyana frontend:
   ```bash
   npm run dev
   ```

### Option B: MongoDB Atlas (Cloud)
1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Set your connection string in `services/ai-service/.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/voyana?retryWrites=true&w=majority
   ```
3. Run `npm run dev` in `services/ai-service`.
