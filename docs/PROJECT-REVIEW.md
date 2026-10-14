# Smart Servicing Centre (Next.js) review — 13 October 2026

Scope: the Next.js app only. This pass inventories the 297 source files and reviews the popup implementation, supporting form flows, application structure, and selected reliability paths. It is not a line-by-line certification of every route, payment flow, or permission boundary. No Laravel changes were made.

## Implemented

- Shared native modal for vehicle lookup, mechanic job forms, rejection, and admin password changes. Consistent warm header, larger controls, rounded panel, blurred backdrop, responsive widths and reduced-motion support.
- Native focus containment, Escape handling, focus restoration, background scroll locking, accessible dialog names, and protection against accidental backdrop dismissal.
- Shared client/mechanic password form: visible labels, required/minimum-length checks, password visibility toggle, matching-password validation, inline server/network errors, and pending state.
- Modal close/Escape disabled while the calling form is pending. Toast messages also render inside the native dialog so action results are not hidden behind it.
- Vehicle selector now clears dependent choices immediately, aborts superseded requests, handles failed lookups, exposes loading/empty states, and uses unique label IDs. Two-column layout replaces five cramped fields.
- Quote lookup catches network/action failures and keeps the error visible.

## Confirmed remaining findings

| Priority | Finding and impact | Source / next action |
| --- | --- | --- |
| High | Petrol spark plugs are added twice when the vehicle has a known plug count. This changes customer quotes. The source explicitly preserves this behavior for historical price parity. | `src/lib/booking/pricing.ts`, `priceServices`: decide the intended pricing rule, remove the duplicate term, and add pricing regression cases before changing live prices. |
| High | Queued email uses `setTimeout`; pending sends can disappear when the server restarts. | `src/lib/mail/send.ts`, `queueMail`: enqueue durably and record delivery attempts. |
| High | Delayed jobs are removed before execution, failures are logged without retry, and unreadable queue data is treated as an empty queue. Reminders can be silently lost. | `src/lib/jobs/queue.ts`, `takeDue`/`load`; `src/lib/jobs/handlers.ts`, `runJob`: claim/acknowledge jobs, retry failures with idempotency, surface corrupt storage. |
| Medium | Homepage rating 4.85 and recommendation percentage 95 are literal values rather than database aggregates. The local homepage also displays a lorem-ipsum review. | `src/app/(site)/page.tsx`: publish verified review statistics and moderate production review content. No customer records were edited. |
| Medium | No custom `error.tsx`, `loading.tsx`, or `not-found.tsx` files exist in the app tree. Framework fallbacks leave recovery and loading states inconsistent with the product. | Add branded route recovery, useful empty/missing-page actions, and loading states for database-heavy pages. |
| Medium | Full-project lint reports 15 errors: render-time component definitions, render-time ref access, and synchronous effect state updates. These deserve individual review; some nested component definitions can cause remounts. | `admin/recents/page.tsx`, `Chat.tsx`, `Sidebar.tsx`, `admin/OrderChat.tsx`, `admin/QuoteTools.tsx`, `crud/RichText.tsx`, `mechanic/BespokeForms.tsx`, `mechanic/QuoteRequestBuilder.tsx`. |
| Medium | Rate-limit counters and job coordination are process-local. | `src/lib/rate-limit.ts`, `src/lib/jobs/queue.ts`: shared storage/locking is needed before deploying multiple instances. Rate limiting already exists for several public actions; the older backlog's blanket “missing rate limiting” claim is stale. |
| Medium | No automated test command in package.json. Pricing, role boundaries, booking, payment retries and job recovery need regression coverage. | Add focused tests and CI gates; do not rely on visual verification for financial flows. |
| Low | (Resolved: renamed to Smart Servicing Centre everywhere.) The old working name was mixed with Smart Servicing Centre in homepage text, metadata, footer and emails. | Choose the customer-facing name and apply it consistently after confirming the business identity. |
| Low | Several destructive/confirmation flows still use browser `confirm()`. | Migrate them to a shared confirmation component with specific consequences, cancellation and pending/error states. |

## Verification

- TypeScript: `tsc --noEmit` passed.
- ESLint: all nine changed TSX components passed.
- Full-project ESLint: 15 errors outside the changed components, listed above.
- Local browser: vehicle modal rendered correctly; Ford loads Ford models; clearing make disables/clears model; Escape removes the dialog, restores trigger focus and releases scroll lock.
- Authenticated mechanic/admin actions and actual password mutations were not exercised. No payment, outbound email or customer-data mutation was performed.
- Small-phone layout, keyboard-only traversal of every popup, and full end-to-end booking still need a dedicated pass.

## Existing backlog

`later.md` remains useful as a planning document, but provider-account status, production credentials and external integrations were not revalidated here. Treat those entries as unverified until checked. The README's “no new tables” description also conflicts with its documented login-link-use migration and should be reconciled.
