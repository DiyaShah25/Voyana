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
    { header: 'Test Category', key: 'category', width: 34 },
    { header: 'Suites / Files', key: 'suites', width: 16 },
    { header: 'Executed Tests', key: 'executed', width: 16 },
    { header: 'Passed', key: 'passed', width: 14 },
    { header: 'Failed', key: 'failed', width: 14 },
    { header: 'Pass Rate (%)', key: 'rate', width: 16 },
    { header: 'Key Metrics / Notes', key: 'notes', width: 55 },
  ];

  wsSummary.addRows([
    { category: 'Frontend Unit & Services (Vitest)', suites: 17, executed: 112, passed: 112, failed: 0, rate: '100.0%', notes: '73.94% on tested modules (45.73% across all services)' },
    { category: 'Backend Integration & API (Jest)', suites: 10, executed: 104, passed: 104, failed: 0, rate: '100.0%', notes: 'Supertest full route groups + business flows' },
    { category: 'E2E & Non-Functional (Playwright)', suites: 2, executed: 6, passed: 6, failed: 0, rate: '100.0%', notes: 'Chromium visual flows, responsive views & a11y baseline' },
    { category: 'TOTAL AUTOMATED TESTS', suites: 29, executed: 222, passed: 222, failed: 0, rate: '100.0%', notes: 'All automated regression tests verified on codebase' },
    {},
    { category: 'Non-Test Operational Metrics & Benchmarks', notes: '(Independent operational metrics without pass/fail test tally)' },
    { category: 'Load Benchmark: GET /health', notes: '2,700 requests | 898.8 req/s throughput | 9.96ms p50 | 0 errors (Health ping micro-benchmark)' },
    { category: 'Load Benchmark: GET /api/destinations', notes: '1,214 requests | 403.6 req/s throughput | 23.44ms p50 | 0 errors (Mongoose DB query)' },
    { category: 'Browser Navigation & Web Vitals', notes: 'TTFB 17.3ms, DOM Loaded 297.6ms, FCP 756.0ms, Load 304.0ms (W3C Real Metrics)' },
    { category: 'Security & Dependency Vulnerabilities', notes: '36 backend CVEs (2 critical, 3 high), 27 frontend CVEs (3 critical, 14 high); Accepted Risk (BUG-06)' },
  ]);

  wsSummary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsSummary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  wsSummary.getRow(5).font = { bold: true };
  wsSummary.getRow(7).font = { bold: true, italic: true, color: { argb: 'FF1E3A8A' } };

  // --------------------------------------------------------------------------
  // SHEET 2: Test Cases (All 34 Cases)
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
    { id: 'TC-DST-04', req: 'FR-DST-02', jira: 'VPM-16', module: 'Destinations', title: 'Unknown Destination ID Returns 404', pre: 'Item absent', data: 'unknown-id-999', expected: 'HTTP 404 Not Found', actual: 'HTTP 404 returned cleanly', status: 'Pass', ref: 'all-routes-integration.test.ts' },
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
    { id: 'TC-PCK-01', req: 'FR-PCK-01', jira: 'VPM-42', module: 'Packing', title: 'Default Packing Checklist Init', pre: 'Trip exists', data: 'tripId', expected: 'HTTP 200 OK, default items', actual: 'HTTP 200, default items returned', status: 'Pass', ref: 'all-routes-integration.test.ts' },
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
  // SHEET 3: Traceability Matrix (All 24 Rows)
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
    { req: 'NFR-04', jira: 'VPM-16', name: 'Responsive UI & Accessibility', src: 'Tailwind / React Components', test: 'voyana-flows.spec.ts', cases: 'TC-NFR-UI-01, TC-NFR-A11Y-01', status: 'Partial (BUG-07)' },
  ];

  traceData.forEach(row => wsTrace.addRow(row));
  wsTrace.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsTrace.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };

  // --------------------------------------------------------------------------
  // SHEET 4: Bug Log (BUG-01 to BUG-08)
  // --------------------------------------------------------------------------
  const wsBug = wb.addWorksheet('Bug Log', { views: [{ showGridLines: true }] });
  wsBug.columns = [
    { header: 'Defect ID', key: 'id', width: 14 },
    { header: 'Severity', key: 'severity', width: 14 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Defect Title', key: 'title', width: 38 },
    { header: 'Steps to Reproduce', key: 'steps', width: 40 },
    { header: 'Expected Result', key: 'expected', width: 32 },
    { header: 'Actual Result', key: 'actual', width: 32 },
    { header: 'Status', key: 'status', width: 22 },
    { header: 'Fixed In / Evidence', key: 'evidence', width: 28 },
  ];

  const bugData = [
    { id: 'BUG-01', severity: 'Critical', category: 'Security', title: 'JWT Signature Verification Bypass via Base64 Fallback', steps: '1. Forge JWT with fake secret.\n2. Send GET /api/auth/me with Bearer token.', expected: 'HTTP 401 Unauthorized', actual: 'HTTP 200 OK (Bypassed check)', status: 'Fixed (Dev Risk Noted)', evidence: 'Commit 2421b1f' },
    { id: 'BUG-02', severity: 'High', category: 'Security', title: 'Hardcoded Fallback JWT Secret in env.ts', steps: '1. Inspect env.ts in older commit.\n2. Run without JWT_SECRET in production.', expected: 'Crash on startup in production', actual: 'Started silently with hardcoded team secret', status: 'Fixed', evidence: 'Commit 25b4c39' },
    { id: 'BUG-03', severity: 'Medium', category: 'Functional/DB', title: 'BudgetModel Upsert Fails Validation on Blank Trip', steps: '1. POST /api/budget/:tripId/expenses for uninitialized trip.', expected: 'HTTP 404 or default fields', actual: 'HTTP 500 Mongoose validation error', status: 'Fixed', evidence: 'Integration Test Suite' },
    { id: 'BUG-04', severity: 'Low', category: 'Documentation', title: 'Initial Check: docs/API_DOCUMENTATION.md Missing in Repo', steps: '1. Search for docs/API_DOCUMENTATION.md.\n2. Observe pre-merge absence.', expected: 'OpenAPI/REST doc exists', actual: 'File exists with 1290 lines', status: 'Invalid / Closed', evidence: 'docs/API_DOCUMENTATION.md' },
    { id: 'BUG-05', severity: 'Medium', category: 'Functional', title: 'Missing Multi-File / Chunked Video Upload Router', steps: '1. Search memories router for multipart video streaming.', expected: 'Chunked video upload endpoint exists', actual: 'Only single JSON mediaUrl accepted', status: 'Open', evidence: 'TEST_PLAN.md Section 1.1' },
    { id: 'BUG-06', severity: 'Moderate', category: 'Security/Deps', title: 'Known Vulnerabilities in Transitive & Dev Dependencies', steps: '1. Run npm audit on root and backend.\n2. Observe 27 frontend and 36 backend CVEs.', expected: 'Zero unvetted high vulnerabilities', actual: 'mix of runtime (express: body-parser, qs, proxy-addr) and dev dependencies; backend 36 (2 critical, 3 high), frontend 27 (3 critical, 14 high); npm audit fix available, deferred', status: 'Accepted Risk', evidence: 'npm-audit-frontend/backend.txt' },
    { id: 'BUG-07', severity: 'Medium', category: 'UI/Responsive', title: 'Header Navigation Clipped & Overflow at 375px', steps: '1. View site at 375x667 viewport.\n2. Observe right-edge navbar clipping.', expected: 'Responsive mobile navbar fits cleanly without clipping', actual: 'Header clipped at right on 375px mobile', status: 'Open (Partial)', evidence: '03_responsive_mobile_375px.png' },
    { id: 'BUG-08', severity: 'Low', category: 'UI/Search', title: 'Search Placeholder Truncated as "regior" at ≥1280px', steps: '1. View search bar at ≥1280px resolution.\n2. Inspect placeholder text.', expected: 'Full text: Search destinations...', actual: 'Truncated text: "regior"', status: 'Open', evidence: '03_responsive_desktop_1440px.png' },
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
  console.log('Successfully regenerated Excel deliverable at:', outPath);
}

generateWorkbook().catch(console.error);
