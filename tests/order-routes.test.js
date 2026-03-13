const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const tempDbPath = path.join(os.tmpdir(), `order-routes-${Date.now()}.sqlite`);
process.env.DB_STORAGE = tempDbPath;

const { initDB, sequelize, Material } = require('../server/models');
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
  assert.equal(body.items[0].ordered_quantity, 2);
  assert.equal(body.items[0].received_quantity, 0);
});

test('POST /api/orders ignores client supplied receipt progress fields', async () => {
  const res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_no: 'ROUTE-PO-QTY-GUARD-001',
      supplier: '方亮包装',
      category: '包装',
      status: 'draft',
      items: [
        {
          name: '包装A',
          model: 'M-1',
          quantity: 3,
          ordered_quantity: 99,
          received_quantity: 77,
          unit: '套',
        },
      ],
    }),
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.items[0].ordered_quantity, 3);
  assert.equal(body.items[0].received_quantity, 0);
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
      status: 'submitted',
      created_at: updatedAt,
    }),
  });

  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.equal(updated.id, created.id);
  assert.equal(updated.status, 'submitted');
  assert.equal(updated.created_at, updatedAt);
  assert.equal(Array.isArray(updated.items), true);
});

test('POST /api/orders/:id/arrive marks processing order as arrived', async () => {
  const createRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_no: 'ROUTE-PO-ARRIVE-001',
      supplier: '汇成',
      category: '锁具',
      status: 'processing',
      remark: '',
      created_at: '2026-03-12T08:13:00.000Z',
      delivery_date: '2026-03-18T00:00:00.000Z',
      items: [
        {
          name: '锁体A',
          model: '主锁',
          spec: '主锁',
          supplier: '汇成',
          quantity: 1,
          unit: '把',
        },
      ],
    }),
  });
  const created = await createRes.json();

  const arriveRes = await fetch(`${baseUrl}/api/orders/${created.id}/arrive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      arrived_at: '2026-03-12T08:14:00.000Z',
      arrived_by: '采购员A',
      arrived_remark: '已到货'
    }),
  });

  assert.equal(arriveRes.status, 200);
  const arrived = await arriveRes.json();
  assert.equal(arrived.status, 'arrived');
  assert.equal(arrived.arrived_by, '采购员A');
  assert.equal(arrived.arrived_at, '2026-03-12T08:14:00.000Z');
  assert.equal(arrived.delivery_date, '2026-03-18T00:00:00.000Z');
});

test('PUT /api/orders/:id rejects invalid status transition', async () => {
  const createRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_no: 'ROUTE-PO-INVALID-001',
      supplier: '方亮包装',
      category: '包装',
      status: 'draft',
      remark: '',
      created_at: '2026-03-12T08:15:00.000Z',
      items: [
        {
          name: '包装A',
          model: '960*2050/7/内开外包',
          spec: '960*2050/7/内开外包',
          supplier: '方亮包装',
          quantity: 1,
          unit: '套',
        },
      ],
    }),
  });
  const created = await createRes.json();

  const updateRes = await fetch(`${baseUrl}/api/orders/${created.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'completed',
    }),
  });

  assert.equal(updateRes.status, 400);
  const body = await updateRes.json();
  assert.equal(body.error, 'INVALID_STATUS_TRANSITION');
  assert.equal(body.fromStatus, 'draft');
  assert.equal(body.toStatus, 'completed');
});

test('PUT /api/orders/:id rejects detail edits for arrived orders', async () => {
  const createRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_no: 'ROUTE-PO-LOCKED-001',
      supplier: '汇成',
      category: '锁具',
      status: 'arrived',
      items: [
        {
          material_id: 'ROUTE-MAT-LOCKED',
          name: '锁体A',
          model: '主锁',
          spec: '主锁',
          supplier: '汇成',
          quantity: 1,
          unit: '把',
        },
      ],
    }),
  });
  const created = await createRes.json();

  const updateRes = await fetch(`${baseUrl}/api/orders/${created.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supplier: '新供应商',
      items: [
        {
          ...created.items[0],
          quantity: 2,
        },
      ],
    }),
  });

  assert.equal(updateRes.status, 400);
  const body = await updateRes.json();
  assert.equal(body.error, 'ORDER_EDIT_LOCKED');
  assert.equal(body.status, 'arrived');
  assert.deepEqual(body.fields, ['supplier', 'items']);
});

test('POST /api/orders/:id/stock-in updates inventory and completes order', async () => {
  await Material.create({
    code: 'ROUTE-MAT-001',
    name: 'Route Material',
    model: 'RM-1',
    supplier: '汇成',
    stock_quantity: 2,
    min_stock: 1,
    unit: '把',
  });

  const createRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_no: 'ROUTE-PO-STOCKIN-001',
      supplier: '汇成',
      category: '锁具',
      status: 'arrived',
      arrived_at: '2026-03-12T08:16:00.000Z',
      items: [
        {
          material_id: 'ROUTE-MAT-001',
          name: 'Route Material',
          model: 'RM-1',
          spec: 'RM-1',
          supplier: '汇成',
          quantity: 4,
          unit: '把',
        },
      ],
    }),
  });
  const created = await createRes.json();

  const stockInRes = await fetch(`${baseUrl}/api/orders/${created.id}/stock-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stocked_in_at: '2026-03-12T08:17:00.000Z',
      operator: '仓管A',
      remark: '已入库'
    }),
  });

  assert.equal(stockInRes.status, 200);
  const stockedIn = await stockInRes.json();
  assert.equal(stockedIn.status, 'completed');
  assert.equal(stockedIn.stocked_in_by, '仓管A');
  assert.equal(stockedIn.stocked_in_at, '2026-03-12T08:17:00.000Z');
  assert.equal(stockedIn.items[0].ordered_quantity, 4);
  assert.equal(stockedIn.items[0].received_quantity, 4);
});

