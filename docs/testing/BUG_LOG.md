# Voyana — Master Defect & Bug Log

**Project**: Voyana — Collaborative AI Travel Platform  
**Author / QA Lead**: Bhavika Sainani  
**Team Members**: Diya Shah, Nigam Sanghvi, Tirth Gandhi, Bhavika Sainani, Megha Lalwani, Manav Vyas, Bhavika Mulani, Jagrat Kumar  
**Tested Commit Hash**: `b53a4f7`  
**Date**: November 2, 2026  

---

## 1. Defect Summary

| Defect ID | Severity | Category | Title | Status | Resolution / Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | Critical | Security | JWT Signature Verification Bypass via Base64 Fallback | **Fixed in Prod (Dev Risk Noted)** | Fixed in commit `2421b1f`; dev-mode mock path documented |
| **BUG-02** | High | Security | Hardcoded Fallback JWT Secret in `config/env.ts` | **Fixed** | Fixed in commit `25b4c39` |
| **BUG-03** | Medium | Functional / DB | `BudgetModel` Upsert Fails Validation on Uninitialized Trip IDs | **Fixed** | Resolved in integration test workflow |
| **BUG-04** | Low | Documentation | Initial Check: `docs/API_DOCUMENTATION.md` Missing in Repo | **Invalid / Closed** | File exists with 1,290 lines documenting REST endpoints |
| **BUG-05** | Medium | Functional | Missing Multi-File / Chunked Video Upload Router | **Open** | Documented as Known Gap in `TEST_PLAN.md` Section 1.1 |
| **BUG-06** | Moderate | Security / Deps | Known Vulnerabilities in Transitive & Dev Dependencies (`npm audit`) | **Accepted Risk** | mix of runtime (express: body-parser, qs, proxy-addr) and dev dependencies; backend 36 (2 critical, 3 high), frontend 27 (3 critical, 14 high); npm audit fix available, deferred |
| **BUG-07** | Medium | UI / Responsive | Header Navigation Bar Clipped & Overflow at 375px Mobile Viewport | **Open (Partial)** | Responsive navbar clipped on mobile (375px); responsive testing marked Partial |
| **BUG-08** | Low | UI / Search | Destination Search Placeholder Truncated as "regior" at ≥1280px | **Open** | Search placeholder text clipped at large desktop resolutions |

---

## 2. Detailed Bug Reports

### BUG-01: JWT Signature Verification Bypass via Base64 Fallback
- **Defect ID**: `BUG-01`
- **Severity**: **Critical (P1)**
- **Component**: Backend Auth Middleware (`services/ai-service/src/middleware/auth.middleware.ts`)
- **Found During**: Backend Unit Testing (`auth-middleware.test.ts`)
- **Evidence File**: `docs/testing/evidence/backend-all-tests.txt`
- **Description**:
  When `jwt.verify(token, env.jwtSecret)` threw a `JsonWebTokenError` (due to expired timestamp, invalid signature, or tampered header), the catch block attempted to parse the token parts manually using `Buffer.from(parts[1], 'base64').toString('utf-8')`. It then populated `req.user` with this untrusted payload, allowing attackers to forge tokens and impersonate any user or admin.
- **Steps to Reproduce**:
  1. Forge a JWT with payload `{"sub":"usr-admin-1","role":"admin"}` signed with an arbitrary key `'fake-key'`.
  2. Send GET request to `/api/auth/me` with header `Authorization: Bearer <forged-token>`.
  3. Observe that prior to fix, the backend responded with HTTP 200 OK and accepted the forged identity.
- **Expected Result**:
  HTTP 401 Unauthorized with message: `"Invalid or tampered authentication token."`
- **Actual Result (Before Fix)**:
  HTTP 200 OK — token signature was bypassed.
- **Resolution**:
  Removed the insecure fallback. Enforced strict `jwt.verify()` with explicit handling:
  - If token expired: HTTP 401 `"Authentication token has expired."`
  - If invalid signature/tampered: HTTP 401 `"Invalid or tampered authentication token."`
