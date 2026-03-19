import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'

const TEST_DB = path.join('/tmp', 'order-search-contract-cache.test.sqlite');
process.env.DB_STORAGE = TEST_DB;

const { sequelize, ErpContract } = require('../server/models') as typeof import('../server/models');
const contractCacheService = require('../server/services/ContractCacheService') as typeof import('../server/services/ContractCacheService').default;

const TEST_CODE = `C-${Date.now()}`;

function buildPayload(code: string, customerName: string, totalAmount = 1000) {
  return {
    code,
    customerName,
    orderDate: '2025年12月26日',
    advanceDate: '2026年01月26日',
    count: '10/10',
    totalAmount,
    list: [{ No: '1', qty: '10/10' }]
  };
}

test('ContractCacheService create/update/lookup', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const payload = buildPayload(TEST_CODE, '外贸程总(三部)', 522580);

  const created = await contractCacheService.cacheContract(payload);
  assert.equal(created.status, 'created');
  assert.equal(created.contract.contract_code, TEST_CODE);

  const unchanged = await contractCacheService.cacheContract(payload);
  assert.equal(unchanged.status, 'unchanged');

  const updatedPayload = { ...payload, totalAmount: 600000 };
  const updated = await contractCacheService.cacheContract(updatedPayload);
  assert.equal(updated.status, 'updated');
  assert.equal(updated.contract.total_amount, 600000);

  const fetched = await contractCacheService.getByCode(TEST_CODE);
  assert.ok(fetched);
  assert.equal(fetched.contract_code, TEST_CODE);
  assert.equal(fetched.raw_json.totalAmount, 600000);
});

test('ContractCacheService listContracts pagination/filter/sort', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const codeA = `HC-A-${Date.now()}`;
  const codeB = `HC-B-${Date.now()}`;
  const codeC = `HC-C-${Date.now()}`;

  await contractCacheService.cacheContract(buildPayload(codeA, '客户甲', 1000));
  await contractCacheService.cacheContract(buildPayload(codeB, '客户乙', 2000));
  await contractCacheService.cacheContract(buildPayload(codeC, '客户甲', 3000));

  await ErpContract.update({ last_fetched_at: new Date('2026-01-01T08:00:00Z') }, { where: { contract_code: codeA } });
  await ErpContract.update({ last_fetched_at: new Date('2026-01-03T08:00:00Z') }, { where: { contract_code: codeB } });
  await ErpContract.update({ last_fetched_at: new Date('2026-01-02T08:00:00Z') }, { where: { contract_code: codeC } });

  const pageOne = await contractCacheService.listContracts({ page: 1, pageSize: 2 });
  assert.equal(pageOne.total, 3);
  assert.equal(pageOne.rows.length, 2);
  assert.equal(pageOne.rows[0].contract_code, codeB);
  assert.equal(pageOne.rows[1].contract_code, codeC);

  const pageTwo = await contractCacheService.listContracts({ page: 2, pageSize: 2 });
  assert.equal(pageTwo.rows.length, 1);
  assert.equal(pageTwo.rows[0].contract_code, codeA);

  const filteredByCode = await contractCacheService.listContracts({ code: 'HC-B-' });
  assert.equal(filteredByCode.total, 1);
  assert.equal(filteredByCode.rows[0].contract_code, codeB);

  const filteredByCustomer = await contractCacheService.listContracts({ customer: '客户甲' });
  assert.equal(filteredByCustomer.total, 2);
  assert.ok(filteredByCustomer.rows.every((row) => row.customer_name === '客户甲'));
});

test.after(async () => {
  await ErpContract.destroy({ where: {} });
  await sequelize.close();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});
