# Voyana — Comprehensive Master Test Cases & Traceability Matrix

**Project**: Voyana — Collaborative AI Travel Platform  
**Author / QA Lead**: Bhavika Sainani  
**Team Members**: Diya Shah, Nigam Sanghvi, Tirth Gandhi, Bhavika Sainani, Megha Lalwani, Manav Vyas, Bhavika Mulani, Jagrat Kumar  
**Tested Commit**: `19b914a`  
**Execution Date**: November 2, 2026  

---

## 1. Test Execution Summary

| Module Group | Automated Suites | Executed Tests | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Frontend Unit & Services** | 17 Vitest suites | 112 | 112 | 0 | **100% Pass** |
| **Backend Integration & Routes** | 10 Jest suites | 104 | 104 | 0 | **100% Pass** |
| **UI & E2E Verification** | 2 Playwright specs | 6 | 6 | 0 | **100% Pass** |
| **Total Automated Tests** | **29 Suites** | **222** | **222** | **0** | **100% Pass** |

---

## 2. Detailed Test Cases by Module

### 2.1 Authentication & Security (AUTH)
| Test ID | Req ID | Jira Key | Title | Preconditions | Test Data | Steps | Expected Result | Actual Result | Status | Automated Test Reference |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-01** | FR-AUTH-01 | VPM-16 | User Registration Success | Database connected | `name: "Postman Tester", email: "postman@voyana.test", password: "Password123!"` | 1. Send POST to `/api/auth/signup`.<br>2. Inspect status and user record. | HTTP 201 Created, returns user object without password hash. | HTTP 201, user created with role 'user'. | **Pass** | `all-routes-integration.test.ts` |
| **TC-AUTH-02** | FR-AUTH-01 | VPM-16 | Duplicate Email Rejection | User already registered | Existing email: `postman@voyana.test` | 1. Send POST to `/api/auth/signup` with identical email. | HTTP 400 Bad Request, message: "User already exists". | HTTP 400, duplicate email blocked. | **Pass** | `all-routes-integration.test.ts` |
| **TC-AUTH-03** | FR-AUTH-02 | VPM-16 | User Login with Valid Password | User registered | `email: "postman@voyana.test", password: "Password123!"` | 1. Send POST to `/api/auth/login`.<br>2. Extract JWT token. | HTTP 200 OK, returns signed JWT token. | HTTP 200, JWT token returned. | **Pass** | `all-routes-integration.test.ts` |
| **TC-AUTH-04** | FR-AUTH-02 | VPM-16 | User Login Wrong Password | User registered | `email: "postman@voyana.test", password: "WrongPassword"` | 1. Send POST to `/api/auth/login`. | HTTP 401 Unauthorized, message: "Invalid credentials". | HTTP 401, unauthorized response. | **Pass** | `all-routes-integration.test.ts` |
| **TC-AUTH-05** | NFR-03 | VPM-16 | RequireAuth Rejects Tampered Token | API route protected | Header: `Bearer <tampered-jwt>` | 1. Send GET to `/api/auth/me` with forged signature. | HTTP 401 Unauthorized, signature verification fails. | HTTP 401 Unauthorized (fixed in BUG-01). | **Pass** | `auth-middleware.test.ts` |
| **TC-AUTH-06** | NFR-03 | VPM-16 | RequireAuth Rejects Expired Token | API route protected | Header: `Bearer <expired-jwt>` | 1. Sign JWT with `exp: -3600`.<br>2. Send request to protected endpoint. | HTTP 401 Unauthorized, "Token has expired". | HTTP 401 Unauthorized. | **Pass** | `auth-middleware.test.ts` |
| **TC-AUTH-07** | NFR-02 | VPM-16 | Client Offline Sign-in Fallback | Backend unreachable | Seeded demo credentials | 1. Mock network disconnect.<br>2. Call `authService.signIn()`. | Signs in using local demo credentials and stores profile in localStorage. | Offline fallback signs in and loads session. | **Pass** | `authService.test.ts` |

