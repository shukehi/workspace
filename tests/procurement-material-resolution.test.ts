import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMaterialResolutionToOrderItem,
  clearMaterialResolutionSnapshot,
  findSupplierMasterIdForOrder,
  resolveMaterialCodeInput,
  syncMaterialResolutionSnapshotQuantity,
} from '../src/features/procurement/materialResolution';
import type { ResolvedMaterialPayload } from '../src/services/materialMappingApi';
import type { OrderItem } from '../src/types/order';

const resolution: ResolvedMaterialPayload = {
  material: {},
  materialId: 42,
  materialCode: 'INT-MAT-042',
  materialName: '标准物料 42',
  stockUnit: 'PCS',
  transactionUnit: 'BOX',
  conversionFactor: 12,
  supplierMasterId: 7,
  supplierCode: 'SUP-042',
  source: 'supplier_mapping',
};

test('procurement material resolution applies backend snapshot fields without replacing external code', () => {
  const item: Partial<OrderItem> = {
    material_id: 'SUP-042',
    name: '',
    model: '',
    quantity: 3,
    unit: 'BOX',
  };

  applyMaterialResolutionToOrderItem(item, resolution, { externalCode: 'SUP-042' });

  assert.equal(item.material_id, 'SUP-042');
  assert.equal(item.resolved_material_id, 42);
  assert.equal(item.external_material_code, 'SUP-042');
  assert.equal(item.material_resolve_source, 'supplier_mapping');
  assert.equal(item.transaction_unit, 'BOX');
  assert.equal(item.stock_unit, 'PCS');
  assert.equal(item.unit_conversion_factor, 12);
  assert.equal(item.stock_quantity, 36);
  assert.equal(item.name, '标准物料 42');
  assert.equal(item.model, 'INT-MAT-042');
});

test('procurement material resolution computes stock quantity from split quantities', () => {
  const item: Partial<OrderItem> = {
    material_id: 'ALIAS-042',
    quantity_left: 2,
    quantity_right: 4,
    unit: 'BOX',
  };

  applyMaterialResolutionToOrderItem(item, resolution, { externalCode: 'ALIAS-042' });

  assert.equal(item.stock_quantity, 72);
});

test('procurement material resolution clears stale snapshot when material code is edited', () => {
  const item: Partial<OrderItem> = {
    material_id: 'SUP-042',
    resolved_material_id: 42,
    external_material_code: 'SUP-042',
    material_resolve_source: 'supplier_mapping',
    transaction_unit: 'BOX',
    stock_unit: 'PCS',
    unit_conversion_factor: 12,
    stock_quantity: 36,
  };

  clearMaterialResolutionSnapshot(item);

  assert.equal(item.resolved_material_id, null);
  assert.equal(item.external_material_code, null);
  assert.equal(item.material_resolve_source, null);
  assert.equal(item.transaction_unit, null);
  assert.equal(item.stock_unit, null);
  assert.equal(item.unit_conversion_factor, null);
  assert.equal(item.stock_quantity, null);
  assert.equal(resolveMaterialCodeInput(item), 'SUP-042');
});

test('procurement material resolution keeps explicit zero material code inputs', () => {
  assert.equal(resolveMaterialCodeInput({ material_id: 0, name: 'fallback' } as Partial<OrderItem>), '0');
});

test('procurement material resolution refreshes stock quantity after quantity edits', () => {
  const item: Partial<OrderItem> = {
    material_id: 'SUP-042',
    quantity: 3,
    unit: 'BOX',
  };

  applyMaterialResolutionToOrderItem(item, resolution, { externalCode: 'SUP-042' });
  item.quantity = 5;

  assert.equal(syncMaterialResolutionSnapshotQuantity(item), true);
  assert.equal(item.stock_quantity, 60);
});

test('procurement material resolution clears stale snapshot after unit edits', () => {
  const item: Partial<OrderItem> = {
    material_id: 'SUP-042',
    quantity: 3,
    unit: 'BOX',
  };

  applyMaterialResolutionToOrderItem(item, resolution, { externalCode: 'SUP-042' });
  item.unit = 'PCS';
  clearMaterialResolutionSnapshot(item);

  assert.equal(item.transaction_unit, null);
  assert.equal(item.stock_unit, null);
  assert.equal(item.unit_conversion_factor, null);
  assert.equal(item.stock_quantity, null);
});

test('procurement material resolution matches supplier master id from order supplier name', () => {
  const supplierId = findSupplierMasterIdForOrder(
    { supplier: ' 映射 供应商 ' },
    [
      {
        id: 7,
        supplierName: '映射供应商',
        normalizedName: '映射供应商',
        status: 'active',
        sourceNote: '',
        sources: ['Mapping Supplier'],
        materialCount: 0,
        linkedMaterialCount: 0,
        linkedMaterialCodes: [],
        hasLinkedMaterialsWhileInactive: false,
        persisted: true,
      },
    ],
  );

  assert.equal(supplierId, 7);
});
