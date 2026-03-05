const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const routePath = require.resolve('../server/routes/print');

let server;
let baseUrl;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api/print', require(routePath));

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
  const started = await startServer();
  server = started.server;
  baseUrl = started.baseUrl;
});

test('POST/GET /api/print/snapshots can store and load snapshot payload', async () => {
  const createRes = await fetch(`${baseUrl}/api/print/snapshots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      poNumber: 'PO-SNAPSHOT-001',
      category: '包装',
      printMode: 'compact',
      order: {
        code: 'PO-SNAPSHOT-001',
        list: [{ name: '测试明细', quantity: 1 }],
      },
    }),
  });

  assert.equal(createRes.status, 200);
  const createBody = await createRes.json();
  assert.equal(createBody.success, true);
  assert.ok(createBody.data.snapshotId);

  const snapshotId = createBody.data.snapshotId;
  const getRes = await fetch(`${baseUrl}/api/print/snapshots/${encodeURIComponent(snapshotId)}`);
  assert.equal(getRes.status, 200);

  const getBody = await getRes.json();
  assert.equal(getBody.success, true);
  assert.equal(getBody.data.snapshotId, snapshotId);
  assert.equal(getBody.data.payload.poNumber, 'PO-SNAPSHOT-001');
  assert.equal(getBody.data.payload.printMode, 'compact');
});

test('GET /api/print/snapshots/:id returns 404 for missing snapshot', async () => {
  const res = await fetch(`${baseUrl}/api/print/snapshots/not-found`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.success, false);
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  delete require.cache[routePath];
});
