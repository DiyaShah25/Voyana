# Voyana — Shared MongoDB Atlas Setup & Architecture Guide

This guide provides complete instructions for setting up, configuring, and using the centralized **MongoDB Atlas** database (`voyana`) across the entire development team.

---

## 1. Architectural Overview

Voyana uses a unified, full-stack architecture where every authorized team member's local instance connects to a single shared MongoDB Atlas cloud database:

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Layer                          │
│          React 18 + TypeScript + Vite (localhost:5173)      │
│          UI Components • AuthContext • Domain Services       │
└───────────────────────────────┬─────────────────────────────┘
                                │ HTTP REST (apiClient.ts)
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API Layer                      │
│            Express + TypeScript (localhost:3001)            │
│   Auth • Trips • Bookings • Budget • Collab • Alerts • AI   │
└───────────────────────────────┬─────────────────────────────┘
                                │ Mongoose Connection Pool
                                ▼
┌─────────────────────────────────────────────────────────────┐
│             Centralized Cloud Database                      │
│            MongoDB Atlas Cluster (db: voyana)               │
│  Users • Trips • Bookings • Budgets • Collab • Alerts • AI  │
└─────────────────────────────────────────────────────────────┘
```

- **Persistence**: Centralized in MongoDB Atlas. Changes made by Team Member A (e.g. creating a trip) are instantly persisted in the cloud and accessible to Team Member B.
- **Offline / Fallback Resilience**: If the network is temporarily offline or credentials are missing, domain services gracefully fall back to local caching without breaking the UI.
- **Frontend Design Preservation**: Zero visual regressions. All UI layouts, colors, fonts, Tailwind classes, and Three.js 3D globe components remain 100% intact.

---

## 2. MongoDB Atlas Configuration (Step-by-Step)

Follow these exact steps to obtain your shared Atlas connection string:

### Step 1: Open MongoDB Atlas
1. Navigate to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas) and sign in.
2. Select your existing organization or project (or click **New Project** and name it `Voyana`).

### Step 2: Deploy / Select Cluster
1. Create or select your cluster:
   - For development: **M0 Free Tier** (AWS, GCP, or Azure in your closest region).
   - Cluster Name: e.g. `Cluster0` or `voyana-dev`.

### Step 3: Configure Database User (Least Privilege)
1. Go to **Security > Database Access**.
2. Click **Add New Database User**:
   - **Authentication Method**: Password.
   - **Username**: `voyana_app_user` (or team username).
   - **Password**: Generate a secure password (e.g. 16+ alphanumeric characters).
   - **Database User Privileges**: Select **Read and write to any database** (or restrict specifically to the `voyana` database).
3. Click **Add User**.
> [!IMPORTANT]
> Never use an Atlas Project Owner / Admin account as the application user.

### Step 4: Configure Network Access (IP Whitelist)
1. Go to **Security > Network Access**.
2. Click **Add IP Address**:
   - For distributed team members working from different locations: Add your teammates' public IP addresses, or select **Allow Access from Anywhere** (`0.0.0.0/0`) during the active development sprint.
3. Click **Confirm**.

### Step 5: Copy Connection String
1. Go to **Deployments > Database**.
2. Click **Connect** on your cluster.
3. Choose **Drivers** (Node.js).
4. Copy the SRV connection URI:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Specify the target database name `voyana`:
   ```
   mongodb+srv://voyana_app_user:<password>@cluster0.xxxxx.mongodb.net/voyana?retryWrites=true&w=majority
   ```

---

## 3. Environment Variables Configuration

In `services/ai-service/.env`, configure the following:

```env
PORT=3001
NODE_ENV=development
LLM_PROVIDER=mock

# Live MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://voyana_app_user:YourSecurePassword123@cluster0.xxxxx.mongodb.net/voyana?retryWrites=true&w=majority
MONGODB_DB_NAME=voyana

