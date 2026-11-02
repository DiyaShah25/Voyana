# Solo and group journeys

Voyana keeps one signed-in account. Solo and group are choices for each trip, not profile roles that a user can change to gain permissions.

## Solo

Choose a destination on the globe, choose a booking service, and select **Solo traveler**. Flights, hotels, trains, buses and cabs keep that destination. A verified payment confirms the reservation and creates the private trip workspace, itinerary and personal expense ledger. Alternatively, create a solo trip in Workspace first and book from its dashboard. Only its owner can access it.

## Group

Create a **Group traveler** workspace. Its creator is the leader. Invite people by email, discuss destinations in Group Chat, vote and ask VoyaBot for suggestions. The leader chooses the destination and dates in the trip dashboard. Only the leader can start checkout, change the destination or complete the trip. Group members can view reservations and collaborate; they cannot book using the group ID. Solo booking outside a group remains a separate personal trip.

Every checkout carries the selected trip ID and mode. The server checks ownership, destination and completion state before creating a payment order and before confirming it. Group bookings reuse the group's existing workspace, members and chat.

## Invitations

Invitations grant access to the signed-in account with the invited email. The app uses a backend Resend adapter for delivery. Configure `RESEND_API_KEY`, a verified `INVITATION_FROM` sender and `PUBLIC_APP_URL` in `services/ai-service/.env`. The provider key remains server-side. If no sender is configured, invitations are saved as **pending**, and the UI provides a link to share directly. The app does not claim that an email was sent. Sending to arbitrary group members needs a sender/domain allowed by the email provider.

## Expenses and notifications

After booking, everyone with editor membership can add, edit or delete manual expenses. Booking expenses remain linked to the reservation, and cannot be edited or removed independently. Amounts use INR. The dashboard refreshes every five seconds; changes create account notifications for the trip's members. Read-only viewers cannot mutate trip data. Booking confirmation/cancellation, invitations, plan updates, completion, photos and AI journal readiness also create notifications.

## Photo memories

After the owner/leader marks a paid trip complete, members can upload JPEG, PNG or WebP files. The browser resizes them to JPEG and removes source-file metadata. One atomic limit allows **50 photos per trip**, including all members' uploads. Photos are stored in MongoDB, and API access requires trip membership. There are no public image URLs.

Users upload photos rather than authoring titles/captions. Clicking **Generate AI travel memories** sends the resized photos to the configured Groq vision model in batches, stores factual captions, and asks the text model to create a journal. The default vision model is configurable with `GROQ_VISION_MODEL`. Failures keep uploaded photos and provide a retry; the app does not replace provider failures with a fabricated success. An in-progress generation has a 15-minute recovery window before retry, including after a server interruption. Generation continues when the browser is closed while the backend stays running.

## Payment

Razorpay Test Mode uses server-created INR orders, signature verification and a captured-payment lookup. Test keys belong only in the ignored backend environment. Mock OTP payment remains available for isolated automated tests; it is a separate provider, and is not Razorpay.

## Validation

`journey-flow.test.ts` covers leader permissions, group reservation linkage, solo privacy, pending invitations, expense notification fan-out, completion gates, simultaneous uploads at the 50-photo boundary and the AI provider contract. `scripts/journey-ui-test.mjs` drives two browser sessions through group creation, member chat, booking, shared expenses and photo upload. External payment and AI verification results are recorded separately in `VERIFICATION.md`.
