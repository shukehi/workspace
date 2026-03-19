import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import type { Router } from 'express'

const TEST_DB = path.join('/tmp', 'order-search-inventory-route.test.sqlite');
process.env.DB_STORAGE = TEST_DB;

const { sequelize, Material, Order, OrderItem } = require('../server/models') as typeof import('../server/models');
import type { MaterialInstance } from '../server/models';
const inventoryRoutes = require('../server/routes/inventory') as Router;
const inventoryReceiptRoutes = require('../server/routes/inventoryReceipts') as Router;
const orderService = require('../server/services/orders') as typeof import('../server/services/orders').default;

function getBody(raw: Record<string, unknown>) {
  return raw?.data !== undefined ? raw.data : raw;
}

const createdMaterialIds: number[] = [];
let server: ReturnType<ReturnType<typeof express>['listen']>
let baseUrl: string

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/inventory-receipts', inventoryReceiptRoutes);

  return await new Promise<{ server: typeof server; baseUrl: string }>((resolve) => {
    const s = app.listen(0, () => {
      const { port } = (s.address() as { port: number });
      resolve({
        server: s,
        baseUrl: `http://127.0.0.1:${port}`
      });
    });
  });
}

test.before(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
  const started = await startServer();
  server = started.server;
  baseUrl = started.baseUrl;
});

