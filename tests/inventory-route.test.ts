import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import type { Router } from 'express'

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

const { sequelize, Material, Order, OrderItem, InventoryLocationBalance, InventoryMovement, Warehouse } = _require('../server/models') as typeof import('../server/models');
import type { MaterialInstance } from '../server/models';
const inventoryRoutes = (_require('../server/routes/inventory') as { default: Router }).default;
const inventoryAdjustmentRoutes = (_require('../server/routes/inventoryAdjustments') as { default: Router }).default;
const inventoryMovementRoutes = (_require('../server/routes/inventoryMovements') as { default: Router }).default;
const inventoryReceiptRoutes = (_require('../server/routes/inventoryReceipts') as { default: Router }).default;
const inventoryLocationRoutes = (_require('../server/routes/inventoryLocations') as { default: Router }).default;
const inventoryOutboundRoutes = (_require('../server/routes/inventoryOutbounds') as { default: Router }).default;
const orderService = (_require('../server/services/orders') as typeof import('../server/services/orders')).default;

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
  app.use('/api/inventory-adjustments', inventoryAdjustmentRoutes);
  app.use('/api/inventory-movements', inventoryMovementRoutes);
  app.use('/api/inventory-receipts', inventoryReceiptRoutes);
  app.use('/api/inventory-locations', inventoryLocationRoutes);
  app.use('/api/inventory-outbounds', inventoryOutboundRoutes);

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

test('GET /api/inventory and PUT /api/inventory/:id updates min stock only', async () => {
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
    body: JSON.stringify({ min_stock: 20 })
  });

  assert.equal(updateRes.status, 200);
  const updated = getBody(await updateRes.json()) as { stock_quantity: number; min_stock: number };
  assert.equal(updated.stock_quantity, 12);
  assert.equal(updated.min_stock, 20);

  const refreshedMaterial = await Material.findByPk(material.id) as MaterialInstance | null;
  assert.equal(Number(refreshedMaterial?.stock_quantity || 0), 12);
  assert.equal(Number(refreshedMaterial?.min_stock || 0), 20);
});

test('GET /api/inventory hides zero-stock materials from inventory list', async () => {
  const zeroStockMaterial = await Material.create({
    code: `TEST-MAT-ZERO-${Date.now()}`,
    name: 'Zero Stock Material',
    model: 'ZERO-MODEL',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 0,
    min_stock: 0
  }) as MaterialInstance;

  const positiveStockMaterial = await Material.create({
    code: `TEST-MAT-POS-${Date.now()}`,
    name: 'Positive Stock Material',
    model: 'POS-MODEL',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 3,
    min_stock: 0
  }) as MaterialInstance;

  const res = await fetch(`${baseUrl}/api/inventory`);
  assert.equal(res.status, 200);
  const rows = getBody(await res.json()) as Array<{ id: number }>;

  assert.equal(rows.some((item) => item.id === zeroStockMaterial.id), false);
  assert.equal(rows.some((item) => item.id === positiveStockMaterial.id), true);
});

