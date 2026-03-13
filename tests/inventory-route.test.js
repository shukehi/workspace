const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

const TEST_DB = path.join('/tmp', 'order-search-inventory-route.test.sqlite');
process.env.DB_STORAGE = TEST_DB;

const { sequelize, Material, Order, OrderItem } = require('../server/models');
const inventoryRoutes = require('../server/routes/inventory');
const inventoryReceiptRoutes = require('../server/routes/inventoryReceipts');
const orderService = require('../server/services/OrderService');

const createdMaterialIds = [];
let server;
let baseUrl;

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/inventory-receipts', inventoryReceiptRoutes);

  return await new Promise((resolve) => {
    const s = app.listen(0, () => {
      const { port } = s.address();
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
  });

  createdMaterialIds.push(material.id);

  const listRes = await fetch(`${baseUrl}/api/inventory`);
  assert.equal(listRes.status, 200);
  const list = await listRes.json();

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
  const updated = await updateRes.json();
  assert.equal(updated.stock_quantity, 99);
  assert.equal(updated.min_stock, 20);
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
  });

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
  const list = await listRes.json();
  assert.equal(list.length, 1);
  assert.equal(list[0].order_id, order.id);
  assert.equal(list[0].material_id, material.code);
  assert.equal(list[0].operator, '仓管A');

  const refreshed = await orderService.getOrderById(order.id);
  assert.equal(refreshed.items[0].ordered_quantity, 2);
  assert.equal(refreshed.items[0].received_quantity, 2);
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
  });

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
  const list = await listRes.json();
  const originalReceipt = list.find((item) => item.direction !== 'reversal');
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
  const reversed = await reverseRes.json();
  assert.equal(reversed.direction, 'reversal');
  assert.equal(reversed.source_receipt_id, originalReceipt.id);
  assert.equal(reversed.reverse_reason, 'entry_error');
  assert.equal(reversed.quantity, -2);

  const refreshedMaterial = await Material.findByPk(material.id);
  assert.equal(Number(refreshedMaterial.stock_quantity), 10);

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
  });

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
  let list = await listRes.json();
  const originalReceipt = list.find((item) => item.direction !== 'reversal');
  assert.equal(originalReceipt.reversible_quantity, 4);

  const firstReverseRes = await fetch(`${baseUrl}/api/inventory-receipts/${originalReceipt.id}/reverse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reversed_at: '2026-03-12T13:10:00.000Z',
      reverse_reason: 'entry_error',
      quantity: 1
    })
  });
  assert.equal(firstReverseRes.status, 200);
  const firstReversal = await firstReverseRes.json();
  assert.equal(firstReversal.quantity, -1);

  listRes = await fetch(`${baseUrl}/api/inventory-receipts?orderId=${order.id}`);
  list = await listRes.json();
  const refreshedOriginal = list.find((item) => item.id === originalReceipt.id);
  assert.equal(refreshedOriginal.reversed_quantity, 1);
  assert.equal(refreshedOriginal.reversible_quantity, 3);

  const overflowRes = await fetch(`${baseUrl}/api/inventory-receipts/${originalReceipt.id}/reverse`, {
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
  });

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
  const list = await listRes.json();
  const originalReceipt = list.find((item) => item.direction !== 'reversal');

  const reverseRes = await fetch(`${baseUrl}/api/inventory-receipts/${originalReceipt.id}/reverse`, {
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

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (createdMaterialIds.length > 0) {
    await Material.destroy({ where: { id: createdMaterialIds } });
  }
  await OrderItem.destroy({ where: {} });
  await Order.destroy({ where: {} });
  await sequelize.close();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});