test('POST /api/orders/:id/stock-in supports explicit partial receipt items', async () => {
  await Material.bulkCreate([
    {
      code: 'ROUTE-MAT-PARTIAL-001',
      name: 'Route Partial A',
      model: 'RPA-1',
      supplier: '汇成',
      stock_quantity: 2,
      min_stock: 0,
      unit: '把',
    },
    {
      code: 'ROUTE-MAT-PARTIAL-002',
      name: 'Route Partial B',
      model: 'RPB-1',
      supplier: '汇成',
      stock_quantity: 4,
      min_stock: 0,
      unit: '把',
    }
  ]);

  const createRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_no: 'ROUTE-PO-STOCKIN-PARTIAL-001',
      supplier: '汇成',
      category: '锁具',
      status: 'arrived',
      items: [
        {
          material_id: 'ROUTE-MAT-PARTIAL-001',
          name: 'Route Partial A',
          model: 'RPA-1',
          spec: 'RPA-1',
          supplier: '汇成',
          quantity: 3,
          unit: '把',
        },
        {
          material_id: 'ROUTE-MAT-PARTIAL-002',
          name: 'Route Partial B',
          model: 'RPB-1',
          spec: 'RPB-1',
          supplier: '汇成',
          quantity: 2,
          unit: '把',
        },
      ],
    }),
  });
  const created = await createRes.json();

  const firstStockInRes = await fetch(`${baseUrl}/api/orders/${created.id}/stock-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stocked_in_at: '2026-03-12T08:18:00.000Z',
      operator: '仓管P1',
      items: [
        {
          order_item_id: created.items[0].id,
          item_key: created.items[0].item_key,
          quantity: 1,
        },
      ],
    }),
  });

  assert.equal(firstStockInRes.status, 200);
  const firstBody = await firstStockInRes.json();
  assert.equal(firstBody.status, 'arrived');
  assert.equal(firstBody.items[0].received_quantity, 1);
  assert.equal(firstBody.items[1].received_quantity, 0);
  assert.equal(firstBody.stocked_in_at, null);
  assert.equal(firstBody.stocked_in_by ?? null, null);

  const finalStockInRes = await fetch(`${baseUrl}/api/orders/${created.id}/stock-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stocked_in_at: '2026-03-12T08:19:00.000Z',
      operator: '仓管P2',
      items: [
        {
          order_item_id: firstBody.items[0].id,
          item_key: firstBody.items[0].item_key,
          quantity: 2,
        },
        {
          order_item_id: firstBody.items[1].id,
          item_key: firstBody.items[1].item_key,
          quantity: 2,
        },
      ],
    }),
  });

  assert.equal(finalStockInRes.status, 200);
  const finalBody = await finalStockInRes.json();
  assert.equal(finalBody.status, 'completed');
  assert.equal(finalBody.items[0].received_quantity, 3);
  assert.equal(finalBody.items[1].received_quantity, 2);
});