### 2.2 Destinations & Globe Catalog (DST)
| Test ID | Req ID | Jira Key | Title | Preconditions | Test Data | Steps | Expected Result | Actual Result | Status | Automated Test Reference |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-DST-01** | FR-DST-01 | VPM-16 | List Curated Destinations | Database seeded | Filter: None | 1. Send GET to `/api/destinations`. | HTTP 200 OK, returns array with 15+ curated destinations. | HTTP 200, returns seeded destination items. | **Pass** | `all-routes-integration.test.ts` |
| **TC-DST-02** | FR-DST-01 | VPM-16 | Filter Destinations by Region | Database seeded | `?region=Europe` | 1. Send GET to `/api/destinations?region=Europe`. | HTTP 200 OK, all returned items have `region: 'Europe'`. | HTTP 200, filtered destinations match Europe. | **Pass** | `all-routes-integration.test.ts` |
| **TC-DST-03** | FR-DST-02 | VPM-16 | Get Destination by Valid ID | Destination exists | `id: 'dst-test-paris'` | 1. Send GET to `/api/destinations/dst-test-paris`. | HTTP 200 OK, returns destination document. | HTTP 200, destination retrieved. | **Pass** | `all-routes-integration.test.ts` |
| **TC-DST-04** | FR-DST-02 | VPM-16 | Unknown Destination ID returns 404 | Destination absent | `id: 'unknown-id-999'` | 1. Send GET to `/api/destinations/unknown-id-999`. | HTTP 404 Not Found, structured error JSON. | HTTP 404 returned. | **Pass** | `all-routes-integration.test.ts` |

### 2.3 AI Assistant / VoyaBot (AI)
| Test ID | Req ID | Jira Key | Title | Preconditions | Test Data | Steps | Expected Result | Actual Result | Status | Automated Test Reference |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AI-01** | FR-AI-01 | VPM-38 | AI Chat Itinerary Advice Generation | LLM mock initialized | `message: "Suggest 3-day Paris itinerary"` | 1. Send POST to `/ai/chat`. | HTTP 200 OK, returns structured AI advice with citations. | HTTP 200, advice generated with day citations. | **Pass** | `chat.test.ts` |
| **TC-AI-02** | FR-AI-02 | VPM-46 | Contextual Citation Verification | Context loaded | `message: "What is my budget for day 2?"` | 1. Send POST to `/ai/chat`. | Cites itinerary days and budget allocations without mutating state. | Verified day references and budget amounts. | **Pass** | `chat.test.ts` |
| **TC-AI-03** | FR-AI-01 | VPM-44 | Validation on Empty Message Payload | Endpoint available | Body: `{ message: "" }` | 1. Send POST to `/ai/chat` with empty message. | HTTP 400 Bad Request, Zod error: "Invalid request payload". | HTTP 400, rejected cleanly. | **Pass** | `all-routes-integration.test.ts` |
| **TC-AI-04** | NFR-01 | VPM-38 | Client Fallback on Remote Timeout (2.5s) | Backend takes > 2500ms | Query: "Find vegetarian bistros" | 1. Force network delay > 2500ms in `aiChatService`.<br>2. Evaluate response. | Aborts remote request at 2.5s and returns local contextual guidance. | Fast fallback returned within SLA. | **Pass** | `aiChatService.test.ts` |

### 2.4 Trip Workspaces & Collaboration (TRIP)
| Test ID | Req ID | Jira Key | Title | Preconditions | Test Data | Steps | Expected Result | Actual Result | Status | Automated Test Reference |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-TRIP-01** | FR-TRIP-01 | VPM-16 | Collaborative Trip Creation | Authenticated user | `title: "Euro Trip 2026", destination: "Paris"` | 1. Send POST to `/api/trips`. | HTTP 201 Created, user added as owner member with unique id. | HTTP 201, trip created with owner member. | **Pass** | `all-routes-integration.test.ts` |
| **TC-TRIP-02** | FR-TRIP-02 | VPM-16 | Collaboration Task Assignment | Trip exists | `title: "Book Louvre tickets", assignedTo: "Diya Shah"` | 1. Send POST to `/api/collaboration/:tripId/tasks`. | HTTP 201 Created, task assigned with priority. | HTTP 201, task recorded in collaboration. | **Pass** | `all-routes-integration.test.ts` |
| **TC-TRIP-03** | FR-TRIP-03 | VPM-16 | Voting Poll Creation & Vote Tally | Trip exists | `question: "Where to dine?", options: ["French", "Italian"]` | 1. POST poll to `/api/collaboration/:tripId/polls`.<br>2. POST vote to `/polls/:pollId/vote`. | HTTP 201 on poll creation; HTTP 200 on vote with votes count incremented. | HTTP 201 poll created, vote tallied correctly. | **Pass** | `all-routes-integration.test.ts` |