test('GET /api/inventory and PUT /api/inventory/:id', async () => {
  const material = await Material.create({
    code: `TEST-MAT-${Date.now()}`,
    name: 'Inventory Test Material',
    model: 'INV-MODEL',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 12,
    min_stock: 5
  }) as MaterialInstance;

  createdMaterialIds.push(material.id);

  const listRes = await fetch(`${baseUrl}/api/inventory`);
  assert.equal(listRes.status, 200);
  const list = getBody(await listRes.json()) as { id: number; stock_quantity: number }[];

  const found = list.find((x) => x.id === material.id);
  assert.ok(found);
  assert.equal(typeof found.id, 'number');
  assert.equal(found.stock_quantity, 12);

  const updateRes = await fetch(`${baseUrl}/api/inventory/${material.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock_quantity: 99, min_stock: 20 })
  });

  assert.equal(updateRes.status, 200);
  const updated = getBody(await updateRes.json()) as { stock_quantity: number; min_stock: number };
  assert.equal(updated.stock_quantity, 99);
  assert.equal(updated.min_stock, 20);
});

test('PUT /api/inventory/:id rejects invalid stock values with validation error', async () => {
  const res = await fetch(`${baseUrl}/api/inventory/1`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock_quantity: 'oops' })
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'VALIDATION_ERROR');
  assert.equal(Array.isArray(body.issues), true);
  assert.equal(body.issues[0].target, 'body');
  assert.equal(body.issues[0].field, 'stock_quantity');
});

test('PUT /api/inventory/:id rejects invalid id param with validation error', async () => {
  const res = await fetch(`${baseUrl}/api/inventory/not-a-number`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock_quantity: 10 })
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'VALIDATION_ERROR');
  assert.equal(Array.isArray(body.issues), true);
  assert.equal(body.issues[0].target, 'params');
  assert.equal(body.issues[0].field, 'id');
});

test('GET /api/inventory-receipts returns stock-in records', async () => {
  const material = await Material.create({
    code: `TEST-MAT-RECEIPT-${Date.now()}`,
    name: 'Receipt Material',
    model: 'R-MODEL',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 3,
    min_stock: 1
  }) as MaterialInstance;

  const order = await orderService.createOrder({
    order_no: `RECEIPT-PO-${Date.now()}`,
    supplier: 'Inventory Supplier',
    category: '测试',
    status: 'arrived',
    items: [
      {
        material_id: material.code,
        supplier: 'Inventory Supplier',
        name: 'Receipt Material',
        model: 'R-MODEL',
        spec: 'R-MODEL',
        quantity: 2,
        unit: 'pcs',
      }
    ]
  });

  await orderService.stockInOrder(order.id, {
    stocked_in_at: '2026-03-12T12:00:00.000Z',
    operator: '仓管A',
    remark: '测试入库'
  });

  const listRes = await fetch(`${baseUrl}/api/inventory-receipts?orderId=${order.id}`);
  assert.equal(listRes.status, 200);
  const payload = getBody(await listRes.json()) as { total: number; page: number; rows: { order_id: number; material_id: string; operator: string }[] };
  assert.equal(payload.total, 1);
  assert.equal(payload.page, 1);
  assert.equal(payload.rows.length, 1);
  assert.equal(payload.rows[0].order_id, order.id);
  assert.equal(payload.rows[0].material_id, material.code);
  assert.equal(payload.rows[0].operator, '仓管A');

  const refreshed = await orderService.getOrderById(order.id);
  assert.equal(refreshed.items[0].ordered_quantity, 2);
  assert.equal(refreshed.items[0].received_quantity, 2);
});

test('GET /api/inventory-receipts/:id rejects invalid id param with validation error', async () => {
  const res = await fetch(`${baseUrl}/api/inventory-receipts/not-a-number`);

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'VALIDATION_ERROR');
  assert.equal(Array.isArray(body.issues), true);
  assert.equal(body.issues[0].target, 'params');
  assert.equal(body.issues[0].field, 'id');
});

test('GET /api/inventory-receipts/:id returns single receipt detail', async () => {
  const material = await Material.create({
    code: `TEST-MAT-DETAIL-${Date.now()}`,
    name: 'Detail Material',
    model: 'DETAIL-MODEL',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 1,
    min_stock: 0
  }) as MaterialInstance;

  const order = await orderService.createOrder({
    order_no: `DETAIL-PO-${Date.now()}`,
    supplier: 'Inventory Supplier',
    category: '测试',
    status: 'arrived',
    items: [
      {
        material_id: material.code,
        supplier: 'Inventory Supplier',
        name: 'Detail Material',
        model: 'DETAIL-MODEL',
        spec: 'DETAIL-MODEL',
        quantity: 3,
        unit: 'pcs',
      }
    ]
  });

  await orderService.stockInOrder(order.id, {
    stocked_in_at: '2026-03-13T09:00:00.000Z',
    operator: '仓管Detail',
    items: [
      {
        order_item_id: order.items[0].id,
        item_key: order.items[0].item_key,
        quantity: 2
      }
    ]
  });

  const listRes = await fetch(`${baseUrl}/api/inventory-receipts?orderId=${order.id}`);
  const listPayload = getBody(await listRes.json()) as { rows: { id: number }[] };
  const receipt = listPayload.rows[0];

  const detailRes = await fetch(`${baseUrl}/api/inventory-receipts/${receipt.id}`);
  assert.equal(detailRes.status, 200);
  const detail = getBody(await detailRes.json()) as { id: number; order_no: string; reversible_quantity: number };
  assert.equal(detail.id, receipt.id);
  assert.equal(detail.order_no, order.order_no);
  assert.equal(detail.reversible_quantity, 2);
});

test('POST /api/inventory-receipts/:id/reverse reverts stock and order status', async () => {
  const material = await Material.create({
    code: `TEST-MAT-REVERSE-${Date.now()}`,
    name: 'Reverse Material',
    model: 'REV-MODEL',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 10,
    min_stock: 1
  }) as MaterialInstance;

  const order = await orderService.createOrder({
    order_no: `REVERSE-PO-${Date.now()}`,
    supplier: 'Inventory Supplier',
    category: '测试',
    status: 'arrived',
    items: [
      {
        material_id: material.code,
        supplier: 'Inventory Supplier',
        name: 'Reverse Material',
        model: 'REV-MODEL',
        spec: 'REV-MODEL',
        quantity: 2,
        unit: 'pcs',
      }
    ]
  });

  await orderService.stockInOrder(order.id, {
    stocked_in_at: '2026-03-12T12:20:00.000Z',
    operator: '仓管A',
    remark: '测试入库'
  });

  const listRes = await fetch(`${baseUrl}/api/inventory-receipts?orderId=${order.id}`);
  const payload = getBody(await listRes.json()) as { rows: { id: number; direction: string }[] };
  const originalReceipt = payload.rows.find((item) => item.direction !== 'reversal');
  assert.ok(originalReceipt);

  const reverseRes = await fetch(`${baseUrl}/api/inventory-receipts/${originalReceipt.id}/reverse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reversed_at: '2026-03-12T12:30:00.000Z',
      operator: '仓管B',
      reverse_reason: 'entry_error',
      remark: '录入错误'
    })
  });

  assert.equal(reverseRes.status, 200);
  const reversed = getBody(await reverseRes.json()) as { direction: string; source_receipt_id: number; reverse_reason: string; quantity: number };
  assert.equal(reversed.direction, 'reversal');
  assert.equal(reversed.source_receipt_id, originalReceipt.id);
  assert.equal(reversed.reverse_reason, 'entry_error');
  assert.equal(reversed.quantity, -2);

  const refreshedMaterial = await Material.findByPk(material.id) as MaterialInstance | null;
  assert.equal(Number(refreshedMaterial!.stock_quantity), 10);

  const refreshedOrder = await orderService.getOrderById(order.id);
  assert.equal(refreshedOrder.status, 'arrived');
  assert.equal(refreshedOrder.items[0].received_quantity, 0);
});

