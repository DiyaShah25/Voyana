# Voyana — Master Defect & Bug Log

**Project**: Voyana — Collaborative AI Travel Platform  
**Author / QA Lead**: Bhavika Sainani  
**Team Members**: Diya Shah, Nigam Sanghvi, Tirth Gandhi, Bhavika Sainani, Megha Lalwani, Manav Vyas, Bhavika Mulani, Jagrat Kumar  
**Tested Commit Hash**: `19b914a`  
**Date**: November 2, 2026  

---

## 1. Defect Summary

| Defect ID | Severity | Category | Title | Status | Fixed In |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | Critical | Security | JWT Signature Verification Bypass via Base64 Fallback | **Fixed** | Commit `2421b1f` |
| **BUG-02** | High | Security | Hardcoded Fallback JWT Secret in `config/env.ts` | **Open** | Scheduled next sprint |
| **BUG-03** | Medium | Functional / DB | `BudgetModel` Upsert Fails Validation on Uninitialized Trip IDs | **Fixed** | Integration Suite Fix |
| **BUG-04** | Low | Documentation | Referenced `docs/API_DOCUMENTATION.md` Does Not Exist in Repository | **Open** | Documented gap |
| **BUG-05** | Medium | Functional | Missing Multi-File / Chunked Video Upload Router | **Open** | Listed as Known Gap |

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
  Allowed mock tokens only in development mode when explicitly matching the prefix `mock-token-`.
- **Status**: **Fixed in commit `2421b1f`**.

---

### BUG-02: Hardcoded Fallback JWT Secret in Environment Configuration
- **Defect ID**: `BUG-02`
- **Severity**: **High (P2)**
- **Component**: Environment Config (`services/ai-service/src/config/env.ts`)
- **Found During**: Security Secret Scanning
- **Evidence File**: `services/ai-service/src/config/env.ts` (Line 13)
- **Description**:
  The environment configuration defaults to a hardcoded string when `JWT_SECRET` is unset:
  `jwtSecret: process.env.JWT_SECRET || 'voyana-team-shared-secret-key-2026'`
  If deployed without setting `JWT_SECRET`, any attacker who reads the source code or commit history can generate valid tokens.
- **Steps to Reproduce**:
  1. Inspect `services/ai-service/src/config/env.ts` line 13.
  2. Start the service with `JWT_SECRET` undefined in environment.
  3. Sign a token using the string `'voyana-team-shared-secret-key-2026'`.
  4. The server accepts it as valid.
- **Expected Result**:
  In production environments (`NODE_ENV === 'production'`), the application should throw a fatal error on startup if `JWT_SECRET` is undefined, rather than falling back to a shared hardcoded secret.
- **Actual Result**:
  The application starts silently using the publicly committed secret key.
- **Remediation**:
  Enforce validation on application boot to crash early if `NODE_ENV === 'production'` and `JWT_SECRET` is missing.
- **Status**: **Open** (Logged for infrastructure hardening sprint).

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

### BUG-04: Referenced `docs/API_DOCUMENTATION.md` Does Not Exist in Repository
- **Defect ID**: `BUG-04`
- **Severity**: **Low (P4)**
- **Component**: Documentation
- **Found During**: Initial Repository Analysis
- **Description**:
  The assignment specification references `docs/API_DOCUMENTATION.md` as the source of truth for REST API endpoints. A complete search of the repository revealed that this specific file does not exist. The actual API endpoints are documented in `docs/mongodb_architecture.md` (Section 3: REST API Reference) and within the Express routers.
- **Steps to Reproduce**:
  1. Check `docs/` folder in the Git workspace.
  2. Notice `docs/mongodb_architecture.md` and `docs/requirements_analysis.md` exist, but `docs/API_DOCUMENTATION.md` is missing.
- **Expected Result**:
  `docs/API_DOCUMENTATION.md` exists with standard OpenAPI / REST specifications.
- **Actual Result**:
  File missing; team uses `docs/mongodb_architecture.md` and `docs/testing/postman/Voyana.postman_collection.json`.
- **Status**: **Open** (Documented gap; Postman collection created to serve as comprehensive living API reference).

---

### BUG-05: Missing Multi-File / Chunked Video Upload Router
- **Defect ID**: `BUG-05`
- **Severity**: **Medium (P3)**
- **Component**: Media & Memory Service (`services/ai-service/src/routes/memories.router.ts`)
- **Found During**: Codebase Survey
- **Description**:
  The user request notes: "multi-file image/video upload: search the code first. If a feature exists, write tests for it. If it does not exist, do not write tests for it; instead list it under Known gaps / not implemented in TEST_PLAN.md."
  A comprehensive survey showed that `memories.router.ts` only accepts a single JSON payload with `mediaUrl` string. There is no `multipart/form-data` or chunked video streaming endpoint implemented on the Express backend.
- **Status**: **Open** (Formally documented in `TEST_PLAN.md` Section 2.3).
