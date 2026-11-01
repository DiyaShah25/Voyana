## Publication preparation — 2026-11-02

- Publishable files and the saved local October 27 commit were checked against configured credentials and common private-key/token formats. No current credentials were found. Backend `.env` files and `.artifacts` stay ignored.
- Removed the previously shared JWT signing default from application configuration and documentation. Configure a private `JWT_SECRET` outside tests; the local secret was rotated.
- GitHub Actions now provisions MongoDB 7 and runs the complete backend suite, including database-backed journey and booking tests. Production frontend and backend builds are also checked.
- The accumulated features and fixes are committed as the verified current project snapshot. Existing remote commits keep their original authors and dates; new commits use the actual author and date.

## Booking statuses and group visibility — 2026-11-02

- Backend: 97 tests passed in 12 suites (`.artifacts/booking-status-all-tests.log`). Includes real database pending-to-booked transitions, group member visibility, solo privacy, and payment verification boundaries. Flight/train/bus projection cases preserve the transport type.
- Builds: frontend typecheck, production frontend build and backend TypeScript build passed (`.artifacts/booking-status-check.log`).
- Lint: zero errors, 10 existing warnings (`.artifacts/booking-status-lint.json`).
- Browser coverage: real account and group creation; group selector at 320×568, 844×390 and 1440×1000; mobile workspace; pending/booked labels for flights, trains and buses, status filtering and pending voucher restrictions. Booking display uses explicit response fixtures; captured-payment transition is verified separately by the backend integration tests. Screenshots/log: `.artifacts/booking-status-ui.log`, `group-traveler-readable.png`, `booking-statuses.png`, `group-workspace-mobile.png`.
- No live payment or real travel ticket was issued. Nothing pushed to GitHub.

# Verification and change report

Verified locally on 2 November 2026. This report describes the revised destination-first workflow.

## Results

| Check | Result |
| --- | --- |
| Frontend TypeScript | Passed |
| Frontend production build | Passed |
| Backend production build | Passed |
| ESLint source checks | Zero errors; ten development warnings |
| Backend automated tests | 94 passed across eleven suites |
| Browser destination flow | Passed: globe geography, checkout, destination isolation and mobile layout |
| Service integration smoke | Passed: flight, hotel, transport and bundle reservations through demo OTP, cancellation, activities, expenses and packing |
| Private GitHub repository | Created as `vyasmanav/Voyana` |
| GitHub push | Not performed; requires the owner's explicit approval |

The main JavaScript bundle still triggers Vite's size warning because of the globe and supporting libraries. Feature dialogs load on demand. Lint warnings concern Fast Refresh exports and existing hook dependency patterns. This verification is not a full production security audit or load test.

## Globe and search

- Fixed the 90-degree mismatch between geographic vectors and the Earth texture's UV coordinates.
- Focus now rotates the searched point to the camera-facing center. Dragging cancels focus correctly.
- Verified Ahmedabad at 23.0225 N, 72.5714 E in the rendered globe.
- Independently compared seven positions across hemispheres with Three.js SphereGeometry texture coordinates, inverse conversion and focus rotation.
- Exact seeded-city searches resolve locally. Empty and unresolved searches show feedback; there is no default Paris selection.
- Resized the globe to fit the page and added an external map link for checking the selected coordinates.

## Connected booking flow

The selected destination drives available flight arrivals, hotels, transport and bundle items. Booking screens lock the destination. Unknown hotel locations return no inventory; transport cannot retain unrelated routes. Bundle checkout validates every item against the selected destination.

One authenticated server service saves the reservation, creates or reuses the account's destination workspace, and records one itinerary activity plus one shared expense. Confirmation requires server persistence. Repeating a reference does not duplicate those records. Payment-backed reservations require cancellation and rebooking for fare, date or quantity changes; contact details remain editable. Historical simulated records retain their legacy modification behavior.

Workspace, expense, packing and memories controls appear only after a confirmed booking for the selected destination. Choosing another city hides unrelated tools. Returning to a booked city restores its workspace. Cancelling its last confirmed booking locks those tools again. Historical expenses remain for audit and need explicit refund accounting.

Inviting a collaborator now uses the protected member endpoint, checks persistence and adds the member to the budget roster. Viewer workspaces show read-only controls.

## Role and resource checks

