import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MATERIAL_COMPATIBILITY_FIELDS,
  auditLegacyMaterialFallbackUsage,
  resolveLegacyMaterialFallbackReason,
} from '../server/services/materials/material-legacy-compatibility';
import { logger } from '../server/app/logger';

test('material compatibility fields document legacy supplier and aliases boundaries', () => {
  assert.match(MATERIAL_COMPATIBILITY_FIELDS.supplier, /compatibility|legacy/i);
  assert.match(MATERIAL_COMPATIBILITY_FIELDS.supplier, /material_supplier_mappings/);
  assert.match(MATERIAL_COMPATIBILITY_FIELDS.aliases, /compatibility|legacy/i);
  assert.match(MATERIAL_COMPATIBILITY_FIELDS.aliases, /material_code_mappings/);
});

test('legacy material fallback audit classifies resolver and commit fallback paths', () => {
  assert.equal(
    resolveLegacyMaterialFallbackReason({ material_resolve_source: 'legacy_alias' }),
    'legacy_resolver_snapshot',
  );
  assert.equal(
    resolveLegacyMaterialFallbackReason(
      { material_id: 'LEGACY-MAT-001' },
      { includeCommitFallback: true },
    ),
    'legacy_material_id_commit_fallback',
  );
  assert.equal(
    resolveLegacyMaterialFallbackReason({ material_id: 'LEGACY-MAT-001' }),
    null,
  );
  assert.equal(
    resolveLegacyMaterialFallbackReason({ material_resolve_source: 'supplier_mapping', resolved_material_id: 1 }),
    null,
  );
});


test('legacy material fallback audit warns only for committed legacy fallback signals', () => {
  const originalWarn = logger.warn;
  const warnings: Array<{ meta: Record<string, unknown>; message?: string }> = [];
  (logger as any).warn = (meta: Record<string, unknown>, message?: string) => {
    warnings.push({ meta, message });
  };

  try {
    auditLegacyMaterialFallbackUsage({
      stage: 'order_create',
      orderId: 12,
      orderNo: 'PO-LEGACY-ALIAS',
      item: { material_resolve_source: 'legacy_alias', external_material_code: 'ALIAS-001', resolved_material_id: 7 },
    });
    auditLegacyMaterialFallbackUsage({
      stage: 'stock_in_receipt',
      orderId: 13,
      orderNo: 'PO-LEGACY-ID',
      item: { material_id: 0 },
    });
    auditLegacyMaterialFallbackUsage({
      stage: 'order_update',
      orderId: 14,
      orderNo: 'PO-MAPPED',
      item: { material_resolve_source: 'supplier_mapping', external_material_code: 'SUP-001', resolved_material_id: 8 },
    });
    auditLegacyMaterialFallbackUsage({
      stage: 'order_create',
      orderId: 15,
      orderNo: 'PO-LEGACY-ID-NOT-COMMIT-FALLBACK',
      item: { material_id: 'LEGACY-ID' },
    });
  } finally {
    (logger as any).warn = originalWarn;
  }

  assert.equal(warnings.length, 2);
  assert.deepEqual(
    warnings.map((entry) => [entry.meta.stage, entry.meta.reason, entry.meta.materialInput]),
    [
      ['order_create', 'legacy_resolver_snapshot', 'ALIAS-001'],
      ['stock_in_receipt', 'legacy_material_id_commit_fallback', 0],
    ],
  );
  assert.ok(warnings.every((entry) => entry.message === 'Legacy material mapping fallback used during transaction commit'));
});


test('legacy material fallback audit does not throw when telemetry logging fails', () => {
  const originalWarn = logger.warn;
  (logger as any).warn = () => {
    throw new Error('logger unavailable');
  };

  try {
    assert.doesNotThrow(() => auditLegacyMaterialFallbackUsage({
      stage: 'stock_in_receipt',
      orderId: 16,
      orderNo: 'PO-LOGGER-DOWN',
      item: { material_id: 'LEGACY-ID' },
    }));
  } finally {
    (logger as any).warn = originalWarn;
  }
});
