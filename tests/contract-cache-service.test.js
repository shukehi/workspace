const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const TEST_DB = path.join('/tmp', 'order-search-contract-cache.test.sqlite');
process.env.DB_STORAGE = TEST_DB;

const { sequelize, ErpContract } = require('../server/models');
const contractCacheService = require('../server/services/ContractCacheService');

const TEST_CODE = `C-${Date.now()}`;

test('ContractCacheService create/update/lookup', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const payload = {
    code: TEST_CODE,
    customerName: '外贸程总(三部)',
    orderDate: '2025年12月26日',
    advanceDate: '2026年01月26日',
    count: '570/570',
    totalAmount: 522580,
    list: [{ No: '1', sx: '90P35锌合金锁芯扣封', qty: '60/60' }]
  };

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

test.after(async () => {
  await ErpContract.destroy({ where: { contract_code: TEST_CODE } });
  await sequelize.close();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

