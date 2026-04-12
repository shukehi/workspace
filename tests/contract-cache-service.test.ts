import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url);
const TEST_DB = path.join(os.tmpdir(), `test-${crypto.randomBytes(8).toString('hex')}.sqlite`);

// Purge cache and set environment before requiring models
const purgeDatabaseCache = () => {
  Object.keys(_require.cache).forEach((key) => {
    if (key.includes('/server/config/database') || key.includes('/server/models/')) {
      delete _require.cache[key];
    }
  });
};
purgeDatabaseCache();
process.env.DB_STORAGE = TEST_DB;

const { sequelize, ErpContract } = _require('../server/models') as typeof import('../server/models');
const contractCacheService = _require('../server/services/ContractCacheService').default as typeof import('../server/services/ContractCacheService').default;

function buildPayload(code: string, customerName: string, totalAmount = 1000) {
  return {
    code,
    customerName,
    orderDate: '2025年12月26日',
    advanceDate: '2026年01月26日',
    count: '10/10',
    totalAmount,
    list: [{ No: '1', qty: '10/10' }],
  };
}

test.before(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
});

test('contractCacheService cacheContract creates, updates, and getByCode returns latest payload', async () => {
  const created = await contractCacheService.cacheContract(buildPayload('CT-001', '客户A', 1000));
  assert.equal(created.status, 'created');
  assert.equal(created.contract.get('contract_code'), 'CT-001');

  const unchanged = await contractCacheService.cacheContract(buildPayload('CT-001', '客户A', 1000));
  assert.equal(unchanged.status, 'unchanged');

  const updated = await contractCacheService.cacheContract(buildPayload('CT-001', '客户A', 2000));
  assert.equal(updated.status, 'updated');

  const cached = await contractCacheService.getByCode('CT-001');
  assert.ok(cached);
  assert.equal(cached!.get('contract_code'), 'CT-001');
  assert.equal(cached!.get('total_amount'), 2000);
});

test('contractCacheService listContracts filters by code and customer', async () => {
  await contractCacheService.cacheContract(buildPayload('CT-A', '客户甲', 1000));
  await contractCacheService.cacheContract(buildPayload('CT-B', '客户乙', 2000));
  await contractCacheService.cacheContract(buildPayload('CT-C', '客户甲', 3000));

  const filteredByCode = await contractCacheService.listContracts({ code: 'CT-B' });
  assert.equal(filteredByCode.total, 1);
  assert.equal(filteredByCode.rows[0].get('contract_code'), 'CT-B');

  const filteredByCustomer = await contractCacheService.listContracts({ customer: '客户甲' });
  assert.equal(filteredByCustomer.total, 2);
  assert.ok(filteredByCustomer.rows.every((row: any) => row.get('customer_name') === '客户甲'));
});

test.after(async () => {
  await sequelize.close();
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
});