### 2.5 Bookings, Payments, OTP & E-Tickets (BOOK)
| Test ID | Req ID | Jira Key | Title | Preconditions | Test Data | Steps | Expected Result | Actual Result | Status | Automated Test Reference |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-BOOK-01** | FR-BOOK-01 | VPM-16 | Flight Reservation Booking | User logged in | `type: "flight", totalAmount: 450, currency: "USD"` | 1. Send POST to `/api/bookings`. | HTTP 201 Created, booking stored in `pending` status. | HTTP 201, flight booking created. | **Pass** | `all-routes-integration.test.ts` |
| **TC-BOOK-02** | FR-BOOK-02 | VPM-16 | OTP Verification Prior to Payment | Booking pending | OTP sent to contact email | 1. Call `otpService.requestOtp()`.<br>2. Call `otpService.verifyOtp()`. | Generates 6-digit OTP, validates within 5-min TTL, rejects expired/wrong codes. | Rejects incorrect code, accepts valid OTP. | **Pass** | `otpService.test.ts` |
| **TC-BOOK-03** | FR-BOOK-03 | VPM-16 | Payment Confirmation & Status Transition | Booking pending, OTP verified | Card details, valid expiry | 1. Submit payment through `paymentService.processPayment()`. | Settles payment, transitions booking to `confirmed`, and creates alert. | Status transitioned to `confirmed`, alert created. | **Pass** | `paymentService.test.ts` |
| **TC-BOOK-04** | FR-BOOK-04 | VPM-16 | Real PDF E-Ticket & Voucher Generation | Booking confirmed | `UnifiedBooking` object with reference code | 1. Call `ticketService.generateBookingPdf()`. | Generates real multi-page binary PDF document via jsPDF. | Generates real PDF blob with barcode and reference. | **Pass** | `ticketService.test.ts` |
| **TC-BOOK-05** | FR-BOOK-05 | VPM-16 | Booking Cancellation Workflow | Booking confirmed | `id: bookingId` | 1. Send POST to `/api/bookings/:id/cancel`. | HTTP 200 OK, booking status updated to `cancelled`. | HTTP 200, status updated to `cancelled`. | **Pass** | `all-routes-integration.test.ts` |

### 2.6 Budgeting & Cost Splitting (BUD)
| Test ID | Req ID | Jira Key | Title | Preconditions | Test Data | Steps | Expected Result | Actual Result | Status | Automated Test Reference |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-BUD-01** | FR-BUD-01 | VPM-41 | Dynamic Budget Category Allocations | Trip exists | `totalBudget: 5000, allocations: DEFAULT_ALLOCATIONS` | 1. Send PUT to `/api/budget/:tripId`. | HTTP 200 OK, allocations updated and saved. | HTTP 200, allocations saved. | **Pass** | `all-routes-integration.test.ts` |
| **TC-BUD-02** | FR-BUD-02 | VPM-67 | Multi-Member Shared Expense Recording | Budget exists | `amount: 45, paidBy: "Alex Morgan", splitAmong: ["Alex", "Diya"]` | 1. Send POST to `/api/budget/:tripId/expenses`. | HTTP 201 Created, expense appended to ledger. | HTTP 201, expense added to shared budget. | **Pass** | `all-routes-integration.test.ts` |
| **TC-BUD-03** | FR-BUD-04 | VPM-41 | Debt Minimization Settlement Mathematics | Expenses recorded | 3 members with reciprocal debts | 1. Run `collaborationService.calculateSettlements()`. | Minimizes debt paths and returns exact net settlement transactions. | Verified mathematical debt settlement matrix. | **Pass** | `collaborationService.test.ts` |

### 2.7 Packing Checklists & Alerts (PCK/ALT)
| Test ID | Req ID | Jira Key | Title | Preconditions | Test Data | Steps | Expected Result | Actual Result | Status | Automated Test Reference |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-PCK-01** | FR-PCK-01 | VPM-42 | Default Packing Checklist Initialization | Trip initialized | Trip ID | 1. Send GET to `/api/packing/:tripId`. | HTTP 200 OK, returns default categorized packing items. | HTTP 200, packing items returned. | **Pass** | `all-routes-integration.test.ts` |
| **TC-PCK-02** | FR-PCK-03 | VPM-191 | Add and Toggle Packing Item | Checklist exists | `name: "Power Bank", assignedTo: "Alex Morgan"` | 1. POST to `/api/packing/:tripId/items`.<br>2. PUT to toggle status. | Item added and packed flag toggled. | HTTP 200, item added and packed status toggled. | **Pass** | `all-routes-integration.test.ts` |
| **TC-ALT-01** | FR-ALT-01 | VPM-16 | Automated Booking Alert Generation | Booking confirmed | Booking event payload | 1. Query `/api/alerts` for user. | HTTP 200 OK, alert exists with severity 'info' and booking details. | HTTP 200, automated notification retrieved. | **Pass** | `all-routes-integration.test.ts` |

