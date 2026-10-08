# Authentication and deployment

TaskFlow uses opaque, database-backed sessions. Only a SHA-256 digest of each random 256-bit token is stored. Browser credentials live in a host-only HttpOnly cookie, Secure in production, with SameSite=Lax. Sessions have an absolute lifetime configured by SESSION_TTL_HOURS (default seven days); expiry is checked independently of MongoDB TTL cleanup.

Deploy the UI and API on the same site (for example app.example.com and api.example.com), over HTTPS. Cross-site hosting is intentionally unsupported by the Lax cookie policy. CORS_ORIGINS must contain exact trusted UI origins; unsafe API requests require that Origin plus X-TaskFlow-Client: web. Do not add wildcard origins. Cookies also authenticate sockets, whose handshakes enforce the origin allowlist.

GET /auth/me restores browser identity. POST /auth/logout revokes the current session; POST /auth/logout-all revokes all sessions for the current account. Both disconnect associated sockets immediately on the current server. Sockets also enforce absolute expiry and recheck account/session status every 15 seconds. A database failure closes the socket rather than extending access. Account disabling is therefore immediate for HTTP and detected within 15 seconds for existing sockets. Multi-instance immediate revocation requires the shared Socket.IO adapter described in the roadmap.

Migration: deployment invalidates legacy bearer-token sessions. Users must sign in again; the client removes the old auth-storage localStorage entry. No user/password migration is necessary. Create the Session indexes before accepting production traffic. Session tokens must not appear in logs or analytics.

The browser clears private caches, cancels pending queries, rejects responses from an older auth generation, and synchronizes account changes through a non-secret storage event. A failed logout request is surfaced rather than pretending server revocation succeeded.

Design references: [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) and [Socket.IO middleware lifecycle](https://socket.io/docs/v4/middlewares/).

Google sign-in is optional. Leave both Google client IDs empty to disable it; production rejects malformed IDs. Existing accounts are resolved by Google's stable subject, not by email alone. A verified email collision requires signing in to the existing account and explicitly linking Google with the current password. Missing profile names are completed through Account settings. See [Google's identity verification guidance](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
