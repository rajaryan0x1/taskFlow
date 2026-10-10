# Operations and release runbook

## Supported deployment

Use Node 24 (CI baseline), npm with the committed lockfile, MongoDB, and one API instance initially. The development Compose file binds MongoDB to localhost and is not a production database configuration. Use an authenticated, encrypted database service in production. The API runs as a non-root user in the provided Docker image. Pin image digests in your deployment system after reviewing updates; repository image tags receive upstream patches.

Build with `npm ci` followed by `npm run check`. Run `npm run test:integration --workspace=server` and `npm run test:e2e` before release. The integration/browser fixtures always create isolated temporary databases and never use MONGO_URI. Their first run downloads MongoDB/Chromium; subsequent runs reuse binaries. Install Chromium with `npx playwright install --with-deps chromium` on Linux CI.

`npm run start` starts the compiled API. Build the API image with `docker build --target api -t taskflow-api .`. The optional `web` target hosts the client with nginx and expects an API upstream named `api`. Terminate HTTPS at your platform/load balancer and configure its upstream network privately. `deploy/nginx.conf` includes SPA fallback, API/WebSocket proxying, and frontend security headers. Configure HSTS at the HTTPS edge only after verifying the domain and subdomain policy. The checked-in Docker/nginx templates have not been run in this workspace because the Docker daemon is unavailable.

For same-origin hosting, build the client with VITE_API_URL=/api/v1 and omit VITE_SOCKET_URL so it uses the page origin. For separate same-site hosts, supply HTTPS URLs at build time and adjust the frontend CSP connect-src allowlist to the exact API/socket hosts. Do not expose a Vite development server publicly. Browser support follows Tailwind 4: Safari 16.4+, Chrome 111+, Firefox 128+.

Required API settings: NODE_ENV=production, MONGO_URI, and CORS_ORIGINS (exact HTTPS frontend origins). SESSION_TTL_HOURS defaults to 168. TRUST_PROXY is the actual number of trusted proxies in front of Express; do not enable arbitrary forwarding-header trust. Google OAuth is optional; use matching valid server/browser client IDs. Configure secrets through the deployment environment, not Docker build arguments or Git. See [authentication.md](authentication.md) for cookie/session migration requirements.

Before routing traffic to a new database, run `npm run db:indexes --workspace=server` with the target environment. This creates declared indexes without dropping existing ones; production startup disables automatic index creation. Inspect duplicate-key failures rather than deleting conflicting customer records. Existing tasks need no data rewrite for version checks; clients send their current __v in If-Match for edits, assignments, archive/delete, and restore. Old API clients must be updated.

## Release and rollback

1. Record the release commit/image digest and verify the latest database backup.
2. Run checks, stage the build, apply non-destructive indexes, and verify /health/ready.
3. Smoke-test password login, reload, project/task creation, a second user's live update, archive/restore, and logout.
4. Roll traffic gradually and watch request error rates, p95 latency, readiness, and socket reconnects.
5. If application health regresses, restore the previous compatible image; do not roll back databases or indexes blindly. The cookie-session migration intentionally invalidates older JWT sessions, so rolling back across that boundary requires a coordinated authentication plan.

CI performs lint, build, unit tests, isolated database/socket integration tests, browser flows, dependency auditing, and a redacted Git-history secret scan. Configure these jobs as required branch-protection checks in your Git host; a workflow file alone cannot enforce branch protection. Dependency updates are scheduled weekly. Secret scanning/auditing does not prove the absence of vulnerabilities.

## Observability and shutdown

Every API response carries X-Request-ID. JSON access logs contain the generated request ID, HTTP method, route pattern, status, and elapsed time. Request bodies, cookies, authorization headers, query strings, and exception messages are excluded. Unknown failures log a fixed error category and request ID for correlation; raw error names, stacks, and causes are excluded because they can embed secrets. Configure your platform's log retention and error/latency alerts; this repository does not provision a monitoring vendor or an on-call schedule.

Use /health/live for process liveness and /health/ready for database readiness (/health remains an alias). A failed readiness check should stop new traffic without restarting healthy processes solely because MongoDB is temporarily unavailable. SIGTERM disconnects sockets, closes HTTP, and disconnects MongoDB with a ten-second deadline. Set the platform termination grace period above that deadline.

Start with alert thresholds such as sustained 5xx errors, failed readiness, and elevated latency compared with your measured baseline; choose actual targets after representative load testing. Resource quotas, distributed rate limiting, cross-instance socket delivery, durable background jobs, and load testing remain launch work, tracked in the roadmap. Do not run multiple API replicas until shared rate-limit/socket state is implemented and tested.

## Backup and recovery

Suggested initial targets for review: RPO 24 hours and RTO 4 hours. These are proposed targets, not measured guarantees. Enable encrypted scheduled snapshots and point-in-time recovery where available, restrict access, and choose retention to match customer commitments. Store recovery credentials outside the application and regularly verify backup completion.

Perform a restore drill into a separate database/network: provision the restore target, restore the snapshot, run the index script, compare collection counts and representative project/task/comment relationships, then run authenticated smoke tests. Record backup timestamp, restore duration, validation results, operator, and any lost interval. Never test a restore against a live customer database. No restore drill was performed here; it requires your actual hosting/backup configuration.

Notifications expire after 30 days. Historical completion analytics use activity events; old tasks without corresponding events are not retroactively reconstructed. Reopening and archiving preserve those events, but permanent deletion currently removes related activity. Define audit/retention obligations before paid launch.
