const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('key setup writes secrets only to the environment file and preserves an existing pair', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-pwa-keys-'));
  try {
    const script = path.resolve('scripts/pwa-keys.mjs');
    const run = () => spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });
    const first = run(); assert.equal(first.status, 0, first.stderr);
    const content = fs.readFileSync(path.join(dir, '.env'), 'utf8');
    const privateKey = content.match(/^VAPID_PRIVATE_KEY=(.+)$/m)[1];
    assert.equal(privateKey.length, 43); assert.equal(first.stdout.includes(privateKey), false);
    assert.equal(run().status, 0); assert.equal(fs.readFileSync(path.join(dir, '.env'), 'utf8'), content);
    const incomplete = content.replace(/^VAPID_PRIVATE_KEY=.*\n/m, '');
    fs.writeFileSync(path.join(dir, '.env'), incomplete);
    assert.notEqual(run().status, 0);
    assert.equal(fs.readFileSync(path.join(dir, '.env'), 'utf8'), incomplete);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(source, { exports, URL, Request, Response, console, process: { env: {} }, require: id => {
    if (!(id in dependencies)) throw new Error(`Unexpected import ${id}`);
    return dependencies[id];
  }, ...globals });
  return exports;
}
const policy = load('src/lib/pwa/policy.ts');
test('order notifications use stable event keys and message notifications open the recipient thread', async () => {
  const events = new Map(); let deliveries = 0;
  const api = load('src/lib/pwa/notify.ts', {
    'server-only': {}, 'node:crypto': crypto,
    'next/server': { after: callback => callback() },
    '@/lib/db': { db: { appAlert: { upsert: async ({ where, create }) => { if (!events.has(where.eventKey)) events.set(where.eventKey, create); } } } },
    './push': { dispatchPushAlerts: async () => deliveries++ }, './policy': policy,
  });
  await api.notifyOrder(389, 'staff'); await api.notifyOrder(389, 'staff');
  await api.notifyOrder(389, 'user:20');
  await api.notifyMessage(389, 'user:10', '389:p:20', 'direct-message:900');
  assert.equal(events.size, 3);
  assert.equal(events.get('order:389:staff').url, '/admin/orders/view/389');
  assert.equal(events.get('order:389:user:20').url, '/mechanic/requests');
  assert.equal(events.get('direct-message:900').url, '/messages?thread=389%3Ap%3A20');
  assert.equal(events.get('direct-message:900').audience, 'user:10');
  assert.equal(deliveries, 4);
});
test('push endpoints reject arbitrary hosts, credentials, insecure URLs and lookalike domains', () => {
  for (const url of ['http://fcm.googleapis.com/a', 'https://127.0.0.1/a', 'https://example.com/a', 'https://fcm.googleapis.com.evil.test/a', 'https://user:password@fcm.googleapis.com/a', 'https://fcm.googleapis.com:8443/a']) assert.equal(policy.validPushEndpoint(url), false, url);
  for (const url of ['https://fcm.googleapis.com/fcm/send/abc', 'https://updates.push.services.mozilla.com/wpush/v2/abc', 'https://web.push.apple.com/abc', 'https://wns2.notify.windows.com/abc']) assert.equal(policy.validPushEndpoint(url), true, url);
});
test('alert audiences and links cannot expose another account or navigate outside the app', () => {
  assert.equal(policy.alertAudiences({ role: 'customer', id: '10' })[0], 'user:10');
  assert.equal(policy.alertAudiences({ role: 'mechanic', id: '20' })[0], 'user:20');
  assert.equal(policy.alertAudiences({ role: 'admin', id: '1' })[0], 'staff');
  for (const url of ['//evil.test', '/\\evil.test', 'https://evil.test', '/\r\nevil']) assert.equal(policy.safeAlertUrl(url), '/dashboard');
  assert.equal(policy.safeAlertUrl('/messages?thread=1%3Ap%3A10'), '/messages?thread=1%3Ap%3A10');
});

