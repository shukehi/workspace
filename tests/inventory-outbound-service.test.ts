import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const TEST_DB = path.join('/tmp', 'order-search-inventory-outbound-service.test.sqlite');
process.env.DB_STORAGE = TEST_DB;

const {
  sequelize,
  Material,
  InventoryLocationBalance,
  InventoryMovement,
} = require('../server/models') as typeof import('../server/models');
const orderService = (require('../server/services/orders') as typeof import('../server/services/orders')).default;
const { inventoryOutboundService } = require('../server/services/inventory') as typeof import('../server/services/inventory');
const { ensureDefaultWarehouseAndLocation } = require('../server/services/inventory/inventory-defaults') as typeof import('../server/services/inventory/inventory-defaults');
import type { MaterialInstance } from '../server/models';

async function createStockedMaterial(quantity: number) {
  const { warehouse, location } = await ensureDefaultWarehouseAndLocation();
  const material = await Material.create({
    code: `SVC-MAT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: 'Service Material',
    model: 'SVC-MODEL',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 0,
    min_stock: 0,
  }) as MaterialInstance;

  const order = await orderService.createOrder({
    order_no: `SVC-PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    supplier: 'Inventory Supplier',
    category: '测试',
    status: 'arrived',
    items: [
      {
        material_id: material.code,
        supplier: 'Inventory Supplier',
        name: 'Service Material',
        model: 'SVC-MODEL',
        spec: 'SVC-MODEL',
        quantity,
        unit: 'pcs',
      }
    ]
  });

  await orderService.stockInOrder(order.id, {
    warehouse_id: warehouse.id,
    location_id: location.id,
    stocked_in_at: '2026-03-20T12:00:00.000Z',
  });

  return { material, warehouse, location };
}

test.beforeEach(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
});

test('inventoryOutboundService creates outbound and decrements location balance', async () => {
  const { material, warehouse, location } = await createStockedMaterial(6);

  const outbound = await inventoryOutboundService.create({
    warehouse_id: warehouse.id,
    location_id: location.id,
    operator: '仓管A',
    reason: '样品领用',
    items: [
      {
        material_id: material.id,
        quantity: 2,
      }
    ]
  });

  assert.equal(outbound.direction, 'out');
  assert.equal(outbound.items.length, 1);
  assert.equal(outbound.items[0].quantity, 2);

  const refreshedMaterial = await Material.findByPk(material.id) as MaterialInstance | null;
  assert.equal(Number(refreshedMaterial?.stock_quantity || 0), 4);

  const balance = await InventoryLocationBalance.findOne({
    where: {
      material_id: material.id,
      warehouse_id: warehouse.id,
      location_id: location.id,
    },
  });
  assert.equal(Number(balance?.quantity || 0), 4);

  const movements = await InventoryMovement.findAll({
    where: {
      source_type: 'outbound',
      source_id: String(outbound.id),
    },
  });
  assert.equal(movements.length, 1);
  assert.equal(Number(movements[0].delta_quantity || 0), -2);
});

test('inventoryOutboundService rejects insufficient location balance', async () => {
  const { material, warehouse, location } = await createStockedMaterial(1);

  await assert.rejects(
    () => inventoryOutboundService.create({
      warehouse_id: warehouse.id,
      location_id: location.id,
      reason: '超额领用',
      items: [
        {
          material_id: material.id,
          quantity: 2,
        }
      ]
    }),
    (error: any) => error?.code === 'OUTBOUND_INSUFFICIENT_BALANCE',
  );
});

test('inventoryOutboundService reverse restores stock and marks source as reversed', async () => {
  const { material, warehouse, location } = await createStockedMaterial(5);

  const outbound = await inventoryOutboundService.create({
    warehouse_id: warehouse.id,
    location_id: location.id,
    operator: '仓管A',
    reason: '售后补件',
    items: [
      {
        material_id: material.id,
        quantity: 3,
      }
    ]
  });

  const reversal = await inventoryOutboundService.reverse(outbound.id, {
    reason: '误领料',
    operator: '仓管B',
  });

  assert.equal(reversal.direction, 'reversal');
  assert.equal(reversal.source_outbound_id, outbound.id);

  const source = await inventoryOutboundService.getById(outbound.id);
  assert.equal(source.status, 'reversed');
  assert.equal(source.can_reverse, false);

  const refreshedMaterial = await Material.findByPk(material.id) as MaterialInstance | null;
  assert.equal(Number(refreshedMaterial?.stock_quantity || 0), 5);

  const balance = await InventoryLocationBalance.findOne({
    where: {
      material_id: material.id,
      warehouse_id: warehouse.id,
      location_id: location.id,
    },
  });
  assert.equal(Number(balance?.quantity || 0), 5);

  const outboundMovements = await InventoryMovement.findAll({
    where: {
      source_type: 'outbound',
      source_id: String(outbound.id),
    },
  });
  const reversalMovements = await InventoryMovement.findAll({
    where: {
      source_type: 'outbound_reversal',
      source_id: String(reversal.id),
    },
  });
  assert.equal(outboundMovements.length, 1);
  assert.equal(reversalMovements.length, 1);
  assert.equal(Number(reversalMovements[0].delta_quantity || 0), 3);
});

test('inventoryOutboundService rejects duplicate reverse attempts', async () => {
  const { material, warehouse, location } = await createStockedMaterial(4);

  const outbound = await inventoryOutboundService.create({
    warehouse_id: warehouse.id,
    location_id: location.id,
    operator: '仓管A',
    reason: '重复冲销测试',
    items: [
      {
        material_id: material.id,
        quantity: 1,
      }
    ]
  });

  await inventoryOutboundService.reverse(outbound.id, {
    reason: '首个冲销',
    operator: '仓管B',
  });

  await assert.rejects(
    () => inventoryOutboundService.reverse(outbound.id, {
      reason: '重复冲销',
      operator: '仓管C',
    }),
    (error: any) => error?.code === 'OUTBOUND_ALREADY_REVERSED',
  );
});

test.after(async () => {
  await sequelize.close();
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
});