### 2.8 Third-Party External APIs (LIVE)
| Test ID | Req ID | Jira Key | Title | Preconditions | Test Data | Steps | Expected Result | Actual Result | Status | Automated Test Reference |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-LIVE-01** | FR-EXT-01 | VPM-16 | Missing Weather API Key returns 401 | No API key in env or headers | `city: "Paris"` | 1. Send GET to `/api/live/weather?city=Paris` without key. | HTTP 401 Unauthorized, message: "Weather API key missing". | HTTP 401 Unauthorized. | **Pass** | `live-travel-api.test.ts` |
| **TC-LIVE-02** | FR-EXT-01 | VPM-16 | Downstream Timeout returns 504 | Upstream hangs > 3000ms | Simulated timeout | 1. Mock fetch aborting after 3s. | HTTP 504 Gateway Timeout, message: "External service timed out". | HTTP 504 Gateway Timeout. | **Pass** | `live-travel-api.test.ts` |
| **TC-LIVE-03** | FR-EXT-01 | VPM-16 | Downstream 5xx/4xx returns 502 | Upstream returns 500 error | Simulated server failure | 1. Mock fetch returning status 500. | HTTP 502 Bad Gateway, message: "External travel service failed". | HTTP 502 Bad Gateway. | **Pass** | `live-travel-api.test.ts` |
| **TC-LIVE-04** | FR-EXT-01 | VPM-16 | Downstream Malformed JSON returns 502 | Upstream returns bad syntax | String: `"<html>Error</html>"` | 1. Mock fetch returning non-JSON response. | HTTP 502 Bad Gateway, message: "Malformed response from external provider". | HTTP 502 Bad Gateway. | **Pass** | `live-travel-api.test.ts` |
| **TC-LIVE-05** | FR-EXT-02 | VPM-16 | Live Currency Conversion Rates | Valid key | `base: "USD", symbols: "EUR,GBP,INR"` | 1. Send GET to `/api/external/rates`. | HTTP 200 OK, returns numeric conversion exchange rates. | HTTP 200 OK, rates returned. | **Pass** | `live-travel-api.test.ts` |

---

## 3. Requirements Traceability Matrix (RTM)