test('POST /api/orders/:id/stock-in falls back to quantity when ordered_quantity is zero on legacy items', async () => {
  await Material.create({
    code: 'ROUTE-LEGACY-ORDERED-001',
    name: 'Legacy Route Material',
    model: 'RLM-1',
    supplier: '忠恒',
    stock_quantity: 0,
    min_stock: 0,
    unit: '套',
  });

  const createRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_no: 'ROUTE-PO-LEGACY-ORDERED-001',
      supplier: '忠恒',
      category: '锁芯',
      status: 'arrived',
      items: [
        {
          material_id: 'ROUTE-LEGACY-ORDERED-001',
          name: 'Legacy Route Material',
          model: 'RLM-1',
          spec: 'RLM-1',
          supplier: '忠恒',
          quantity: 24,
          unit: '套',
        },
      ],
    }),
  });
  const created = await createRes.json();

  await sequelize.models.OrderItem.update(
    { ordered_quantity: 0, received_quantity: 0 },
    { where: { order_id: created.id } }
  );

  const stockInRes = await fetch(`${baseUrl}/api/orders/${created.id}/stock-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stocked_in_at: '2026-03-12T14:00:00.000Z',
      operator: '仓管Legacy',
    }),
  });

  assert.equal(stockInRes.status, 200);
  const stockedIn = await stockInRes.json();
  assert.equal(stockedIn.status, 'completed');
  assert.equal(stockedIn.items[0].ordered_quantity, 24);
  assert.equal(stockedIn.items[0].received_quantity, 24);
});

test('POST /api/orders/:id/stock-in rejects explicit empty receipt items', async () => {
  await Material.create({
    code: 'ROUTE-MAT-EMPTY-ITEMS-001',
    name: 'Route Empty Items',
    model: 'REI-1',
    supplier: '汇成',
    stock_quantity: 0,
    min_stock: 0,
    unit: '把',
  });

  const createRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_no: 'ROUTE-PO-STOCKIN-EMPTY-ITEMS-001',
      supplier: '汇成',
      category: '锁具',
      status: 'arrived',
      items: [
        {
          material_id: 'ROUTE-MAT-EMPTY-ITEMS-001',
          name: 'Route Empty Items',
          model: 'REI-1',
          spec: 'REI-1',
          supplier: '汇成',
          quantity: 2,
          unit: '把',
        },
      ],
    }),
  });
  const created = await createRes.json();

  const stockInRes = await fetch(`${baseUrl}/api/orders/${created.id}/stock-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stocked_in_at: '2026-03-12T08:20:00.000Z',
      operator: '仓管Empty',
      items: [],
    }),
  });

  assert.equal(stockInRes.status, 400);
  const body = await stockInRes.json();
  assert.equal(body.error, 'ORDER_ITEMS_REQUIRED');
});

test('POST /api/orders/:id/stock-in rejects arrived orders without items', async () => {
  const createRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_no: 'ROUTE-PO-STOCKIN-EMPTY-001',
      supplier: '汇成',
      category: '锁具',
      status: 'arrived',
      arrived_at: '2026-03-12T08:18:00.000Z',
      items: [],
    }),
  });
  const created = await createRes.json();

  const stockInRes = await fetch(`${baseUrl}/api/orders/${created.id}/stock-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stocked_in_at: '2026-03-12T08:19:00.000Z',
      operator: '仓管B',
    }),
  });

  assert.equal(stockInRes.status, 400);
  const body = await stockInRes.json();
  assert.equal(body.error, 'ORDER_ITEMS_REQUIRED');
});

test('POST /api/orders/:id/stock-in rejects received quantity overflow', async () => {
  const material = await Material.create({
    code: 'ROUTE-MAT-OVERFLOW-001',
    name: 'Overflow Material',
    model: 'OM-1',
    supplier: '汇成',
    stock_quantity: 1,
    min_stock: 0,
    unit: '把',
  });

  const createRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_no: 'ROUTE-PO-STOCKIN-OVERFLOW-001',
      supplier: '汇成',
      category: '锁具',
      status: 'arrived',
      items: [
        {
          material_id: material.code,
          name: 'Overflow Material',
          model: 'OM-1',
          spec: 'OM-1',
          supplier: '汇成',
          quantity: 2,
          unit: '把',
        },
      ],
    }),
  });
  const created = await createRes.json();

  await sequelize.models.OrderItem.update(
    { ordered_quantity: 2, received_quantity: 2 },
    { where: { order_id: created.id } }
  );

  const stockInRes = await fetch(`${baseUrl}/api/orders/${created.id}/stock-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stocked_in_at: '2026-03-12T08:21:00.000Z',
      operator: '仓管C',
      items: [
        {
          order_item_id: created.items[0].id,
          item_key: created.items[0].item_key,
          quantity: 2,
        },
      ],
    }),
  });

  assert.equal(stockInRes.status, 400);
  const body = await stockInRes.json();
  assert.equal(body.error, 'RECEIVED_QUANTITY_EXCEEDED');
  assert.equal(body.orderedQuantity, 2);
  assert.equal(body.nextReceivedQuantity, 4);
});

test('POST /api/orders/:id/stock-in rejects explicit item key mismatch', async () => {
  await Material.create({
    code: 'ROUTE-MAT-MISMATCH-001',
    name: 'Mismatch Material',
    model: 'MM-1',
    supplier: '汇成',
    stock_quantity: 0,
    min_stock: 0,
    unit: '把',
  });

  const createRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_no: 'ROUTE-PO-STOCKIN-MISMATCH-001',
      supplier: '汇成',
      category: '锁具',
      status: 'arrived',
      items: [
        {
          material_id: 'ROUTE-MAT-MISMATCH-001',
          name: 'Mismatch Material',
          model: 'MM-1',
          spec: 'MM-1',
          supplier: '汇成',
          quantity: 1,
          unit: '把',
        },
      ],
    }),
  });
  const created = await createRes.json();

  const stockInRes = await fetch(`${baseUrl}/api/orders/${created.id}/stock-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [
        {
          order_item_id: created.items[0].id,
          item_key: 'WRONG|KEY|VALUE',
          quantity: 1,
        },
      ],
    }),
  });

  assert.equal(stockInRes.status, 400);
  const body = await stockInRes.json();
  assert.equal(body.error, 'ORDER_ITEM_KEY_MISMATCH');
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
