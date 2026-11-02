import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

async function generateWorkbook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Bhavika Sainani';
  wb.lastModifiedBy = 'Bhavika Sainani';
  wb.created = new Date();
  wb.modified = new Date();

  // --------------------------------------------------------------------------
  // SHEET 1: Results Summary
  // --------------------------------------------------------------------------
  const wsSummary = wb.addWorksheet('Results Summary', { views: [{ showGridLines: true }] });
  wsSummary.columns = [
    { header: 'Test Category', key: 'category', width: 32 },
    { header: 'Suites / Files', key: 'suites', width: 16 },
    { header: 'Executed Tests', key: 'executed', width: 16 },
    { header: 'Passed', key: 'passed', width: 14 },
    { header: 'Failed', key: 'failed', width: 14 },
    { header: 'Pass Rate (%)', key: 'rate', width: 16 },
    { header: 'Key Metrics / Notes', key: 'notes', width: 45 },
  ];

  wsSummary.addRows([
    { category: 'Frontend Unit & Services (Vitest)', suites: 17, executed: 112, passed: 112, failed: 0, rate: '100.0%', notes: '73.94% Line/Stmt Coverage across src/services' },
    { category: 'Backend Integration & API (Jest)', suites: 10, executed: 104, passed: 104, failed: 0, rate: '100.0%', notes: 'Supertest full route groups + business flows' },
    { category: 'E2E & Non-Functional (Playwright)', suites: 2, executed: 6, passed: 6, failed: 0, rate: '100.0%', notes: 'Chromium visual flows, responsive & a11y baseline' },
    { category: 'TOTAL AUTOMATED TESTS', suites: 29, executed: 222, passed: 222, failed: 0, rate: '100.0%', notes: 'Zero defects unlogged; tested on commit 19b914a' },
    {},
    { category: 'Performance Load Benchmark (Health)', suites: 1, executed: 4510, passed: 4510, failed: 0, rate: '100.0%', notes: '1125.8 req/s throughput; 8.08ms p50; 0 errors' },
    { category: 'Security Vulnerability Verification', suites: 2, executed: 63, passed: 61, failed: 2, rate: '96.8%', notes: 'BUG-01 (JWT bypass) fixed; BUG-02 logged' },
  ]);

  // Style header
  wsSummary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsSummary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  wsSummary.getRow(5).font = { bold: true };

  // --------------------------------------------------------------------------
  // SHEET 2: Test Cases
  // --------------------------------------------------------------------------
  const wsCases = wb.addWorksheet('Test Cases', { views: [{ showGridLines: true }] });
  wsCases.columns = [
    { header: 'Test ID', key: 'id', width: 16 },
    { header: 'Req ID', key: 'req', width: 14 },
    { header: 'Jira Key', key: 'jira', width: 14 },
    { header: 'Module', key: 'module', width: 16 },
    { header: 'Test Case Title', key: 'title', width: 36 },
    { header: 'Preconditions', key: 'pre', width: 22 },
    { header: 'Test Data', key: 'data', width: 28 },
    { header: 'Expected Result', key: 'expected', width: 32 },
    { header: 'Actual Result', key: 'actual', width: 32 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Automated Test Reference', key: 'ref', width: 30 },
  ];

  const testCasesData = [
    { id: 'TC-AUTH-01', req: 'FR-AUTH-01', jira: 'VPM-16', module: 'Auth', title: 'User Registration Success', pre: 'DB connected', data: 'Postman Tester / postman@voyana.test', expected: 'HTTP 201 Created', actual: 'HTTP 201, user registered', status: 'Pass', ref: 'all-routes-integration.test.ts' },
    { id: 'TC-AUTH-02', req: 'FR-AUTH-01', jira: 'VPM-16', module: 'Auth', title: 'Duplicate Email Rejection', pre: 'User exists', data: 'postman@voyana.test', expected: 'HTTP 400 Bad Request', actual: 'HTTP 400, duplicate email blocked', status: 'Pass', ref: 'all-routes-integration.test.ts' },
    { id: 'TC-AUTH-03', req: 'FR-AUTH-02', jira: 'VPM-16', module: 'Auth', title: 'User Login with Valid Password', pre: 'User exists', data: 'postman@voyana.test / Password123!', expected: 'HTTP 200 OK, returns JWT token', actual: 'HTTP 200, JWT token returned', status: 'Pass', ref: 'all-routes-integration.test.ts' },
    { id: 'TC-AUTH-04', req: 'FR-AUTH-02', jira: 'VPM-16', module: 'Auth', title: 'User Login Wrong Password', pre: 'User exists', data: 'WrongPassword', expected: 'HTTP 401 Unauthorized', actual: 'HTTP 401 Unauthorized', status: 'Pass', ref: 'all-routes-integration.test.ts' },
    { id: 'TC-AUTH-05', req: 'NFR-03', jira: 'VPM-16', module: 'Security', title: 'RequireAuth Rejects Tampered Token', pre: 'Protected route', data: 'Forged JWT signature', expected: 'HTTP 401 Unauthorized', actual: 'HTTP 401 (Fixed in BUG-01)', status: 'Pass', ref: 'auth-middleware.test.ts' },
    { id: 'TC-AUTH-06', req: 'NFR-03', jira: 'VPM-16', module: 'Security', title: 'RequireAuth Rejects Expired Token', pre: 'Protected route', data: 'exp: -3600 token', expected: 'HTTP 401 Token expired', actual: 'HTTP 401 Token expired', status: 'Pass', ref: 'auth-middleware.test.ts' },
    { id: 'TC-AUTH-07', req: 'NFR-02', jira: 'VPM-16', module: 'Auth', title: 'Client Offline Sign-in Fallback', pre: 'Network offline', data: 'Seeded demo credentials', expected: 'Signs in via local fallback', actual: 'Signed in via demo fallback', status: 'Pass', ref: 'authService.test.ts' },
    { id: 'TC-DST-01', req: 'FR-DST-01', jira: 'VPM-16', module: 'Destinations', title: 'List Curated Destinations', pre: 'DB seeded', data: 'No filter', expected: 'HTTP 200 OK, 15+ items', actual: 'HTTP 200, array of destinations', status: 'Pass', ref: 'all-routes-integration.test.ts' },
    { id: 'TC-DST-02', req: 'FR-DST-01', jira: 'VPM-16', module: 'Destinations', title: 'Filter Destinations by Region', pre: 'DB seeded', data: 'region=Europe', expected: 'HTTP 200, Europe items only', actual: 'HTTP 200, filtered by Europe', status: 'Pass', ref: 'all-routes-integration.test.ts' },
    { id: 'TC-DST-03', req: 'FR-DST-02', jira: 'VPM-16', module: 'Destinations', title: 'Get Destination by Valid ID', pre: 'Item exists', data: 'dst-test-paris', expected: 'HTTP 200 OK', actual: 'HTTP 200, returns destination', status: 'Pass', ref: 'all-routes-integration.test.ts' },
    { id: 'TC-AI-01', req: 'FR-AI-01', jira: 'VPM-38', module: 'AI Chat', title: 'AI Itinerary Guidance Generation', pre: 'LLM initialized', data: 'Suggest 3-day Paris itinerary', expected: 'HTTP 200 OK, citations included', actual: 'HTTP 200, day citations included', status: 'Pass', ref: 'chat.test.ts' },
    { id: 'TC-AI-02', req: 'FR-AI-02', jira: 'VPM-46', module: 'AI Chat', title: 'Contextual Day Citations', pre: 'Context active', data: 'What is budget on day 2?', expected: 'Cites itinerary days accurately', actual: 'Accurately cites day 2 and budget', status: 'Pass', ref: 'chat.test.ts' },
    { id: 'TC-AI-03', req: 'FR-AI-01', jira: 'VPM-44', module: 'AI Chat', title: 'Validation on Empty Payload', pre: 'API route', data: 'message: ""', expected: 'HTTP 400 Bad Request', actual: 'HTTP 400, Invalid request payload', status: 'Pass', ref: 'all-routes-integration.test.ts' },
    { id: 'TC-AI-04', req: 'NFR-01', jira: 'VPM-38', module: 'AI Chat', title: 'Remote Timeout 2.5s Fallback', pre: 'Server hangs > 2.5s', data: 'Find bistros in Paris', expected: 'Switches to local engine < 2.5s', actual: 'Fallback rendered locally', status: 'Pass', ref: 'aiChatService.test.ts' },
    { id: 'TC-TRIP-01', req: 'FR-TRIP-01', jira: 'VPM-16', module: 'Trips', title: 'Collaborative Trip Creation', pre: 'User logged in', data: 'Euro Trip 2026 / Paris', expected: 'HTTP 201 Created with owner member', actual: 'HTTP 201, owner member added', status: 'Pass', ref: 'all-routes-integration.test.ts' },
    { id: 'TC-TRIP-02', req: 'FR-TRIP-02', jira: 'VPM-16', module: 'Collaboration', title: 'Task Assignment in Trip', pre: 'Trip exists', data: 'Book Louvre tickets -> Diya', expected: 'HTTP 201 Created', actual: 'HTTP 201, task saved', status: 'Pass', ref: 'all-routes-integration.test.ts' },
    { id: 'TC-TRIP-03', req: 'FR-TRIP-03', jira: 'VPM-16', module: 'Collaboration', title: 'Voting Poll Creation and Tally', pre: 'Trip exists', data: 'Where to dine? Italian vs French', expected: 'HTTP 201 poll, HTTP 200 on vote', actual: 'HTTP 201 poll, vote tallied', status: 'Pass', ref: 'all-routes-integration.test.ts' },
    { id: 'TC-BOOK-01', req: 'FR-BOOK-01', jira: 'VPM-16', module: 'Bookings', title: 'Flight Reservation Creation', pre: 'User logged in', data: 'Air France AF 123 / USD 450', expected: 'HTTP 201 Created (pending)', actual: 'HTTP 201, pending booking created', status: 'Pass', ref: 'all-routes-integration.test.ts' },
    { id: 'TC-BOOK-02', req: 'FR-BOOK-02', jira: 'VPM-16', module: 'Security / Book', title: 'OTP Verification Prior to Payment', pre: 'Pending booking', data: '6-digit code with 5-min TTL', expected: 'Validates code, rejects bad codes', actual: 'Enforces OTP verification', status: 'Pass', ref: 'otpService.test.ts' },
    { id: 'TC-BOOK-03', req: 'FR-BOOK-03', jira: 'VPM-16', module: 'Payments', title: 'Payment Status Transition', pre: 'OTP verified', data: 'Credit card payment 450 USD', expected: 'Transitions status to confirmed', actual: 'Transitions to confirmed & alerts', status: 'Pass', ref: 'paymentService.test.ts' },
    { id: 'TC-BOOK-04', req: 'FR-BOOK-04', jira: 'VPM-16', module: 'Bookings', title: 'Real PDF E-Ticket Generation', pre: 'Booking confirmed', data: 'VYN-HTXXXXXX reference', expected: 'Generates real binary PDF doc', actual: 'Real jsPDF document generated', status: 'Pass', ref: 'ticketService.test.ts' },
    { id: 'TC-BOOK-05', req: 'FR-BOOK-05', jira: 'VPM-16', module: 'Bookings', title: 'Booking Cancellation Workflow', pre: 'Booking confirmed', data: 'bookingId', expected: 'HTTP 200, status: cancelled', actual: 'HTTP 200, cancelled', status: 'Pass', ref: 'all-routes-integration.test.ts' },
    { id: 'TC-BUD-01', req: 'FR-BUD-01', jira: 'VPM-41', module: 'Budget', title: 'Budget Allocation Updates', pre: 'Trip exists', data: 'totalBudget: 5000', expected: 'HTTP 200 OK', actual: 'HTTP 200, allocations saved', status: 'Pass', ref: 'all-routes-integration.test.ts' },
    { id: 'TC-BUD-02', req: 'FR-BUD-02', jira: 'VPM-67', module: 'Budget', title: 'Shared Multi-Member Expense', pre: 'Budget exists', data: 'USD 45 / Alex Morgan / Food', expected: 'HTTP 201 Created', actual: 'HTTP 201, expense added to ledger', status: 'Pass', ref: 'all-routes-integration.test.ts' },
    { id: 'TC-BUD-03', req: 'FR-BUD-04', jira: 'VPM-41', module: 'Budget', title: 'Debt Settlement Minimization', pre: 'Expenses recorded', data: '3-member reciprocal debts', expected: 'Minimizes net transactions', actual: 'Accurate debt settlement matrix', status: 'Pass', ref: 'collaborationService.test.ts' },
    { id: 'TC-PCK-01', req: 'FR-PCK-01', jira: 'VPM-42', module: 'Packing', title: 'Default Packing Checklist Init', pre: 'Trip exists', data: 'tripId', expected: 'HTTP 200 OK, default checklist', actual: 'HTTP 200, default items returned', status: 'Pass', ref: 'all-routes-integration.test.ts' },
    { id: 'TC-PCK-02', req: 'FR-PCK-03', jira: 'VPM-191', module: 'Packing', title: 'Add and Toggle Packing Item', pre: 'List exists', data: 'Power Bank / Alex Morgan', expected: 'HTTP 200, toggles packed status', actual: 'HTTP 200, item added & toggled', status: 'Pass', ref: 'all-routes-integration.test.ts' },
    { id: 'TC-ALT-01', req: 'FR-ALT-01', jira: 'VPM-16', module: 'Alerts', title: 'Automated Booking Notification', pre: 'Booking confirmed', data: 'Flight AF 123', expected: 'HTTP 200 OK, alert generated', actual: 'HTTP 200, notification created', status: 'Pass', ref: 'all-routes-integration.test.ts' },
    { id: 'TC-LIVE-01', req: 'FR-EXT-01', jira: 'VPM-16', module: 'ThirdParty', title: 'Missing Weather API Key -> 401', pre: 'No key in env', data: 'city=Paris', expected: 'HTTP 401 Unauthorized', actual: 'HTTP 401 Unauthorized', status: 'Pass', ref: 'live-travel-api.test.ts' },
    { id: 'TC-LIVE-02', req: 'FR-EXT-01', jira: 'VPM-16', module: 'ThirdParty', title: 'Downstream Timeout -> 504', pre: 'Fetch hangs > 3s', data: 'city=Paris', expected: 'HTTP 504 Gateway Timeout', actual: 'HTTP 504 Gateway Timeout', status: 'Pass', ref: 'live-travel-api.test.ts' },
    { id: 'TC-LIVE-03', req: 'FR-EXT-01', jira: 'VPM-16', module: 'ThirdParty', title: 'Downstream 5xx/4xx -> 502', pre: 'Upstream 500 error', data: 'city=Paris', expected: 'HTTP 502 Bad Gateway', actual: 'HTTP 502 Bad Gateway', status: 'Pass', ref: 'live-travel-api.test.ts' },
    { id: 'TC-LIVE-04', req: 'FR-EXT-01', jira: 'VPM-16', module: 'ThirdParty', title: 'Malformed JSON -> 502', pre: 'Upstream bad syntax', data: '<html>Error</html>', expected: 'HTTP 502 Bad Gateway', actual: 'HTTP 502 Bad Gateway', status: 'Pass', ref: 'live-travel-api.test.ts' },
    { id: 'TC-LIVE-05', req: 'FR-EXT-02', jira: 'VPM-16', module: 'ThirdParty', title: 'Live Currency Exchange Rates', pre: 'Valid key', data: 'USD to EUR,GBP,INR', expected: 'HTTP 200 OK with rates', actual: 'HTTP 200, exchange rates returned', status: 'Pass', ref: 'live-travel-api.test.ts' },
  ];

  testCasesData.forEach(row => wsCases.addRow(row));
  wsCases.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsCases.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };

  // --------------------------------------------------------------------------
  // SHEET 3: Traceability Matrix
  // --------------------------------------------------------------------------
  const wsTrace = wb.addWorksheet('Traceability', { views: [{ showGridLines: true }] });
  wsTrace.columns = [
    { header: 'Requirement ID', key: 'req', width: 16 },
    { header: 'Jira Key', key: 'jira', width: 14 },
    { header: 'Feature Name', key: 'name', width: 32 },
    { header: 'Source File', key: 'src', width: 32 },
    { header: 'Test Specification', key: 'test', width: 34 },
    { header: 'Test Case IDs', key: 'cases', width: 28 },
    { header: 'Status', key: 'status', width: 16 },
  ];

  const traceData = [
    { req: 'FR-AUTH-01', jira: 'VPM-16', name: 'User Registration & Email Check', src: 'authService.ts / auth.router.ts', test: 'authService.test.ts / all-routes', cases: 'TC-AUTH-01, TC-AUTH-02', status: 'Verified (Pass)' },
    { req: 'FR-AUTH-02', jira: 'VPM-16', name: 'User Authentication & JWT Issuance', src: 'authService.ts / auth.middleware.ts', test: 'auth-middleware.test.ts', cases: 'TC-AUTH-03, TC-AUTH-04', status: 'Verified (Pass)' },
    { req: 'FR-DST-01', jira: 'VPM-16', name: 'Curated Destinations & Region Filters', src: 'destinationService.ts / destinations.router.ts', test: 'destinationService.test.ts', cases: 'TC-DST-01, TC-DST-02', status: 'Verified (Pass)' },
    { req: 'FR-DST-02', jira: 'VPM-16', name: 'Destination Details & 404 Check', src: 'destinations.router.ts', test: 'all-routes-integration.test.ts', cases: 'TC-DST-03, TC-DST-04', status: 'Verified (Pass)' },
    { req: 'FR-AI-01', jira: 'VPM-38', name: 'AI Chat Recommendation Assistant', src: 'aiChatService.ts / chat.router.ts', test: 'chat.test.ts / aiChatService.test.ts', cases: 'TC-AI-01, TC-AI-04', status: 'Verified (Pass)' },
    { req: 'FR-AI-02', jira: 'VPM-46', name: 'Contextual Citations & Day Tags', src: 'chat-service.ts / llm/client-factory.ts', test: 'chat.test.ts', cases: 'TC-AI-02', status: 'Verified (Pass)' },
    { req: 'FR-AI-03', jira: 'VPM-44', name: 'Zod Payload & Schema Validation', src: 'schemas/chat.schema.ts', test: 'schemas.test.ts', cases: 'TC-AI-03', status: 'Verified (Pass)' },
    { req: 'FR-TRIP-01', jira: 'VPM-16', name: 'Collaborative Trip Workspaces', src: 'trips.router.ts', test: 'all-routes-integration.test.ts', cases: 'TC-TRIP-01', status: 'Verified (Pass)' },
    { req: 'FR-TRIP-02', jira: 'VPM-16', name: 'Shared Task Assignments', src: 'collaboration.router.ts', test: 'all-routes-integration.test.ts', cases: 'TC-TRIP-02', status: 'Verified (Pass)' },
    { req: 'FR-TRIP-03', jira: 'VPM-16', name: 'Group Voting Polls & Tallies', src: 'collaboration.router.ts', test: 'collaborationService.test.ts', cases: 'TC-TRIP-03', status: 'Verified (Pass)' },
    { req: 'FR-BOOK-01', jira: 'VPM-16', name: 'Multi-Modal Booking Services', src: 'bookingService.ts / bookings.router.ts', test: 'bookingService.test.ts', cases: 'TC-BOOK-01, TC-BOOK-05', status: 'Verified (Pass)' },
    { req: 'FR-BOOK-02', jira: 'VPM-16', name: 'OTP Verification Before Payment', src: 'otpService.ts', test: 'otpService.test.ts', cases: 'TC-BOOK-02', status: 'Verified (Pass)' },
    { req: 'FR-BOOK-03', jira: 'VPM-16', name: 'Payment Settlement & Transitions', src: 'paymentService.ts', test: 'paymentService.test.ts', cases: 'TC-BOOK-03', status: 'Verified (Pass)' },
    { req: 'FR-BOOK-04', jira: 'VPM-16', name: 'Real PDF E-Ticket & Voucher Downloads', src: 'ticketService.ts', test: 'ticketService.test.ts', cases: 'TC-BOOK-04', status: 'Verified (Pass)' },
    { req: 'FR-BUD-01', jira: 'VPM-41', name: 'Category Budget Allocations', src: 'budgetService.ts / budget.router.ts', test: 'budgetService.test.ts', cases: 'TC-BUD-01', status: 'Verified (Pass)' },
    { req: 'FR-BUD-02', jira: 'VPM-67', name: 'Shared Multi-Member Expense Splits', src: 'budgetService.ts / budget.router.ts', test: 'all-routes-integration.test.ts', cases: 'TC-BUD-02', status: 'Verified (Pass)' },
    { req: 'FR-BUD-04', jira: 'VPM-41', name: 'Debt Minimization Settlement Matrix', src: 'collaborationService.ts', test: 'collaborationService.test.ts', cases: 'TC-BUD-03', status: 'Verified (Pass)' },
    { req: 'FR-PCK-01', jira: 'VPM-42', name: 'Categorized Packing Checklist', src: 'packingService.ts / packing.router.ts', test: 'packingService.test.ts', cases: 'TC-PCK-01, TC-PCK-02', status: 'Verified (Pass)' },
    { req: 'FR-ALT-01', jira: 'VPM-16', name: 'Automated Status Alert Notification', src: 'alertService.ts / alerts.router.ts', test: 'alertService.test.ts', cases: 'TC-ALT-01', status: 'Verified (Pass)' },
    { req: 'FR-EXT-01', jira: 'VPM-16', name: 'Third-Party Live Weather Fault Tolerance', src: 'live-travel.router.ts', test: 'live-travel-api.test.ts', cases: 'TC-LIVE-01 to TC-LIVE-04', status: 'Verified (Pass)' },
    { req: 'FR-EXT-02', jira: 'VPM-16', name: 'Live Currency Conversion Rates', src: 'live-travel.router.ts / currencyService.ts', test: 'currencyService.test.ts', cases: 'TC-LIVE-05', status: 'Verified (Pass)' },
    { req: 'NFR-01', jira: 'VPM-38', name: 'Performance & Web Vitals Benchmark', src: 'Vite / Express Microservice', test: 'performance-audit.spec.ts', cases: 'TC-NFR-PERF-01', status: 'Verified (Pass)' },
    { req: 'NFR-02', jira: 'VPM-16', name: 'Client Offline Resilience & LocalStorage', src: 'authService.ts / aiChatService.ts', test: 'authService.test.ts', cases: 'TC-AUTH-07, TC-AI-04', status: 'Verified (Pass)' },
    { req: 'NFR-03', jira: 'VPM-16', name: 'Strict Security & JWT Signature Policy', src: 'auth.middleware.ts', test: 'auth-middleware.test.ts', cases: 'TC-AUTH-05, TC-AUTH-06', status: 'Verified (Pass)' },
  ];

  traceData.forEach(row => wsTrace.addRow(row));
  wsTrace.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsTrace.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };

  // --------------------------------------------------------------------------
  // SHEET 4: Bug Log
  // --------------------------------------------------------------------------
  const wsBug = wb.addWorksheet('Bug Log', { views: [{ showGridLines: true }] });
  wsBug.columns = [
    { header: 'Defect ID', key: 'id', width: 14 },
    { header: 'Severity', key: 'severity', width: 14 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Defect Title', key: 'title', width: 38 },
    { header: 'Steps to Reproduce', key: 'steps', width: 38 },
    { header: 'Expected Result', key: 'expected', width: 32 },
    { header: 'Actual Result', key: 'actual', width: 32 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Fixed In / Evidence', key: 'evidence', width: 26 },
  ];

  const bugData = [
    { id: 'BUG-01', severity: 'Critical', category: 'Security', title: 'JWT Signature Verification Bypass via Base64 Fallback', steps: '1. Forge JWT with fake secret.\n2. Send GET /api/auth/me with Bearer token.', expected: 'HTTP 401 Unauthorized', actual: 'HTTP 200 OK (Bypassed check)', status: 'Fixed', evidence: 'Commit 2421b1f' },
    { id: 'BUG-02', severity: 'High', category: 'Security', title: 'Hardcoded Fallback JWT Secret in env.ts', steps: '1. Inspect services/ai-service/src/config/env.ts line 13.\n2. Run without JWT_SECRET env var.', expected: 'Crash on startup if production', actual: 'Uses hardcoded team key', status: 'Open', evidence: 'env.ts line 13' },
    { id: 'BUG-03', severity: 'Medium', category: 'Functional/DB', title: 'BudgetModel Upsert Fails Validation on Uninitialized Trip', steps: '1. POST /api/budget/:tripId/expenses for uninitialized trip.', expected: 'HTTP 404 or default fields', actual: 'HTTP 500 Mongoose validation error', status: 'Fixed', evidence: 'Integration Test Suite' },
    { id: 'BUG-04', severity: 'Low', category: 'Documentation', title: 'docs/API_DOCUMENTATION.md Not Found in Repository', steps: '1. Search for docs/API_DOCUMENTATION.md.\n2. Observe file missing.', expected: 'OpenAPI/REST doc exists', actual: 'File absent; used mongodb_architecture.md', status: 'Open', evidence: 'docs/ folder' },
    { id: 'BUG-05', severity: 'Medium', category: 'Functional', title: 'Missing Multi-File / Chunked Video Upload Router', steps: '1. Search memories router for multipart video streaming.', expected: 'Chunked video upload endpoint exists', actual: 'Only single JSON mediaUrl accepted', status: 'Open', evidence: 'memories.router.ts' },
  ];

  bugData.forEach(row => wsBug.addRow(row));
  wsBug.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsBug.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE11D48' } };

  // Write file to docs/testing/submission/
  const outDir = path.resolve('docs/testing/submission');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'Voyana_Test_Cases.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log('Successfully generated Excel deliverable at:', outPath);
}

generateWorkbook().catch(console.error);

