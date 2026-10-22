# Voyana — Collaborative AI Travel Planning & Booking Platform

Voyana is a collaborative, AI-assisted travel planning and booking web application. It combines an interactive 3D WebGL Earth globe, the intelligent VoyaBot AI travel assistant, collaborative group trip workspaces, multi-service reservations (flights, hotels, transport), dynamic budget tracking, smart packing checklists, and social travel memories.

---

## Key Features

### 1. Interactive 3D Earth Globe
* Built with Three.js and WebGL for smooth spherical Earth rendering.
* Coordinate pinning, great-circle flight arcs, and interactive destination focusing.
* Camera controls for rotation, zoom, hemisphere reset, and marker selection.

### 2. VoyaBot AI Travel Assistant
* Powered by Groq Cloud high-speed LLM inference with strict JSON schema validation.
* Answers prompts dynamically for any global destination with tailored multi-day itineraries, highlights, dining guides, and packing tips.
* Surfaces context citations and actionable proposal cards that can be synced directly into trip workspaces.
* Automatic fallback to a local heuristic travel engine when offline.

### 3. Collaborative Trip Workspaces
* Multi-user itinerary planning with day-by-day activity timelines.
* Member roles, permission controls, and invite link generation.
* Group task assignment and real-time activity voting.

### 4. Multi-Service Booking Engine
* Unified booking flow for flights, hotels, and ground transportation.
* Interactive seat selection, room tier selection, and baggage options.
* Real-time reservation status tracking and confirmation references.

### 5. Smart Budget Planner & Expense Splitter
* Dynamic multi-currency expense tracker with category allocation (Lodging, Flights, Food, Activities).
* Real-time per-member debt settlement calculations.
* CSV export and expense breakdown charts.

### 6. Weather-Aware Packing Checklist
* Destination-aware gear checklists categorized by clothing, electronics, documents, and medical.
* Real-time weather condition sync and packing progress indicators.
* Individual item assignment to group members.

### 7. Travel Memories & Reviews
* Photo gallery with location tagging, captioning, and like counters.
* Community reviews and safety score benchmarks for global destinations.

---

## Technology Stack

### Frontend Application
* Framework: React 18, TypeScript, Vite
* Styling: Vanilla CSS and Tailwind CSS with modern glassmorphism design
* 3D Visuals: Three.js
* Icons: Lucide React
* State & Storage: React Context, LocalStorage offline-first cache

### Backend Microservice (`services/ai-service`)
* Runtime: Node.js, Express.js, TypeScript
* AI Provider: Groq Cloud SDK (Llama 3.3 / GPT-OSS models)
* Validation: Zod schemas
* Authentication: JSON Web Tokens (JWT), Bcrypt password hashing
* Telemetry & Data Storage: MongoDB Atlas via Mongoose ODM

### Database Layer
* Primary Document Store: MongoDB Atlas (`trips`, `bookings`, `expenses`, `packing_lists`, `booking_alerts`, `ai_requests`, `users`)
* Relational Schema: Supabase PostgreSQL migrations with Row Level Security and database triggers
* Client Storage: Browser `localStorage` fallback for offline resiliency

---

## Project Structure

