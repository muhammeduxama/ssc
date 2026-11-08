const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function chat({ invited = true, assigned = false, owner = 10n, accessible = true } = {}) {
  const writes = [];
  const alerts = [];
  const db = {
    orders: { findFirst: async () => accessible ? { id: 1n } : null, findUnique: async () => ({ user_id: owner, token: 'example', orderassigns: [] }) },
    orderassigns: { findFirst: async () => assigned ? { id: 1n } : null },
    orderrequests: { findFirst: async () => invited ? { id: 1n } : null },
    users: { findUnique: async ({ where }) => ({ id: where.id, role_id: 1n, fname: 'Test', lname: 'User', email: 'test@example.com' }) },
    resolutions: { create: async ({ data }) => { writes.push(data); return { id: 100n }; } },
    adminresolutions: { create: async ({ data }) => { writes.push(data); return { id: 200n }; } },
  };
  const exports = {};
  const dependencies = {
    './pwa/notify': { notifyMessage: async (...args) => alerts.push(args) },
    'server-only': {}, './db': { db }, './session': { isStaff: (s) => s.kind === 'admin' },
    './queries': { orderScope: () => ({}) }, './format': {},
    './mail/send': { queueMail: () => {} }, './mail/templates': { messageCenter: () => ({}), adminMechanicChat: () => ({}) },
  };
  const source = ts.transpileModule(fs.readFileSync('src/lib/chat.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (id) => {
    if (!(id in dependencies)) throw new Error(`Unexpected import ${id}`);
    return dependencies[id];
  } });
  return { api: exports, writes, alerts };
}
const customer = { kind: 'user', id: '10', role: 'customer' };
const mechanic = { kind: 'user', id: '20', role: 'mechanic' };

test('rejects malformed, negative, zero and unsafe thread identifiers', () => {
  const { api } = chat();
  for (const key of ['1:p:20:extra', '-1:s:10', '0:s:10', '1:x:20', '1:p:0', '9007199254740992:p:20', '1:p:1e2']) assert.equal(api.parseKey(key), null, key);
  assert.equal(api.parseKey('1:p:20').userId, 20);
});
test('customer can message an invited mechanic and text is trimmed', async () => {
  const { api, writes, alerts } = chat();
  assert.equal(await api.sendMessage(customer, '1:p:20', ' Hello '), true);
  assert.equal(writes[0].message, 'Hello');
  assert.equal(writes[0].receiver_id, 20n);
  assert.deepEqual(alerts[0], [1, 'user:20', '1:p:10', 'direct-message:100']);
});
test('customer cannot message an unrelated mechanic', async () => {
  const { api, writes, alerts } = chat({ invited: false });
  assert.equal(await api.sendMessage(customer, '1:p:30', 'Hello'), false);
  assert.equal(writes.length, 0);
  assert.equal(alerts.length, 0);
});
test('mechanic cannot message another mechanic on a customer booking', async () => {
  const { api, writes } = chat();
  assert.equal(await api.sendMessage(mechanic, '1:p:30', 'Hello'), false);
  assert.equal(writes.length, 0);
});
test('assigned mechanic can message the booking owner', async () => {
  const { api } = chat({ invited: false, assigned: true });
  assert.equal(await api.sendMessage(mechanic, '1:p:10', 'Hello'), true);
});
test('users cannot send in someone else’s support thread or to themselves', async () => {
  const { api, writes } = chat();
  assert.equal(await api.sendMessage(customer, '1:s:20', 'Hello'), false);
  assert.equal(await api.sendMessage(customer, '1:p:10', 'Hello'), false);
  assert.equal(writes.length, 0);
});

test('customer cannot open or send support messages on an inaccessible booking', async () => {
  const { api, writes } = chat({ accessible: false });
  assert.equal(await api.resolveThread(customer, '1:s:10'), null);
  assert.equal(await api.sendMessage(customer, '1:s:10', 'Hello'), false);
  assert.equal(writes.length, 0);
});
test('staff cannot send a private customer-to-mechanic message', async () => {
  const { api, writes } = chat();
  assert.equal(await api.sendMessage({kind:'admin', id:'1', role:'admin'}, '1:p:20', 'Hello'), false);
  assert.equal(writes.length, 0);
});
