# TaskFlow client

React, TypeScript, Vite, Tailwind 4, TanStack Query, and Socket.IO. Run workspace commands from the repository root; see [the project README](../README.md).

Authentication uses HttpOnly cookies, not persisted browser tokens. Private cache state is cleared at account boundaries. Production API/socket URLs must use HTTPS or the documented same-origin defaults. Configure Google sign-in only when both server and browser OAuth client IDs are valid.

`npm run lint --workspace=client`, `npm run test --workspace=client`, and `npm run build:client` validate this workspace. Browser workflows run from the root with `npm run test:e2e`.

## Interface design

The responsive app shell, dashboard, task board, account screens, and authentication pages share the light surface and indigo accent styles in `src/index.css`. Layout components live in `src/components/layout`. Navigation works with keyboard and touch; native dialogs retain focus trapping and Escape behavior. Motion is disabled when reduced motion is requested.

The visual direction draws on Aceternity's [Sidebar](https://ui.aceternity.com/components/sidebar), [Bento Grid](https://ui.aceternity.com/components/bento-grid), [Signup Form](https://ui.aceternity.com/components/signup-form), [Tabs](https://ui.aceternity.com/components/tabs), and [Animated Modal](https://ui.aceternity.com/components/animated-modal). These are project-specific React/CSS adaptations, not installed Aceternity components.

The dashboard and My tasks page use the membership-scoped `/tasks/mine` API. Counts cover all accessible, active, incomplete assignments; lists use bounded cursor pagination and refresh periodically, on focus, and after relevant local changes. The queue is ordered newest first, not by due date. Notification history supports loading additional pages.

`tests/e2e/design.spec.ts` exercises desktop and mobile navigation, task links, dialog focus, and horizontal overflow, and captures screenshots under `test-results/`. Fixtures are created only in the isolated browser-test database. Screenshots are review artifacts, not pixel-diff baselines.
