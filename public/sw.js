/* Cache only this public offline screen and icons. Never cache accounts, API responses or payment pages. */
const CACHE = 'ssc-public-v1';
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/offline.html', '/pwa/icon-192.png', '/pwa/icon-512.png'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('ssc-public-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  if (event.request.method === 'GET' && event.request.mode === 'navigate') event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
});
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let data;
    try { data = event.data.json(); } catch { data = { title: 'Smart Servicing Centre', body: 'Open the app to check your latest updates.', url: '/dashboard' }; }
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const visible = windows.some(client => client.visibilityState === 'visible');
    // Every push displays a notification, including on Safari. Foreground pages play the custom chime.
    await self.registration.showNotification(data.title || 'Smart Servicing Centre', { body: data.body || 'Open the app for details.', icon: '/pwa/icon-192.png', badge: '/pwa/badge.png', tag: 'ssc-' + (data.id || 'update'), renotify: false, silent: visible || data.sound === false, data: { url: data.url || '/dashboard', id: data.id, account: data.account } });
    for (const client of windows) client.postMessage({ type: 'SSC_ALERT', alert: data });
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = new URL(event.notification.data?.url || '/dashboard', self.location.origin);
    if (target.origin !== self.location.origin) return;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) if (new URL(client.url).origin === target.origin) { await client.navigate(target.href); await client.focus(); return; }
    await self.clients.openWindow(target.href);
  })());
});
