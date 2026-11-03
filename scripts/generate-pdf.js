import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function generatePdf() {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Voyana — Test Plan and Test Cases</title>
<style>
  @page {
    size: A4;
    margin: 16mm 14mm 16mm 14mm;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.45;
    font-size: 9.5pt;
  }
  .cover-page {
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 88vh;
    text-align: center;
    border: 2px solid #3b82f6;
    border-radius: 12px;
    padding: 35px 20px;
    margin-top: 15px;
  }
  .cover-title {
    font-size: 26pt;
    font-weight: 800;
    color: #1e3a8a;
    margin-bottom: 6px;
  }
  .cover-subtitle {
    font-size: 14pt;
    color: #2563eb;
    margin-bottom: 25px;
  }
  .cover-badge {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1d4ed8;
    padding: 6px 16px;
    border-radius: 9999px;
    font-size: 10.5pt;
    font-weight: 600;
    display: inline-block;
    margin-bottom: 25px;
  }
  .cover-meta {
    margin-top: 20px;
    text-align: left;
    width: 82%;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 18px;
    font-size: 10pt;
  }
  .cover-meta table {
    width: 100%;
    border-collapse: collapse;
  }
  .cover-meta td {
    padding: 5px 8px;
    border: none;
  }
  .cover-meta td.label {
    font-weight: bold;
    color: #475569;
    width: 35%;
  }
  h1 {
    color: #0f172a;
    font-size: 15pt;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 4px;
    margin-top: 20px;
    page-break-after: avoid;
  }
  h2 {
    color: #1e3a8a;
    font-size: 11pt;
    margin-top: 14px;
    page-break-after: avoid;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 8pt;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 4px 6px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background-color: #f1f5f9;
    font-weight: 600;
    color: #334155;
  }
  tr:nth-child(even) {
    background-color: #f8fafc;
  }
  .badge-pass {
    background-color: #dcfce7;
    color: #166534;
    font-weight: bold;
    padding: 1px 5px;
    border-radius: 3px;
    display: inline-block;
  }
  .badge-crit {
    background-color: #fee2e2;
    color: #991b1b;
    font-weight: bold;
    padding: 1px 5px;
    border-radius: 3px;
    display: inline-block;
  }
  .badge-high {
    background-color: #fef3c7;
    color: #92400e;
    font-weight: bold;
    padding: 1px 5px;
    border-radius: 3px;
    display: inline-block;
  }
  .badge-neutral {
    background-color: #e2e8f0;
    color: #334155;
    font-weight: bold;
    padding: 1px 5px;
    border-radius: 3px;
    display: inline-block;
  }
  .page-break {
    page-break-after: always;
  }
  .metric-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 10px;
    font-size: 8.5pt;
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover-page">
  <div class="cover-title">VOYANA</div>
  <div class="cover-subtitle">Collaborative AI-Assisted Travel Planning Platform</div>
  <div class="cover-badge">Course Deliverable: Comprehensive Test Plan & Test Cases</div>
  
  <div class="cover-meta">
    <table>
      <tr>
        <td class="label">Course:</td>
        <td>DAU Sem-3 WSOA (Web Services & Oriented Architectures)</td>
      </tr>
      <tr>
        <td class="label">Author / QA Lead:</td>
        <td><strong>Bhavika Sainani</strong> (<code>bhavikasainani2608@gmail.com</code>)</td>
      </tr>
      <tr>
        <td class="label">Project Team:</td>
        <td>Diya Shah, Nigam Sanghvi, Tirth Gandhi, Bhavika Sainani, Megha Lalwani, Manav Vyas, Bhavika Mulani, Jagrat Kumar</td>
      </tr>
      <tr>
        <td class="label">Tested Commit Hash:</td>
        <td><code>b53a4f7</code></td>
      </tr>
      <tr>
        <td class="label">Repository:</td>
        <td><code>https://github.com/DiyaShah25/Voyana</code></td>
      </tr>
      <tr>
        <td class="label">Submission Date:</td>
        <td>November 2, 2026</td>
      </tr>
      <tr>
        <td class="label">Test Execution Result:</td>
        <td><strong>222 / 222 Automated Tests Passed (100% Pass Rate)</strong></td>
      </tr>
    </table>
  </div>
</div>

<!-- SECTION 1: MASTER TEST PLAN -->
<h1>1. Master Test Plan</h1>
<p>
Voyana combines an AI itinerary recommendation engine (VoyaBot), interactive 3D Globe visualization, multi-modal travel bookings (Flights, Hotels, Transport), shared budget tracking, debt settlements, packing checklists, collaborative polls, and travel memories into an integrated web application.
</p>
<h2>1.1 Scope of Testing & Coverage Boundaries</h2>
<ul>
  <li><strong>In-Scope Modules:</strong> Authentication & Security, Destinations & Globe Canvas, AI Travel Assistant, Trip Workspaces, Bookings & Payments, OTP Verification, Real PDF E-Ticket Generation, Budgeting & Debt Settlement, Packing Checklists, Notifications, and Third-Party External APIs.</li>
  <li><strong>In-Scope Testing Levels:</strong> Frontend Unit Testing (Vitest), Backend Integration & Supertest (Jest), UI/Visual E2E (Playwright), Multi-Endpoint API Load Testing (Concurrent Benchmark), Security Analysis (npm audit & code review), Cross-Browser and Accessibility Baselines.</li>
  <li><strong>Coverage & Scope Nuance:</strong> The 17 tested frontend service suites achieve 73.94% statement coverage across their specific files. Across all files in <code>src/services/</code>, statement coverage is 45.73%, as modules like <code>tripService.ts</code> (0%), <code>reviewService.ts</code> (0%), and <code>itineraryService.ts</code> (0%) lack isolated unit tests. These are verified through backend integration (<code>all-routes-integration.test.ts</code>) and Playwright E2E browser automation.</li>
  <li><strong>Known Gaps / Not Implemented:</strong> Multi-file chunked video streaming upload is not implemented on the backend; single photo upload is supported. Live airline GDS pipes use deterministic mock catalog providers.</li>
</ul>

<h2>1.2 Test Environment & Configurations</h2>
<table>
  <tr><th>Component</th><th>Technology</th><th>Version / Environment</th><th>Testing Purpose</th></tr>
  <tr><td>Frontend Client</td><td>React 18 + Vite + Tailwind</td><td>React 18.3.1, Vite 5.4.8</td><td>Client-side rendering & state management</td></tr>
  <tr><td>Backend Microservice</td><td>Express + Mongoose + TypeScript</td><td>Node.js v22.19.0, Express 4.x</td><td>REST API & microservice controllers</td></tr>
  <tr><td>Primary DB</td><td>MongoDB Atlas / In-Memory Mongo</td><td>mongodb-memory-server v10.1</td><td>Isolated deterministic test DB (voyana_test)</td></tr>
  <tr><td>Relational DB</td><td>Supabase PostgreSQL</td><td>Supabase CLI & migrations</td><td>Relational booking audits</td></tr>
  <tr><td>Client Testing</td><td>Vitest + RTL + JSDOM</td><td>Vitest 2.1.9, JSDOM 29.1</td><td>17 service unit test suites</td></tr>
  <tr><td>API Testing</td><td>Jest + Supertest</td><td>Jest 29.7, Supertest 7.0</td><td>10 route group & flow suites</td></tr>
  <tr><td>E2E Automation</td><td>Playwright</td><td>Playwright 1.64.1 (Chromium)</td><td>End-to-end user workflows</td></tr>
</table>

<h2>1.3 Defect Priority and Roles</h2>
<p>
Defects are prioritized from Critical (P1, blocking security/data loss) to Low (P4, minor cosmetic/doc typos). The QA team is led by Bhavika Sainani with engineering verification across Diya Shah, Nigam Sanghvi, Tirth Gandhi, Megha Lalwani, Manav Vyas, Bhavika Mulani, and Jagrat Kumar.
</p>

<div class="page-break"></div>

<!-- SECTION 2: TEST EXECUTION RESULTS -->
<h1>2. Test Execution Results & Metrics</h1>
<div class="metric-card">
  <strong>Execution Summary:</strong> 29 Test Suites | 222 Automated Tests Executed | <strong>222 Passed | 0 Failed (100% Pass Rate)</strong><br>
  <strong>Service Code Coverage:</strong> 73.94% Statements on tested modules (45.73% across all files in <code>src/services/</code>)<br>
  <strong>Tested Commit:</strong> <code>b53a4f7</code> | Duration: Vitest (24.58s), Jest (32.92s), Playwright (15.2s)
</div>

<h2>2.1 Automated Test Suites Summary</h2>
<table>
  <tr><th>Test Category</th><th>Suites / Files</th><th>Executed</th><th>Passed</th><th>Failed</th><th>Pass Rate</th><th>Key Findings</th></tr>
  <tr><td>Frontend Unit (Vitest)</td><td>17</td><td>112</td><td>112</td><td>0</td><td>100.0%</td><td>17 service modules passing, offline fallback verified</td></tr>
  <tr><td>Backend Integration (Jest)</td><td>10</td><td>104</td><td>104</td><td>0</td><td>100.0%</td><td>All mounted route groups & multi-step business flows passing</td></tr>
  <tr><td>UI & NFR Specs (Playwright)</td><td>2</td><td>6</td><td>6</td><td>0</td><td>100.0%</td><td>Chromium visual workflows, responsive views, performance audit</td></tr>
  <tr><td><strong>Total Automated Tests</strong></td><td><strong>29</strong></td><td><strong>222</strong></td><td><strong>222</strong></td><td><strong>0</strong></td><td><strong>100.0%</strong></td><td><strong>All automated regression tests verified</strong></td></tr>
</table>

<h2>2.2 Multi-Endpoint API Load Testing & Performance Benchmark</h2>
<p><em>Real multi-endpoint benchmark executed with 10 concurrent connections on local Node.js v22.19.0 / Express server:</em></p>
<table>
  <tr><th>Benchmark Target</th><th>Endpoint Type</th><th>Total Requests</th><th>Throughput (RPS)</th><th>p50 Latency</th><th>p95 Latency</th><th>Max Latency</th><th>Error Rate</th><th>Status</th></tr>
  <tr><td><code>GET /health</code></td><td>Health Ping (No DB)</td><td>2,700 reqs</td><td><strong>898.8 req/s</strong></td><td><strong>9.96 ms</strong></td><td><strong>15.99 ms</strong></td><td>68.35 ms</td><td>0.00%</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td><code>GET /api/destinations</code></td><td>Database Query (Mongoose)</td><td>1,214 reqs</td><td><strong>403.6 req/s</strong></td><td><strong>23.44 ms</strong></td><td><strong>30.85 ms</strong></td><td>76.51 ms</td><td>0.00%</td><td><span class="badge-pass">Pass</span></td></tr>
</table>

<h2>2.3 Browser Core Web Vitals & Real Navigation Timings</h2>
<table>
  <tr><th>NFR Aspect</th><th>Measurement / Tool</th><th>Observed Real Metric</th><th>Benchmark / Criteria</th><th>Status</th></tr>
  <tr><td>Time to First Byte (TTFB)</td><td>Navigation Timing API</td><td><strong>17.3 ms</strong></td><td>&lt; 100 ms</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>DOM Content Loaded</td><td>Navigation Timing API</td><td><strong>297.6 ms</strong></td><td>&lt; 500 ms</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>First Contentful Paint (FCP)</td><td>Paint Timing API</td><td><strong>756.0 ms</strong></td><td>&lt; 1800 ms</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>Load Complete</td><td>Navigation Timing API</td><td><strong>304.0 ms</strong></td><td>&lt; 2000 ms</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>Lighthouse Synthetic Scores</td><td>Categories</td><td><em>Not measured</em> (timing metrics measured directly)</td><td>N/A</td><td><span class="badge-neutral">Not measured</span></td></tr>
  <tr><td>Responsive Layouts</td><td>Playwright Headless</td><td>375px (Mobile: navbar clipped on right, see BUG-07), 768px (Tablet), 1440px (Desktop)</td><td>Zero horizontal layout overflow</td><td><span class="badge-high">Partial (BUG-07)</span></td></tr>
</table>

<div class="page-break"></div>

<!-- SECTION 3: ALL 34 TEST CASES -->
<h1>3. Complete Test Cases & Traceability Matrix</h1>
<p><em>The full suite of 34 test cases is presented below and matches <code>Voyana_Test_Cases.xlsx</code> exactly.</em></p>

<h2>3.1 Master Test Cases (34 Cases)</h2>
<table>
  <tr><th>ID</th><th>Req / Jira</th><th>Module</th><th>Title</th><th>Precondition / Input</th><th>Expected Result</th><th>Status</th></tr>
  <tr><td>TC-AUTH-01</td><td>FR-AUTH-01 / VPM-16</td><td>Auth</td><td>User Registration Success</td><td>New user email</td><td>HTTP 201 Created</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-AUTH-02</td><td>FR-AUTH-01 / VPM-16</td><td>Auth</td><td>Duplicate Email Rejection</td><td>Existing email</td><td>HTTP 400 Bad Request</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-AUTH-03</td><td>FR-AUTH-02 / VPM-16</td><td>Auth</td><td>Login with Valid Password</td><td>Valid credentials</td><td>HTTP 200 OK + JWT</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-AUTH-04</td><td>FR-AUTH-02 / VPM-16</td><td>Auth</td><td>User Login Wrong Password</td><td>Wrong password</td><td>HTTP 401 Unauthorized</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-AUTH-05</td><td>NFR-03 / VPM-16</td><td>Security</td><td>Tampered JWT Token Rejection</td><td>Forged signature</td><td>HTTP 401 Unauthorized</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-AUTH-06</td><td>NFR-03 / VPM-16</td><td>Security</td><td>Expired JWT Token Rejection</td><td>exp: -3600 token</td><td>HTTP 401 Token expired</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-AUTH-07</td><td>NFR-02 / VPM-16</td><td>Auth</td><td>Client Offline Sign-in Fallback</td><td>Network offline</td><td>Signs in via local fallback</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-DST-01</td><td>FR-DST-01 / VPM-16</td><td>Destinations</td><td>List Curated Destinations</td><td>Seeded DB</td><td>HTTP 200 OK, 15+ items</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-DST-02</td><td>FR-DST-01 / VPM-16</td><td>Destinations</td><td>Filter Destinations by Region</td><td>region=Europe</td><td>HTTP 200, Europe items only</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-DST-03</td><td>FR-DST-02 / VPM-16</td><td>Destinations</td><td>Get Destination by Valid ID</td><td>dst-test-paris</td><td>HTTP 200 OK, returns destination</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-DST-04</td><td>FR-DST-02 / VPM-16</td><td>Destinations</td><td>Unknown Destination ID Returns 404</td><td>unknown-id-999</td><td>HTTP 404 Not Found</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-AI-01</td><td>FR-AI-01 / VPM-38</td><td>AI Chat</td><td>AI Itinerary Recommendations</td><td>"Suggest 3-day Paris trip"</td><td>HTTP 200 OK with day citations</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-AI-02</td><td>FR-AI-02 / VPM-46</td><td>AI Chat</td><td>Contextual Day Citations</td><td>"What is budget on day 2?"</td><td>Cites itinerary days accurately</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-AI-03</td><td>FR-AI-01 / VPM-44</td><td>AI Chat</td><td>Validation on Empty Payload</td><td>message: ""</td><td>HTTP 400 Bad Request</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-AI-04</td><td>NFR-01 / VPM-38</td><td>AI Chat</td><td>2.5s Remote Timeout Fallback</td><td>Server delay &gt; 2.5s</td><td>Local contextual advice rendered</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-TRIP-01</td><td>FR-TRIP-01 / VPM-16</td><td>Trips</td><td>Collaborative Trip Creation</td><td>User logged in</td><td>HTTP 201 Created with owner member</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-TRIP-02</td><td>FR-TRIP-02 / VPM-16</td><td>Collaboration</td><td>Task Assignment in Trip</td><td>"Book Louvre tickets" -> Diya</td><td>HTTP 201 Created, task saved</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-TRIP-03</td><td>FR-TRIP-03 / VPM-16</td><td>Collaboration</td><td>Group Voting Poll & Vote Tally</td><td>Where to dine? Italian vs French</td><td>HTTP 201 poll, vote tallied</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-BOOK-01</td><td>FR-BOOK-01 / VPM-16</td><td>Bookings</td><td>Flight Reservation Creation</td><td>User logged in</td><td>HTTP 201 Created (pending status)</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-BOOK-02</td><td>FR-BOOK-02 / VPM-16</td><td>Security</td><td>OTP Verification Prior to Payment</td><td>Pending booking</td><td>6-digit OTP verified in 5m TTL</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-BOOK-03</td><td>FR-BOOK-03 / VPM-16</td><td>Payments</td><td>Payment Status Confirmation</td><td>Card data submitted</td><td>Status transitioned to confirmed</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-BOOK-04</td><td>FR-BOOK-04 / VPM-16</td><td>Bookings</td><td>Real PDF E-Ticket Generation</td><td>Confirmed booking</td><td>Generates binary PDF document</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-BOOK-05</td><td>FR-BOOK-05 / VPM-16</td><td>Bookings</td><td>Booking Cancellation Workflow</td><td>Confirmed booking</td><td>HTTP 200, status: cancelled</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-BUD-01</td><td>FR-BUD-01 / VPM-41</td><td>Budget</td><td>Dynamic Budget Allocations</td><td>Total $5000</td><td>HTTP 200 OK, allocations saved</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-BUD-02</td><td>FR-BUD-02 / VPM-67</td><td>Budget</td><td>Shared Multi-Member Expense</td><td>USD 45 / Alex Morgan / Food</td><td>HTTP 201 Created, added to ledger</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-BUD-03</td><td>FR-BUD-04 / VPM-41</td><td>Budget</td><td>Debt Settlement Minimization</td><td>3 members with reciprocal debts</td><td>Greedy net settlement computed</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-PCK-01</td><td>FR-PCK-01 / VPM-42</td><td>Packing</td><td>Default Packing Checklist Init</td><td>Trip initialized</td><td>HTTP 200 OK, default items</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-PCK-02</td><td>FR-PCK-03 / VPM-191</td><td>Packing</td><td>Add and Toggle Packing Item</td><td>Power Bank / Alex Morgan</td><td>HTTP 200, item added & toggled</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-ALT-01</td><td>FR-ALT-01 / VPM-16</td><td>Alerts</td><td>Automated Booking Notification</td><td>Booking confirmed</td><td>Notification created in ledger</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-LIVE-01</td><td>FR-EXT-01 / VPM-16</td><td>ThirdParty</td><td>Missing Weather API Key</td><td>No key header</td><td>HTTP 401 Unauthorized</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-LIVE-02</td><td>FR-EXT-01 / VPM-16</td><td>ThirdParty</td><td>Downstream Timeout Handling</td><td>Fetch hangs &gt; 3s</td><td>HTTP 504 Gateway Timeout</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-LIVE-03</td><td>FR-EXT-01 / VPM-16</td><td>ThirdParty</td><td>Downstream 5xx/4xx Handling</td><td>Upstream 500 error</td><td>HTTP 502 Bad Gateway</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-LIVE-04</td><td>FR-EXT-01 / VPM-16</td><td>ThirdParty</td><td>Malformed JSON Response</td><td>Upstream returns bad syntax</td><td>HTTP 502 Bad Gateway</td><td><span class="badge-pass">Pass</span></td></tr>
  <tr><td>TC-LIVE-05</td><td>FR-EXT-02 / VPM-16</td><td>ThirdParty</td><td>Live Currency Exchange Rates</td><td>USD to EUR,GBP,INR</td><td>HTTP 200 OK, exchange rates returned</td><td><span class="badge-pass">Pass</span></td></tr>
</table>

<div class="page-break"></div>

<!-- SECTION 3.2: ALL 24 TRACEABILITY ROWS -->
<h2>3.2 Requirements Traceability Matrix (All 24 Rows)</h2>
<table>
  <tr><th>Requirement</th><th>Jira Key</th><th>Module Description</th><th>Implementation Source</th><th>Automated Suite</th><th>Verification</th></tr>
  <tr><td>FR-AUTH-01</td><td>VPM-16</td><td>User Registration & Email Uniqueness</td><td>authService.ts / auth.router.ts</td><td>authService.test.ts / all-routes</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-AUTH-02</td><td>VPM-16</td><td>User Authentication & Token Grant</td><td>authService.ts / auth.middleware.ts</td><td>auth-middleware.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-DST-01</td><td>VPM-16</td><td>Curated Destinations & Region Search</td><td>destinationService.ts / destinations.router.ts</td><td>destinationService.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-DST-02</td><td>VPM-16</td><td>Destination Query & Details</td><td>destinations.router.ts</td><td>all-routes-integration.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-AI-01</td><td>VPM-38</td><td>AI Chat Itinerary Advice & Citations</td><td>aiChatService.ts / chat.router.ts</td><td>chat.test.ts / aiChatService.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-AI-02</td><td>VPM-46</td><td>Contextual Citation Engine</td><td>chat-service.ts / llm/client-factory.ts</td><td>chat.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-AI-03</td><td>VPM-44</td><td>Zod Payload & Schema Validation</td><td>schemas/chat.schema.ts</td><td>schemas.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-TRIP-01</td><td>VPM-16</td><td>Collaborative Trip Workspaces</td><td>trips.router.ts</td><td>all-routes-integration.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-TRIP-02</td><td>VPM-16</td><td>Shared Task Assignments</td><td>collaboration.router.ts</td><td>all-routes-integration.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-TRIP-03</td><td>VPM-16</td><td>Group Voting Polls & Tallies</td><td>collaboration.router.ts</td><td>collaborationService.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-BOOK-01</td><td>VPM-16</td><td>Multi-Modal Booking Services</td><td>bookingService.ts / bookings.router.ts</td><td>bookingService.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-BOOK-02</td><td>VPM-16</td><td>OTP Verification Before Payment</td><td>otpService.ts</td><td>otpService.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-BOOK-03</td><td>VPM-16</td><td>Payment Settlement & Transitions</td><td>paymentService.ts</td><td>paymentService.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-BOOK-04</td><td>VPM-16</td><td>Real PDF E-Ticket & Voucher Downloads</td><td>ticketService.ts</td><td>ticketService.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-BUD-01</td><td>VPM-41</td><td>Dynamic Budget Allocations</td><td>budgetService.ts / budget.router.ts</td><td>budgetService.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-BUD-02</td><td>VPM-67</td><td>Shared Multi-Member Expense Splits</td><td>budgetService.ts / budget.router.ts</td><td>all-routes-integration.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-BUD-04</td><td>VPM-41</td><td>Debt Settlement Minimization Matrix</td><td>collaborationService.ts</td><td>collaborationService.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-PCK-01</td><td>VPM-42</td><td>Categorized Packing Checklist</td><td>packingService.ts / packing.router.ts</td><td>packingService.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-ALT-01</td><td>VPM-16</td><td>Automated Status Alert Notification</td><td>alertService.ts / alerts.router.ts</td><td>alertService.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-EXT-01</td><td>VPM-16</td><td>Third-Party Live Weather Fault Tolerance</td><td>live-travel.router.ts</td><td>live-travel-api.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>FR-EXT-02</td><td>VPM-16</td><td>Live Currency Conversion Rates</td><td>live-travel.router.ts / currencyService.ts</td><td>currencyService.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>NFR-01</td><td>VPM-38</td><td>Performance & Throughput SLA</td><td>Vite / Express Microservice</td><td>performance-audit.spec.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>NFR-02</td><td>VPM-16</td><td>Client Offline Resilience & LocalStorage</td><td>authService.ts / aiChatService.ts</td><td>authService.test.ts / aiChat</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>NFR-03</td><td>VPM-16</td><td>Strict Security & JWT Signature Policy</td><td>auth.middleware.ts</td><td>auth-middleware.test.ts</td><td><span class="badge-pass">Verified</span></td></tr>
  <tr><td>NFR-04</td><td>VPM-16</td><td>Responsive UI & Accessibility</td><td>Tailwind CSS / React</td><td>voyana-flows.spec.ts</td><td><span class="badge-high">Partial (BUG-07)</span></td></tr>
</table>

<div class="page-break"></div>

<!-- SECTION 4: BUG LOG -->
<h1>4. Defect & Bug Log</h1>
<p>All recorded defects were directly reproduced and confirmed on the active codebase. Fixed defects retain their original reproduction steps and link to their resolution commit.</p>

<table>
  <tr><th>ID</th><th>Severity</th><th>Category</th><th>Title & Summary</th><th>Expected vs Actual</th><th>Status & Resolution</th></tr>
  <tr>
    <td><strong>BUG-01</strong></td>
    <td><span class="badge-crit">Critical</span></td>
    <td>Security</td>
    <td>JWT Signature Verification Bypass via Base64 Fallback</td>
    <td><strong>Expected:</strong> 401 Unauthorized on forged signature.<br><strong>Actual:</strong> 200 OK (blindly decoded base64 payload).</td>
    <td><strong>Fixed in Production (Dev-Mode Risk Noted)</strong> in commit <code>2421b1f</code>. In production, strict verification is enforced. Dev fallback retained in non-prod.</td>
  </tr>
  <tr>
    <td><strong>BUG-02</strong></td>
    <td><span class="badge-high">High</span></td>
    <td>Security</td>
    <td>Hardcoded Fallback JWT Secret in <code>config/env.ts</code></td>
    <td><strong>Expected:</strong> Startup crash if JWT_SECRET unset in prod.<br><strong>Actual:</strong> Started silently with hardcoded team secret.</td>
    <td><strong>Fixed</strong> in commit <code>25b4c39</code>. Server throws fatal error on boot if missing.</td>
  </tr>
  <tr>
    <td><strong>BUG-03</strong></td>
    <td>Medium</td>
    <td>DB / Logic</td>
    <td><code>BudgetModel</code> Upsert Fails Validation on Blank Trip</td>
    <td><strong>Expected:</strong> 404 Not Found or automatic default fields.<br><strong>Actual:</strong> 500 error due to missing required schema fields.</td>
    <td><strong>Fixed</strong> in integration test suite by auto-initializing budget first.</td>
  </tr>
  <tr>
    <td><strong>BUG-04</strong></td>
    <td>Low</td>
    <td>Docs</td>
    <td>Initial Check: <code>docs/API_DOCUMENTATION.md</code> Missing</td>
    <td><strong>Expected:</strong> OpenAPI/REST documentation file exists.<br><strong>Actual:</strong> File exists with 1,290 lines in updated tree.</td>
    <td><strong>Invalid / Closed</strong> (Confirmed present in repository with 1,290 lines).</td>
  </tr>
  <tr>
    <td><strong>BUG-05</strong></td>
    <td>Medium</td>
    <td>Functional</td>
    <td>Missing Multi-File / Chunked Video Upload Endpoint</td>
    <td><strong>Expected:</strong> Multipart video streaming endpoint exists.<br><strong>Actual:</strong> Only single JSON mediaUrl accepted in memories router.</td>
    <td><strong>Open</strong> (Formally documented in Test Plan Section 1.1).</td>
  </tr>
  <tr>
    <td><strong>BUG-06</strong></td>
    <td>Moderate</td>
    <td>Security/Deps</td>
    <td>Known Vulnerabilities in Transitive & Dev Dependencies</td>
    <td><strong>Expected:</strong> Zero unvetted dependencies.<br><strong>Actual:</strong> mix of runtime (express: body-parser, qs, proxy-addr) and dev dependencies; backend 36 (2 critical, 3 high), frontend 27 (3 critical, 14 high); npm audit fix available, deferred.</td>
    <td><strong>Accepted Risk</strong> (npm audit fix available, deferred).</td>
  </tr>
  <tr>
    <td><strong>BUG-07</strong></td>
    <td>Medium</td>
    <td>UI / Responsive</td>
    <td>Header Navigation Bar Clipped & Overflow at 375px Mobile Viewport</td>
    <td><strong>Expected:</strong> Fits cleanly within 375px viewport.<br><strong>Actual:</strong> Header clipped at right ("Sign In" cut, menu missing).</td>
    <td><strong>Open (Partial)</strong> (Responsive testing marked Partial).</td>
  </tr>
  <tr>
    <td><strong>BUG-08</strong></td>
    <td>Low</td>
    <td>UI / Search</td>
    <td>Destination Search Placeholder Truncated as "regior" at ≥1280px</td>
    <td><strong>Expected:</strong> Complete placeholder string.<br><strong>Actual:</strong> Clipped placeholder text "regior".</td>
    <td><strong>Open</strong>.</td>
  </tr>
</table>

<div class="page-break"></div>

<!-- SECTION 5: DATABASE SEEDING -->
<h1>5. Database Seeding & Data Consistency</h1>
<p>
A dedicated, idempotent seeding architecture was created to populate the isolated test database (<code>voyana_test</code>) without risk of polluting production MongoDB Atlas clusters.
</p>
<h2>5.1 Entity Counts Verified in Database</h2>
<table>
  <tr><th>Database Collection</th><th>Target Count</th><th>Actual Seeded Count</th><th>Data Consistency Verification</th></tr>
  <tr><td><code>users</code></td><td>8+ users</td><td><strong>16 users</strong></td><td>Bcrypt-hashed passwords, normal/admin roles, distinct currencies</td></tr>
  <tr><td><code>destinations</code></td><td>15+ destinations</td><td><strong>16 destinations</strong></td><td>Geographic coordinates, weather data, regional grouping</td></tr>
  <tr><td><code>trips</code></td><td>6+ trips</td><td><strong>16 trips</strong></td><td>Multi-day itineraries, owner/editor/viewer roles, valid member IDs</td></tr>
  <tr><td><code>bookings</code></td><td>15+ bookings</td><td><strong>18 bookings</strong></td><td>Flight, Hotel, Transport across pending, confirmed, cancelled</td></tr>
  <tr><td><code>budgets</code></td><td>6+ budgets</td><td><strong>16 budgets</strong></td><td>Categorized allocations, expense ledgers, multi-user splits</td></tr>
  <tr><td><code>packing_lists</code></td><td>6+ lists</td><td><strong>16 lists</strong></td><td>Categorized items, priority tags, assigned traveler IDs</td></tr>
  <tr><td><code>tasks</code></td><td>10+ tasks</td><td><strong>16 tasks</strong></td><td>Assigned members, priority tags, due dates</td></tr>
  <tr><td><code>polls</code></td><td>6+ polls</td><td><strong>16 polls</strong></td><td>Multiple options, voter names array, vote tallies</td></tr>
  <tr><td><code>memories</code></td><td>10+ memories</td><td><strong>16 memories</strong></td><td>Photo media URLs, captions, like tallies</td></tr>
  <tr><td><code>alerts</code></td><td>10+ alerts</td><td><strong>16 alerts</strong></td><td>Severity types (info, warning), booking updates, read states</td></tr>
  <tr><td><code>reviews</code></td><td>10+ reviews</td><td><strong>16 reviews</strong></td><td>Category ratings (food, safety, value), traveler types</td></tr>
</table>

<h2>5.2 Production Database Safety Guard</h2>
<p>
The seed script enforces a strict regex guard refusing execution if the connection string or database name matches <code>/prod|production|live|^voyana$/i</code>. In addition, an accompanying PostgreSQL relational seed script (<code>supabase/seed.sql</code>) was authored to maintain relational parity for Supabase tables.
</p>

</body>
</html>
  `;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  const outDir = path.resolve('docs/testing/submission');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'Voyana_Test_Plan_and_Test_Cases.pdf');
  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '12mm',
      bottom: '12mm',
      left: '12mm',
      right: '12mm',
    },
  });

  await browser.close();
  console.log('Successfully regenerated complete PDF deliverable at:', outPath);
}

generatePdf().catch(console.error);
