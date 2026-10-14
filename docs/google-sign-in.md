# Enable Google login and signup

TaskFlow uses Google Identity Services: the Google button returns an ID token, the API verifies it with Google's library and the configured audience, and TaskFlow issues its own HttpOnly session cookie. The same endpoint signs in existing Google identities or creates a new account. Google API access tokens and client secrets are not needed for this authentication flow.

1. Open the [Google Auth Platform clients page](https://console.cloud.google.com/auth/clients), select your project, and configure the application branding and audience. If your application is restricted to test users, add the Google accounts that will test it.
2. Create an OAuth client with application type **Web application**.
3. Under **Authorized JavaScript origins**, add `http://localhost` and `http://localhost:5173` for local development. Add the exact HTTPS frontend origin for production. Use localhost in your browser when testing these settings. This app uses a popup/JavaScript callback, so it does not need an authorized redirect URI for Google sign-in.
4. Set the same client ID in `server/.env` as `GOOGLE_CLIENT_ID` and `client/.env` as `VITE_GOOGLE_CLIENT_ID`. The value ends in `.apps.googleusercontent.com`. Leave these blank to disable Google sign-in; placeholder IDs cannot enable it.
5. Restart `npm run dev` after changing configuration. For production, rebuild the frontend after setting its Vite variable, then restart the API with the matching ID.
6. Visit `/register` or `/login` and use the Google button. A first signup with incomplete provider names opens Account settings. Returning users retain the same account. Refresh the browser to verify session restoration, then sign out and verify access is revoked.

Use a Google account without an existing password account for first-time signup testing. If the email is already registered with a password, TaskFlow requires signing in that way and explicitly linking Google in Account settings. It deliberately does not merge accounts just because an email matches. Disabled accounts cannot sign in.

Troubleshooting:

- No button: check both client IDs, restart Vite, and check for script blockers.
- `origin_mismatch`: authorize the exact frontend scheme, host, and port in the Web client configuration.
- API verification failure: client and server IDs must match; expired, invalid, or wrong-audience credentials are rejected.
- Popup communication failures with FedCM disabled: the frontend host must permit Google popups; do not enforce a restrictive cross-origin opener policy. Configure `Cross-Origin-Opener-Policy: same-origin-allow-popups` where needed.
- CSP restrictions: permit Google's Identity Services script, frame, style, and connection origins. The provided nginx template already includes these origins.

Automated tests cover identity provisioning, explicit linking boundaries, verification failures, and audience selection with mocked Google verification. A real Google-account end-to-end test requires an authorized client ID and interactive Google sign-in; mocked tests do not validate your Google Console configuration.

References: [Google setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) and [server-side ID-token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
