const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const contractCacheService = require('../server/services/ContractCacheService');
const apiRoutes = require('../server/routes/api');

let server;
let baseUrl;
let originalListContracts;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api', apiRoutes);

  return await new Promise((resolve) => {
    const s = app.listen(0, () => {
      const { port } = s.address();
      resolve({
        server: s,
        baseUrl: `http://127.0.0.1:${port}`,
      });
    });
  });
}

test.before(async () => {
  originalListContracts = contractCacheService.listContracts;
  contractCacheService.listContracts = async () => ({
    rows: [{ contract_code: 'CT-001' }],
    total: 1,
    page: 1,
    pageSize: 20,
  });

  const started = await startServer();
  server = started.server;
  baseUrl = started.baseUrl;
});

test.after(async () => {
  contractCacheService.listContracts = originalListContracts;
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

test('GET /api/contracts keeps rows and total at the top level for current consumers', async () => {
  const res = await fetch(`${baseUrl}/api/contracts?page=1&pageSize=20`);
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.success, true);
  assert.deepEqual(body.rows, [{ contract_code: 'CT-001' }]);
  assert.equal(body.total, 1);
  assert.equal(body.page, 1);
  assert.equal(body.pageSize, 20);
  assert.equal(body.data, undefined);
});