# Shared JWT Secret for Session Verification
JWT_SECRET=voyana-team-shared-secret-key-2026
```

> [!CAUTION]
> The `.env` file is excluded from Git in `.gitignore`. Never commit or push connection strings or credentials to GitHub.

---

## 4. Collections and Schema Design

The `voyana` database uses the following collections:

| Collection | Model File | Purpose | Key Indexes |
|---|---|---|---|
| `users` | `src/db/models/user.model.ts` | User registry, bcrypt password hashes, traveler preferences, roles | `id` (unique), `email` (unique) |
| `trips` | `src/db/models/trip.model.ts` | Multi-day itineraries, scheduled activities, and collaborators | `id` (unique), `ownerId`, `visibility`, text search on title & destination |
| `bookings` | `src/db/models/booking.model.ts` | Flights, hotels, and transport reservations with payment status | `id` (unique), `bookingReference` (unique), `userId` |
| `budgets` | `src/db/models/budget.model.ts` | Category allocations, expenses ledger, and debt settlements | `id` (unique), `tripId` |
| `chatmessages` | `src/db/models/collaboration.model.ts` | Group trip messages and activity logs | `id` (unique), `tripId` |
| `tasks` | `src/db/models/collaboration.model.ts` | Collaborative task boards with status and assignments | `id` (unique), `tripId`, `status` |
| `polls` | `src/db/models/collaboration.model.ts` | Group voting polls with voter tracking | `id` (unique), `tripId` |
| `memories` | `src/db/models/collaboration.model.ts` | Shared trip photos, journals, and likes | `id` (unique), `tripId` |
| `packinglists` | `src/db/models/packing.model.ts` | Smart packing checklists, categories, and item packed states | `id` (unique), `tripId` |
| `alerts` | `src/db/models/alert.model.ts` | Real-time booking alerts, notifications, and read states | `id` (unique), `user_id` |
| `airequests` | `src/db/models/ai-request.model.ts` | AI Concierge telemetry and token usage logs | `createdAt` |

---

## 5. Starting the Project Locally

### 1. Install Dependencies
```bash
# Frontend
npm install

# Backend AI & Database Service
cd services/ai-service
npm install
cd ../..
```

### 2. Start the Backend API (port 3001)
```bash
cd services/ai-service
npm run dev
```
You should see:
```
[Mongo] Connected successfully to database "voyana" via mongodb+srv://voyana_app_user:******@...
[Data Migration] Seeding completed: 0 users, 0 trips, 0 bookings.
[Voyana Backend] Running on port 3001
[Voyana Backend] Health check: http://localhost:3001/health
[Voyana Backend] API root:     http://localhost:3001/api
```

### 3. Start the Frontend (port 5173)
```bash
npm run dev
```
Open **`http://localhost:5173/`** in your browser.

---

## 6. Verifying Database Connectivity

### Check Health & Connection Status
```bash
# PowerShell
Invoke-RestMethod http://localhost:3001/health | ConvertTo-Json -Depth 4

# Bash / curl
curl -s http://localhost:3001/health | jq
```

Expected output:
```json
{
  "status": "ok",
  "service": "ai-service",
  "dependencies": {
    "database": {
      "type": "mongodb",
      "status": "connected"
    },
    "llmProvider": {
      "name": "mock",
      "status": "ready"
    }
  }
}
```

### Run Full Test Suite
```bash
cd services/ai-service
npm run test
```
All 4 test suites (health, error-handling, chat, and mongodb-api) run against the connected MongoDB instance.

---

## 7. Team Collaboration Workflow (Multi-User Verification)

1. **Member A Creates Trip**:
   - Signs into Voyana on `http://localhost:5173/`.
   - Creates a trip "Swiss Alps Winter Expedition".
   - The frontend calls `POST http://localhost:3001/api/trips`.
   - Trip is saved centrally in MongoDB Atlas under collection `trips`.
2. **Member B Retrieves Trip**:
   - Opens local Voyana on their computer.
   - Frontend calls `GET http://localhost:3001/api/trips`.
   - Sees "Swiss Alps Winter Expedition" immediately in their Trips list.
3. **Persistence Across Server Restarts**:
   - Restarting either Member A's or Member B's dev server does not wipe data because it is centrally stored in Atlas.

---

## 8. Troubleshooting Common Errors

| Error Message | Cause | Solution |
|---|---|---|
| `MongoServerSelectionError: connection timed out` | IP is not in Atlas IP Access list | Go to **Atlas > Network Access** and add your current public IP or `0.0.0.0/0`. |
| `MongoError: Authentication failed` | Invalid username or password | Re-check credentials in `MONGODB_URI`. URL-encode special characters in passwords (e.g. `@` -> `%40`). |
| `ECONNREFUSED 127.0.0.1:3001` | Backend service is not running | Start the backend with `cd services/ai-service && npm run dev`. |
| `CORS Error in Browser` | Origin mismatch | `cors()` middleware is configured on the backend. Ensure your frontend runs on `http://localhost:5173`. |
