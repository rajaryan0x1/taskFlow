# TaskFlow client

React, TypeScript, Vite, Tailwind 4, TanStack Query, and Socket.IO. Run workspace commands from the repository root; see [the project README](../README.md).

Authentication uses HttpOnly cookies, not persisted browser tokens. Private cache state is cleared at account boundaries. Production API/socket URLs must use HTTPS or the documented same-origin defaults. Configure Google sign-in only when both server and browser OAuth client IDs are valid.

`npm run lint --workspace=client`, `npm run test --workspace=client`, and `npm run build:client` validate this workspace. Browser workflows run from the root with `npm run test:e2e`.