Tests reject forged/expired sessions, all profile role changes, non-admin user-directory access, unauthenticated trip and booking access, destination mismatches, unpaid booking confirmation, cross-account trip/budget/chat/memory reads, cross-account reservation changes, and cross-account alert changes. Invited viewers can read but cannot write or invite others. Shared links require verified membership.

## Browser evidence

`scripts/destination-flow-test.mjs` drives the real UI: search Ahmedabad, check the globe, create an isolated account, verify pre-booking restrictions, search flights to AMD, fill passenger details, reject an incorrect demo OTP and then confirm the correct code, verify one persisted expense and group chat message, switch to Paris and back, inspect mobile overflow and open the workspace. No uncaught browser errors occurred.

`scripts/smoke-test.mjs` exercises all four booking types, OTP payment confirmation and cancellation, trip activities and completion, shared expenses, packing persistence, destination cache isolation, cancellation and a single VoyaBot instance. Browser test history can remain in the test database; it is not production data.

## Remaining boundaries

Supplier inventory, payments, refunds, tickets and currency conversion are demonstrations. No real flight/hotel/transport reservation or charge is made. Google OAuth is configured locally and owner-verified; password-reset delivery still needs provider configuration. Member records do not send invitations by email, and document records remain local. Concurrent-edit conflict handling, transactional recovery for multi-document writes, production uploads, provider integration and dependency hardening remain deployment work.

Earlier dependency updates reduced the root audit count from 22 to six reported advisories; those six are not claimed resolved by this change.

## Google login and globe follow-up (29 October 2026)

- Replaced the unsupported social-login placeholder with Google Identity Services and a server-side ID-token/session exchange using Google's official library.
- Added origin-bound expiring challenges, nonce/replay checks, stable Google subject storage and fixed-role account mapping. Provider credentials and roles are never trusted from the browser.
- Full backend run: 56 tests passed in seven suites. Google UI callback/session adoption/sign-out passed with an explicitly mocked provider. The approved Google Cloud client is now created and configured locally; the real SDK control renders. The owner completed real Google sign-in in the normal browser and confirmed success on 29 October 2026. The isolated headless SDK check reported an origin-recognition warning during client provisioning; the live browser confirmation and mocked automated tests are recorded separately.
- Corrected camera focus to preserve geographic north as screen up. Reduced the marker/ring size so small islands are visible, softened map shading/clouds and reduced the city-click snap distance from five degrees to 0.35 degrees.
- Bali search, quick selection and the destination card passed with identical coordinates (-8.4095, 115.1889). Seven north-up orientation cases passed across hemispheres and the date line.
- Both builds passed. ESLint has zero errors and ten existing development warnings.

## Demo OTP checkout, INR and account-page refresh

The owner clarified that this is a dummy payment flow: no PAN/KYC, Razorpay account, bank details, SMS delivery or real charge is required. `PAYMENT_PROVIDER=demo` is now the default. The optional real Razorpay Test Mode adapter remains disabled.

The backend creates an authoritative INR quote from shared sample catalogs, issues an on-screen six-digit demo OTP, and confirms one reservation/workspace/expense only after OTP verification. Tests cover incorrect codes, five-attempt throttling, expiry, idempotent retries, paise amounts, quote tampering and simulated cancellation. Flight passenger pricing is applied once. Paid reservations use cancel/rebook for fare or date changes. Old records retain their original currency; all new sample inventory, planning defaults and payments use INR.

Full backend verification passed: **71 tests in nine suites**. The browser completed a flight checkout with an incorrect-code rejection followed by successful demo confirmation and INR ledger persistence. The service smoke test completed flight, hotel, transport and bundle confirmations through their OTP dialogs, plus cancellation, packing and shared-expense checks.

Google login and signup now show a prominent styled card with the official pill-shaped Google button, security copy and responsive sizing. Desktop and mobile previews were captured and reviewed. Both production builds passed; source lint has zero errors. See [demo payment flow](DEMO_PAYMENTS.md).


## Workspace planning follow-up (30 October 2026)

Changed the brand tagline to “trip pe aana”. Header, footer and planning section open a signed-in workspace list without requiring a selected destination or booking. New private planning groups support invitations, persistent chat, tasks and polls. Budget/expense and memories APIs still require a confirmed reservation. New chats start empty, save messages on the server and refresh every five seconds. Backend regression: 73 tests passed in nine suites. The browser created an undecided-destination workspace and confirmed chat persistence after reload. Both production builds and TypeScript passed.


