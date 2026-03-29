import test from 'node:test';
import assert from 'node:assert/strict';
import { buildZeroStockCleanupPlan } from '../server/services/inventory/inventory-material-cleanup.service';

test('buildZeroStockCleanupPlan separates deletable and blocked zero-stock materials', () => {
  const result = buildZeroStockCleanupPlan([
    {
      id: 1,
      code: 'MAT-001',
      name: 'Material 1',
      model: 'MODEL-1',
      stock_quantity: 0,
      blockers: {
        location_balances: 0,
        inventory_movements: 0,
        inventory_outbound_items: 0,
        inventory_receipts: 0,
        order_items: 0,
      },
    },
    {
      id: 2,
      code: 'MAT-002',
      name: 'Material 2',
      model: 'MODEL-2',
      stock_quantity: 0,
      blockers: {
        location_balances: 0,
        inventory_movements: 1,
        inventory_outbound_items: 0,
        inventory_receipts: 0,
        order_items: 0,
      },
    },
  ]);

  assert.equal(result.scanned, 2);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.blocked.length, 1);
  assert.deepEqual(result.candidates[0], {
    id: 1,
    code: 'MAT-001',
    name: 'Material 1',
    model: 'MODEL-1',
    stock_quantity: 0,
    reason: 'zero_stock_and_unreferenced',
  });
  assert.equal(result.blocked[0].id, 2);
  assert.equal(result.blocked[0].blockers.inventory_movements, 1);
});
