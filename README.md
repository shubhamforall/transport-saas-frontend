# transport-saas-frontend

Web app for **Vaharo**, a multi-tenant transport management SaaS for Indian goods-transport businesses.

The API lives in a separate repository: `transport-saas-backend`. Its `docs/API.md` is the API
contract; the types in `src/types/api.ts` must stay in step with it.

## Stack

React 19 · Vite · TypeScript (strict) · Tailwind CSS 4 · React Router 7 · TanStack Query ·
React Hook Form + Zod · Lucide icons · Vitest + Testing Library.

## Getting started

```bash
cp .env.example .env    # set VITE_API_BASE_URL if the API is not on localhost:4000
npm install
npm run dev             # http://localhost:5173
```

The backend must be running and must list `http://localhost:5173` in its `WEB_ORIGIN`.

## Scripts

| Script                 | Purpose                         |
| ---------------------- | ------------------------------- |
| `npm run dev`          | Start the dev server            |
| `npm run build`        | Type-check and build to `dist/` |
| `npm run preview`      | Serve the production build      |
| `npm run lint`         | ESLint                          |
| `npm run typecheck`    | TypeScript without emitting     |
| `npm run format:check` | Prettier check                  |
| `npm test`             | Run tests                       |

## Project layout

```text
src/
  app/          Providers, router, query client
  components/
    layout/     App shell (sidebar, top bar, mobile drawer), auth layout, brand
    ui/         Button, Card, fields, Badge, Modal/ConfirmDialog, Toast, Table, feedback states
  features/     One folder per feature: auth, tenants, dashboard, customers, vehicles, jobs,
                invoices, payments, reports, team, billing, settings, platform (Super Admin)
  lib/          API client, env, formatting (₹, dates), helpers
  routes/       Shared pages (not found, coming soon)
  types/        API types (mirror backend docs/API.md)
  test/         Test setup and the fake API used in tests
```

## How the app talks to the API

- All calls go through `src/lib/api.ts`, which sends cookies (`credentials: 'include'`), adds the
  CSRF header on state-changing requests, refreshes an expired session once, and turns error
  responses into `ApiError` (with `fieldErrors` for forms).
- The session comes from `GET /auth/me`; tokens are HttpOnly cookies and never touch JavaScript.
- Company pages live under `/t/:tenantId/...`. Hiding a menu item or button is only a UI hint;
  the API checks membership and permissions on every request.

## Deploying

Build with the production API URL and upload `dist/` (it includes `.htaccess` for SPA routing,
HTTPS and security headers on Hostinger):

```bash
VITE_API_BASE_URL=https://api.<your-domain>/api/v1 npm run build
```

Full steps are in the backend repository's `docs/DEPLOYMENT.md`.

See [docs/DECISIONS.md](docs/DECISIONS.md).
