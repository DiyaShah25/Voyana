# Razorpay Test Mode

The local app selects `PAYMENT_PROVIDER=razorpay`, and the supplied Test Mode credentials are now configured in the ignored backend environment. A real test order and hosted checkout opening were verified. On a fresh checkout, valid Test Mode credentials are required. The previous Voyana demo OTP screen is not used in this mode.

## Dashboard setup

1. Open https://dashboard.razorpay.com/ and sign in yourself.
2. Select **Test Mode** in the dashboard mode selector.
3. Open **Account & Settings → API Keys** under Website and app settings.
4. Generate a Test Mode key pair. Add its values directly to `services/ai-service/.env`:

```dotenv
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_secret
```

These are placeholders, not working credentials. Do not put the secret in frontend `VITE_` variables, chat or Git. The backend environment file is ignored by Git. Restart the backend after adding keys.

5. Enable automatic payment capture in the Razorpay Test Mode payment capture settings. Voyana only confirms a booking after Razorpay reports the payment as captured.
6. Select a destination, choose a booking, and click **Pay with Razorpay**. The official hosted checkout opens with INR and the server-created order. Complete a test payment using Razorpay's supported test payment details and simulated bank success screen. No real money is charged.
7. Check the Test Mode dashboard for the order and payment, and Voyana for exactly one booking, itinerary activity and expense. Test cancellation, failed checkout and closing the checkout as well.

Voyana rejects live keys, recalculates prices on the server, verifies the Razorpay payment signature, and fetches the payment to check order, amount, INR currency and captured state. A browser success callback alone cannot confirm a booking.

Account onboarding requirements are controlled by Razorpay. If your dashboard blocks access, share the wording of the message without personal details or credentials.

## Verification status

The adapter and payment boundary have automated tests with mocked Razorpay responses. On 30 October 2026 the configured account accepted a ₹1 test order, and the official hosted checkout opened from a Voyana booking order. Opening an unpaid checkout did not confirm a booking. A captured transaction through the hosted browser flow still needs a manual test; it is not claimed as completed by the opening check.

## Official references

- API keys: https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/
- Standard Checkout integration and test payment instructions: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
