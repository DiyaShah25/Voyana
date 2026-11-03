# Voyana — Comprehensive Master Test Plan

**Course**: DAU Sem-3 WSOA (Web Services and Oriented Architectures)  
**Project**: Voyana — Collaborative AI-Assisted Travel Platform  
**Author / QA Lead**: Bhavika Sainani  
**Team Members**: Diya Shah, Nigam Sanghvi, Tirth Gandhi, Bhavika Sainani, Megha Lalwani, Manav Vyas, Bhavika Mulani, Jagrat Kumar  
**Tested Commit**: `b53a4f7`  
**Date**: November 2, 2026  

---

## 1. Executive Summary & Objective

Voyana is a real-time collaborative travel planning and booking platform integrating an AI itinerary assistant (VoyaBot), interactive 3D Globe visualization, multi-service bookings (Flights, Hotels, Transport), shared budget tracking, debt settlements, packing checklists, collaborative polls, and travel memories.

The primary objective of this Test Plan is to validate the correctness, security, reliability, performance, accessibility, and user experience of both the frontend client and backend microservices before university deliverable submission.

### 1.1 Scope Boundaries & Known Technical Gaps
- **Multi-File / Chunked Video Upload Router**: Formally documented as not implemented on backend (tracked as BUG-05); single photo/memory upload is supported.
- **Responsive Viewport at 375px**: Mobile navbar layout clipping identified at 375px width (tracked as BUG-07; responsive verification marked Partial).
- **Search Placeholder Truncation**: Search placeholder text truncated at ≥1280px (tracked as BUG-08).

---

## 2. Scope of Testing

### 2.1 In-Scope Functional Modules
- **Authentication & Security**: Multi-mode login, registration, password hashing (bcrypt), JWT generation, token verification, session persistence, and role-based permissions (`admin`, `user`).
- **Interactive Globe & Destination Catalog**: 3D Three.js globe rendering, regional filtering, search indexing, and details modal rendering.
- **AI Travel Assistant (VoyaBot)**: Contextual trip recommendations, prompt-driven destination guidance, daily itinerary citations, and offline/timeout fallback to local contextual responses within 2.5s.
- **Trip Workspaces & Collaboration**: Trip creation, member roles (`owner`, `editor`, `viewer`), task assignments, and real-time voting polls.
- **Bookings & Payments**: Flight reservations, hotel bookings, transport hire, card verification, OTP authentication requirement before payment confirmation, and real PDF e-ticket generation via `jspdf`.
- **Budgeting & Cost Splitting**: Categorized allocations, expense ledgers, multi-user debt settlement mathematics, and local/remote synchronization.
- **Packing & Alerts**: Shared packing checklists, progress tracking, automated booking status notifications, and delay alerts.
- **Third-Party Integrations**: Weather API and Live Currency Rates with comprehensive fault injection and fallback handling.

### 2.2 In-Scope Non-Functional Types
- **UI / E2E Automation**: Playwright headless browser flows on Chromium across full booking and navigation paths.
- **Cross-Browser & Responsiveness**: Viewport verification across Mobile (375px), Tablet (768px), and Desktop (1440px).
- **Accessibility (a11y)**: Focusability, image alt-attributes, DOM semantic hierarchy, and contrast baseline.
- **Performance & Load**: Native concurrent load testing covering both lightweight ping (`/health`) and database-backed catalog queries (`/api/destinations`), reporting throughput, p50/p95/p99 latency, and error rate.
- **Security & Vulnerability Analysis**: Audit for hardcoded secrets, JWT bypass vulnerabilities, dependency CVEs via `npm audit`, NoSQL injection resilience, and IDOR protection.
- **Resilience / Fault Tolerance**: Backend offline recovery, mock provider fallback, and network failure tolerance.

