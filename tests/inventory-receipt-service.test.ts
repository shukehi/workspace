import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const _require = createRequire(import.meta.url);
const TEST_DB = path.join(os.tmpdir(), `test-inv-receipt-svc-${crypto.randomBytes(8).toString('hex')}.sqlite`);

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

// Runtime CJS bridge: these cache-purging tests must require models after DB_STORAGE is set.
const { sequelize, Material, InventoryMovement, InventoryReceipt, OrderItem } = _require('../server/models') as any;
const orderService = (_require('../server/services/orders') as any).default;
const { inventoryReceiptService } = _require('../server/services/inventory') as any;
import type { MaterialInstance } from '../server/models';

async function createOriginalReceipt() {
  const material = await Material.create({
    code: `RECEIPT-SVC-MAT-${Date.now()}`,
    name: 'Receipt Service Material',
    model: 'RECEIPT-SVC',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 0,
    min_stock: 0,
  }) as MaterialInstance;

  const order = await orderService.createOrder({
    order_no: `RECEIPT-SVC-PO-${Date.now()}`,
    supplier: 'Inventory Supplier',
    category: '测试',
    status: 'arrived',
    items: [
      {
        material_id: material.code,
        supplier: 'Inventory Supplier',
        name: 'Receipt Service Material',
        model: 'RECEIPT-SVC',
        spec: 'RECEIPT-SVC',
        quantity: 2,
        unit: 'pcs',
      }
    ]
  });

  await orderService.stockInOrder(order.id, {
    stocked_in_at: '2026-03-20T12:00:00.000Z',
  });

  const list = await inventoryReceiptService.list({ orderId: order.id });
  const receipt = list.rows.find((item: { direction?: string }) => item.direction !== 'reversal');
  assert.ok(receipt);
  return receipt;
}

test.beforeEach(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
});

test('inventoryReceiptService returns a conflict when reverse lock cannot be claimed', async () => {
  const receipt = await createOriginalReceipt();
  const hookName = `test-reverse-conflict-${receipt.id}`;
  let injectedConflict = false;

  InventoryReceipt.addHook('beforeBulkUpdate', hookName, async (options: any) => {
    if (injectedConflict) {
      return;
    }
    if (Number(options?.where?.id) !== Number(receipt.id)) {
      return;
    }
    injectedConflict = true;
    await sequelize.query(
      `
        UPDATE inventory_receipts
        SET reverse_version = reverse_version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :receiptId
      `,
      {
        replacements: { receiptId: Number(receipt.id) },
        transaction: options.transaction,
      },
    );
  });

  try {
    await assert.rejects(
      () => inventoryReceiptService.reverseReceipt(receipt.id, {
        reverse_reason: 'entry_error',
      }),
      (error: any) => error?.code === 'RECEIPT_REVERSE_CONFLICT',
    );
  } finally {
    InventoryReceipt.removeHook('beforeBulkUpdate', hookName);
  }
});


test('inventoryReceiptService reverses mapped receipts in transaction units and keeps mapping metadata', async () => {
  const material = await Material.create({
    code: `RECEIPT-MAPPED-MAT-${Date.now()}`,
    name: 'Mapped Receipt Material',
    model: 'RECEIPT-MAPPED',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'PCS',
    stock_quantity: 0,
    min_stock: 0,
  }) as MaterialInstance;

  const order = await orderService.createOrder({
    order_no: `RECEIPT-MAPPED-PO-${Date.now()}`,
    supplier: 'Inventory Supplier',
    category: '测试',
    status: 'arrived',
    items: [
      {
        material_id: 'SUPPLIER-BOX-001',
        resolved_material_id: material.id,
        external_material_code: 'SUPPLIER-BOX-001',
        material_resolve_source: 'supplier_mapping',
        transaction_unit: 'BOX',
        stock_unit: 'PCS',
        unit_conversion_factor: 10,
        supplier: 'Inventory Supplier',
        name: 'Mapped Receipt Material',
        model: 'RECEIPT-MAPPED',
        spec: 'RECEIPT-MAPPED',
        quantity: 2,
        unit: 'BOX',
      }
    ]
  });

  await orderService.stockInOrder(order.id, {
    stocked_in_at: '2026-03-20T12:00:00.000Z',
  });

  const list = await inventoryReceiptService.list({ orderId: order.id });
  const receipt = list.rows.find((item: { direction?: string }) => item.direction !== 'reversal');
  assert.ok(receipt);
  assert.equal(Number(receipt.quantity), 20);

  const reversal = await inventoryReceiptService.reverseReceipt(receipt.id, {
    reverse_reason: 'partial_mapping_reversal',
    quantity: 10,
  });

  const orderItem = await OrderItem.findByPk(order.items[0].id) as any;
  assert.equal(Number(orderItem.received_quantity), 1);
  assert.equal(Number(reversal.quantity), -10);

  const reversalMovements = await InventoryMovement.findAll({
    where: {
      source_type: 'receipt_reversal',
      source_id: String(reversal.id),
    },
  });
  assert.equal(reversalMovements.length, 1);
  assert.equal(Number(reversalMovements[0].delta_quantity || 0), -10);
  const metadata = JSON.parse(reversalMovements[0].metadata_json || '{}');
  assert.equal(metadata.material_mapping.externalMaterialCode, 'SUPPLIER-BOX-001');
  assert.equal(metadata.material_mapping.reversedStockQuantity, 10);
  assert.equal(metadata.material_mapping.reversedTransactionQuantity, 1);
});

test('inventoryReceiptService writes receipt and reversal movements', async () => {
  const receipt = await createOriginalReceipt();

  const receiptMovements = await InventoryMovement.findAll({
    where: {
      source_type: 'receipt_in',
      source_id: String(receipt.id),
    },
  });
  assert.equal(receiptMovements.length, 1);
  assert.equal(Number(receiptMovements[0].delta_quantity || 0), 2);

  const reversal = await inventoryReceiptService.reverseReceipt(receipt.id, {
    reverse_reason: 'entry_error',
  });

  const reversalMovements = await InventoryMovement.findAll({
    where: {
      source_type: 'receipt_reversal',
      source_id: String(reversal.id),
    },
  });
  assert.equal(reversalMovements.length, 1);
  assert.equal(Number(reversalMovements[0].delta_quantity || 0), -2);
});

test.after(async () => {
  await sequelize.close();
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
});
