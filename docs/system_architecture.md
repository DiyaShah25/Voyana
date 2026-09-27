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

Voyana is architected as a modular, cloud-native collaborative travel platform composed of a reactive single-page frontend application, a BaaS (Backend-as-a-Service) persistence tier, and an intelligent AI co-pilot integration service.

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
    end

    subgraph Service Tier [Voyana Core Services Layer]
        AIService[AI Travel Assistant Service]
        ItinService[Itinerary Generation Service]
        RecomService[Destination Match & Recommendation Engine]
        BudService[Budget & Expense Ledger Service]
        PackService[Packing & Task Assignment Service]
        CollabService[Collaboration & Access Control Service]
        BookingService[Unified Reservation & Checkout Pipeline]
    end

    subgraph Storage Tier [Persistence & Real-time BaaS]
        Supabase[(PostgreSQL / Supabase BaaS)]
        RLS[Row Level Security Policies]
        LocalStorage[(Client Storage Cache & Fallback)]
    end

    UI --> Service Tier
    Globe --> Service Tier
    ChatModal --> AIService
    ItineraryEngine --> ItinService
    BudgetEngine --> BudService
    PackingEngine --> PackService
    BookingSuite --> BookingService

    Service Tier --> Supabase
    Service Tier --> LocalStorage
```

---

## 2. Software Component Architecture (SCA) Decomposition

### 2.1 Presentation Components
- **Navigation & Header Hub (`Header.tsx`, `QuickServicesBar.tsx`)**: Global routing, search triggers, service drawer shortcuts, and user profile management.
- **Visual Exploration (`VoyanaGlobe.tsx`, `DestinationGrid.tsx`, `FeaturedJourneys.tsx`)**: 3D interactive WebGL globe visualization with coordinate pinning and curated journey discovery.
- **Workspaces & Modal Drawers (`ChatAssistantModal`, `BudgetPlannerModal`, `PackingChecklistModal`, `TripWorkspaceModal`, `UnifiedBundleBookingModal`)**: Modals with full responsive support and animations.

### 2.2 Domain Services & State Managers
- **`aiChatService.ts`**: AI prompt chaining, fallback intelligence, context citation chips, and action proposals.
- **`itineraryService.ts`**: Dynamic day-by-day scheduler matching pace (relaxed, balanced, packed) with destination points of interest.
- **`budgetService.ts`**: Multi-currency expense ledger, dynamic category allocation, debt settlement calculations, and CSV export.
- **`packingService.ts`**: Weather-aware checklist generation, item priority categorization, and member task assignments.
- **`recommendationService.ts`**: Multi-dimensional scoring for destination recommendations based on traveler vibes, budgets, and seasons.
- **`collaborationService.ts`**: Multi-user permissions (owner, editor, viewer), invite token generation, and realtime alerts.

---

## 3. Data Flow & Communication Patterns

1. **State Synchronization**: Optimistic UI updates with client-side caching in `localStorage`, backed by asynchronous Supabase synchronization.
2. **AI Telemetry & Fallback Protocol**: Transparent failover to high-fidelity client-side recommendation and heuristic engines whenever external AI endpoints are unreachable.
3. **Cross-Module Actions**: 1-click execution bridges between AI chat suggestions, budget allocations, and packing lists.
