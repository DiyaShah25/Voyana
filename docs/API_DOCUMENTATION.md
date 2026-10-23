# Voyana API Documentation

**Base URL:** `http://localhost:3001`

**Content-Type:** `application/json`

**Authentication:** Bearer JWT token in `Authorization` header. Most endpoints use `optionalAuth` (works with or without a token). Endpoints marked require a valid token via `requireAuth`.

---

## Table of Contents

- [Health & Status](#health--status)
- [Authentication](#authentication)
- [Trips & Itineraries](#trips--itineraries)
- [Trip Activities](#trip-activities)
- [Trip Members](#trip-members)
- [Bookings](#bookings)
- [Budget & Expenses](#budget--expenses)
- [Packing Checklists](#packing-checklists)
- [Alerts & Notifications](#alerts--notifications)
- [Destinations](#destinations)
- [Travel Memories](#travel-memories)
- [Collaboration – Group Chat](#collaboration--group-chat)
- [Collaboration – Tasks](#collaboration--tasks)
- [Collaboration – Polls](#collaboration--polls)
- [Collaboration – Trip Memories](#collaboration--trip-memories)
- [Reviews](#reviews)
- [VoyaBot AI Chat](#voyabot-ai-chat)
- [Data Migration](#data-migration)
- [Legacy Data API](#legacy-data-api)
- [Error Responses](#error-responses)

---

## Health & Status

### GET /health

Returns service health, uptime, and dependency statuses.

**Response:**

```json
{
  "status": "ok",
  "service": "ai-service",
  "timestamp": "2026-10-23T06:30:00.000Z",
  "uptimeSeconds": 3600,
  "dependencies": {
    "database": {
      "type": "mongodb",
      "status": "connected"
    },
    "llmProvider": {
      "name": "groq",
      "status": "ready"
    }
  }
}
```

### GET /api/data/status

Returns MongoDB connection status.

**Response:**

```json
{
  "status": "ok",
  "database": "MongoDB",
  "mongoConnection": "connected",
  "timestamp": "2026-10-23T06:30:00.000Z"
}
```

---

## Authentication

### POST /api/auth/signup

Register a new user account.

**Request Body:**

| Field      | Type   | Required | Description                                   |
|------------|--------|----------|-----------------------------------------------|
| `name`     | string | Yes      | Full name (minimum 2 characters)              |
| `email`    | string | Yes      | Valid email address                            |
| `password` | string | Yes      | Password (minimum 8 characters)               |
| `role`     | string | No       | `traveler` (default), `organizer`, or `admin`  |

**Success Response (201):**

```json
{
  "ok": true,
  "message": "Account created successfully. Welcome to Voyana, Diya Shah!",
  "session": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "usr-a1b2c3d4",
      "name": "Diya Shah",
      "email": "diya@voyana.com",
      "role": "traveler",
      "preferences": {
        "preferredCurrency": "USD",
        "travelStyle": "Cultural & Historic",
        "emailNotifications": true,
        "smsAlerts": false
      }
    },
    "expiresAt": 1730000000000
  }
}
```

**Error Responses:**

| Status | Condition                     |
|--------|-------------------------------|
| 400    | Missing or invalid fields     |
| 409    | Email already registered      |
| 500    | Server error                  |

---

### POST /api/auth/login

Sign in with email and password.

**Request Body:**

| Field      | Type   | Required | Description |
|------------|--------|----------|-------------|
| `email`    | string | Yes      | Email       |
| `password` | string | Yes      | Password    |

**Success Response (200):**

```json
{
  "ok": true,
  "message": "Welcome back, Diya!",
  "session": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { ... },
    "expiresAt": 1730000000000
  }
}
```

**Error Responses:**

| Status | Condition                |
|--------|--------------------------|
| 400    | Missing email or password|
| 401    | Account not found        |
| 401    | Incorrect password       |

---

### GET /api/auth/me

Get the currently authenticated user's profile.

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**

```json
{
  "ok": true,
  "user": {
    "id": "usr-a1b2c3d4",
    "name": "Diya Shah",
    "email": "diya@voyana.com",
    "role": "traveler",
    "preferences": { ... }
  }
}
```

---

### PUT /api/auth/profile

Update the authenticated user's profile fields.

**Headers:** `Authorization: Bearer <token>`

**Request Body:** Any updatable user fields (name, preferences, etc.). Fields `passwordHash`, `id`, and `_id` are blocked.

**Success Response (200):**

```json
{
  "ok": true,
  "message": "Profile updated successfully.",
  "user": { ... }
}
```

---

### GET /api/auth/users

List all registered users (collaborator lookup). Passwords are excluded from results.

**Success Response (200):**

```json
{
  "ok": true,
  "users": [ ... ]
}
```

---

## Trips & Itineraries

### GET /api/trips

List trips with optional filters. Visibility is scoped to authenticated user's trips, public/shared trips, and templates.

**Query Parameters:**

| Param          | Type   | Description                          |
|----------------|--------|--------------------------------------|
| `destination`  | string | Filter by destination (regex match)  |
| `search`       | string | Full-text search across title, destination, country, tags |
| `templateOnly` | string | Set `"true"` to fetch only templates |
| `ownerId`      | string | Filter by trip owner ID              |

**Success Response (200):**

```json
{
  "ok": true,
  "count": 5,
  "trips": [ ... ]
}
```

---

### GET /api/trips/:id

Get full trip details including activities and members.

**Success Response (200):**

```json
{
  "ok": true,
  "trip": {
    "id": "trip-a1b2c3d4",
    "title": "Bali Adventure",
    "destination": "Bali",
    "country": "Indonesia",
    "startDate": "2026-10-10",
    "endDate": "2026-10-16",
    "budgetTarget": 4200,
    "currency": "USD",
    "visibility": "shared",
    "members": [ ... ],
    "activities": [ ... ]
  }
}
```

---

### POST /api/trips

Create a new trip.

**Request Body:**

| Field           | Type     | Required | Description                               |
|-----------------|----------|----------|-------------------------------------------|
| `title`         | string   | Yes      | Trip title                                |
| `destination`   | string   | Yes      | Destination name                          |
| `startDate`     | string   | Yes      | ISO date string                           |
| `endDate`       | string   | Yes      | ISO date string                           |
| `country`       | string   | No       | Country name                              |
| `description`   | string   | No       | Trip description                          |
| `coverImage`    | string   | No       | Cover image URL                           |
| `visibility`    | string   | No       | `public`, `shared` (default), `private`   |
| `budgetTarget`  | number   | No       | Total budget target                       |
| `currency`      | string   | No       | Currency code (default: `USD`)            |
| `tags`          | string[] | No       | Tags array                                |
| `isTemplate`    | boolean  | No       | Mark as a reusable template               |
| `invitedEmails` | string[] | No       | Emails to auto-invite as editors          |
| `activities`    | array    | No       | Initial activities                        |

**Success Response (201):**

```json
{
  "ok": true,
  "message": "Trip created successfully in shared MongoDB Atlas.",
  "trip": { ... }
}
```

---

### PUT /api/trips/:id

Update trip details. Fields `_id` and `id` are protected.

**Request Body:** Any updatable trip fields.

**Success Response (200):**

```json
{
  "ok": true,
  "message": "Trip updated successfully in shared MongoDB Atlas.",
  "trip": { ... }
}
```

---

### DELETE /api/trips/:id

Delete a trip by ID.

**Success Response (200):**

```json
{
  "ok": true,
  "message": "Trip \"Bali Adventure\" deleted from shared MongoDB Atlas."
}
```

---

## Trip Activities

### POST /api/trips/:id/activities

Add an activity to a trip itinerary.

**Request Body:**

| Field              | Type    | Required | Description                          |
|--------------------|---------|----------|--------------------------------------|
| `dayNumber`        | number  | No       | Day number in itinerary (default: 1) |
| `activityDate`     | string  | No       | ISO date of the activity             |
| `timeSlot`         | string  | No       | Time slot (default: `10:00 AM`)      |
| `title`            | string  | No       | Activity title                       |
| `locationName`     | string  | No       | Venue/location name                  |
| `description`      | string  | No       | Description                          |
| `cost`             | number  | No       | Estimated cost                       |
| `category`         | string  | No       | Category (default: `Sightseeing`)    |
| `bookingReference` | string  | No       | Related booking reference            |
| `orderIndex`       | number  | No       | Display order                        |

**Success Response (201):**

```json
{
  "ok": true,
  "message": "Activity added to trip itinerary.",
  "activity": { ... },
  "trip": { ... }
}
```

---

### PUT /api/trips/:id/activities/:activityId

Update a specific activity within a trip.

**Request Body:** Any updatable activity fields.

---

### DELETE /api/trips/:id/activities/:activityId

Remove an activity from the trip.

---

## Trip Members

### POST /api/trips/:id/members

Invite a collaborator to a trip.

**Request Body:**

| Field   | Type   | Required | Description                            |
|---------|--------|----------|----------------------------------------|
| `email` | string | Yes      | Collaborator email address             |
| `name`  | string | No       | Display name                           |
| `role`  | string | No       | `owner`, `editor` (default), `viewer`  |

**Success Response (201):**

```json
{
  "ok": true,
  "message": "Collaborator added to trip.",
  "member": { ... },
  "trip": { ... }
}
```

---

## Bookings

### GET /api/bookings

List bookings. Filterable by type, status, and user.

**Query Parameters:**

| Param    | Type   | Description                                      |
|----------|--------|--------------------------------------------------|
| `userId` | string | Filter by user (auto-set from token if present)  |
| `type`   | string | Filter by booking type (`flight`, `hotel`, etc.) |
| `status` | string | Filter by status (`confirmed`, `cancelled`, etc.)|

**Success Response (200):**

```json
{
  "ok": true,
  "count": 3,
  "bookings": [ ... ]
}
```

---

### GET /api/bookings/:id

Get a single booking by ID or booking reference.

---

### POST /api/bookings

Create a new booking. Automatically generates a confirmation alert.

**Request Body:**

| Field              | Type   | Required | Description                                |
|--------------------|--------|----------|--------------------------------------------|
| `bookingType`      | string | Yes      | `flight`, `hotel`, `transport`, `package`  |
| `totalAmount`      | number | Yes      | Total booking amount                       |
| `contactEmail`     | string | Yes      | Contact email address                      |
| `currency`         | string | No       | Currency code (default: `USD`)             |
| `status`           | string | No       | Default: `confirmed`                       |
| `paymentStatus`    | string | No       | Default: `paid`                            |
| `contactPhone`     | string | No       | Contact phone number                       |
| `specialRequests`  | string | No       | Special requests text                      |
| `flightDetails`    | object | No       | Flight-specific details                    |
| `hotelDetails`     | object | No       | Hotel-specific details                     |
| `transportDetails` | object | No       | Transport-specific details                 |

**Success Response (201):**

```json
{
  "ok": true,
  "message": "Booking confirmed and recorded in shared MongoDB Atlas.",
  "booking": {
    "id": "bkg-a1b2c3d4",
    "bookingReference": "VOY-FL-123456",
    "bookingType": "flight",
    "status": "confirmed",
    "totalAmount": 850,
    "currency": "USD",
    ...
  }
}
```

---

### PUT /api/bookings/:id

Update booking fields. Accepts ID or booking reference.

---

### POST /api/bookings/:id/cancel

Cancel a booking. Sets status to `cancelled`, payment to `refunded`, and creates an alert.

**Request Body:**

| Field    | Type   | Required | Description            |
|----------|--------|----------|------------------------|
| `reason` | string | No       | Cancellation reason    |

---

## Budget & Expenses

### GET /api/budget/:tripId

Get or auto-initialize budget for a trip. Creates a default budget with standard category allocations if none exists.

**Success Response (200):**

```json
{
  "ok": true,
  "budget": {
    "id": "trip-bali-001",
    "tripId": "trip-bali-001",
    "totalBudget": 4200,
    "currency": "USD",
    "allocations": [
      { "category": "Flights", "allocated": 1400, "color": "#635BFF" },
      { "category": "Accommodations", "allocated": 1200, "color": "#00D4B2" },
      ...
    ],
    "expenses": [ ... ]
  }
}
```

---

### PUT /api/budget/:tripId

Update budget totals, allocations, or metadata. Upserts if not found.

---

### POST /api/budget/:tripId/expenses

Add an expense to the trip budget.

**Request Body:**

| Field           | Type     | Required | Description                         |
|-----------------|----------|----------|-------------------------------------|
| `title`         | string   | Yes      | Expense title                       |
| `amount`        | number   | Yes      | Expense amount                      |
| `paidBy`        | string   | Yes      | Who paid                            |
| `category`      | string   | No       | Budget category (default: `Miscellaneous`) |
| `currency`      | string   | No       | Currency (default: `USD`)           |
| `date`          | string   | No       | Date of expense                     |
| `splitAmong`    | string[] | No       | Members to split among              |
| `paymentMethod` | string   | No       | Payment method                      |
| `notes`         | string   | No       | Notes                               |
| `receiptUrl`    | string   | No       | Receipt image URL                   |

**Success Response (201):**

```json
{
  "ok": true,
  "message": "Expense added to shared budget.",
  "expense": { ... },
  "budget": { ... }
}
```

---

### DELETE /api/budget/:tripId/expenses/:expenseId

Remove an expense from the trip budget.

---

## Packing Checklists

### GET /api/packing/:tripId

Get or auto-initialize packing checklist for a trip.

**Success Response (200):**

```json
{
  "ok": true,
  "list": {
    "id": "trip-bali-001",
    "tripId": "trip-bali-001",
    "destination": "Paris",
    "tripDurationDays": 5,
    "seasonOrWeather": "Mild Autumn",
    "items": [
      {
        "id": "pack-1",
        "name": "Passport & Visa Documents",
        "category": "Documents & Money",
        "isPacked": true,
        "priority": "essential",
        "assignedTo": "Diya Shah",
        "quantity": 1,
        "notes": "Digital backup in encrypted cloud"
      }
    ]
  }
}
```

---

### PUT /api/packing/:tripId

Update the entire packing list metadata or items.

---

### POST /api/packing/:tripId/items

Add an item to the packing checklist.

**Request Body:**

| Field        | Type    | Required | Description                                |
|--------------|---------|----------|--------------------------------------------|
| `name`       | string  | Yes      | Item name                                  |
| `category`   | string  | No       | Category (default: `Clothing`)             |
| `isPacked`   | boolean | No       | Packed status (default: `false`)           |
| `priority`   | string  | No       | `essential`, `recommended`, `optional`     |
| `assignedTo` | string  | No       | Member assigned (default: `Everyone`)      |
| `quantity`   | number  | No       | Quantity (default: 1)                      |
| `notes`      | string  | No       | Notes                                      |
| `weatherTag` | string  | No       | Weather-specific tag                       |

---

### PUT /api/packing/:tripId/items/:itemId

Update or toggle a specific packing item.

---

### DELETE /api/packing/:tripId/items/:itemId

Remove an item from the checklist.

---

## Alerts & Notifications

### GET /api/alerts

List alerts for a user with unread count.

**Query Parameters:**

| Param    | Type   | Description         |
|----------|--------|---------------------|
| `userId` | string | Filter by user ID   |

**Success Response (200):**

```json
{
  "ok": true,
  "count": 5,
  "unreadCount": 2,
  "alerts": [
    {
      "id": "alt-a1b2c3",
      "user_id": "usr-a1b2c3d4",
      "booking_id": "bkg-xyz",
      "booking_reference": "VOY-FL-123456",
      "booking_type": "flight",
      "title": "Booking Confirmed: VOY-FL-123456",
      "message": "Your flight reservation for 850 USD is confirmed.",
      "severity": "success",
      "is_read": false,
      "new_status": "confirmed",
      "created_at": "2026-10-23T06:30:00.000Z"
    }
  ]
}
```

---

### POST /api/alerts

Create a new alert manually.

**Request Body:**

| Field               | Type   | Required | Description                                     |
|---------------------|--------|----------|-------------------------------------------------|
| `title`             | string | Yes      | Alert title                                     |
| `message`           | string | Yes      | Alert message body                              |
| `severity`          | string | No       | `info` (default), `success`, `warning`, `critical` |
| `booking_id`        | string | No       | Associated booking ID                           |
| `booking_reference` | string | No       | Booking reference code                          |
| `booking_type`      | string | No       | Booking type                                    |
| `old_status`        | string | No       | Previous status                                 |
| `new_status`        | string | No       | New status                                      |

---

### PUT /api/alerts/:id/read

Mark a single alert as read.

---

### PUT /api/alerts/read-all

Mark all alerts as read for a user.

**Request Body:**

| Field    | Type   | Required | Description    |
|----------|--------|----------|----------------|
| `userId` | string | No       | Target user ID |

---

## Destinations

### GET /api/destinations

Retrieve all curated destinations or filter by region.

**Query Parameters:**

| Param    | Type   | Description                                    |
|----------|--------|------------------------------------------------|
| `region` | string | Filter by region (e.g., `Asia`, `Europe`, `all`) |

**Success Response (200):**

```json
{
  "ok": true,
  "count": 12,
  "destinations": [
    {
      "id": "dest-bali",
      "name": "Bali",
      "country": "Indonesia",
      "region": "Asia",
      "coordinates": { "lat": -8.4095, "lng": 115.1889 },
      ...
    }
  ]
}
```

---

### GET /api/destinations/:id

Retrieve a single destination by ID.

---

## Travel Memories

### GET /api/memories

List travel memories with search, filtering, and sorting.

**Query Parameters:**

| Param    | Type   | Description                                       |
|----------|--------|---------------------------------------------------|
| `tripId` | string | Filter by trip ID (or `all`)                      |
| `tag`    | string | Filter by tag (or `all`)                          |
| `search` | string | Full-text search across title, caption, location  |
| `sortBy` | string | `newest` (default), `oldest`, `likes`             |
| `limit`  | number | Max results (default: 100, max: 200)              |

**Success Response (200):**

```json
{
  "ok": true,
  "count": 10,
  "memories": [ ... ],
  "tags": ["Travel", "Sunset", "Architecture"]
}
```

---

### GET /api/memories/:id

Get a single memory by ID.

---

### POST /api/memories

Create a new travel memory.

**Request Body:**

| Field          | Type            | Required | Description                      |
|----------------|-----------------|----------|----------------------------------|
| `title`        | string          | Yes      | Memory title                     |
| `imageUrl`     | string          | Yes      | Image URL                        |
| `tripId`       | string          | No       | Associated trip ID               |
| `locationName` | string          | No       | Location name                    |
| `caption`      | string          | No       | Caption text                     |
| `date`         | string          | No       | Date of memory                   |
| `tags`         | string[] or CSV | No       | Tags (auto-cleaned, `#` removed) |
| `uploadedBy`   | string          | No       | Uploader name                    |

---

### POST /api/memories/:id/like

Toggle like on a memory. Same user name will unlike if already liked.

**Request Body:**

| Field      | Type   | Required | Description   |
|------------|--------|----------|---------------|
| `userName` | string | No       | Voter's name  |

---

### PUT /api/memories/:id

Update an existing memory's title, caption, location, image, date, or tags.

---

### DELETE /api/memories/:id

Permanently delete a memory from MongoDB.

---

### POST /api/memories/ai-story

Generate an AI-powered reflection caption and smart hashtags for a memory.

**Request Body:**

| Field         | Type   | Required | Description            |
|---------------|--------|----------|------------------------|
| `title`       | string | No       | Memory title           |
| `location`    | string | No       | Location name          |
| `destination` | string | No       | Destination name       |

**Success Response (200):**

```json
{
  "ok": true,
  "caption": "Paused in the quiet glow of Bali to take in \"Sunset at Uluwatu\"...",
  "tags": ["TravelMoments", "Wanderlust", "GoldenHour", "ExploreMore", "VoyanaTravel"]
}
```

---

## Collaboration – Group Chat

### GET /api/collaboration/:tripId/chat

Retrieve chat messages for a trip (up to 200, chronological).

**Success Response (200):**

```json
{
  "ok": true,
  "count": 15,
  "messages": [
    {
      "id": "msg-a1b2c3d4",
      "tripId": "trip-bali-001",
      "senderName": "Diya Shah",
      "message": "Just booked the villa!",
      "messageType": "text",
      "createdAt": "2026-10-20T14:30:00.000Z"
    }
  ]
}
```

---

### POST /api/collaboration/:tripId/chat

Send a chat message.

**Request Body:**

| Field          | Type   | Required | Description                     |
|----------------|--------|----------|---------------------------------|
| `message`      | string | Yes      | Message content                 |
| `senderName`   | string | No       | Sender display name             |
| `senderAvatar` | string | No       | Avatar URL                      |
| `messageType`  | string | No       | `text` (default), `image`, etc. |

---

## Collaboration – Tasks

### GET /api/collaboration/:tripId/tasks

List all tasks for a trip.

---

### POST /api/collaboration/:tripId/tasks

Create a new task.

**Request Body:**

| Field           | Type   | Required | Description                                    |
|-----------------|--------|----------|------------------------------------------------|
| `title`         | string | Yes      | Task title                                     |
| `description`   | string | No       | Task description                               |
| `assignedTo`    | string | No       | Assigned member name                           |
| `assignedEmail` | string | No       | Assigned member email                          |
| `dueDate`       | string | No       | Due date                                       |
| `status`        | string | No       | `todo` (default), `in-progress`, `done`        |
| `category`      | string | No       | Category (default: `General`)                  |

---

### PUT /api/collaboration/:tripId/tasks/:taskId

Update a task's fields (status, assignee, due date, etc.).

---

### DELETE /api/collaboration/:tripId/tasks/:taskId

Delete a task.

---

## Collaboration – Polls

### GET /api/collaboration/:tripId/polls

List all polls for a trip.

---

### POST /api/collaboration/:tripId/polls

Create a voting poll.

**Request Body:**

| Field     | Type     | Required | Description                       |
|-----------|----------|----------|-----------------------------------|
| `question`| string   | Yes      | Poll question                     |
| `options` | string[] | Yes      | At least 2 option texts           |

**Success Response (201):**

```json
{
  "ok": true,
  "message": "Poll created.",
  "poll": {
    "id": "poll-a1b2c3",
    "question": "Which restaurant for dinner?",
    "options": [
      { "id": 1, "text": "Warung Babi", "votes": 0, "voterNames": [] },
      { "id": 2, "text": "Bebek Bengil", "votes": 0, "voterNames": [] }
    ],
    "totalVotes": 0,
    "isClosed": false
  }
}
```

---

### POST /api/collaboration/:tripId/polls/:pollId/vote

Cast a vote on a poll option. Duplicate votes by the same name are ignored.

**Request Body:**

| Field       | Type   | Required | Description              |
|-------------|--------|----------|--------------------------|
| `optionId`  | number | Yes      | Option ID to vote for    |
| `voterName` | string | No       | Voter display name       |

---

## Collaboration – Trip Memories

### GET /api/collaboration/:tripId/memories

List memories scoped to a specific trip.

---

### POST /api/collaboration/:tripId/memories

Add a memory to a trip's collaboration space.

**Request Body:**

| Field          | Type     | Required | Description     |
|----------------|----------|----------|-----------------|
| `title`        | string   | Yes      | Memory title    |
| `imageUrl`     | string   | Yes      | Image URL       |
| `locationName` | string   | No       | Location name   |
| `caption`      | string   | No       | Caption         |
| `date`         | string   | No       | Date            |
| `tags`         | string[] | No       | Tags            |

---

### POST /api/collaboration/:tripId/memories/:memoryId/like

Toggle like on a trip memory.

---

### DELETE /api/collaboration/:tripId/memories/:memoryId

Delete a trip memory.

---

## Reviews

### GET /api/reviews

Query travel reviews with filters and sorting.

**Query Parameters:**

| Param          | Type   | Description                                      |
|----------------|--------|--------------------------------------------------|
| `targetType`   | string | Filter by target type (e.g., `destination`)      |
| `targetId`     | string | Filter by target ID (or `all`)                   |
| `travelerType` | string | Filter by traveler type (e.g., `Couples`, `all`) |
| `minRating`    | number | Minimum rating filter                            |
| `sortBy`       | string | `helpful` (default), `highest`, `newest`         |

**Success Response (200):**

```json
{
  "ok": true,
  "count": 8,
  "reviews": [
    {
      "id": "rev-a1b2c3d4",
      "targetType": "destination",
      "targetId": "bali",
      "rating": 4.8,
      "categoryRatings": {
        "cleanliness": 5,
        "service": 5,
        "valueForMoney": 4,
        "location": 5,
        "safety": 5
      },
      "title": "Unforgettable Experience",
      "comment": "...",
      "pros": ["Beautiful scenery", "Friendly locals"],
      "cons": ["Crowded in peak season"],
      "travelerType": "Couples",
      "helpfulVotes": 12,
      "verifiedBooking": true
    }
  ]
}
```

---

### POST /api/reviews

Submit a new review.

**Request Body:**

| Field             | Type     | Required | Description                              |
|-------------------|----------|----------|------------------------------------------|
| `targetType`      | string   | No       | Review target type                       |
| `targetId`        | string   | No       | Review target ID                         |
| `targetTitle`     | string   | No       | Display title of the target              |
| `rating`          | number   | No       | Overall rating (1-5)                     |
| `categoryRatings` | object   | No       | `{ cleanliness, service, valueForMoney, location, safety }` |
| `title`           | string   | No       | Review title                             |
| `comment`         | string   | No       | Review text                              |
| `pros`            | string[] | No       | List of pros                             |
| `cons`            | string[] | No       | List of cons                             |
| `travelerType`    | string   | No       | Traveler type (default: `Couples`)       |
| `visitDate`       | string   | No       | Visit date (YYYY-MM format)             |
| `photos`          | string[] | No       | Photo URLs                               |

---

### POST /api/reviews/:id/vote

Toggle helpful vote on a review. Same voter name will un-vote if already voted.

**Request Body:**

| Field      | Type   | Required | Description   |
|------------|--------|----------|---------------|
| `userName` | string | No       | Voter's name  |

---

## VoyaBot AI Chat

### POST /ai/chat

*Also available at* `POST /api/ai/chat`

Send a message to VoyaBot, the AI travel concierge powered by Groq LLM.

**Request Body (Zod-validated):**

| Field         | Type     | Required | Description                                  |
|---------------|----------|----------|----------------------------------------------|
| `message`     | string   | Yes      | User message (min 1 character)               |
| `tripId`      | string   | No       | Trip context ID (default: `trip-bali-001`)   |
| `destination` | string   | No       | Destination to query about                   |
| `history`     | array    | No       | Conversation history `[{role, content}]`     |

**History Item Schema:**

| Field     | Type   | Required | Description                          |
|-----------|--------|----------|--------------------------------------|
| `role`    | string | Yes      | `user`, `assistant`, or `system`     |
| `content` | string | Yes      | Message content                      |

**Success Response (200):**

```json
{
  "content": "Here's a suggested 5-day itinerary for Paris...",
  "aiGenerated": true,
  "citedContext": {
    "days": [1, 2, 3, 4, 5],
    "topics": ["itinerary", "sightseeing", "food"],
    "notes": "Custom itinerary based on user preferences"
  },
  "proposedChanges": [
    {
      "day": 1,
      "activity": "Visit the Eiffel Tower",
      "rationale": "Iconic landmark, best visited early morning"
    }
  ]
}
```

**Error Responses:**

| Status | Condition                                     |
|--------|-----------------------------------------------|
| 400    | Invalid request payload (Zod validation)      |
| 503    | LLM provider rate-limited or timed out        |

---

## Data Migration

### POST /api/migrate

Trigger database seeding and data migration.

**Success Response (200):**

```json
{
  "ok": true,
  "message": "Migration completed successfully.",
  "summary": { ... }
}
```

---

## Legacy Data API

These endpoints are mounted under `/api/data/` and provide direct MongoDB access. They are retained for backward compatibility.

| Method | Endpoint                            | Description                  |
|--------|-------------------------------------|------------------------------|
| GET    | `/api/data/status`                  | MongoDB connection status    |
| GET    | `/api/data/trips`                   | List all trips               |
| GET    | `/api/data/trips/:tripId`           | Get trip by tripId           |
| POST   | `/api/data/trips`                   | Create or upsert trip        |
| DELETE | `/api/data/trips/:tripId`           | Delete trip                  |
| GET    | `/api/data/bookings`                | List bookings                |
| POST   | `/api/data/bookings`                | Create booking + alert       |
| PUT    | `/api/data/bookings/:bookingId/status` | Update booking status     |
| GET    | `/api/data/expenses/:tripId`        | List expenses for trip       |
| POST   | `/api/data/expenses`                | Add expense                  |
| DELETE | `/api/data/expenses/:expenseId`     | Delete expense               |
| GET    | `/api/data/packing/:tripId`         | Get packing checklist        |
| POST   | `/api/data/packing/:tripId`         | Upsert packing checklist     |
| GET    | `/api/data/alerts`                  | List alerts                  |
| POST   | `/api/data/alerts`                  | Create alert                 |
| PUT    | `/api/data/alerts/:alertId/read`    | Mark alert as read           |
| PUT    | `/api/data/alerts/read-all`         | Mark all alerts as read      |

---

## Error Responses

All endpoints follow a consistent error response format:

**Standard Error (4xx/5xx):**

```json
{
  "ok": false,
  "message": "Human-readable error description.",
  "error": "Technical error details (when available)"
}
```

**Validation Error (400 — Zod):**

```json
{
  "error": "Invalid request payload",
  "details": [
    { "field": "message", "message": "String must contain at least 1 character(s)" }
  ]
}
```

**Authentication Error (401):**

```json
{
  "error": "Unauthorized",
  "message": "Authentication token is missing. Please sign in."
}
```

**Not Found (404):**

```json
{
  "error": "Not Found",
  "message": "Endpoint GET /unknown does not exist on Voyana backend."
}
```

**Service Unavailable (503 — LLM):**

```json
{
  "error": "AI Service Unavailable",
  "message": "Downstream LLM provider is temporarily rate limited or timed out. Please retry shortly.",
  "retryAfterSeconds": 5
}
```

---

## Environment Variables

| Variable             | Default                               | Description                        |
|----------------------|---------------------------------------|------------------------------------|
| `PORT`               | `3001`                                | Server port                        |
| `NODE_ENV`           | `development`                         | Environment mode                   |
| `MONGODB_URI`        | `mongodb://localhost:27017/voyana`     | MongoDB connection string          |
| `MONGODB_DB_NAME`    | `voyana`                              | MongoDB database name              |
| `JWT_SECRET`         | `voyana-team-shared-secret-key-2026`  | JWT signing secret                 |
| `LLM_PROVIDER`       | `mock`                                | LLM provider (`groq` or `mock`)   |
| `GROQ_API_KEY`       | —                                     | Groq API key                       |
| `GROQ_MODEL`         | `llama-3.3-70b-versatile`            | Groq model identifier              |
| `REQUEST_TIMEOUT_MS` | `30000`                               | Request timeout in milliseconds    |
