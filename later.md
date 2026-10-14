# Smart Servicing Centre (Next.js) — everything still to do

The Next.js app already does everything the Laravel app does (see [PARITY.md](PARITY.md)).
This file is the backlog for after that: what's needed to go live, technical clean-up, and features
competitors have that we don't. Research date: 1 Oct 2026.

Priority: **P0** blocks going live · **P1** soon after launch · **P2** growth / nice to have.

---

## 1. Before going live (P0)

### Accounts and keys
- [ ] **Vehicle lookup.** The VehicleSmart app ID returns 403, so new registrations fail (Laravel too).
      Renew VehicleSmart, or switch to UK Vehicle Data / CheckCarDetails. A provider change means rewriting `lookupRegistration` in `src/lib/vehicle.ts`.
- [ ] **Email.** Set `MAILGUN_DOMAIN`, `MAILGUN_SECRET`, `MAIL_FROM`. Without them, mail only goes to `.outbox/`.
      Set up SPF, DKIM and DMARC on the sending domain.
- [ ] **Stripe live keys.** Enter them in Admin → Payments → Stripe management.
      Check that mechanics' Connect accounts belong to the live platform, and set up the Connect OAuth redirect URL for the new domain (`/mechanic/stripe/response`).
- [ ] **Postcodes.** getaddress.io's `/find` is retired; postcodes.io is used as a fallback.
      Decide whether to buy getaddress.io's newer API (gives house-level addresses for an address picker) or stay on postcodes.io.
- [ ] **Pusher.** Optional: needed only if we switch chat from polling to instant updates (§3).

### Hosting and cut-over
- [ ] **Choose hosting.** A Node server (VPS / Render / Railway / Fly) is simplest, because the job worker runs inside the app and uploads live on disk.
      Vercel would need the job queue and uploads moved first (§3).
- [ ] **Domain, HTTPS, production `.env`.** Generate a long random `SESSION_SECRET`, set `APP_URL` to the real domain, set `NODE_ENV=production`.
- [ ] **Database.** Point the Next.js app at the production MySQL rather than the 4407 copy.
      Take a backup first and set up daily backups.
- [ ] **Uploads.** Make Laravel's `public/` folder (blog images, documents, chat files, signables) available to the Next.js app, or move it to S3 / R2 (§3).
- [ ] **Cut-over plan.** Either switch DNS from Laravel to the Next.js app in one go (old URLs already redirect), or run both on the same DB for a while.
      Keep Laravel read-only as a fallback for 2–4 weeks.
- [ ] **Delete test data** from the 4407 copy: customer id 12458, booking #386, quote #387 (see README).
- [ ] **Fix the security holes in the live Laravel site now,** whatever the cut-over date:
      `/mechanic/app/order/sync/{id}`, `/cancel/{id}/unverified/order`, `/user/order/{token}/cancel`, `/stripe/charge/...`, `/muneeb`,
      the public `/api/customers|mechanics|orders` (they leak `api_token`s), bespoke auto-login, and the registration role taken from the form.

### Test before launch
- [ ] Book a mechanic's repair quote with a card ("Book me in" → slots → card → assigned).
- [ ] Book a bespoke estimate with a card.
- [ ] Mechanic charges a customer through Stripe Connect at the end of a job, including the declined-card email.
- [ ] Every email template sent to a real inbox (Gmail + Outlook rendering).
- [ ] The delayed jobs fire after a restart (`.jobs/queue.json`): 24h quote reminder, hourly "add card", day-before reminder, mechanic re-notify at +1h/+3h.
- [ ] Mobile check of the booking flow on real phones (iOS Safari, Android Chrome), especially the Stripe card field and the slot picker.

### Legal and trust
- [ ] **Cookie consent banner** (UK GDPR / PECR). Needed as soon as analytics or marketing pixels are added.
- [ ] **Customer data rights.** Customers can download or delete their data; record an admin procedure for this.
- [ ] **Remove hard-coded marketing numbers** on the home page ("4.85 average rating", "95% would recommend").
      Replace them with real averages from `reviews`, or a Trustpilot widget. Laravel's fake "418/253/173 completed jobs" were not ported; keep it that way.

---

## 2. Decisions needed (P0/P1)

- [ ] **Petrol spark plugs are counted twice** in `getPrice` (kept for price parity with Laravel). Fix it, or keep it as an intentional margin.
- [ ] **When the card is charged.** Today the card is saved and the mechanic charges it at the end of the job.
      Laravel's copy says "we pre-authorise the booking amount 24h before" but never did it. ClickMechanic does both:
      it reserves the amount the day before, then charges after the customer approves.
      Decide, then build it (§4.1).
- [ ] **Cancellation fees.** ClickMechanic charges nothing more than 24h before the booking, £20 within 24h, and £40 once the mechanic is travelling.
      We have no fees. Decide the policy and put it into the terms and the code.
- [ ] **Commission model.** Today it is `garage_comission` % with a `max_commission` cap.
      Review it against ClickMechanic (commission only on completed work; it covers payments, marketing and support).
