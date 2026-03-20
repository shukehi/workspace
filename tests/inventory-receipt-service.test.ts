import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const TEST_DB = path.join('/tmp', `order-search-inventory-receipt-service-${process.pid}-${Date.now()}.test.sqlite`);
process.env.DB_STORAGE = TEST_DB;

const { sequelize, Material, InventoryReceipt } = require('../server/models') as typeof import('../server/models');
const orderService = (require('../server/services/orders') as typeof import('../server/services/orders')).default;
const { inventoryReceiptService } = require('../server/services/inventory') as typeof import('../server/services/inventory');
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
  const receipt = list.rows.find((item) => item.direction !== 'reversal');
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

test.after(async () => {
  await sequelize.close();
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
});
