# Google sign-in setup

Voyana uses Google Identity Services and Google's official Node verifier. A Google Cloud Web application OAuth client ID is required; this flow does not need a client secret or Gmail/Drive scopes.

1. Choose the Google Cloud project that should own the application.
2. In Google Auth Platform, configure branding as Voyana and set the owner's support/contact email. Choose the audience deliberately: Internal restricts login to the college organization; External permits accounts outside the college, subject to Google's test/publishing settings.
3. Create a Web application client named `Voyana Local Web`.
4. Register these JavaScript origins: `http://localhost:5173` and `http://127.0.0.1:5173`. Add a deployed HTTPS origin only when it exists. Popup ID-token login does not require a redirect URI.
5. Set `GOOGLE_CLIENT_ID=<the client ID>` in `services/ai-service/.env`, and set `FRONTEND_ORIGINS` to the same exact frontend origins. Restart the backend.
6. Open `/#/login` and use the official Continue with Google button. The user completes Google's account-selection/sign-in interface.

The API issues a five-minute origin-bound nonce challenge. It verifies Google's signature, audience, issuer and expiry through `google-auth-library`, then checks email verification and the nonce. A challenge can complete once. The Google subject is stored separately from email. New accounts receive traveler access; existing account roles are preserved. Linking an existing email/password account requires an authoritative Gmail/Workspace identity. No client-provided role is accepted.

Changing the Google account does not switch roles inside an active Voyana session: sign out first. The SDK uses explicit account selection rather than automatic sign-in.

Tests mock the provider only in the regression fixtures; normal application code never accepts fake Google tokens. Run `node scripts/google-login-ui-test.mjs` for callback/session UI coverage and `npm test --prefix services/ai-service` for server checks. A real account sign-in remains a manual verification step after provisioning the client.

Official documentation: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token and https://developers.google.com/identity/gsi/web/reference/js-reference.

## Local registration

The owner approved creation of `Voyana Local Web` in the college-owned Google Cloud project `voyana-513104`. The public client ID is configured in the ignored backend `.env` file. Both localhost:5173 and 127.0.0.1:5173 are registered origins. The backend reports Google login enabled and issues sign-in challenges. Keep deployment origins synchronized in both Google Cloud and `FRONTEND_ORIGINS`.

The real Google Identity Services SDK now renders its Continue with Google control with this registration. Completing Google account selection and validating a real returned credential is a user-driven check; automated callback tests use a controlled provider fixture. Newly created client settings may need time to propagate through Google.

The configured audience is External with publishing status Testing. This implementation requests basic identity only; Google documents an exception to the test-user allowlist for Sign in with Google: https://support.google.com/cloud/answer/15549945. College administrator account restrictions can still apply.

Live verification: on 29 October 2026 the owner completed Google account selection in the normal browser and reported successful sign-in to Voyana. An isolated headless Edge SDK request still reported an origin-recognition error during immediate post-creation checks; Google client propagation or browser context may affect that isolated request. Both registered origins are documented above.
