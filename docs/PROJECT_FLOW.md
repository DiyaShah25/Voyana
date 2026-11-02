# Voyana project flow

Tagline: **trip pe aana**. Current behavior, verified 30 October 2026.

## Account and trip mode

Sign in with Google or email/password. A user can take solo trips and lead or join group trips with the same account. Solo/group is chosen for each trip; it does not change the account role in the profile. Every booking entry asks **Solo traveler** or **Group traveler**. Booking buttons inside a trip dashboard already use that trip's mode.

## Solo journey

1. Choose a destination in search or on the globe. Geography uses the selected coordinates.
2. Open flights, hotels, trains/buses/cabs or a bundle, then choose **Solo traveler**.
3. Search inventory for the selected destination. Choose traveler details and quantities.
4. Review the INR price and open Razorpay Test Mode checkout. The backend recalculates prices and creates the order.
5. Only a verified, captured payment confirms a reservation. Closing or failing checkout does not confirm it.
6. The private trip workspace contains the confirmed itinerary and personal expense tracker. A solo trip can also be created from Workspace before booking.
7. After the trip, its owner marks it completed and uploads photos for AI travel memories.

## Group journey

1. Open **Workspace** anywhere and choose **Group traveler**. The creator becomes the single booking leader.
2. Invite people by account email. A group can start with an undecided destination. Members can chat, manage tasks, vote and ask VoyaBot for suggestions before booking.
3. The leader selects the canonical destination and dates in **Trip dashboard**. An undecided group cannot book.
4. The leader books from the dashboard, or selects **Group traveler** and that workspace at a booking entry. The server checks the leader, mode, destination and trip state before creating a payment order.
5. Payment confirmation attaches to the same group workspace. It preserves members and discussions and adds one itinerary entry and one expense. Every member can view group reservations. Only the leader can book or cancel them.
6. Editor members can add, edit and delete manual expenses. The dashboard syncs every five seconds; account notifications report changes. Booking charges cannot be manually changed independently of the reservation.
7. The leader marks the trip completed. Members then contribute photos to the group's AI memories, within one shared 50-photo quota.

## Invitations and notifications

Email delivery uses the backend Resend adapter. Set `RESEND_API_KEY`, a verified `INVITATION_FROM` sender and `PUBLIC_APP_URL` in the ignored backend environment. Without a sender, invitations are stored as **pending** and a share link is available. The app never claims an email was sent when it was not. People sign in using the invited email to see the group.

Bookings, cancellation, invitations, plan changes, expenses, completion, photo uploads and AI readiness create trip-member notifications. The header polls the signed-in account's alerts every five seconds and shows new items as toasts. Data and notifications are scoped to the authenticated account.

## AI travel memories

- A completed, booked trip is required before uploading photos.
- Upload JPEG, PNG or WebP files. The browser resizes them to JPEG; the backend stores protected photo data in MongoDB.
- The limit is **50 photos for the whole trip**, whether solo or group. The backend reserves slots atomically, including simultaneous uploads.
- Users supply photos rather than writing captions. **Generate AI travel memories** sends photos to the configured vision model, saves captions and generates a journal from those observations and trip facts.
- The app reports progress and errors, preserves photos for retry, and notifies members when ready. A browser can close while generation continues on the running backend. Interrupted backend jobs can be retried after their 15-minute lease expires.

## Access boundaries

| Action | Solo owner / group leader | Group editor | Viewer / outsider |
| --- | --- | --- | --- |
| Choose trip destination / dates | Yes | No | No |
| Book or cancel for the trip | Yes | No | No |
| Read shared reservations | Yes | Yes | Viewer only |
| Chat, polls and AI suggestions | Group leader | Yes | No writes |
| Change manual expenses | Yes, after booking | Yes, after booking | No |
| Mark completed | Yes, after booking | No | No |
| Upload photos / generate journal | Yes, after completion | Yes, after completion | No writes |

Membership and leader checks happen on the server. Solo trips reject group invitations. Ordinary members cannot gain booking authority by changing browser fields or profile roles.

## Services and storage

- `src/App.tsx`: authentication, destination context, booking-mode choice and navigation.
- `src/components/Trips/`: workspace discovery, collaboration and trip dashboard.
- `services/ai-service/src/routes/trips.router.ts`: trip creation, membership and itinerary.
- `services/ai-service/src/routes/journeys.router.ts`: plan, completion, invitations, AI suggestions, photos and journal jobs.
- `services/ai-service/src/routes/payments.router.ts`: trusted quotes, orders and payment verification.
- `services/ai-service/src/routes/budget.router.ts`: shared expenses and notifications.
- `services/ai-service/src/services/booking-workspace.service.ts`: reservation/workspace/itinerary/expense linkage.
- `services/ai-service/src/services/journey-ai.service.ts`: image captions and journal generation.

MongoDB holds trips, reservations, payment intents, budgets, chat, invitations, protected photos and alerts. Booking inventory is sample data; Razorpay uses test money. No real supplier ticket or hotel reservation is issued.

See [solo/group details](SOLO_AND_GROUP_TRIPS.md), [Razorpay setup](RAZORPAY_TEST_MODE.md), and [verification](VERIFICATION.md). GitHub push requires the owner's approval.


## Booking presentation and pricing update (2 November 2026)

Each booking service uses a matching local category image or vehicle illustration. These are representative visuals, not supplier/property photos. Packages expose origin, travel date, tier, travelers, rooms and nights, with a visible quantity breakdown and a matching server quote. A package car rental covers the selected stay's rental days. Sample fares vary by route/date/class instead of using one fixed fallback amount. The catalogs and `catalog/pricing.ts` are shared by frontend and backend. See `VERIFICATION.md` for the browser and payment-order checks.


## Click-to-select globe names (2 November 2026)

Clicking the globe reverse-resolves the picked point, automatically selects its destination and fills the search field with its place-name hierarchy. The globe label and selected-place card show city, state/region and country rather than coordinates. Coordinates remain internal for marker placement. Pending lookups do not save temporary destinations, and old responses are cancelled when a new place is selected. Known cities resolve locally; other points use the cached, rate-limited Photon proxy. When detailed lookup is unavailable, local country outlines provide a coarse country label. Open water or unmapped points are identified without inventing cities and cannot start a booking.


### Booking progress and group screen visibility

Starting checkout saves an unpaid order. My Bookings and the selected group dashboard show it as **Pending payment**, with the service name (Flight, Train, Bus, Hotel or other transport). Verified payment replaces that entry with **Booked**. Pending entries do not create a paid reservation, voucher, itinerary expense or access to post-booking features. Closing checkout leaves an unpaid pending order; no ticket has been issued. Start checkout again with the same selection to retry. Razorpay Test Mode creates project test reservations.

My Bookings refreshes every five seconds while open and supports status filters. Group members can see their leader's pending and confirmed reservations; solo orders remain private. Booking and payment status come from the server.

The traveler selector scrolls within the viewport, uses explicit readable text colors, and offers loading/retry feedback for groups. Workspace booking flags are fetched in one query instead of one per trip. Workspace tabs scroll horizontally, while the main content scrolls vertically; booking actions wrap on narrow screens.