test('POST /api/inventory-receipts/:id/reverse supports partial reversal and blocks overflow', async () => {
  const material = await Material.create({
    code: `TEST-MAT-PARTIAL-REV-${Date.now()}`,
    name: 'Partial Reverse Material',
    model: 'PRM',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 10,
    min_stock: 1
  }) as MaterialInstance;

  const order = await orderService.createOrder({
    order_no: `PARTIAL-REV-PO-${Date.now()}`,
    supplier: 'Inventory Supplier',
    category: '测试',
    status: 'arrived',
    items: [
      {
        material_id: material.code,
        supplier: 'Inventory Supplier',
        name: 'Partial Reverse Material',
        model: 'PRM',
        spec: 'PRM',
        quantity: 4,
        unit: 'pcs',
      }
    ]
  });

  await orderService.stockInOrder(order.id, {
    stocked_in_at: '2026-03-12T13:00:00.000Z',
    operator: '仓管A'
  });

  let listRes = await fetch(`${baseUrl}/api/inventory-receipts?orderId=${order.id}`);
  let payload = getBody(await listRes.json()) as { rows: { id: number; direction: string; reversible_quantity: number; reversed_quantity: number }[] };
  const originalReceipt = payload.rows.find((item) => item.direction !== 'reversal');
  assert.equal(originalReceipt!.reversible_quantity, 4);

  const firstReverseRes = await fetch(`${baseUrl}/api/inventory-receipts/${originalReceipt!.id}/reverse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reversed_at: '2026-03-12T13:10:00.000Z',
      reverse_reason: 'entry_error',
      quantity: 1
    })
  });
  assert.equal(firstReverseRes.status, 200);
  const firstReversal = getBody(await firstReverseRes.json()) as { quantity: number };
  assert.equal(firstReversal.quantity, -1);

  listRes = await fetch(`${baseUrl}/api/inventory-receipts?orderId=${order.id}`);
  payload = getBody(await listRes.json()) as { rows: { id: number; direction: string; reversible_quantity: number; reversed_quantity: number }[] };
  const refreshedOriginal = payload.rows.find((item) => item.id === originalReceipt!.id);
  assert.equal(refreshedOriginal!.reversed_quantity, 1);
  assert.equal(refreshedOriginal!.reversible_quantity, 3);

  const overflowRes = await fetch(`${baseUrl}/api/inventory-receipts/${originalReceipt!.id}/reverse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reversed_at: '2026-03-12T13:20:00.000Z',
      reverse_reason: 'entry_error',
      quantity: 5
    })
  });
  assert.equal(overflowRes.status, 400);
  const overflowBody = await overflowRes.json();
  assert.equal(overflowBody.error, 'REVERSE_QUANTITY_EXCEEDED');
  assert.equal(overflowBody.reversibleQuantity, 3);
  assert.equal(overflowBody.requestedQuantity, 5);
});