test('GET /api/inventory supports warehouse/location filters and returns location summaries', async () => {
  const locationRes = await fetch(`${baseUrl}/api/inventory-locations`);
  assert.equal(locationRes.status, 200);
  const locationPayload = getBody(await locationRes.json()) as {
    warehouses: Array<{ id: number }>;
    locations: Array<{ id: number; warehouse_id: number }>;
  };
  const warehouseId = locationPayload.warehouses[0].id;
  const locationId = locationPayload.locations[0].id;

  const material = await Material.create({
    code: `TEST-MAT-FILTER-${Date.now()}`,
    name: 'Filter Material',
    model: 'FILTER-MODEL',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 0,
    min_stock: 5
  }) as MaterialInstance;

  const order = await orderService.createOrder({
    order_no: `FILTER-PO-${Date.now()}`,
    supplier: 'Inventory Supplier',
    category: '测试',
    status: 'arrived',
    items: [
      {
        material_id: material.code,
        supplier: 'Inventory Supplier',
        name: 'Filter Material',
        model: 'FILTER-MODEL',
        spec: 'FILTER-MODEL',
        quantity: 4,
        unit: 'pcs',
      }
    ]
  });

  await orderService.stockInOrder(order.id, {
    stocked_in_at: '2026-03-20T10:00:00.000Z',
    warehouse_id: warehouseId,
    location_id: locationId,
  });

  const filteredRes = await fetch(`${baseUrl}/api/inventory?warehouseId=${warehouseId}&locationId=${locationId}&keyword=FILTER-MODEL`);
  assert.equal(filteredRes.status, 200);
  const filtered = getBody(await filteredRes.json()) as Array<{
    id: number;
    stock_quantity: number;
    locations: Array<{ locationId: number; warehouseId: number; quantity: number }>;
  }>;
  const found = filtered.find((item) => item.id === material.id);
  assert.ok(found);
  assert.equal(found.stock_quantity, 4);
  assert.equal(found.locations[0].locationId, locationId);
  assert.equal(found.locations[0].warehouseId, warehouseId);
  assert.equal(found.locations[0].quantity, 4);

  const lowStockRes = await fetch(`${baseUrl}/api/inventory?lowStockOnly=true&keyword=FILTER-MODEL`);
  assert.equal(lowStockRes.status, 200);
  const lowStockRows = getBody(await lowStockRes.json()) as Array<{ id: number }>;
  assert.ok(lowStockRows.some((item) => item.id === material.id));
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

test('PUT /api/inventory/:id rejects direct stock quantity updates', async () => {
  const material = await Material.create({
    code: `TEST-MAT-IMMUTABLE-${Date.now()}`,
    name: 'Immutable Material',
    model: 'IMM-MODEL',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 8,
    min_stock: 2
  }) as MaterialInstance;

  const res = await fetch(`${baseUrl}/api/inventory/${material.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock_quantity: 10 })
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'STOCK_QUANTITY_IMMUTABLE');
  assert.equal(body.field, 'stock_quantity');

  const refreshedMaterial = await Material.findByPk(material.id) as MaterialInstance | null;
  assert.equal(Number(refreshedMaterial?.stock_quantity || 0), 8);
  assert.equal(Number(refreshedMaterial?.min_stock || 0), 2);
});

test('POST /api/inventory-adjustments updates stock, location balance and creates movement', async () => {
  const locationRes = await fetch(`${baseUrl}/api/inventory-locations`);
  assert.equal(locationRes.status, 200);
  const locationPayload = getBody(await locationRes.json()) as {
    warehouses: Array<{ id: number }>;
    locations: Array<{ id: number }>;
  };

  const warehouseId = locationPayload.warehouses[0].id;
  const locationId = locationPayload.locations[0].id;

  const material = await Material.create({
    code: `TEST-MAT-ADJ-${Date.now()}`,
    name: 'Adjustment Material',
    model: 'ADJ-MODEL',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 5,
    min_stock: 1
  }) as MaterialInstance;

  await InventoryLocationBalance.create({
    material_id: material.id,
    warehouse_id: warehouseId,
    location_id: locationId,
    quantity: 5,
  });

  const res = await fetch(`${baseUrl}/api/inventory-adjustments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      material_id: material.id,
      warehouse_id: warehouseId,
      location_id: locationId,
      operation_key: `adj-${material.id}-positive`,
      delta_quantity: 3,
      reason: '盘点补差',
      operator: '仓管B',
      remark: '补录库存'
    })
  });

  assert.equal(res.status, 201);
  const body = getBody(await res.json()) as {
    movement: { delta_quantity: number; balance_after: number; stock_after: number; reason: string };
    item: { id: number; stock_quantity: number; locations: Array<{ quantity: number }> };
  };
  assert.equal(body.movement.delta_quantity, 3);
  assert.equal(body.movement.balance_after, 8);
  assert.equal(body.movement.stock_after, 8);
  assert.equal(body.movement.reason, '盘点补差');
  assert.equal(body.item.id, material.id);
  assert.equal(body.item.stock_quantity, 8);
  assert.equal(body.item.locations[0].quantity, 8);

  const refreshedMaterial = await Material.findByPk(material.id) as MaterialInstance | null;
  const refreshedBalance = await InventoryLocationBalance.findOne({
    where: {
      material_id: material.id,
      warehouse_id: warehouseId,
      location_id: locationId,
    }
  });
  const movement = await InventoryMovement.findOne({
    where: {
      material_id: material.id,
      warehouse_id: warehouseId,
      location_id: locationId,
      source_type: 'manual_adjustment',
    }
  });

  assert.equal(Number(refreshedMaterial?.stock_quantity || 0), 8);
  assert.equal(Number(refreshedBalance?.quantity || 0), 8);
  assert.ok(movement);
});