function subscription(session = { kind: 'user', id: '10', role: 'customer', pv: 'version' }) {
  const writes = []; const cookieWrites = [];
  const api = load('src/app/api/pwa/subscription/route.ts', {
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'device-hash' }), set: (...args) => cookieWrites.push(args), delete: () => {} }) },
    'next/server': { NextResponse: { json: (data, init) => Response.json(data, init) } },
    zod: require('zod'), '@/lib/db': { db: { pushSubscription: { upsert: async args => writes.push(args), deleteMany: async args => writes.push(args), findFirst: async args => { writes.push(args); return null; } } } },
    '@/lib/session': { getSession: async () => session, secureCookies: true },
    '@/lib/rate-limit': { hit: () => true, MIN: 60000 },
    '@/lib/pwa/push': { endpointHash: value => crypto.createHash('sha256').update(value).digest('hex'), PUSH_DEVICE_COOKIE: 'ssc-push-device', pushReady: () => true },
    '@/lib/pwa/policy': policy,
  });
  return { api, writes, cookieWrites };
}
const request = (origin = 'https://app.test', endpoint = 'https://fcm.googleapis.com/test') => new Request('https://app.test/api/pwa/subscription', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ subscription: { endpoint, keys: { p256dh: 'a'.repeat(87), auth: 'b'.repeat(22) } }, sound: true, ownerKey: 'admin:1' }) });
test('subscription writes require sign-in and matching origin', async () => {
  const unauth = subscription(null);
  assert.equal((await unauth.api.POST(request())).status, 401);
  const auth = subscription();
  assert.equal((await auth.api.POST(request('https://evil.test'))).status, 403);
  assert.equal((await auth.api.POST(request('https://app.test', 'https://127.0.0.1/internal'))).status, 400);
  assert.equal(auth.writes.length, 0);
});
test('device ownership comes from the session and deletion is restricted to that account', async () => {
  const { api, writes, cookieWrites } = subscription();
  assert.equal((await api.POST(request())).status, 200);
  assert.equal(writes[0].create.ownerKey, 'user:10');
  assert.equal(writes[0].create.version, 'version');
  assert.equal(cookieWrites[0][2].httpOnly, true);
  await api.DELETE(new Request('https://app.test/api/pwa/subscription', { method: 'DELETE', headers: { origin: 'https://app.test' } }));
  assert.equal(writes[1].where.ownerKey, 'user:10');
});
test('feed is account scoped, skips old alerts at first load and rejects overflowing cursors', async () => {
  const reads = [];
  const api = load('src/app/api/pwa/events/route.ts', {
    'next/server': { NextResponse: { json: (data, init) => Response.json(data, init) } },
    '@/lib/db': { db: { appAlert: { findMany: async args => { reads.push(args); return [{ id: 7n, title: 'Message', body: 'Generic', url: '/messages', createdAt: new Date() }]; } } } },
    '@/lib/session': { getSession: async () => ({ kind: 'user', id: '10', role: 'customer' }), isStaff: () => false },
    '@/lib/chat': { unreadCount: async () => 2 }, '@/lib/pwa/policy': policy,
  });
  const initial = await (await api.GET(new Request('https://app.test/api/pwa/events'))).json();
  assert.equal(initial.events.length, 0); assert.equal(initial.cursor, '7');
  const next = await api.GET(new Request('https://app.test/api/pwa/events?after=7'));
  assert.equal(next.headers.get('cache-control'), 'private, no-store');
  for (const args of reads) assert.equal(args.where.audience.in[0], 'user:10');
  assert.equal(reads.at(-1).where.id.gt, 7n);
  for (const cursor of ['-1', 'x', '99999999999999999999']) assert.equal((await api.GET(new Request(`https://app.test/api/pwa/events?after=${cursor}`))).status, 400);
});

