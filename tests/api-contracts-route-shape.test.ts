import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'

import contractCacheService from '../server/services/ContractCacheService'
import apiRoutes from '../server/routes/api'

let server: ReturnType<ReturnType<typeof express>['listen']>
let baseUrl: string
let originalListContracts: typeof contractCacheService.listContracts

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api', apiRoutes);

  return await new Promise<{ server: typeof server; baseUrl: string }>((resolve) => {
    const s = app.listen(0, () => {
      const { port } = (s.address() as { port: number });
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
  await new Promise<void>((resolve, reject) => {
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
