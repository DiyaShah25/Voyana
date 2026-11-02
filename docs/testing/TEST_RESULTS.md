# Voyana — Master Test Execution Results & Metrics

**Project**: Voyana — Collaborative AI Travel Platform  
**Author / QA Lead**: Bhavika Sainani  
**Team Members**: Diya Shah, Nigam Sanghvi, Tirth Gandhi, Bhavika Sainani, Megha Lalwani, Manav Vyas, Bhavika Mulani, Jagrat Kumar  
**Tested Commit Hash**: `19b914a`  
**Execution Timestamp**: November 2, 2026, 21:44:00 IST  
**Environment**: Localhost Development & Isolated Sandbox (Windows 11, Node.js v22.19.0, Isolated In-Memory MongoDB)  

---

## 1. High-Level Execution Summary

All test suites were executed against isolated instances with zero mocks on internal business logic and full deterministic mocking on upstream external HTTP APIs.

```
========================================================================================
                               TEST EXECUTION SUMMARY
========================================================================================
Test Category             Suites / Specs    Executed    Passed    Failed    Pass Rate
----------------------------------------------------------------------------------------
Frontend Unit (Vitest)          17             112        112        0       100.0%
Backend Integration (Jest)      10             104        104        0       100.0%
E2E & UI Specs (Playwright)      2               6          6        0       100.0%
----------------------------------------------------------------------------------------
TOTAL AUTOMATED TESTS           29             222        222        0       100.0%
========================================================================================
```

---

## 2. Test Suite Breakdown

### 2.1 Frontend Unit & Service Suites (`vitest run --coverage`)
- **Evidence File**: `docs/testing/evidence/frontend-coverage.txt`
- **Duration**: 24.58s
- **Total Tests**: 112 passed across 17 files

| Test File | Tests Passed | Duration | Key Aspects Verified |
| :--- | :--- | :--- | :--- |
| `src/services/__tests__/destinationService.test.ts` | 5 | 32 ms | Querying, region filter, fallback handling |
| `src/services/__tests__/alertService.test.ts` | 5 | 111 ms | Automated booking alerts, status changes |
| `src/services/__tests__/bookingService.test.ts` | 3 | 119 ms | Status transitions, cancellation |
| `src/services/__tests__/aiChatService.test.ts` | 4 | 2070 ms | 2.5s timeout trigger, offline guidance fallback |
| `src/services/__tests__/paymentService.test.ts` | 11 | 843 ms | Status settlement, alert trigger, card checks |
| `src/services/__tests__/apiClient.test.ts` | 7 | 39 ms | Request building, base URL, auth token headers |
| `src/services/__tests__/budgetService.test.ts` | 5 | 88 ms | Allocations, expense ledgers, calculations |
| `src/services/__tests__/currencyService.test.ts` | 11 | 88 ms | Global rates, multi-currency conversion |
| `src/services/__tests__/mongoApiClient.test.ts` | 14 | 54 ms | REST operations, error mapping, query params |
| `src/services/__tests__/hotelService.test.ts` | 6 | 50 ms | Search, star filter, reference format `VYN-HT` |
| `src/services/__tests__/transportService.test.ts` | 4 | 12 ms | City filtering, originCity/basePrice mappings |
| `src/services/__tests__/collaborationService.test.ts` | 4 | 22 ms | Task creation, voting polls, debt settlements |
| `src/services/__tests__/authService.test.ts` | 9 | 2110 ms | Password length, offline demo login, duplicates |
| `src/services/__tests__/packingService.test.ts` | 6 | 19 ms | Item addition, categorization, assignment |
| `src/services/__tests__/flightService.test.ts` | 7 | 80 ms | Airport codes, cabinClass filter, passenger seats |
| `src/services/__tests__/otpService.test.ts` | 8 | 30 ms | 6-digit generation, 5-min TTL, invalid codes |
| `src/services/__tests__/ticketService.test.ts` | 3 | 101 ms | jsPDF multi-page document generation |

### 2.2 Backend Integration Suites (`jest --runInBand --forceExit`)
- **Evidence File**: `docs/testing/evidence/backend-all-tests.txt`
- **Duration**: 32.92s
- **Total Tests**: 104 passed across 10 suites

| Test File | Tests Passed | Duration | Key Aspects Verified |
| :--- | :--- | :--- | :--- |
| `all-routes-integration.test.ts` | 34 | 14.51 s | Every mounted route group + 3 business flow sequences |
| `chat.test.ts` | 4 | 40 ms | Contextual day & budget citations in AI answers |
| `error-handling.test.ts` | 2 | 45 ms | Downstream 429 rate limit and timeout 503 handling |
| `health.test.ts` | 2 | 29 ms | Health metadata, dependency states, 404 response |
| `auth-middleware.test.ts` | 9 | 7 ms | requireAuth / optionalAuth, expired & tampered tokens |
| `live-travel-api.test.ts` | 8 | 71 ms | Missing key (401), timeout (504), 5xx (502), bad JSON (502) |
| `chat-service.test.ts` | 3 | 6 ms | Prompt rendering, destination context, structured schema |
| `schemas.test.ts` | 13 | 7 ms | Zod request/response validation, TripSchema constraints |
| `llm-client.test.ts` | 3 | 5 ms | MockLlmClient initialization and deterministic generation |
| Existing migration & teardown | 26 | 13.72 s | Idempotent migration trigger and cleanup |