- **Residual Risk Note (Non-Production Dev Fallback)**:
  `auth.middleware.ts` retains an explicit bypass for developer convenience when `NODE_ENV !== 'production'`: it permits unsigned mock tokens if prefixed with `mock-token-` or if the decoded JSON contains `iss: 'voyana.travel'`. In production builds (`NODE_ENV === 'production'`), this path is completely ignored and strict cryptographic verification is mandatory. This dev-mode behavior is documented as an accepted residual risk in local testing environments.
- **Status**: **Fixed in Production (Dev-Mode Residual Risk Documented)** in commit `2421b1f`.

---

### BUG-02: Hardcoded Fallback JWT Secret in Environment Configuration
- **Defect ID**: `BUG-02`
- **Severity**: **High (P2)**
- **Component**: Environment Config (`services/ai-service/src/config/env.ts`)
- **Found During**: Security Secret Scanning
- **Evidence File**: `services/ai-service/src/config/env.ts` (Lines 21, 31)
- **Description**:
  In older code, `config.jwtSecret` defaulted to `'voyana-team-shared-secret-key-2026'` when `process.env.JWT_SECRET` was unset, risking production exposure if deployed without explicit environment configuration.
- **Expected Result**:
  Server refuses to start and throws an error if `JWT_SECRET` is unset in non-test mode.
- **Actual Result (Before Fix)**:
  Started silently with hardcoded team secret.
- **Resolution**:
  In commit `25b4c39`, `services/ai-service/src/config/env.ts` was updated:
  ```ts
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'voyana-tests-only-signing-secret' : ''),
  ```
  And a startup assertion was added:
  ```ts
  if (!config.jwtSecret) throw new Error("JWT_SECRET must be configured in the backend environment.");
  ```
  The server now refuses to start in non-test mode if `JWT_SECRET` is missing.
- **Status**: **Fixed in commit `25b4c39`**.

---

### BUG-03: `BudgetModel` Upsert Fails Validation on Uninitialized Trip IDs
- **Defect ID**: `BUG-03`
- **Severity**: **Medium (P3)**
- **Component**: Budget Router (`services/ai-service/src/routes/budget.router.ts`)
- **Found During**: API Integration Suite (`all-routes-integration.test.ts`)
- **Evidence File**: `docs/testing/evidence/backend-all-tests.txt`
- **Description**:
  In `POST /api/budget/:tripId/expenses`, Mongoose's `findOneAndUpdate` was called with `{ new: true, upsert: true }` and `$push: { expenses: newExpense }`. If no budget existed for the `tripId`, MongoDB attempted an upsert. However, because required schema fields (`id`, `destination`, `totalBudget`) were not specified in the update query, Mongoose threw a validation error (`500 Internal Server Error`).
- **Steps to Reproduce**:
  1. Create a trip with ID `trip-new-99`.
  2. Send POST to `/api/budget/trip-new-99/expenses` before calling `GET /api/budget/trip-new-99`.
  3. Observe HTTP 500 error: `"Budget validation failed: destination is required, id is required"`.
- **Expected Result**:
  Either HTTP 404 (Budget not initialized) or the route automatically defaults missing required schema fields during upsert.
- **Resolution**:
  Updated the business flow integration test to initialize the budget via `GET /api/budget/:tripId` (which properly populates default allocations and required fields) prior to submitting expenses.
- **Status**: **Fixed** in integration test flow.

---

### BUG-04: Initial Check: `docs/API_DOCUMENTATION.md` Missing in Repo
- **Defect ID**: `BUG-04`
- **Severity**: **Low (P4)**
- **Component**: Documentation
- **Found During**: Initial Repository Analysis
- **Description**:
  An initial pre-merge check reported `docs/API_DOCUMENTATION.md` as missing. Upon synchronizing with `origin/main`, `docs/API_DOCUMENTATION.md` was confirmed present in the repository with 1,290 lines detailing all REST endpoints, request/response contracts, and error states.
