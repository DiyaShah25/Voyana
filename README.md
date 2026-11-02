# Voyana

A collaborative travel-planning demo built with React, TypeScript, Vite, Express, and MongoDB.

Start with [the project flow](docs/PROJECT_FLOW.md) and [verification results](docs/VERIFICATION.md). Older documents in `docs/` contain historical designs and planned integrations.

## Run locally

Use Node.js 22 and npm.

```sh
npm ci
npm ci --prefix services/ai-service
```

Copy `.env.example` to `.env`, and `services/ai-service/.env.example` to `services/ai-service/.env`. Set `MONGODB_URI`, `MONGODB_DB_NAME`, and a private `JWT_SECRET` in the backend file. MongoDB may be local or Atlas.

```sh
npm run dev
```

Open http://localhost:5173. The API listens on http://localhost:3001. `npm run dev:client` and `npm run dev:server` start each process separately.

For the optional demo data, set `SEED_ON_START=true` for one backend start, then set it back to false. Normal startup does not modify seeded data. Use `LLM_PROVIDER=mock` for deterministic AI without an external key, or configure Groq in the backend environment.

## Current features

- Destination discovery and a texture-aligned globe with precise coordinate focus.
- Email/password accounts, Google Identity Services integration, and profile updates. Google login requires a registered Web client ID; see [Google setup](docs/GOOGLE_SIGN_IN.md).
- Destination-locked bookings that create a workspace, itinerary entry and shared expense after confirmation.
- Solo and group journeys, with leader-only group booking and pre-booking chat, tasks and polls.
- Shared expense tracking with member notifications, plus trip-specific budgets and packing.
- AI photo captions and travel journals after trip completion, with a shared 50-photo limit.
- Email invitations with honest pending/sent delivery status; an email sender must be configured.
- Flight, hotel, transport and bundle checkout with INR pricing, a demo OTP confirmation, shared reservations and notifications. No PAN, gateway account or SMS setup is needed. See [demo payments](docs/DEMO_PAYMENTS.md).
- VoyaBot with selected-trip context and local fallback responses.

Bookings, payment methods, tickets, refunds, weather, and currency conversion are demonstrations. OAuth and password-reset delivery need an external provider. Shared documents are local records. Booked-trip access and reservation ownership are enforced by the API. Concurrent editing and production integrations need further work. See the flow guide for exact boundaries.

## Check the project

```sh
npm run typecheck
npm run build
npm run build --prefix services/ai-service
npm test --prefix services/ai-service
npm run test:smoke
npm run test:ui
npm run lint
```

Backend integration tests require MongoDB and use the separate `voyana_test` database. Database-free backend tests can run with:

```sh
npm test --prefix services/ai-service -- --testPathIgnorePatterns=mongodb-api
```

Browser tests require both development servers running and Edge on Windows. They create isolated test accounts and do not require seeded login credentials. On other systems install Playwright Chromium using `npx playwright install chromium`. Set `VOYANA_URL` for a different frontend URL and `PLAYWRIGHT_CHANNEL` to select another installed browser.

`test:smoke` exercises flight, hotel, transport and bundle reservations plus trip activities, shared expenses, packing and cancellation. `test:ui` checks globe geography, the before/after booking interface, actual flight checkout, destination switching, mobile overflow and API role restrictions. Test records may remain as audit history; use a development database with test data.

For isolated browser tests, start the backend with `NODE_ENV=test`, `PORT=3101`, and `SEED_ON_START=false`, and start Vite on port 5174 with `VITE_API_URL=http://127.0.0.1:3101/api`. Set `VOYANA_URL=http://127.0.0.1:5174` when running browser checks. The API tests automatically use `voyana_test`.

GitHub CI builds both applications and runs database-free backend tests. See the verification report for current results and remaining warnings.

## Structure

```text
src/App.tsx                Page composition and one active service modal
src/components/            Feature screens
src/services/              Domain logic, one API client, shared planning context
src/context/               Authentication provider
services/ai-service/src/    Express API, validation, Mongoose models, AI providers
scripts/                   Combined development launcher and browser checks
docs/PROJECT_FLOW.md        Current user and data flow
docs/VERIFICATION.md        Tests, changes, and remaining work
supabase/                  Legacy optional schema migrations
```

Environment files, dependencies, builds, and local verification reports are excluded from Git. Keep provider keys in environment files. Existing project authorship and educational-use terms are retained.

For Razorpay Test Mode, follow [the setup guide](docs/RAZORPAY_TEST_MODE.md). The local configuration selects Razorpay; test API keys are still required.

See [solo and group trip flow](docs/SOLO_AND_GROUP_TRIPS.md) for roles, email setup, photo storage and AI generation.
