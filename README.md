# Smart Servicing Centre (Next.js)

A modern rebuild of Smart Servicing Centre on **Next.js 16 · React 19 · TypeScript · Tailwind 4 · Prisma**.
It reads and writes the **same MySQL database** as the Laravel app in the parent folder. Laravel's tables are unchanged; this app adds one small table of its own (see below).

## Run it

```bash
cp .env.example .env        # set DATABASE_URL and SESSION_SECRET
npm install
npx prisma generate
npm run dev -- --port 3100  # http://localhost:3100
```

Sign in with any existing account: admins (`admins` table), mechanics and customers (`users` table).
Laravel's `$2y$` bcrypt hashes verify as-is.

If the schema changes in Laravel, refresh the Prisma models with `npx prisma db pull && npx prisma generate`.

### Database changes this app adds

Run these once on any database this app uses (the Laravel app ignores them):

- `prisma/sql/2026-10-09-login-link-uses.sql` creates `login_link_uses`, which records used email login links so each link works only once.

### Sign-in security

- Sessions carry a fingerprint of the account's password hash, so changing a password signs out every other device. Sessions issued before this change are no longer valid, so everyone signs in again once.
- Emailed links sign people in with a signed, single-use link (`/l/...`) that expires after 7 days and is used up only when the person presses Continue (email scanners that pre-open links can't spend it). Expired or used links still lead to the page after a normal sign-in.
- Old Laravel-style links that carried a user's permanent `api_token` no longer sign anyone in; they redirect to the page behind the normal sign-in.

## What's built

Everything the Laravel app does, route by route — see **[PARITY.md](PARITY.md)** for the full checklist
(admin console, mechanic portal, public site, booking + Stripe, customer portal, emails, delayed jobs, PDFs, JSON API).

### Configuration (`.env`)

| Key | Needed for |
| --- | --- |
| `DATABASE_URL`, `SESSION_SECRET` | always |
| `APP_URL` | links inside emails |
| `LEGACY_PUBLIC_DIR` | uploads shared with Laravel's `public/` (default `../public`) |
| `MAIL_ENABLED`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_NAME`, `MAIL_FROM_ADDRESS` | real email over SMTP; with `MAIL_ENABLED=false` or no `MAIL_HOST`, emails are saved to `.outbox/` and email verification is skipped |
| `VEHICLESMART_APPID` | looking up registrations that aren't cached in `vehicledatas` |
| `GETADDRESS_API_KEY` | postcodes that aren't in `postcodes` yet |

Stripe keys come from the `stripes` table (Admin → Payments → Stripe management).

### Local test data

Created while testing the booking flow on the local database copy (port 4407):

- Customer `ssc.test.customer@example.com`, password `TestPass123` (users.id 12458)
- Booking #386 (paid with Stripe test card 4242…) and closed repair quote #387

Delete them with `DELETE FROM users WHERE id = 12458;` (orders cascade) when you no longer need them.

## Layout

```
src/lib        db, session, auth, queries, chat, formatters, themes
src/components AppShell, Sidebar, Chat, charts, ThemeSwitcher, ui
src/app        (site)/ public site + booking · (app)/ admin, mechanic, portal · token links · api/
src/proxy.ts   optimistic route guard (Next 16 name for middleware)
```
