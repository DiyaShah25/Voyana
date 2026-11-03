# Demo OTP payments and INR

The default checkout is a project demonstration. It does not require Razorpay registration, PAN/KYC, a bank account, SMS credentials or a card. No actual money moves.

## User flow

1. Select a destination and choose a flight, hotel, transfer or bundle.
2. Review its price in Indian rupees (INR).
3. Click **Continue to OTP**. The server calculates the amount from the shared sample catalog and creates a demo order.
4. Enter the displayed six-digit demo OTP, or use **Use code**, then click **Confirm demo payment**.
5. The server checks the OTP and saves one reservation, destination workspace, itinerary entry and expense. The confirmation reference starts with `VOY-DEMO-`.
6. Cancellation records a simulated refund. It does not call a bank or Razorpay.

The OTP is intentionally displayed for the classroom/project demo. No SMS is sent. Codes expire after five minutes; a new code can be requested after thirty seconds. Five incorrect attempts lock that code. Repeating a successful confirmation or retrying the same recent checkout reuses the reservation instead of duplicating it.

## Configuration

`PAYMENT_PROVIDER=demo` is the backend default and is documented in `.env.example`. No payment keys are needed. The optional Razorpay Test Mode adapter is retained for future use but is inactive in the default demo. It requires explicit `PAYMENT_PROVIDER=razorpay` and test keys. Live keys are rejected.

## Pricing and currency

The client and server share pure sample catalogs in `services/ai-service/src/catalog/`. Prices are native INR sample prices, not real-time supplier prices or foreign-exchange quotes. The backend recalculates quantity, room-night totals and bundle discounts; browser totals cannot override the quote. Flight passenger quantities are applied once.

New account/planning defaults and new reservations use INR. Existing saved records retain their original currency rather than being relabelled as rupees. New INR workspaces are separate from older workspaces in another currency. Paid reservations require cancellation and rebooking for fare/date/guest changes.

## Main files

- `src/components/Payment/PaymentModal.tsx`: order summary and checkout entry.
- `src/components/Payment/DemoOtpCheckout.tsx`: OTP dialog, code entry, resend and error states.
- `src/services/paymentService.ts`: checkout orchestration.
- `services/ai-service/src/routes/payments.router.ts`: quote/order, OTP confirmation and optional Razorpay verification.
- `services/ai-service/src/services/reservation-quote.service.ts`: authoritative catalog pricing.
- `services/ai-service/src/db/models/payment-intent.model.ts`: order, OTP expiry/attempts and completion state.

Run `npm test --prefix services/ai-service`, `npm run test:ui`, and `npm run test:smoke` with the development servers running. Browser checks create isolated test accounts and retain some demo audit history.