test('POST /api/inventory-adjustments rejects negative result balance', async () => {
  const locationRes = await fetch(`${baseUrl}/api/inventory-locations`);
  assert.equal(locationRes.status, 200);
  const locationPayload = getBody(await locationRes.json()) as {
    warehouses: Array<{ id: number }>;
    locations: Array<{ id: number }>;
  };

  const warehouseId = locationPayload.warehouses[0].id;
  const locationId = locationPayload.locations[0].id;

  const material = await Material.create({
    code: `TEST-MAT-ADJ-NEG-${Date.now()}`,
    name: 'Adjustment Negative Material',
    model: 'ADJ-NEG-MODEL',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 2,
    min_stock: 0
  }) as MaterialInstance;

  await InventoryLocationBalance.create({
    material_id: material.id,
    warehouse_id: warehouseId,
    location_id: locationId,
    quantity: 2,
  });

  const res = await fetch(`${baseUrl}/api/inventory-adjustments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      material_id: material.id,
      warehouse_id: warehouseId,
      location_id: locationId,
      operation_key: `adj-${material.id}-negative`,
      delta_quantity: -5,
      reason: '盘亏调整'
    })
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'INVENTORY_BALANCE_NEGATIVE');

  const refreshedMaterial = await Material.findByPk(material.id) as MaterialInstance | null;
  const refreshedBalance = await InventoryLocationBalance.findOne({
    where: {
      material_id: material.id,
      warehouse_id: warehouseId,
      location_id: locationId,
    }
  });
  const movements = await InventoryMovement.count({
    where: {
      material_id: material.id,
      source_type: 'manual_adjustment',
    }
  });

  assert.equal(Number(refreshedMaterial?.stock_quantity || 0), 2);
  assert.equal(Number(refreshedBalance?.quantity || 0), 2);
  assert.equal(movements, 0);
});

test('POST /api/inventory-adjustments is idempotent for the same operation_key', async () => {
  const locationRes = await fetch(`${baseUrl}/api/inventory-locations`);
  assert.equal(locationRes.status, 200);
  const locationPayload = getBody(await locationRes.json()) as {
    warehouses: Array<{ id: number }>;
    locations: Array<{ id: number }>;
  };

  const warehouseId = locationPayload.warehouses[0].id;
  const locationId = locationPayload.locations[0].id;

  const material = await Material.create({
    code: `TEST-MAT-ADJ-IDEMP-${Date.now()}`,
    name: 'Adjustment Idempotent Material',
    model: 'ADJ-IDEMP-MODEL',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 4,
    min_stock: 0
  }) as MaterialInstance;

  await InventoryLocationBalance.create({
    material_id: material.id,
    warehouse_id: warehouseId,
    location_id: locationId,
    quantity: 4,
  });

  const payload = {
    material_id: material.id,
    warehouse_id: warehouseId,
    location_id: locationId,
    operation_key: `adj-${material.id}-retry`,
    delta_quantity: 2,
    reason: '重试补差',
    operator: '仓管C',
  };

  const [firstRes, secondRes] = await Promise.all([
    fetch(`${baseUrl}/api/inventory-adjustments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),
    fetch(`${baseUrl}/api/inventory-adjustments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),
  ]);

  assert.equal(firstRes.status, 201);
  assert.equal(secondRes.status, 201);

  const firstBody = getBody(await firstRes.json()) as { movement: { id: number }; item: { stock_quantity: number } };
  const secondBody = getBody(await secondRes.json()) as { movement: { id: number }; item: { stock_quantity: number } };

  assert.equal(firstBody.movement.id, secondBody.movement.id);
  assert.equal(firstBody.item.stock_quantity, 6);
  assert.equal(secondBody.item.stock_quantity, 6);

  const refreshedMaterial = await Material.findByPk(material.id) as MaterialInstance | null;
  const refreshedBalance = await InventoryLocationBalance.findOne({
    where: {
      material_id: material.id,
      warehouse_id: warehouseId,
      location_id: locationId,
    }
  });
  const movements = await InventoryMovement.count({
    where: {
      material_id: material.id,
      source_type: 'manual_adjustment',
      source_id: payload.operation_key,
    }
  });

  assert.equal(Number(refreshedMaterial?.stock_quantity || 0), 6);
  assert.equal(Number(refreshedBalance?.quantity || 0), 6);
  assert.equal(movements, 1);
});

test('GET /api/inventory-movements returns paged ledger rows with filters', async () => {
  const locationRes = await fetch(`${baseUrl}/api/inventory-locations`);
  assert.equal(locationRes.status, 200);
  const locationPayload = getBody(await locationRes.json()) as {
    warehouses: Array<{ id: number }>;
    locations: Array<{ id: number }>;
  };

  const warehouseId = locationPayload.warehouses[0].id;
  const locationId = locationPayload.locations[0].id;

  const material = await Material.create({
    code: `TEST-MAT-MOV-${Date.now()}`,
    name: 'Movement Material',
    model: 'MOV-MODEL',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 3,
    min_stock: 0
  }) as MaterialInstance;

  await InventoryLocationBalance.create({
    material_id: material.id,
    warehouse_id: warehouseId,
    location_id: locationId,
    quantity: 3,
  });

  const matchedAdjustmentRes = await fetch(`${baseUrl}/api/inventory-adjustments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      material_id: material.id,
      warehouse_id: warehouseId,
      location_id: locationId,
      operation_key: `mov-${material.id}-query-match`,
      delta_quantity: 1,
      reason: '查询测试',
    })
  });
  assert.equal(matchedAdjustmentRes.status, 201);

  const unmatchedAdjustmentRes = await fetch(`${baseUrl}/api/inventory-adjustments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      material_id: material.id,
      warehouse_id: warehouseId,
      location_id: locationId,
      operation_key: `mov-${material.id}-query-unmatched`,
      delta_quantity: 1,
      reason: '盘点补差',
    })
  });
  assert.equal(unmatchedAdjustmentRes.status, 201);

  const listRes = await fetch(`${baseUrl}/api/inventory-movements?materialId=${material.id}&sourceType=manual_adjustment&keyword=查询&page=1&pageSize=1`);
  assert.equal(listRes.status, 200);
  const payload = getBody(await listRes.json()) as {
    rows: Array<{ material_id: number; source_type: string; delta_quantity: number; reason: string }>;
    total: number;
    page: number;
    pageSize: number;
  };

  assert.equal(payload.page, 1);
  assert.equal(payload.pageSize, 1);
  assert.equal(payload.total, 1);
  assert.equal(payload.rows.length, 1);
  assert.equal(payload.rows[0].material_id, material.id);
  assert.equal(payload.rows[0].source_type, 'manual_adjustment');
  assert.equal(payload.rows[0].delta_quantity, 1);
  assert.equal(payload.rows[0].reason, '查询测试');
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

test('POST /api/inventory-locations creates location and PUT updates status', async () => {
  const initialRes = await fetch(`${baseUrl}/api/inventory-locations`);
  assert.equal(initialRes.status, 200);
  const initialPayload = getBody(await initialRes.json()) as {
    warehouses: Array<{ id: number }>;
    locations: Array<{ code: string }>;
  };
  assert.ok(initialPayload.warehouses.length >= 1);
  assert.ok(initialPayload.locations.some((item) => item.code === 'UNASSIGNED'));

  const createRes = await fetch(`${baseUrl}/api/inventory-locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      warehouse_id: initialPayload.warehouses[0].id,
      code: 'A-01',
      name: '主通道 A-01',
      remark: '首层货架',
      sort_order: 10
    })
  });

  assert.equal(createRes.status, 201);
  const created = getBody(await createRes.json()) as {
    id: number;
    code: string;
    status: string;
  };
  assert.equal(created.code, 'A-01');
  assert.equal(created.status, 'active');

  const updateRes = await fetch(`${baseUrl}/api/inventory-locations/${created.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'inactive',
      remark: '停用待整理'
    })
  });

  assert.equal(updateRes.status, 200);
  const updated = getBody(await updateRes.json()) as { status: string; remark: string };
  assert.equal(updated.status, 'inactive');
  assert.equal(updated.remark, '停用待整理');
});

test('PUT /api/inventory-locations/:id rejects changing warehouse for an existing location', async () => {
  const initialRes = await fetch(`${baseUrl}/api/inventory-locations`);
  assert.equal(initialRes.status, 200);
  const initialPayload = getBody(await initialRes.json()) as {
    warehouses: Array<{ id: number }>;
    locations: Array<{ id: number }>;
  };

  const secondWarehouse = await Warehouse.create({
    code: `W-${Date.now()}`,
    name: '二号仓',
    status: 'active',
    remark: '',
  });

  const res = await fetch(`${baseUrl}/api/inventory-locations/${initialPayload.locations[0].id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      warehouse_id: secondWarehouse.id,
      remark: '尝试换仓',
    })
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'LOCATION_WAREHOUSE_IMMUTABLE');
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