---

## 3. Code Coverage Analysis

From Istanbul/v8 automated instrumentation (`npm run test:coverage`):

| Scope | Statements (% Stmts) | Branch Coverage (% Branch) | Function Coverage (% Funcs) | Line Coverage (% Lines) |
| :--- | :--- | :--- | :--- | :--- |
| **All Tested Services (`src/services/`)** | **73.94%** | **71.49%** | **86.58%** | **73.94%** |
| `ticketService.ts` | 100.0% | 58.82% | 100.0% | 100.0% |
| `apiClient.ts` | 100.0% | 73.68% | 100.0% | 100.0% |
| `otpService.ts` | 88.00% | 76.31% | 100.0% | 88.00% |
| `currencyService.ts` | 96.36% | 88.00% | 100.0% | 96.36% |
| `destinationService.ts` | 90.00% | 70.00% | 100.0% | 90.00% |
| `packingService.ts` | 88.67% | 69.44% | 75.00% | 88.67% |
| `mongoApiClient.ts` | 84.27% | 39.02% | 100.0% | 84.27% |
| `hotelService.ts` | 76.72% | 52.63% | 71.42% | 76.72% |
| `aiChatService.ts` | 75.16% | 61.76% | 100.0% | 75.16% |
| `flightService.ts` | 67.14% | 72.72% | 81.81% | 67.14% |

---

## 4. Non-Functional Testing (NFR) Results

### 4.1 UI & Cross-Browser E2E Testing
- **Evidence Files**: `docs/testing/evidence/playwright-chromium.txt`, `playwright-results.json`
- **Screenshots Captured**:
  1. `01_homepage_hero.png` (2.7 MB) — Desktop 3D globe and header
  2. `02_destination_search.png` (462 KB) — Interactive search input and destination cards
  3. `03_responsive_mobile_375px.png` (60 KB) — Mobile viewport (iPhone 12, 375x667)
  4. `03_responsive_tablet_768px.png` (202 KB) — Tablet viewport (iPad Mini, 768x1024)
  5. `03_responsive_desktop_1440px.png` (489 KB) — Full desktop view (1440x900)
  6. `04_accessibility_view.png` (463 KB) — Interactive elements & contrast verification

### 4.2 Performance Benchmark (Autocannon / Concurrent Node Suite)
- **Evidence File**: `docs/testing/evidence/load-test-benchmark.txt`
- **Target**: `GET /health` on local production-mode Express server
- **Total Requests**: **4,510 requests in 4.01s**
- **Average Throughput**: **1,125.8 req/s** (0.23 MB/s)
- **Error Rate**: **0.00% (0 errors, 0 timeouts)**
- **Latency Distribution**:
  - Min Latency: **5.99 ms**
  - **p50 (Median)**: **8.08 ms**
  - **p95**: **12.69 ms**
  - **p99**: **16.97 ms**
  - Max Latency: **61.07 ms**

### 4.3 Browser Core Web Vitals & Navigation Timings
- **Evidence Files**: `docs/testing/evidence/lighthouse-report.html`, `lighthouse-report.json`
- **Real Measured Values (W3C Navigation & Paint Timing APIs)**:
  - Time to First Byte (TTFB): **17.3 ms** (Threshold &lt; 100 ms — **Pass**)
  - DOM Content Loaded: **297.6 ms** (Threshold &lt; 500 ms — **Pass**)
  - First Contentful Paint (FCP): **756.0 ms** (Threshold &lt; 1800 ms — **Pass**)
  - Load Complete: **304.0 ms** (Threshold &lt; 2000 ms — **Pass**)
  - Total Static Resources Loaded: **27 resources**
- **Lighthouse Composite Category Scores**:
  - Performance: **Not measured** *(Direct W3C Navigation & Core Web Vitals measured instead)*
  - Accessibility: **Not measured** *(Axe-core DOM baseline and focusability measured instead)*
  - Best Practices: **Not measured**
  - SEO: **Not measured**

### 4.4 Security Audit (`npm audit` & Manual Penetration)
- **Evidence Files**: `docs/testing/evidence/npm-audit-frontend.txt`, `npm-audit-backend.txt`
- **Automated Dependency Audit**:
  - Frontend: 27 vulnerabilities (2 low, 8 moderate, 14 high, 3 critical) in dev tools (`vitest`, `tinypool`).
  - Backend: 36 vulnerabilities in transitive CLI tools (`proxy-addr`, `qs`, `zod`).
  - Risk Assessment: Documented in Bug Log as **BUG-06 (Accepted Risk)** since they are isolated to dev/build tooling or non-exposed transitive parsers.
- **Code Security Findings**:
  - **BUG-01 (Critical)**: Blind base64 token decoding when signature failed in `auth.middleware.ts`. **Fixed in commit `2421b1f`**.
  - **BUG-02 (High)**: Hardcoded fallback secret string in `config/env.ts`. **Fixed in commit `25b4c39`**.

### 4.5 System Resilience & Fault Tolerance
- **Backend Offline Handling**: Verified `aiChatService.ts` smoothly catches network failures and switches to the local deterministic contextual engine.
- **LocalStorage Fallback**: Verified `authService.ts`, `bookingService.ts`, and `destinationService.ts` operate smoothly with seeded local records when remote API is unreachable.