- [x] **Brand.** Done: the app uses "Smart Servicing Centre" everywhere, like the Laravel site.

---

## 3. Technical clean-up (P1)

- [ ] **Instant chat.** Replace polling with Pusher (reuse Laravel's account; both apps see messages instantly) or with server-sent events.
- [ ] **Durable email and jobs.** `queueMail` uses `setTimeout`, so emails waiting to send are lost on restart.
      Route all mail through the durable queue, or better, move jobs to a DB table / Redis (BullMQ) so several servers can share them.
- [ ] **Uploads to object storage** (S3 / Cloudflare R2) instead of Laravel's `public/` folder. This is needed for serverless hosting or more than one server.
- [ ] **Rate limiting and bot protection** on login, register, join-network, password reset, contact form and booking.
      Use per-IP limits plus Cloudflare Turnstile or hCaptcha.
- [ ] **Error monitoring** (Sentry) and uptime checks; structured logs for payments and emails.
- [ ] **Automated tests:**
  - [ ] Unit tests for pricing (`getPrice`, basket rules, MOT discount) against the Laravel numbers we verified.
  - [ ] Playwright end-to-end tests: booking + Stripe test card, repair quote, password reset, mechanic accept → charge, admin quote → customer books.
  - [ ] CI (GitHub Actions): typecheck, lint, tests and build on every push.
- [ ] **Lint.** Fix the ~20 remaining React-compiler lint errors in older admin and mechanic components (`Chat.tsx`, `QuoteTools.tsx`, `ThemeSwitcher.tsx`, `OrderChat.tsx`, `RichText.tsx`, `BespokeForms.tsx`, `admin/recents`).
- [ ] **Schema ownership.** Once Laravel is retired, move to Prisma migrations, add missing indexes (orders.status, orders.created_at, orderrequests.user_id, timeslots.start_at), and add a primary key to `password_resets`.
- [ ] **Time zones.** Slot times are stored as server-local → UTC, the same as Laravel's data (5h offset on this machine). Pin `TZ=Europe/London` on the server so times stay correct.
- [ ] **Performance.** Add caching for the public pages (service, city, make, blog) with revalidation, and resize images through Next/Image.
- [ ] **SEO.** Generate `sitemap.xml` and `robots.txt` automatically (the admin can upload a sitemap today), add canonical URLs and Open Graph images, and keep JSON-LD per page.

---

## 4. Product features — what ClickMechanic and YourMechanic have that we don't

### 4.1 Booking and payments (P1)
- [ ] **Instant fixed prices for far more repairs.** Most of our repairs show "Get quote" because parts have no price.
      ClickMechanic quotes most jobs instantly from industry labour times and parts data.
      Options: license labour times (Autodata / HaynesPro), a parts-pricing feed (trade supplier API), or fill `prices` from the quotes admins have already sent (we have that data).
- [ ] **Same-day / next-day booking.** Show the earliest available slot. ClickMechanic books 7 days a week, 8am–8pm; YourMechanic 7am–9pm.
- [ ] **Reserve the amount the day before** (Stripe manual-capture PaymentIntent created by a job 24h before the slot). The customer then approves the work before the final charge ("go-ahead to invoice").
- [ ] **Customer approves extra work in the app**, with photos, before the mechanic adds it. We have follow-on quotes; make approval part of the job flow.
- [ ] **Cancellation and rescheduling by the customer** with automatic fees (§2) instead of the message-centre form.
- [ ] **Promo codes / discounts and referral credits** (customer refers a friend; mechanic referral programme).
- [ ] **Pay later** (Klarna / Clearpay) for big repairs. Neither competitor shows it; it could set us apart.
- [ ] **Address lookup by house number** (getaddress autocomplete) instead of typing street and city.

### 4.2 More services (P1/P2)
- [ ] **Pre-purchase inspection** (both competitors; YourMechanic does a 150-point inspection with a report, about $75). We already have the fault-report PDF; add a checklist template and a buyer-facing report.
- [ ] **Tyre fitting** (ClickMechanic).
- [ ] **EV charger installation** and EV/hybrid servicing (ClickMechanic).
- [ ] **Collection and delivery to a garage**, with clear rules for when a job needs a workshop and recovery fees for undrivable cars.

### 4.3 Customer account (P1/P2)
- [ ] **"My garage": several vehicles per customer**, each with its service history (all past orders, parts, mechanic, invoices).
- [ ] **Maintenance schedule and reminders** (YourMechanic: factory-recommended schedule):
      MOT due date and history from the free DVSA MOT History API, road-tax status from the DVLA Vehicle Enquiry Service, and service-due reminders by email/SMS with one-click booking.
- [ ] **Digital vehicle health report** after every job: checklist, photos, faults with urgency (we have faults; add photos and a nicer report page).
- [ ] **Mechanic ETA / "on my way" tracking** on the day (YourMechanic).
- [ ] **Chat with the mechanic before the appointment** (we have it), plus SMS/WhatsApp notifications (Twilio) for booking confirmed, mechanic on the way, job done, and card needed.
- [ ] **VAT invoices as PDF** for every completed job, downloadable in the portal and attached to the completion email.
- [ ] **Customer app.** Start with a PWA (installable, push notifications); native iOS/Android later.

### 4.4 Mechanic side (P1/P2)
- [ ] **Mechanic app as a PWA** with push notifications for new jobs (ClickMechanic sends jobs to the phone; mechanics accept or decline).
- [ ] **Availability calendar and working hours,** so requests only go to mechanics free at the customer's times, plus a coverage-radius map editor.
- [ ] **Show expected pay per job** (ClickMechanic advertises £35–£85/hour) and a clear earnings and payout dashboard.
      Payouts within 3 working days through Stripe Connect Express; the first payout can take up to 10 days.
- [ ] **Parts ordering at trade discount** from the app (partner with a supplier; margin on parts like ClickMechanic).
- [ ] **Vetting:** enforce minimum requirements (NVQ / City & Guilds Level 2 or 5 years' experience, £1m public liability, motor-trade insurance), check documents within one working day, and send expiry reminders for insurance documents.
- [ ] **Show quality publicly:** real ratings, review counts, years of experience and qualifications on profiles; automatically pause mechanics whose ratings fall too low.

### 4.5 Admin and operations (P1/P2)
- [ ] **Smart dispatch:** offer jobs to the nearest available, best-rated mechanics first, then widen the radius automatically. Today everyone in range is emailed at once.
- [ ] **Warranty and complaint workflow:** 12-month / 12,000-mile warranty claims, disputes, refunds (Stripe), and notes on each case.
- [ ] **Reports:** revenue, commission, conversion of quotes into bookings, mechanic response times, cancellations, and repeat customers.
- [ ] **Fleet / business accounts** (ClickMechanic offers fleet servicing): company accounts with several vehicles, monthly invoicing, and purchase-order numbers.
- [ ] **Help centre** with searchable articles, and a support chat widget for customers who haven't booked yet.
- [ ] **Trustpilot integration:** invite after every completed job and show the score on the site.

### 4.6 Marketing and SEO (P2)
- [ ] **Price guide pages** ("Clutch replacement cost for a Ford Focus") generated from real quotes and prices, a big source of traffic for both competitors.
- [ ] **City × service landing pages** ("Mobile mechanic Reading – brake pads"), with proper deduplication.
- [ ] **Free diagnosis by phone with in-house mechanics** (ClickMechanic helps 35,000+ people a year; the home page already promises it). Needs a phone/booking workflow.
- [ ] Social proof blocks, newsletter, and email marketing (abandoned-basket emails using the booking state we already store).

---

## 5. Research notes

**ClickMechanic (UK)**
- 1,600+ mechanics and garages; 4.7★ from 26,000+ reviews (212,000+ customer reviews claimed).
- Says it is up to 47–50% cheaper than franchise dealers; instant fixed prices from industry-standard data.
- Same or next-day bookings, 7 days a week, 8am–8pm. Card held to secure the booking, an amount reserved the day before, and charged only after the customer approves.
- Cancellation: free more than 24h before; £20 within 24h; £40 if the mechanic is already travelling.
- 12-month parts and labour warranty.
- Services: servicing, MOT, repairs, diagnostics, tyres, pre-purchase inspection, EV chargers, fleet servicing.
- Mechanics: free to join, commission only on completed work, jobs pay £35–£85/hour, payouts within 3 working days, trade parts discounts in the app.
  Requirements: Level 2 qualification or 5+ years' experience, £1m public liability, motor-trade insurance.

**YourMechanic (US)**
- 500+ services; mobile mechanics 7 days a week, 7am–9pm; instant quotes; card charged after the work.
- 12-month / 12,000-mile warranty.
- App: vehicle health overview, history, maintenance schedule, several vehicles, mechanic ETA, chat with the mechanic before the job, service reports.
- 150-point pre-purchase inspection with report (about $75). Mechanic profiles with ratings, review counts and experience.

Sources:
- [ClickMechanic home](https://www.clickmechanic.com/)
- [ClickMechanic – how it works](https://www.clickmechanic.com/how-it-works)
- [ClickMechanic – for mechanics](https://www.clickmechanic.com/mechanics/home)
- [ClickMechanic – terms](https://www.clickmechanic.com/terms)
- [ClickMechanic on Trustpilot](https://www.trustpilot.com/review/clickmechanic.com)
- [YourMechanic – book online](https://www.yourmechanic.com/request-service-online)
- [YourMechanic – services](https://www.yourmechanic.com/services)
- [YourMechanic app launch (MOTOR)](https://www.motor.com/2021/08/yourmechanic-launches-app-to-bring-auto-repair-directly-to-car-owners-homes-nationwide/)
- [YourMechanic pre-purchase inspection (PRWeb)](https://www.prweb.com/releases/yourmechanic_lifts_the_hood_on_used_car_shopping_with_pre_purchase_inspection_offering/prweb11200696.htm)