test('POST /api/inventory-outbounds creates outbound, filters list, and reverse restores balance', async () => {
  const locationRes = await fetch(`${baseUrl}/api/inventory-locations`);
  const locationPayload = getBody(await locationRes.json()) as {
    warehouses: Array<{ id: number }>;
    locations: Array<{ id: number }>;
  };
  const warehouseId = locationPayload.warehouses[0].id;
  const locationId = locationPayload.locations[0].id;

  const material = await Material.create({
    code: `TEST-MAT-OUTBOUND-${Date.now()}`,
    name: 'Outbound Material',
    model: 'OUTBOUND-MODEL',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 0,
    min_stock: 0
  }) as MaterialInstance;

  const order = await orderService.createOrder({
    order_no: `OUTBOUND-PO-${Date.now()}`,
    supplier: 'Inventory Supplier',
    category: '测试',
    status: 'arrived',
    items: [
      {
        material_id: material.code,
        supplier: 'Inventory Supplier',
        name: 'Outbound Material',
        model: 'OUTBOUND-MODEL',
        spec: 'OUTBOUND-MODEL',
        quantity: 6,
        unit: 'pcs',
      }
    ]
  });

  await orderService.stockInOrder(order.id, {
    stocked_in_at: '2026-03-20T11:00:00.000Z',
    warehouse_id: warehouseId,
    location_id: locationId,
  });

  const createRes = await fetch(`${baseUrl}/api/inventory-outbounds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      warehouse_id: warehouseId,
      location_id: locationId,
      operator: '仓管A',
      reason: '样品领用',
      items: [
        {
          material_id: material.id,
          quantity: 2
        }
      ]
    })
  });
  assert.equal(createRes.status, 201);
  const outbound = getBody(await createRes.json()) as {
    id: number;
    direction: string;
    items: Array<{ quantity: number }>;
  };
  assert.equal(outbound.direction, 'out');
  assert.equal(outbound.items[0].quantity, 2);

  const balance = await InventoryLocationBalance.findOne({
    where: {
      material_id: material.id,
      warehouse_id: warehouseId,
      location_id: locationId,
    },
  });
  assert.equal(Number(balance?.quantity || 0), 4);

  const listRes = await fetch(`${baseUrl}/api/inventory-outbounds?keyword=样品领用`);
  assert.equal(listRes.status, 200);
  const listPayload = getBody(await listRes.json()) as {
    total: number;
    rows: Array<{ id: number; reason: string }>;
  };
  assert.equal(listPayload.total >= 1, true);
  assert.ok(listPayload.rows.some((item) => item.id === outbound.id && item.reason === '样品领用'));

  const reverseRes = await fetch(`${baseUrl}/api/inventory-outbounds/${outbound.id}/reverse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reason: '误领料',
      operator: '仓管B'
    })
  });
  assert.equal(reverseRes.status, 200);
  const reversed = getBody(await reverseRes.json()) as { direction: string; source_outbound_id: number };
  assert.equal(reversed.direction, 'reversal');
  assert.equal(reversed.source_outbound_id, outbound.id);

  const refreshedMaterial = await Material.findByPk(material.id);
  assert.equal(Number(refreshedMaterial?.stock_quantity || 0), 6);
  const restoredBalance = await InventoryLocationBalance.findOne({
    where: {
      material_id: material.id,
      warehouse_id: warehouseId,
      location_id: locationId,
    },
  });
  assert.equal(Number(restoredBalance?.quantity || 0), 6);
});

