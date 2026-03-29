import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInventoryReconciliationReport } from '../server/services/inventory/inventory-reconciliation.service';

test('buildInventoryReconciliationReport returns mismatched rows with suggested targets', () => {
  const report = buildInventoryReconciliationReport([
    {
      id: 1,
      code: 'MAT-001',
      name: 'Material 1',
      model: 'MODEL-1',
      unit: 'pcs',
      stock_quantity: 10,
      locationBalances: [
        {
          quantity: 6,
          warehouse: { code: 'DEFAULT', name: '默认仓' },
          location: { code: 'A-01', name: 'A-01' },
        },
      ],
    },
    {
      id: 2,
      code: 'MAT-002',
      name: 'Material 2',
      model: 'MODEL-2',
      unit: 'pcs',
      stock_quantity: 5,
      locationBalances: [
        {
          quantity: 5,
          warehouse: { code: 'DEFAULT', name: '默认仓' },
          location: { code: 'B-01', name: 'B-01' },
        },
      ],
    },
    {
      id: 3,
      code: 'MAT-003',
      name: 'Material 3',
      model: 'MODEL-3',
      unit: 'pcs',
      stock_quantity: 4,
      locationBalances: [],
    },
  ]);

  assert.equal(report.scannedMaterials, 3);
  assert.equal(report.mismatchedMaterials, 2);
  assert.equal(report.matchedMaterials, 1);
  assert.equal(report.totalAbsoluteDiff, 8);
  assert.equal(report.rows.length, 2);

  assert.deepEqual(report.rows[0], {
    material_id: 1,
    material_code: 'MAT-001',
    material_name: 'Material 1',
    material_model: 'MODEL-1',
    unit: 'pcs',
    stock_quantity: 10,
    location_total: 6,
    diff_quantity: 4,
    suggested_delta: 4,
    suggested_target: '默认仓 / A-01',
  });

  assert.deepEqual(report.rows[1], {
    material_id: 3,
    material_code: 'MAT-003',
    material_name: 'Material 3',
    material_model: 'MODEL-3',
    unit: 'pcs',
    stock_quantity: 4,
    location_total: 0,
    diff_quantity: 4,
    suggested_delta: 4,
    suggested_target: 'DEFAULT / UNASSIGNED',
  });
});