test('POST /api/inventory-receipts/:id/reverse requires reverse reason', async () => {
  const material = await Material.create({
    code: `TEST-MAT-REVERSE-REQ-${Date.now()}`,
    name: 'Reverse Req Material',
    model: 'REV-REQ',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 5,
    min_stock: 1
  }) as MaterialInstance;

  const order = await orderService.createOrder({
    order_no: `REVERSE-REQ-PO-${Date.now()}`,
    supplier: 'Inventory Supplier',
    category: '测试',
    status: 'arrived',
    items: [
      {
        material_id: material.code,
        supplier: 'Inventory Supplier',
        name: 'Reverse Req Material',
        model: 'REV-REQ',
        spec: 'REV-REQ',
        quantity: 1,
        unit: 'pcs',
      }
    ]
  });

  await orderService.stockInOrder(order.id, {
    stocked_in_at: '2026-03-12T12:40:00.000Z',
    operator: '仓管A'
  });

  const listRes = await fetch(`${baseUrl}/api/inventory-receipts?orderId=${order.id}`);
  const payload = getBody(await listRes.json()) as { rows: { id: number; direction: string }[] };
  const originalReceipt = payload.rows.find((item) => item.direction !== 'reversal');

  const reverseRes = await fetch(`${baseUrl}/api/inventory-receipts/${originalReceipt!.id}/reverse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reversed_at: '2026-03-12T12:45:00.000Z'
    })
  });

  assert.equal(reverseRes.status, 400);
  const body = await reverseRes.json();
  assert.equal(body.error, 'REVERSE_REASON_REQUIRED');
});

test('POST /api/inventory-receipts/:id/reverse rejects invalid quantity type with validation error', async () => {
  const res = await fetch(`${baseUrl}/api/inventory-receipts/1/reverse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quantity: 'oops'
    })
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'VALIDATION_ERROR');
  assert.equal(Array.isArray(body.issues), true);
  assert.equal(body.issues[0].target, 'body');
  assert.equal(body.issues[0].field, 'quantity');
});

test('GET /api/inventory-receipts keeps reversal stats correct under pagination and filters', async () => {
  const material = await Material.create({
    code: `TEST-MAT-PAGED-REV-${Date.now()}`,
    name: 'Paged Reverse Material',
    model: 'PAGED-REV',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 8,
    min_stock: 1
  }) as MaterialInstance;

  const order = await orderService.createOrder({
    order_no: `PAGED-REV-PO-${Date.now()}`,
    supplier: 'Inventory Supplier',
    category: '测试',
    status: 'arrived',
    items: [
      {
        material_id: material.code,
        supplier: 'Inventory Supplier',
        name: 'Paged Reverse Material',
        model: 'PAGED-REV',
        spec: 'PAGED-REV',
        quantity: 4,
        unit: 'pcs',
      }
    ]
  });

  await orderService.stockInOrder(order.id, {
    stocked_in_at: '2026-03-12T14:00:00.000Z',
    operator: '仓管A'
  });

  const initialListRes = await fetch(`${baseUrl}/api/inventory-receipts?orderId=${order.id}&direction=in&page=1&pageSize=1`);
  const initialPayload = getBody(await initialListRes.json()) as { rows: { id: number; reversible_quantity: number }[] };
  const originalReceipt = initialPayload.rows[0];
  assert.equal(originalReceipt.reversible_quantity, 4);

  const reverseRes = await fetch(`${baseUrl}/api/inventory-receipts/${originalReceipt.id}/reverse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reversed_at: '2026-03-12T14:10:00.000Z',
      reverse_reason: 'duplicate_receipt',
      quantity: 1
    })
  });
  assert.equal(reverseRes.status, 200);

  const pagedRes = await fetch(`${baseUrl}/api/inventory-receipts?orderId=${order.id}&direction=in&page=1&pageSize=1`);
  assert.equal(pagedRes.status, 200);
  const pagedPayload = getBody(await pagedRes.json()) as { total: number; rows: { reversed_quantity: number; reversible_quantity: number }[] };
  assert.equal(pagedPayload.total, 1);
  assert.equal(pagedPayload.rows.length, 1);
  assert.equal(pagedPayload.rows[0].reversed_quantity, 1);
  assert.equal(pagedPayload.rows[0].reversible_quantity, 3);
});

test.after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  if (createdMaterialIds.length > 0) {
    await Material.destroy({ where: { id: createdMaterialIds } });
  }
  await OrderItem.destroy({ where: {} });
  await Order.destroy({ where: {} });
  await sequelize.close();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});
