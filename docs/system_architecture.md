# Voyana Software Component Architecture (SCA) & System Design (VPM-13)

| Metadata Field | Specification |
| :--- | :--- |
| **Project** | Voyana — Collaborative AI Travel Planning & Booking Platform |
| **Jira Issue Key** | **VPM-13** |
| **Issue Title** | **SCA and System Architecture Design** |
| **Parent Epic** | **VPM-1: Core Architecture & System Foundation** |
| **Assignee** | **Jagrat Kumar (202512079)** |
| **Reporter** | **Diya Shah** |
| **Status** | **Done** |
| **Due Date** | **Sep 27, 2026** |
| **Updated Date** | **Sep 27, 2026, 2:32 PM** |

---

## 1. System Architecture Overview

Voyana is architected as a modular, cloud-native collaborative travel platform composed of a reactive single-page frontend application (React + Vite + TypeScript), an Express.js backend service (`services/ai-service`), a MongoDB document database with Mongoose ODM, and an intelligent Groq Cloud AI co-pilot integration service.

```mermaid
graph TD
    subgraph Client Tier [Voyana Client Application - React + Vite + TypeScript]
        UI[Interactive UI Layer / Modern Glassmorphism]
        Globe[3D WebGL Earth Globe]
        ChatModal[AI Assistant Copilot Modal]
        ItineraryEngine[Itinerary Workspace & Activity Builder]
        BudgetEngine[Budget Planner & Split Matrix]
        PackingEngine[Smart Packing Checklist]
        BookingSuite[Multi-Service Booking: Flights, Hotels, Transport]
        LocalStorage[(Client Storage Cache & Fallback)]
    end

    subgraph Backend & Service Tier [Express.js Backend & Core Services Layer]
        APIGateway[Express.js REST API Gateway /api/v1]
        AIService[AI Travel Assistant Service - Groq LLM / Fallback]
        ItinService[Itinerary Generation Service]
        RecomService[Destination Match & Recommendation Engine]
        BudService[Budget & Expense Ledger Service]
        PackService[Packing & Task Assignment Service]
        CollabService[Collaboration & Access Control Service]
        BookingService[Unified Reservation & Checkout Pipeline]
    end

    subgraph Storage Tier [Persistence & Database Tier]
        MongoDB[(MongoDB Atlas / Document Store)]
        Mongoose[Mongoose ODM Schemas]
        Collections[Collections: trips, bookings, expenses, packing_lists, booking_alerts, ai_requests]
    end

    UI --> Backend & Service Tier
    Globe --> Backend & Service Tier
    ChatModal --> AIService
    ItineraryEngine --> ItinService
    BudgetEngine --> BudService
    PackingEngine --> PackService
    BookingSuite --> BookingService
    UI -.-> LocalStorage

    Backend & Service Tier --> APIGateway
    APIGateway --> Mongoose
    Mongoose --> MongoDB
    MongoDB --- Collections
```

---

## 2. Software Component Architecture (SCA) Decomposition

### 2.1 Presentation Components
- **Navigation & Header Hub (`Header.tsx`, `QuickServicesBar.tsx`)**: Global routing, search triggers, service drawer shortcuts, and user profile management.
- **Visual Exploration (`VoyanaGlobe.tsx`, `DestinationGrid.tsx`, `FeaturedJourneys.tsx`)**: 3D interactive WebGL globe visualization with coordinate pinning and curated journey discovery.
- **Workspaces & Modal Drawers (`ChatAssistantModal`, `BudgetPlannerModal`, `PackingChecklistModal`, `TripWorkspaceModal`, `UnifiedBundleBookingModal`)**: Modals with full responsive support and animations.

### 2.2 Domain Services & State Managers
- **`aiChatService.ts`**: AI prompt chaining, Groq Cloud / Fallback intelligence, context citation chips, and action proposals.
- **`itineraryService.ts`**: Dynamic day-by-day scheduler matching pace (relaxed, balanced, packed) with destination points of interest.
- **`budgetService.ts`**: Multi-currency expense ledger, dynamic category allocation, debt settlement calculations, and CSV export.
- **`packingService.ts`**: Weather-aware checklist generation, item priority categorization, and member task assignments.
- **`recommendationService.ts`**: Multi-dimensional scoring for destination recommendations based on traveler vibes, budgets, and seasons.
- **`collaborationService.ts`**: Multi-user permissions (owner, editor, viewer), invite token generation, and realtime alerts.

---

## 3. Data Flow & Communication Patterns

1. **State Synchronization**: Optimistic UI updates with client-side caching in `localStorage`, backed by asynchronous REST API calls to the Express.js backend and MongoDB persistence via Mongoose.
2. **AI Telemetry & Fallback Protocol**: Groq Cloud API (`llama-3.3-70b-versatile`) execution with transparent failover to high-fidelity client-side recommendation and heuristic engines whenever external AI endpoints are unreachable.
3. **Cross-Module Actions**: 1-click execution bridges between AI chat suggestions, budget allocations, and packing lists.