test('POST /api/inventory-outbounds rejects insufficient location balance', async () => {
  const locationRes = await fetch(`${baseUrl}/api/inventory-locations`);
  const locationPayload = getBody(await locationRes.json()) as {
    warehouses: Array<{ id: number }>;
    locations: Array<{ id: number }>;
  };
  const warehouseId = locationPayload.warehouses[0].id;
  const locationId = locationPayload.locations[0].id;

  const material = await Material.create({
    code: `TEST-MAT-OUTBOUND-LIMIT-${Date.now()}`,
    name: 'Outbound Limit Material',
    model: 'OUTBOUND-LIMIT',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 0,
    min_stock: 0
  }) as MaterialInstance;

  const order = await orderService.createOrder({
    order_no: `OUTBOUND-LIMIT-PO-${Date.now()}`,
    supplier: 'Inventory Supplier',
    category: '测试',
    status: 'arrived',
    items: [
      {
        material_id: material.code,
        supplier: 'Inventory Supplier',
        name: 'Outbound Limit Material',
        model: 'OUTBOUND-LIMIT',
        spec: 'OUTBOUND-LIMIT',
        quantity: 1,
        unit: 'pcs',
      }
    ]
  });

  await orderService.stockInOrder(order.id, {
    warehouse_id: warehouseId,
    location_id: locationId,
  });

  const res = await fetch(`${baseUrl}/api/inventory-outbounds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      warehouse_id: warehouseId,
      location_id: locationId,
      reason: '超额领用',
      items: [
        {
          material_id: material.id,
          quantity: 2
        }
      ]
    })
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'OUTBOUND_INSUFFICIENT_BALANCE');
});

test('POST /api/inventory-receipts/:id/reverse rejects reversal when issued stock already consumed the location balance', async () => {
  const locationRes = await fetch(`${baseUrl}/api/inventory-locations`);
  const locationPayload = getBody(await locationRes.json()) as {
    warehouses: Array<{ id: number }>;
    locations: Array<{ id: number }>;
  };
  const warehouseId = locationPayload.warehouses[0].id;
  const locationId = locationPayload.locations[0].id;

  const material = await Material.create({
    code: `TEST-MAT-REVERSE-BAL-${Date.now()}`,
    name: 'Reverse Balance Material',
    model: 'REV-BAL',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 0,
    min_stock: 0
  }) as MaterialInstance;

  const order = await orderService.createOrder({
    order_no: `REVERSE-BAL-PO-${Date.now()}`,
    supplier: 'Inventory Supplier',
    category: '测试',
    status: 'arrived',
    items: [
      {
        material_id: material.code,
        supplier: 'Inventory Supplier',
        name: 'Reverse Balance Material',
        model: 'REV-BAL',
        spec: 'REV-BAL',
        quantity: 4,
        unit: 'pcs',
      }
    ]
  });

  await orderService.stockInOrder(order.id, {
    stocked_in_at: '2026-03-20T11:20:00.000Z',
    warehouse_id: warehouseId,
    location_id: locationId,
  });

  const receiptsRes = await fetch(`${baseUrl}/api/inventory-receipts?orderId=${order.id}`);
  const receiptsPayload = getBody(await receiptsRes.json()) as {
    rows: Array<{ id: number; direction: string }>;
  };
  const originalReceipt = receiptsPayload.rows.find((item) => item.direction !== 'reversal');
  assert.ok(originalReceipt);

  const outboundRes = await fetch(`${baseUrl}/api/inventory-outbounds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      warehouse_id: warehouseId,
      location_id: locationId,
      reason: '先出库再撤销',
      items: [
        {
          material_id: material.id,
          quantity: 3,
        }
      ]
    })
  });
  assert.equal(outboundRes.status, 201);

  const reverseRes = await fetch(`${baseUrl}/api/inventory-receipts/${originalReceipt!.id}/reverse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reversed_at: '2026-03-20T11:30:00.000Z',
      reverse_reason: 'entry_error',
      quantity: 2,
    })
  });

  assert.equal(reverseRes.status, 400);
  const body = await reverseRes.json();
  assert.equal(body.error, 'RECEIPT_INSUFFICIENT_BALANCE');
});

test('POST /api/inventory-outbounds/:id/reverse rejects duplicate reverse attempts', async () => {
  const locationRes = await fetch(`${baseUrl}/api/inventory-locations`);
  const locationPayload = getBody(await locationRes.json()) as {
    warehouses: Array<{ id: number }>;
    locations: Array<{ id: number }>;
  };
  const warehouseId = locationPayload.warehouses[0].id;
  const locationId = locationPayload.locations[0].id;

  const material = await Material.create({
    code: `TEST-MAT-OUTBOUND-REVERSE-DUP-${Date.now()}`,
    name: 'Outbound Reverse Dup Material',
    model: 'OUTBOUND-REV-DUP',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 0,
    min_stock: 0
  }) as MaterialInstance;

  const order = await orderService.createOrder({
    order_no: `OUTBOUND-REV-DUP-PO-${Date.now()}`,
    supplier: 'Inventory Supplier',
    category: '测试',
    status: 'arrived',
    items: [
      {
        material_id: material.code,
        supplier: 'Inventory Supplier',
        name: 'Outbound Reverse Dup Material',
        model: 'OUTBOUND-REV-DUP',
        spec: 'OUTBOUND-REV-DUP',
        quantity: 2,
        unit: 'pcs',
      }
    ]
  });

  await orderService.stockInOrder(order.id, {
    warehouse_id: warehouseId,
    location_id: locationId,
  });

  const createRes = await fetch(`${baseUrl}/api/inventory-outbounds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      warehouse_id: warehouseId,
      location_id: locationId,
      reason: '重复冲销检查',
      items: [
        {
          material_id: material.id,
          quantity: 1
        }
      ]
    })
  });
  assert.equal(createRes.status, 201);
  const outbound = getBody(await createRes.json()) as { id: number };

  const firstReverseRes = await fetch(`${baseUrl}/api/inventory-outbounds/${outbound.id}/reverse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: '第一次冲销' })
  });
  assert.equal(firstReverseRes.status, 200);

  const duplicateReverseRes = await fetch(`${baseUrl}/api/inventory-outbounds/${outbound.id}/reverse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: '第二次冲销' })
  });
  assert.equal(duplicateReverseRes.status, 400);
  const duplicateBody = await duplicateReverseRes.json();
  assert.equal(duplicateBody.error, 'OUTBOUND_ALREADY_REVERSED');
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