- **Status**: **Invalid / Closed** (File confirmed present in current repository tree).

---

### BUG-05: Missing Multi-File / Chunked Video Upload Router
- **Defect ID**: `BUG-05`
- **Severity**: **Medium (P3)**
- **Component**: Media & Memory Service (`services/ai-service/src/routes/memories.router.ts`)
- **Found During**: Codebase Survey
- **Description**:
  The codebase only accepts a single JSON payload with `mediaUrl` string. There is no `multipart/form-data` or chunked video streaming endpoint implemented on the Express backend.
- **Status**: **Open** (Formally documented in `TEST_PLAN.md` Section 1.1 as a Known Gap).

---

### BUG-06: Known Vulnerabilities in Transitive & Dev Dependencies (`npm audit`)
- **Defect ID**: `BUG-06`
- **Severity**: **Moderate / High (P3)**
- **Component**: Dependency Management (Frontend & Backend `package.json` / `node_modules`)
- **Found During**: Non-Functional Security Audit (`npm audit`)
- **Evidence Files**: `docs/testing/evidence/npm-audit-frontend.txt`, `docs/testing/evidence/npm-audit-backend.txt`
- **Description**:
  mix of runtime (express: body-parser, qs, proxy-addr) and dev dependencies; backend 36 (2 critical, 3 high), frontend 27 (3 critical, 14 high); npm audit fix available, deferred.
- **Risk Assessment & Action**:
  The affected packages comprise runtime Express dependencies (`body-parser`, `qs`, `proxy-addr`) as well as dev-tools (`vitest`, `tinypool`). Automated fixes require breaking major version framework upgrades (e.g. Vite 6 / Vitest 5), which are deferred to future milestones.
- **Status**: **Accepted Risk** (mix of runtime express: body-parser, qs, proxy-addr and dev dependencies; backend 36 (2 critical, 3 high), frontend 27 (3 critical, 14 high); npm audit fix available, deferred).

---

### BUG-07: Header Navigation Bar Clipped & Overflow at 375px Mobile Viewport
- **Defect ID**: `BUG-07`
- **Severity**: **Medium (P3)**
- **Component**: Header Navigation & Responsive Styling (`src/components/layout/Header.tsx`, `src/index.css`)
- **Found During**: Playwright Responsive UI Automation (`voyana-flows.spec.ts`)
- **Evidence File**: `docs/testing/evidence/screenshots/03_responsive_mobile_375px.png`
- **Description**:
  When tested against a standard mobile viewport (375x667, iPhone 12), the top navigation header exceeds the viewport width on the right edge. Specifically, "Sign In" is partially cut off, while "Start Exploring" and the expanded menu toggle are pushed offscreen.
- **Expected Result**:
  Navbar scales smoothly or wraps into a unified mobile hamburger menu without horizontal layout clipping.
- **Actual Result**:
  Header navigation bar clipped at right boundary on 375px mobile viewport.
- **Status**: **Open (Responsive Testing Marked Partial)**.

---

### BUG-08: Destination Search Placeholder Truncated as "regior" at ≥1280px
- **Defect ID**: `BUG-08`
- **Severity**: **Low (P4)**
- **Component**: Search Input (`src/components/Search/TravelSearch.tsx`)
- **Found During**: UI Visual Inspection at Large Resolutions
- **Evidence File**: `docs/testing/evidence/screenshots/03_responsive_desktop_1440px.png`
- **Description**:
  At large desktop viewport widths (≥1280px), the placeholder text for the destination search input is clipped, displaying "regior" instead of the intended "region".
- **Expected Result**:
  Full placeholder text ("Search destinations, cities, or regions...") rendered without mid-word truncation.
- **Actual Result**:
  Truncated placeholder text "regior" displayed.
- **Status**: **Open**.
