# Installable app and alerts

The app can be installed on supported phones, tablets, and desktops. It uses the existing account and blue theme. The header's bell opens **Install & alerts**, with installation instructions, notification permission, sound settings, a test chime, and recent alerts.

## Server setup

From the project directory, with the correct production DATABASE_URL in `.env`:

```sh
npm ci
npm run pwa:db
npx prisma generate
npm run pwa:keys
```

The database command creates only the two PWA tables; it does not reset existing data. The key command writes a new pair directly to `.env`, without printing secrets, and preserves an existing pair. Keep the same keys across restarts and all server instances. Do not commit `.env`.

Check this block in `.env`:

```dotenv
PUSH_ENABLED=true
VAPID_PUBLIC_KEY=generated-by-pwa-keys
VAPID_PRIVATE_KEY=generated-by-pwa-keys
VAPID_SUBJECT=mailto:your-support-email@example.com
```

Keep the generated key values. Set the subject to your real contact email and `APP_URL` to the public HTTPS origin. Then build and restart your existing process manager:

```sh
npm run build
npm start
```

Serve through HTTPS. Localhost is a browser development exception; an HTTP LAN IP is not. Do not cache `/sw.js` at the reverse proxy/CDN. The app sets no-cache headers on it. Phone testing should use the HTTPS domain.

This project uses a long-running Node server. Alerts are stored in MySQL and dispatched after the request, with a 15-second worker as fallback and up to five delivery attempts. Multiple Node instances lease events to prevent concurrent delivery. A serverless deployment needs a separate scheduled worker; process intervals alone are insufficient there. The server needs outbound HTTPS to browser push providers. Expired subscriptions are removed, disabled accounts/password changes invalidate devices, subscriptions unused for 90 days are excluded, and undelivered events older than 24 hours are not sent. Event history currently remains in the database.

## Enable on each device

1. Sign in and open the bell in the header.
2. Choose **Install app**, or follow **How to install**. On iPhone/iPad (iOS/iPadOS 16.4+), use Safari's Share → Add to Home Screen, then open the installed app.
3. Choose **Enable notifications** and allow the browser/device permission.
4. Use **Test sound** and leave **Notification sound** on.

Sound can also be enabled without push. Browsers require a user interaction before allowing audio, including after reopening the app. The custom two-note chime plays for new alerts while a workspace page is visible. Background notifications use the OS/browser sound, which depends on notification settings, silent mode, Focus/Do Not Disturb, and browser support. Websites cannot force a custom background ringtone or bypass these settings. Delivery may be delayed or unavailable when the browser is force-quit, offline, or restricted by the device.

Admins/editors receive new confirmed bookings, repair quote requests, and incoming support messages. Mechanics receive new job invitations and messages addressed to them. Customers receive messages addressed to them. Notification text is generic and does not expose private message contents on the lock screen. Clicking an alert opens the relevant booking or conversation. Foreground polling checks every eight seconds and avoids replaying historical alerts on first load; tabs coordinate to avoid repeated chimes. Signed-in pages and API responses are never cached for offline use; offline navigation shows a public reconnect screen.

Turning notifications off removes this device subscription. Signing out revokes its server registration. Signing back into a previously opted-in account can restore the existing browser subscription without another permission prompt; a different account must opt in itself.

## Verification

```sh
npm run test:pwa
npm run test:chat
```

For a real device test, enable alerts on two intended test accounts and send a test message between them. Check once with the recipient app visible and once with it in the background; also test a new booking/job invitation using test data. Actual OS delivery and sound require device permission and cannot be proven by the automated tests. Automated tests mock push providers and do not send real notifications or emails.
