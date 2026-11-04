import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('range options deduplicate engines after formatting and keep numeric order', async () => {
  const db = {
    makes: { findMany: async () => [{ name: 'Nissan' }] },
    fuels: { findMany: async () => [{ fuel: 'Petrol' }] },
    engines: { findMany: async () => ['0.7', '0.70', '0.74', '10', '2', '2.0'].map(name => ({ name })) },
    years: { aggregate: async () => ({ _min: { start: 2020 }, _max: { end: 2021 } }) },
  };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/lib/admin/prices.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: id => {
    if (id === 'server-only') return {};
    if (id === '@/lib/db') return { db };
    throw new Error(`Unexpected import ${id}`);
  } });
  const options = await exports.rangeOptions();
  assert.deepEqual(Array.from(options.engines), ['0.7', '2.0', '10.0']);
  assert.deepEqual(Array.from(options.years), [2020, 2021]);
  assert.deepEqual(Array.from(options.makes), ['Nissan']);
  assert.deepEqual(Array.from(options.fuels), ['Petrol']);
});