test('delivery discards revoked accounts and expired subscriptions without leaking message text', async () => {
  const sends = []; const removed = []; const delivered = [];
  const devices = ['valid', 'revoked', 'expired'].map((id, index) => ({ endpointHash: id, ownerKey: `user:${index + 1}`, role: 'customer', endpoint: `https://fcm.googleapis.com/${id}`, version: 'current', sound: true, p256dh: 'key', auth: 'auth' }));
  const api = load('src/lib/pwa/push.ts', {
    'server-only': {}, 'node:crypto': crypto,
    'web-push': { sendNotification: async (sub, payload) => { sends.push({ sub, payload: JSON.parse(payload) }); if (sub.endpoint.endsWith('/expired')) throw { statusCode: 410 }; } },
    '@/lib/db': { db: {
      appAlert: { findMany: async () => [{ id: 1n, audience: 'user:1', title: 'New message', body: 'You have a new message.', url: '//evil.test' }], updateMany: async () => ({ count: 1 }), update: async args => delivered.push(args) },
      pushSubscription: { findMany: async () => devices, deleteMany: async args => removed.push(args.where.endpointHash) },
      users: { findUnique: async ({ where }) => ({ password: where.id === 2n ? 'old' : 'current', status: true, role_id: 2n }) },
    } },
    '@/lib/session': { passwordVersion: v => v }, './policy': policy,
  }, { process: { env: { PUSH_ENABLED: 'true', VAPID_PUBLIC_KEY: 'public', VAPID_PRIVATE_KEY: 'private', VAPID_SUBJECT: 'mailto:owner@example.com' } } });
  await api.dispatchPushAlerts();
  assert.equal(sends.length, 2);
  assert.equal(sends[0].payload.account, 'user:1');
  assert.equal(sends[0].payload.url, '/dashboard');
  assert.deepEqual(removed.sort(), ['expired', 'revoked']);
  assert.equal(delivered.length, 1);
});

function worker(visibility = 'hidden') {
  const handlers = {}; const notifications = []; const messages = []; const navigations = []; const cached = [];
  const client = { visibilityState: visibility, url: 'https://app.test/messages', postMessage: m => messages.push(m), navigate: async url => navigations.push(url), focus: async () => {} };
  const self = { addEventListener: (type, fn) => handlers[type] = fn, location: { origin: 'https://app.test' }, skipWaiting: async () => {}, clients: { matchAll: async () => [client], claim: async () => {}, openWindow: async url => navigations.push(url) }, registration: { showNotification: async (...args) => notifications.push(args) } };
  const caches = { open: async () => ({ addAll: async urls => cached.push(...urls) }), keys: async () => [], match: async () => 'offline' };
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), { self, caches, URL, fetch: async () => { throw Error('offline'); } });
  const fire = async (name, event = {}) => { let pending; handlers[name]({ ...event, waitUntil: p => pending = p }); await pending; };
  return { handlers, notifications, messages, navigations, cached, fire };
}
test('service worker shows background notifications and respects sound preference', async () => {
  for (const [visibility, sound, silent] of [['hidden', true, false], ['visible', true, true], ['hidden', false, true]]) {
    const w = worker(visibility);
    await w.fire('push', { data: { json: () => ({ id: '1', title: 'New message', body: 'Generic', url: '/messages', sound, account: 'user:10' }) } });
    assert.equal(w.notifications.length, 1);
    assert.equal(w.notifications[0][1].silent, silent);
    assert.equal(w.messages[0].alert.account, 'user:10');
  }
});
test('service worker caches public fallback only and rejects external notification links', async () => {
  const w = worker(); await w.fire('install');
  assert.deepEqual(w.cached, ['/offline.html', '/pwa/icon-192.png', '/pwa/icon-512.png']);
  let response;
  w.handlers.fetch({ request: { method: 'GET', mode: 'navigate' }, respondWith: p => response = p });
  assert.equal(await response, 'offline');
  let cachedApi = false;
  w.handlers.fetch({ request: { method: 'GET', mode: 'cors' }, respondWith: () => cachedApi = true });
  assert.equal(cachedApi, false);
  await w.fire('notificationclick', { notification: { close() {}, data: { url: 'https://evil.test' } } });
  assert.equal(w.navigations.length, 0);
  await w.fire('notificationclick', { notification: { close() {}, data: { url: '/messages?thread=1' } } });
  assert.equal(w.navigations[0], 'https://app.test/messages?thread=1');
});