```
Voyana/
├── architecture.md                     # High-level architecture summary
├── dist/                               # Production frontend build output
├── docs/                               # System documentation, design docs, and BRD
│   ├── diagrams/                       # ER and architecture diagrams
│   ├── mongodb_architecture.md         # MongoDB Atlas design specifications
│   ├── requirements_analysis.md        # Functional requirements specification
│   └── system_architecture.md          # Software Component Architecture (SCA)
├── public/                             # Static public assets
├── services/
│   └── ai-service/                     # Standalone Express AI & Data backend
│       ├── fixtures/                   # Deterministic trip fixtures for testing
│       ├── prompts/                    # Versioned AI system prompts (chat.v1.md)
│       ├── src/
│       │   ├── config/                 # Environment variable loader
│       │   ├── db/                     # MongoDB connection and Mongoose models
│       │   ├── llm/                    # Groq client, Mock client, and Client factory
│       │   ├── middleware/             # JWT auth verification middleware
│       │   ├── routes/                 # Express API routers (chat, trips, bookings, auth)
│       │   ├── schemas/                # Zod validation schemas
│       │   ├── services/               # Chat processing and telemetry logging services
│       │   ├── app.ts                  # Express application configuration
│       │   └── server.ts               # Server entry point
│       ├── package.json
│       └── tsconfig.json
├── src/                                # Frontend React application source
│   ├── components/
│   │   ├── Alerts/                     # Notifications and booking alert panels
│   │   ├── Booking/                    # Flight, hotel, and transport booking modals
│   │   ├── Budget/                     # Budget planner and expense split matrix
│   │   ├── Chat/                       # VoyaBot interactive chat assistant modal
│   │   ├── Destinations/               # Destination exploration grids and rails
│   │   ├── Globe/                      # Three.js 3D WebGL Earth globe component
│   │   ├── Journeys/                   # Curated multi-stop expedition routes
│   │   ├── Memories/                   # Travel memories gallery and photo uploader
│   │   ├── Packing/                    # Smart packing checklist modal
│   │   ├── Reviews/                    # Verified traveler reviews modal
│   │   ├── Services/                   # Intelligent Travel Suite hub
│   │   ├── Trips/                      # Collaborative workspace and dashboard modals
│   │   └── layout/                     # Header navigation bar and footer
│   ├── context/                        # React AuthContext provider
│   ├── pages/                          # Authentication pages and admin modal
│   ├── services/                       # Domain service layer and API clients
│   ├── types/                          # TypeScript shared type definitions
│   ├── App.tsx                         # Main platform landing page layout
│   ├── index.css                       # Global styles and design system tokens
│   └── main.tsx                        # React application bootstrap
├── supabase/
│   └── migrations/                     # PostgreSQL schema definitions and triggers
├── index.html                          # Single-page application entry HTML
├── package.json                        # Frontend dependencies and scripts
├── tailwind.config.js                  # Tailwind CSS styling configuration
├── tsconfig.json                       # Base TypeScript configuration
└── vite.config.ts                      # Vite build and dev server configuration
```

---

## Getting Started

### Prerequisites
* Node.js version 18 or higher
* npm version 9 or higher
* Git

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/DiyaShah25/Voyana.git
cd Voyana
```

---

### Step 2: Configure Environment Variables

#### Root Frontend Configuration (`.env`)
Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:3001/api
VITE_AI_SERVICE_URL=http://localhost:3001

# Optional: Supabase PostgreSQL (leave blank for local mock/localStorage mode)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

#### Backend Configuration (`services/ai-service/.env`)
Create a `.env` file inside `services/ai-service/`:

```env
PORT=3001
NODE_ENV=development
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.safj48q.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=voyana
JWT_SECRET=voyana-team-shared-secret-key-2026
```

---

### Step 3: Install Dependencies

#### Install Frontend Dependencies
```bash
npm install
```

#### Install Backend Dependencies
```bash
cd services/ai-service
npm install
cd ../..
```

---

### Step 4: Run the Application

#### Start the Backend Service (Port 3001)
In one terminal window:
```bash
cd services/ai-service
npm run dev
```

#### Start the Frontend Client (Port 5173)
In a second terminal window:
```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

---

## API Reference

The backend Express service runs on `http://localhost:3001` and exposes the following endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check and database connection status |
| `POST` | `/ai/chat` | VoyaBot conversational travel assistance |
| `GET` | `/api/status` | MongoDB connection status |
| `POST` | `/api/auth/signup` | Register new user account |
| `POST` | `/api/auth/login` | Authenticate user and receive JWT session |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `GET` | `/api/trips` | Retrieve all collaborative trips |
| `POST` | `/api/trips` | Create or update a trip record |
| `GET` | `/api/bookings` | List user bookings across flights, hotels, and transport |
| `POST` | `/api/bookings` | Create a new reservation |
| `GET` | `/api/expenses/:tripId` | Fetch trip expenses and budget ledger |
| `POST` | `/api/expenses` | Record a new expense |
| `GET` | `/api/packing/:tripId` | Retrieve packing checklist for a trip |
| `POST` | `/api/packing/:tripId` | Save packing items and completion state |
| `GET` | `/api/alerts` | Retrieve notifications and booking status updates |

---

## Build and Quality Verification

### Frontend Type Checking
```bash
npm run typecheck
```

### Frontend Production Build
```bash
npm run build
```

### Backend Automated Test Suite
```bash
cd services/ai-service
npm test
```

### Backend Production Build
```bash
cd services/ai-service
npm run build
```

---

## License

This project is developed for educational and collaborative travel platform purposes. All rights reserved.