| Requirement ID | Jira Issue Key | Module Name | Implementation Source Files | Automated Test Suite Files | Test Case IDs | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-AUTH-01** | VPM-16 | Authentication & Signup | `authService.ts`, `auth.router.ts` | `authService.test.ts`, `all-routes-integration.test.ts` | TC-AUTH-01, TC-AUTH-02 | **Verified (Pass)** |
| **FR-AUTH-02** | VPM-16 | Sign In & JWT Token | `authService.ts`, `auth.middleware.ts` | `authService.test.ts`, `auth-middleware.test.ts` | TC-AUTH-03, TC-AUTH-04 | **Verified (Pass)** |
| **FR-DST-01** | VPM-16 | Destination Catalog & Filters | `destinationService.ts`, `destinations.router.ts` | `destinationService.test.ts`, `all-routes-integration.test.ts` | TC-DST-01, TC-DST-02 | **Verified (Pass)** |
| **FR-DST-02** | VPM-16 | Destination Query & Details | `destinationService.ts`, `DestinationDetailsModal.tsx` | `destinationService.test.ts`, `all-routes-integration.test.ts` | TC-DST-03, TC-DST-04 | **Verified (Pass)** |
| **FR-AI-01** | VPM-38 | AI Chat Itinerary Guidance | `aiChatService.ts`, `chat.router.ts` | `aiChatService.test.ts`, `chat.test.ts` | TC-AI-01, TC-AI-04 | **Verified (Pass)** |
| **FR-AI-02** | VPM-46 | Contextual Citation Engine | `chat-service.ts`, `llm/client-factory.ts` | `chat.test.ts`, `chat-service.test.ts` | TC-AI-02 | **Verified (Pass)** |
| **FR-AI-03** | VPM-44 | AI Payload Validation | `schemas/chat.schema.ts` | `schemas.test.ts`, `all-routes-integration.test.ts` | TC-AI-03 | **Verified (Pass)** |
| **FR-TRIP-01**| VPM-16 | Trip Workspaces | `tripService.ts`, `trips.router.ts` | `all-routes-integration.test.ts` | TC-TRIP-01 | **Verified (Pass)** |
| **FR-TRIP-02**| VPM-16 | Task Assignments | `collaborationService.ts`, `collaboration.router.ts`| `collaborationService.test.ts`, `all-routes-integration.test.ts`| TC-TRIP-02 | **Verified (Pass)** |
| **FR-TRIP-03**| VPM-16 | Group Voting Polls | `collaborationService.ts`, `collaboration.router.ts`| `collaborationService.test.ts`, `all-routes-integration.test.ts`| TC-TRIP-03 | **Verified (Pass)** |
| **FR-BOOK-01**| VPM-16 | Multi-Modal Booking Engine | `bookingService.ts`, `bookings.router.ts` | `bookingService.test.ts`, `all-routes-integration.test.ts` | TC-BOOK-01, TC-BOOK-05 | **Verified (Pass)** |
| **FR-BOOK-02**| VPM-16 | OTP Verification Pre-Payment | `otpService.ts`, `BookingModal.tsx` | `otpService.test.ts` | TC-BOOK-02 | **Verified (Pass)** |
| **FR-BOOK-03**| VPM-16 | Payment Settlement | `paymentService.ts`, `PaymentModal.tsx` | `paymentService.test.ts`, `all-routes-integration.test.ts` | TC-BOOK-03 | **Verified (Pass)** |
| **FR-BOOK-04**| VPM-16 | PDF E-Ticket & Voucher Download| `ticketService.ts` | `ticketService.test.ts` | TC-BOOK-04 | **Verified (Pass)** |
| **FR-BUD-01** | VPM-41 | Budget Allocations | `budgetService.ts`, `budget.router.ts` | `budgetService.test.ts`, `all-routes-integration.test.ts` | TC-BUD-01 | **Verified (Pass)** |
| **FR-BUD-02** | VPM-67 | Multi-Member Expense Splits | `budgetService.ts`, `budget.router.ts` | `budgetService.test.ts`, `all-routes-integration.test.ts` | TC-BUD-02 | **Verified (Pass)** |
| **FR-BUD-04** | VPM-41 | Debt Settlement Algorithms | `collaborationService.ts` | `collaborationService.test.ts` | TC-BUD-03 | **Verified (Pass)** |
| **FR-PCK-01** | VPM-42 | Categorized Packing Checklists | `packingService.ts`, `packing.router.ts` | `packingService.test.ts`, `all-routes-integration.test.ts` | TC-PCK-01, TC-PCK-02 | **Verified (Pass)** |
| **FR-ALT-01** | VPM-16 | Automated Notification Alerts | `alertService.ts`, `alerts.router.ts` | `alertService.test.ts`, `all-routes-integration.test.ts` | TC-ALT-01 | **Verified (Pass)** |
| **FR-EXT-01** | VPM-16 | Live Weather Service | `live-travel.router.ts` | `live-travel-api.test.ts` | TC-LIVE-01 to TC-LIVE-04 | **Verified (Pass)** |
| **FR-EXT-02** | VPM-16 | Live Currency Exchange Rates | `live-travel.router.ts`, `currencyService.ts` | `live-travel-api.test.ts`, `currencyService.test.ts` | TC-LIVE-05 | **Verified (Pass)** |
| **NFR-01** | VPM-38 | Performance & Web Vitals | Vite Preview, Node Express Server | `performance-audit.spec.ts`, `run-benchmark.ts` | TC-NFR-PERF-01 | **Verified (Pass)** |
| **NFR-02** | VPM-16 | Offline Resilience & Fallback | `authService.ts`, `aiChatService.ts` | `authService.test.ts`, `aiChatService.test.ts` | TC-AUTH-07, TC-AI-04 | **Verified (Pass)** |
| **NFR-03** | VPM-16 | Security & JWT Verification | `auth.middleware.ts`, `env.ts` | `auth-middleware.test.ts` | TC-AUTH-05, TC-AUTH-06 | **Verified (Pass)** |
| **NFR-04** | VPM-16 | Responsive UI & Accessibility | Tailwind CSS, React Components | `voyana-flows.spec.ts` | TC-NFR-UI-01, TC-NFR-A11Y-01| **Verified (Pass)** |
