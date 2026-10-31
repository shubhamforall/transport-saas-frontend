# Decision log

Record each decision with date, choice, rationale and impact.

## 2026-10-31 — Design system

- **Choice:** Tailwind CSS 4 with design tokens in `src/index.css` (`@theme`) taken from the Vaharo
  sample prototype (navy text, electric-blue primary, cyan accent, soft borders). Small in-house
  components in `src/components/ui`; no third-party component library.
- **Rationale:** The prototype's look is simple to reproduce; one visual system, no mixing.
- **Impact:** Brand colours and name change in one place (`index.css`, `layout/Brand.tsx`).

## 2026-10-31 — Responsive layout

- **Choice:** Full sidebar at ≥1024px, icon rail at 640–1023px, slide-in drawer below 640px,
  matching the prototype's breakpoints.

## 2026-10-31 — Tenant in the URL

- **Choice:** Company pages live under `/t/:tenantId/...`. The last-used company id is kept in
  `localStorage` only to pick where to land after sign-in.
- **Rationale:** Links and browser tabs stay tied to one company. The id is a selector; the API
  verifies membership on every request.
- **Impact:** Switching company remounts all pages so no state leaks between companies.

## 2026-10-31 — Session handling

- **Choice:** No tokens in JavaScript. The session is the result of `GET /auth/me` cached by
  TanStack Query. The CSRF token is fetched from `GET /auth/csrf` and kept in memory.
- **Rationale:** Matches the backend decision (HttpOnly cookies) and limits XSS damage.

## 2026-10-31 — Money input and invoice preview

- **Choice:** Amounts are typed as text and parsed to integer paise with string maths
  (`lib/money.ts`); quantities to thousandths. The invoice editor's live preview uses a copy of
  the server formula (`lib/invoice-calc.ts`, BigInt, half-up rounding) but the server
  recalculates on save and issue, and its totals are what is stored.

## 2026-10-31 — Lists, filters and code splitting

- **Choice:** List filters, search and page live in the URL so reload/back keep them. Feature
  pages load on demand (React Router `lazy`), keeping the first download small on mobile data.

## 2026-10-31 — Subscription UX

- **Choice:** The plan/trial pill sits in the top bar and sidebar; a banner appears on every page
  when the company is read-only. Razorpay Checkout.js loads only when a plan is chosen; after
  paying, the page polls for the webhook-confirmed status instead of trusting the browser.

## 2026-10-31 — Super Admin area

- **Choice:** Separate layout under `/platform`, linked only for platform admins; the API hides
  the area from everyone else (404).

## 2026-10-31 — Money and dates

- **Choice:** Money is formatted from integer paise with `en-IN` grouping (₹2,48,500.00); dates
  default to `Asia/Kolkata`.

## 2026-11-01 — Email verification screen

- **Choice:** `/verify-email?email=…&next=…` after sign-up (and after signing in to an unverified
  account). One numeric field with `autocomplete="one-time-code"`; it submits by itself at 6
  digits. "Send a new code" is disabled for 60 seconds. Sign-up from an invitation link sends the
  invitation token so the code is skipped.
- Signed-in visitors on sign-in/up pages now follow a safe `?next=` instead of always going home.