### 2.3 Known Gaps, Scope Boundaries & Testing Limitations
- **Untested Frontend Service Modules (Unit Level)**:
  - `tripService.ts` (0% unit coverage), `reviewService.ts` (0%), `invitationService.ts` (0%), and `itineraryService.ts` (0%) do not currently possess isolated Vitest unit test suites.
  - *Mitigation & Coverage Strategy*: `tripService.ts` and core trip workspaces are extensively exercised and validated through backend integration tests (`all-routes-integration.test.ts`) and Playwright E2E browser flows.
  - Overall frontend services layer coverage sits at **45.73%** across all files in `src/services/`, while the 17 tested modules achieve an average statement coverage of **73.94%**.
- **Multi-File / Multi-Gigabyte Chunked Video Upload**: Basic single photo/memory upload UI exists; background chunked multi-file video streaming is currently not implemented on the backend.
- **Live Airline GDS Integration**: Live booking uses internal simulated mock providers and verified schema mappings; direct Sabre/Amadeus GDS network pipes are not configured.

---

## 3. Test Environments & Tooling

| Layer | Technology / Tool | Version / Details | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React + Vite + TypeScript | React 18.3.1, Vite 5.4.8 | Single Page Application |
| **Backend Framework** | Node.js + Express + Mongoose | Node v22.19.0, Express 4.x | REST API & Microservice |
| **Primary Database** | MongoDB Atlas / In-Memory Mongo | mongodb-memory-server v10.1 | Isolated deterministic test DB (`voyana_test`) |
| **Relational Database** | Supabase PostgreSQL | CLI Migrations & SQL Seeding | Relational bookings & audit records |
| **Unit Testing (UI)** | Vitest + React Testing Library | Vitest 2.1.9, JSDOM 29.1 | Client service and utility testing |
| **Unit/API Testing (API)**| Jest + Supertest | Jest 29.7, Supertest 7.0 | Route groups, middleware, and schemas |
| **E2E & Visual Testing** | Playwright | 1.64.1 (Chromium headless) | End-to-end flows & screenshots |
| **API Load Testing** | Multi-Endpoint Benchmark | Concurrent Node suite (health & DB) | Latency percentiles & RPS |
| **API Client Documentation**| Postman Collection | v2.1.0 Collection format | Manual & automated regression |

---

## 4. Entry and Exit Criteria

### 4.1 Entry Criteria
1. Isolated test infrastructure established (in-memory MongoDB runs without touching production Atlas cluster).
2. Clean build passes for both frontend (`npm run build`) and backend (`npm --prefix services/ai-service run build`).
3. Seed script populates a consistent baseline dataset across all collections.

### 4.2 Exit Criteria
1. **100% pass rate** on all unit and integration test suites.
2. Zero high-severity security vulnerabilities unlogged or unaddressed.
3. Every test case traced to a verified requirement ID (VPM-xx).
4. Evidence captured for every metric, screenshot, and bug logged.

---

## 5. Team Roles & Responsibilities

| Team Member | Role | Primary Responsibility |
| :--- | :--- | :--- |
| **Bhavika Sainani** | QA Lead & Test Architect | Test plan creation, test execution, bug log management, final submission |
| **Diya Shah** | Full-Stack Lead | Trip collaboration, real-time sync, and route integration |
| **Nigam Sanghvi** | Backend Engineer | Auth middleware, database schema modeling, and API endpoints |
| **Tirth Gandhi** | Frontend Engineer | Globe 3D canvas, destination filters, and Explore strip UI |
| **Megha Lalwani** | QA Engineer | Bookings, flights, and payment status verification |
| **Manav Vyas** | Backend Engineer | Migration service, database seeding, and data pipelines |
| **Bhavika Mulani** | QA Engineer | Alerting service, packing lists, and responsive UI testing |
| **Jagrat Kumar** | AI / Systems Engineer | VoyaBot LLM client factory, prompts, and rate limit resilience |

---

## 6. Defect Severity & Priority Classification

- **Critical (P1)**: Complete system crash, authentication bypass, data loss, or unauthorized access. Blocks release.
- **High (P2)**: Core functional feature broken with no immediate workaround (e.g., booking payment fails, JWT validation failure).
- **Medium (P3)**: Non-critical feature broken or degraded performance, but a functional fallback exists.
- **Low (P4)**: Cosmetic UI imperfection, minor typo, or documentation mismatch.