## Solo/group lifecycle and Razorpay (30 October 2026)

- Final complete backend run: **83 tests passed in ten suites**. Frontend TypeScript, both production builds and source lint passed (zero lint errors; ten existing development warnings).
- Solo browser flow passed through the mode selector, destination-locked flight checkout, expense persistence, role protection and mobile layout.
- Two browser accounts created a group, saved a pending-email invitation, exchanged chat, confirmed a leader booking into the original workspace, shared an expense and observed its notification toast on the other account. Trip completion and photo upload passed.
- The configured Groq account's real vision model generated photo captions and a journal from a synthetic uploaded test image. This is recorded separately from mocked AI contract tests. A transient provider rejection led to retry support; the subsequent real run passed.
- The backend enforces a shared 50-photo quota, including simultaneous uploads at the boundary. Completed-trip and membership requirements are tested. Group members cannot create payment orders or cancel the leader's booking.
- Supplied Razorpay test credentials were saved only in the ignored backend environment. Authentication succeeded and a ₹1 test order was created through Razorpay's API. The official hosted checkout opened with a server-created INR booking order; an unpaid checkout created no booking. A completed captured transaction in Razorpay's hosted browser flow has not been claimed as verified; signature/capture verification is covered by gateway boundary tests.
- Actual invitation email delivery is pending: no email-service account or sender credentials were supplied. The app saves invitations, grants invited account access and exposes share links with explicit pending delivery status.
- A secret scan found no Razorpay secret in tracked or unignored files. Nothing was pushed to GitHub.


## Booking images and configurable prices (2 November 2026)

Replaced remote booking thumbnails with locally stored, category-specific images. Hotel bedrooms, resorts, passenger trains, coaches, sedans, SUVs and flights have distinct visuals. Passenger vans use a local vector illustration. Images are labelled representative, rather than being presented as photographs of the named supplier/property. City hotels no longer receive tropical resort photos merely because they have a pool. Photo sources are listed in `public/images/booking/SOURCES.md`.

Removed the flat ₹4,400 generated train fare and fixed the fallback that could return a car as a train. Browser and server share deterministic sample pricing by route, service, travel date and class. Filtered inventory remains retrievable in the full inventory for checkout. Hotel prices respect room type, rooms and nights. Unknown flight-route estimates use distance, with class and date factors. Flight timestamps use UTC consistently.

Travel packages now let the traveler choose the departure airport, date, tier, traveler count, room count and nights. Every item shows its quantity calculation. Rental cars in a package charge for the selected rental days. Package savings and the demo service charge are itemized, and the server re-quotes all selected choices before creating the payment order.

Verification: the full backend run passed 87 tests in ten suites. After the rental-day adjustment, all 15 affected pricing/payment tests passed, including the additional rental-day test. Both builds passed. Source lint has zero errors and ten existing warnings. The browser loaded local photos on hotel, flight, train and car screens, changed package nights/travelers/rooms/tier, checked mobile overflow and verified that the Razorpay order amount exactly matched the displayed package total. No payment was captured by that check. Prices remain sample estimates, not live supplier quotes.


## Globe clicks select named places (2 November 2026)

Globe clicks now resolve the actual picked point to a name and automatically update the search field. The selected-place card shows City, State/Region and Country; raw coordinate labels were removed from it and the floating marker. Typed search, destination cards and quick selections use the same search display. Legacy coordinate-only selections are resolved again rather than shown as numeric destination names.

The backend uses a cached, rate-limited Photon proxy, with a local Natural Earth country fallback. It does not fabricate a nearby city for open water or unmapped areas. Unknown regions cannot open city booking services. Live lookup of a non-seeded Jaipur point returned city, Rajasthan and India successfully. Public provider availability still affects detailed names; coarse country lookup works locally.

Final backend run: **94 tests passed in eleven suites**. Both builds passed, with zero lint errors and ten existing development warnings. Physical-pointer browser tests passed for selecting Ahmedabad and a non-seeded point, preserving the clicked coordinates internally, synchronizing the search bar, displaying city/state/country, cancelling stale lookups, hiding coordinate text, open-water handling and mobile width. Automated remote-response fixtures are separate from the real provider probe. Existing Bali search/card/quick-selection and seven-position globe geometry checks also passed.
