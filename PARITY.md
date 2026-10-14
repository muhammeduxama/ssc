# Laravel → Next.js parity checklist

Source of truth: `routes/web.php`, `routes/app.php`, `routes/api.php` and the controllers they point to.
Status: ✅ done · 🟡 partial · ⬜ not started. Update this file as modules land.

## Admin (auth:admin — admins + editors)

| Area | Laravel routes | Next.js | Status |
| --- | --- | --- | --- |
| Dashboard tiles, income, order management table, quote tiles | `/admin/home` | `/dashboard` (staff) | ✅ formulas ported 1:1 |
| Recent activity | `/admin/recents` | `/admin/recents` | ✅ |
| Notifications bell (mark seen, seen all) | `/seen/notification/*` | header bell | ✅ |
| Orders lists (all/new/today/tomorrow/accepted/completed/rejected/unverified/inactive/assigned) | `/ssc/order/*` | `/admin/orders/[filter]` | ✅ incl. Laravel display rule + row colours |
| Order details (info, notified mechanics, map, send request to garage, cancel ×3, SSC note, labour/part CRUD, photos, faults, chat) | `/ssc/order/{id}/orderdetails`, `/admin/order/*`, `/ssc/order/add|edit|delete/*` | `/admin/orders/view/[id]` | ✅ |
| Order edit | `/ssc/order/{id}/edit|update` | `/admin/orders/view/[id]/edit` | ✅ (also saves customer address, which Laravel forgot to) |
| Order messages (admin posts into customer↔mechanic thread) | `/ssc/order/{id}/messages/{mechanic}` | order detail → Chat tab | ✅ |
| Notified mechanics page | `/ssc/order/{id}/notified` | order detail → Notified section | ✅ |
| Order reviews (add + email mechanic, edit, delete) | `/ssc/order/reviews` (resource) | `/admin/reviews` | ✅ |
| Quotes (all/new/yesterday/not-responded/closed/sent estimates, details, add/delete labour-part, make/send quote, notified, responses, viewed-by, chat, send request) | `/ssc/quote/*`, `/admin/quote/*` | `/admin/quotes/*` | ✅ incl. 24h reminder job, carprices learning |
| Blogs, blog categories/sub, tags, image library | `/sscblogs`, `/ssccategory`, `/sscsubcategory`, `/ssctags`, `/sscimages` | `/admin/r/*` | ✅ |
| Main / sub / sub-sub categories | `/main-categories`, `/main-sub-categories`, `/sub-sub-categories` | `/admin/r/*` | ✅ |
| Services, service parts, service pages | `/ssc-services`, `/ssc-services/{s}/parts`, `/services-pages` | `/admin/r/*` | ✅ |
| Services CSV import | `/ssc-services/import` | `/admin/services/import` | ✅ (disabled in Laravel; implemented) |
| Fixed prices / range prices | `/ssc-fix-price`, `/ssc-service/*/prices`, `/ssc-range-price*` | `/admin/prices/*` | ✅ |
| Vehicle data: cars, makes (+ make pages), models, fuels, engines, years | `/data-*` | `/admin/r/*` | ✅ |
| Car CSV import, models bulk upload, model requests | `/ssc-import/data`, `/admin/models/bulk/upload`, `/model-request*` | `/admin/data/*` | ✅ (car CSV import was broken in Laravel; fixed) |
| Quote prices data, labour requests, part price requests | `/admin/admin_qoutes`, `/admin/labour_requests*`, `/admin/part_price_qoutes*` | `/admin/data/*` | ✅ |
| Sitemap | `/admin/sitemap/*` | `/admin/sitemap` | ✅ |
| Stripe management, payment details | `/admin/payment/*` | `/admin/payments/*` | ✅ (secret key never sent to browser) |
| Mailbox: sent, compose, show, download, delete, join-network invite, report, templates, doc mail | `/ssc-mails/*`, `/ssc-template`, `/docmail*` | `/admin/mail/*`, `/admin/r/email-templates` | ✅ |
| Mechanics admin (all/garage/mobile/incomplete, garage requests approve/reject/create account, status, password, delete, login-as, SEO, profile edit, documents) | `/ssc/mechanic`, `/ssc-mechanic/*`, `/admin/mechanic/profile/*` | `/admin/mechanics/*` | ✅ incl. login-as with return-to-admin |
| Required documents | `/ssc-document` | `/admin/r/documents` | ✅ |
| Clients admin (list, add, status, profile, update, password, login-as) | `/ssc-client/*` | `/admin/clients/*` | ✅ |
| Workers | `/ssc-worker` | `/admin/r/workers` | ✅ |
| Website: cities, FAQs, about, legal pages, contact messages | `/ssc-pages/city`, `/ssc-faq`, `/ssc-about`, `/ssc-pages` | `/admin/r/*` | ✅ |
| Labour & pricing settings (MOT, commission, limit, hour), postcodes | `/ssc-city/*`, `/ssc-postcode/*` | `/admin/settings/*` | ✅ (getaddress.io refresh needs GETADDRESS_API_KEY) |
| Admin register (system update) | `/ssc/system/update` | Workers | ✅ |
| Public JSON API | `routes/api.php` | `/api/blogs`, `/api/services`, `/api/service/{id}`, `/api/services/pages` (public) · `/api/orders`, `/api/orders/assigned`, `/api/order/{id}`, `/api/mechanics`, `/api/customers` (staff session only — Laravel served customers' details and `api_token`s to anyone) · `/api/user` | ✅ |

## Mechanic (routes/app.php)

| Area | Status |
| --- | --- |
| Dashboard `/mechanic/home` (counts, docs/Stripe warnings) | ✅ `/dashboard` |
| Job requests list + detail, accept at a customer slot (docs must be approved), decline with reason | ✅ `/mechanic/requests` |
| Offer alternative slots → customer chooses (`/offer/customer/{id}/alternative`, `/choose/alternatives/{token}/request/{id}`) | ✅ |
| Current / previous jobs | ✅ `/mechanic/jobs`, `/mechanic/jobs/previous` |
| Job workspace: earnings, notes, customer, vehicle, mileage, visit reschedule (slot or free), labour (min × labour_hour_limit), parts, service edit/delete, photos, faults, invoice → charge via Stripe Connect (with further-work / excuse flow) | ✅ `/mechanic/jobs/[id]` |
| Follow-on quotes (add/delete lines, send, delete) | ✅ in the job workspace |
| Repair quote requests (list, builder, send, dismiss) | ✅ `/mechanic/quote-requests` |
| Bespoke estimates (create with reg lookup or manual vehicle, labour/parts, send, delete) | ✅ `/mechanic/bespokes` |
| Chat (customer + support) + old `/app/resolution/*`, `/mechanic/ssc/chat/*` links | ✅ `/messages` + redirect routes |
| Profile (skills, address, service type, photo, qualifications, accreditations, preferences, work types, documents) | ✅ `/mechanic/profile` |
| Documents list, upload by emailed token + status | ✅ `/mechanic/documents`, `/mechanic/{token}/docs` |
| Change password, procedure | ✅ |
| Payments + Stripe Connect OAuth callback | ✅ `/mechanic/payments`, `/mechanic/stripe/response` |
| Emailed accept link `/mechanic/accept/{api}/request/{token}` (magic sign-in) | ✅ |
| Respond to review | ✅ `/mechanic/respond/review/{token}` |
| Delayed jobs: finalize-order (hourly), day-before reminder | ✅ |
| `/mechanic/app/order/sync/{id}` (unauthenticated order delete) | ⛔ intentionally not ported — security hole |
| Agreement PDF (`/mechanic/profile/agreement`, signable) | ✅ `/mechanic/agreement` (generated on join, stored in `public/ssc/signable`, row in `signables`) |
| Email must be verified for the mechanic area (`verified` middleware) | ✅ notice + resend inside the app shell |

## Customer & public site

| Area | Laravel | Next.js | Status |
| --- | --- | --- | --- |
| Home (reg + postcode quote form, perks, why us, process, recent activity, reviews, top jobs, cities, makes) | `/` | `/` | ✅ |
| How it works, FAQ, about, contact (+ store message), mobile mechanics, legal docs | `/how_it_works`, `/faq`, `/about`, `/contact-us`, `/mobile-mechanics`, `/legal_docs/{slug}` | same | ✅ |
| Service, city, make pages (+ SEO meta, schema code, popular-repair price tables), mechanic profile, review | `/service/*`, `/city/*`, `/make/all`, `/makes/{slug}`, `/mechanic/show/{company}_{id}`, `/watch/review/{id}` | same | ✅ |
| Blog index, tag (12/page), post (+ views) | `/blog`, `/blog/tag/{slug}`, `/blog/{slug}` | same | ✅ |
| Catch-all `/{slug}` → home | | `/[slug]` | ✅ |
| Booking: reg lookup (VehicleSmart), postcode (getaddress.io), unknown-reg picker | `/user/post-code`, `/user/unknown/reg`, `/ajax/*` | home form + `/api/vehicle` | ✅ (needs `VEHICLESMART_APPID`, `GETADDRESS_API_KEY` for new regs/postcodes) |
| Choose category / services, repair search, basket rules (packages exclusive, MOT discount with a package), `getPrice` | `/choose-category`, `/choose-service/{id}`, `/cart/*`, `/user/search/service` | same | ✅ prices verified identical to Laravel |
| Repair quote request (+ admin notification + emails) | `/services/{id}/repairs` | same | ✅ |
| Place order: login-or-register inline, address, multi-day slots, collection answers, terms → order, cart snapshot, tracks, timeslots | `/place/order`, `/order/schedule` | `/place/order` | ✅ (existing customers can now log in here — Laravel always said "password incorrect") |
| Card: SetupIntent + Stripe card element → `orderpayments`, admin + customer emails, requests to mechanics in radius (+20s/+1h/+3h reminders) | `/get-payment-info/{id}`, `/save/card/intent` | `/get-payment-info/{id}` | ✅ tested with Stripe test card |
| Thank-you page | `/services/{id}/status` | same | ✅ |
| Portal: bookings (card update, unverified cancel, actions menu), view (+ mechanic quotes, book me in, ask question) | `/user/portal/orders*` | `/portal/orders*` (old URLs redirect) | ✅ |
| Quotes: open / closed / expired + follow-on accept & reject, change/close with reason, SSC quote chat (+ file) | `/user/portal/quotes*`, `/ssc/user/{id}/messages` | `/portal/quotes*`, `/portal/follow-on/{id}` | ✅ |
| Book SSC (admin) quote: slots + address → card | `/quote/user/{api}/quote/{token}` | same link → `/portal/quotes/{id}/book` | ✅ |
| Book a mechanic's repair quote: slots → card → assigned with their labour/parts | `/accept/mechanic/{api}/order/{token}` | same link → `/portal/quotes/{id}/accept/{req}` | ✅ (Laravel's card page posted to the plain save-card endpoint, so the job never went to the quoting mechanic; fixed) |
| Message centre (change / cancel with reason / message mechanic / mechanic late / other) | `/resolutions/message_center/{o}/{n}` | `/portal/message/{o}/{n}` | ✅ |
| Edit profile, change password | `/user/portal/edit*`, `/user/portal/changepassword` | `/portal/profile`, `/portal/password` | ✅ |
| Review mechanic | `/user/review/{order}/mechanic/{api}` | same | ✅ (only completed jobs by that mechanic — Laravel's checks always passed) |
| Inspection report PDF | `/user/report/{order}/mechanic/{api}` | same | ✅ |
| Bespoke estimate accept → slots → card → assigned to the estimating mechanic | `/user/portal/bespoke/{token}`, `/user/bespoke/payment/*` | same | ✅ (no auto-login by email any more; token rotates after booking) |
| Token links: card payment, follow-on quote, quote chat reply, Stripe payment status | `/user/{email}/token/*`, `/quote/email/*`, `/ssc/user/{id}/messages/{token}`, `/stripe/payment/*` | same | ✅ |
| Choose alternatives (slots) | `/choose/alternatives/{token}/request/{id}` | same | ✅ |
| Customer dashboard | `/dashboard` | `/dashboard` | ✅ |
| Auth: login, register, join network (inactive until approved, docs email, agreement), verify email, password reset | `Auth::routes`, `/join-network`, `/user/register`, `/mechanic/register` | `/login`, `/register`, `/join-network`, `/email/verify/*`, `/password/reset/*` | ✅ (role is never taken from the form) |
| `/user/order/{token}/cancel`, `/stripe/charge/{user}/order/{order}`, `/read-json`, `/send/{user}/request/{token}` | unauthenticated or one-off | — | ⛔ not ported (unauthenticated destructive / dead code) |

## Cross-cutting

| Area | Status |
| --- | --- |
| Emails (Mailgun, dev outbox) | ✅ ~40 templates |
| Delayed jobs (durable queue) | ✅ `.jobs/queue.json` + worker in `instrumentation.ts` |
| Database notifications | ✅ admin bell (`notifications` table), incl. "city missing for postcode" |
| Chat emails (every customer↔mechanic and SSC↔mechanic message emails the other side) | ✅ |
| Live chat updates (Laravel: Pusher broadcasting) | ✅ polling every few seconds instead of Pusher |

### Full route audit (583 Laravel routes)

Every Laravel route was listed with `Route::getRoutes()` and matched to a the Next.js app page, action or link.
Deliberately not ported:

| Laravel | Why |
| --- | --- |
| `/muneeb` | one-off, unauthenticated script that overwrote every city's SEO text with random rating counts |
| `/read-json`, `/reset-prices-data` | one-off data import / method doesn't exist |
| `/mechanic/app/order/sync/{id}`, `/user/order/{token}/cancel`, `/cancel/{id}/unverified/order` (public) | unauthenticated destructive actions (the last one is ported with an ownership check) |
| `/stripe/charge/{user}/order/{order}` | unauthenticated, only used by a view no controller renders |
| `/services/{service}/mechanics`, `/send/{user}/request/{token}` | old "choose a mechanic" flow, not linked anywhere |
| `/ajax/order/{id}/first`, `/mechanic/app/*/get` JSON endpoints, `/mechanic/besposkes/cart/*`, `/user/search/all_services`, `/check/service/{id}/validaty` | data feeds for Laravel's React screens (the Next.js app renders on the server) or no-ops (the bespoke service cart was never saved) |
| `/password/confirm`, Cashier `/stripe/webhook` + `/stripe/payment/{id}`, `/broadcasting/auth`, Debugbar | unused framework scaffolding |
| `/ssc-mails/documents`, `/ssc-mails/report` | empty test method / renders the agreement template (agreement PDF is ported) |
| Legacy admin URLs redirect to the Next.js app pages | ✅ `next.config.ts` |
| Legacy email links keep working (same URL patterns) | ✅ |
| Shared uploads with Laravel `public/` | ✅ `/legacy/*` |
