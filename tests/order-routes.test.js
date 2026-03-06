const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const tempDbPath = path.join(os.tmpdir(), `order-routes-${Date.now()}.sqlite`);
process.env.DB_STORAGE = tempDbPath;

const { initDB, sequelize } = require('../server/models');
const orderRoutes = require('../server/routes/order');

let server;
let baseUrl;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api/orders', orderRoutes);

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
  await initDB();
  const started = await startServer();
  server = started.server;
  baseUrl = started.baseUrl;
});

test('POST /api/orders returns normalized plain order payload with created_at and items', async () => {
  const createdAt = '2026-03-06T08:10:00.000Z';
  const res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_no: 'ROUTE-PO-001',
      supplier: '方亮包装',
      category: '包装',
      status: 'draft',
      remark: 'route create',
      metadata: { source: 'route-test' },
      created_at: createdAt,
      items: [
        {
          name: '包装A',
          model: '960*2050/7/内开外包',
          spec: '960*2050/7/内开外包',
          supplier: '方亮包装',
          quantity: 2,
          unit: '套',
        },
      ],
    }),
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(typeof body.id, 'number');
  assert.equal(body.order_no, 'ROUTE-PO-001');
  assert.equal(body.created_at, createdAt);
  assert.equal(Array.isArray(body.items), true);
  assert.equal(body.items.length, 1);
  assert.equal(typeof body.total_amount, 'number');
  assert.equal(body.items[0].name, '包装A');
});

test('PUT /api/orders/:id keeps normalized order payload shape', async () => {
  const createRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_no: 'ROUTE-PO-002',
      supplier: '应志友',
      category: '锁叉',
      status: 'draft',
      remark: '',
      created_at: '2026-03-06T08:11:00.000Z',
      items: [
        {
          name: '锁叉A',
          model: '570*301 = 871',
          spec: '570*301 = 871',
          supplier: '应志友',
          quantity: 1,
          unit: '个',
        },
      ],
    }),
  });
  const created = await createRes.json();

  const updatedAt = '2026-03-06T08:12:00.000Z';
  const updateRes = await fetch(`${baseUrl}/api/orders/${created.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'processing',
      created_at: updatedAt,
    }),
  });

  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.equal(updated.id, created.id);
  assert.equal(updated.status, 'processing');
  assert.equal(updated.created_at, updatedAt);
  assert.equal(Array.isArray(updated.items), true);
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await sequelize.close();
  if (fs.existsSync(tempDbPath)) {
    fs.unlinkSync(tempDbPath);
  }
});
