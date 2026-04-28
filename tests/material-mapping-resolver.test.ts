import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import {
  createMaterialForMappingTest,
  createSupplierMasterForMappingTest,
} from './helpers/material-mapping-test-helpers';

const requireForTest = createRequire(import.meta.url);
const TEST_DB = path.join(os.tmpdir(), `material-resolver-${crypto.randomBytes(8).toString('hex')}.sqlite`);

const purgeServerCache = () => {
  // Keep this before server imports so the DB_STORAGE override below always reaches
  // a fresh sequelize instance, even when this test file is run after other model tests.
  Object.keys(requireForTest.cache).forEach((key) => {
    if (key.includes('/server/config/database') || key.includes('/server/models/') || key.includes('/server/services/materials/')) {
      delete requireForTest.cache[key];
    }
  });
};

purgeServerCache();
process.env.DB_STORAGE = TEST_DB;

const {
  initDB,
  sequelize,
  Material,
  MaterialSupplierMapping,
  SupplierMaster,
} = requireForTest('../server/models') as typeof import('../server/models');
const materialResolverService = (requireForTest('../server/services/materials/material-resolver.service') as typeof import('../server/services/materials/material-resolver.service')).default;
const {
  createCodeMapping,
  createSupplierMapping,
  updateCodeMapping,
  createUomConversion,
  normalizeMaterialExternalCode,
} = requireForTest('../server/services/materials/material-mapping.repository') as typeof import('../server/services/materials/material-mapping.repository');

async function createMaterial(code: string, overrides: Record<string, unknown> = {}) {
  return createMaterialForMappingTest(Material, code, overrides);
}

async function createSupplierMaster(supplierName: string, overrides: Record<string, unknown> = {}) {
  return createSupplierMasterForMappingTest(SupplierMaster, supplierName, overrides);
}

test.before(async () => {
  await initDB();
});

test('material resolver prefers exact internal material code', async () => {
  const supplier = await createSupplierMaster('Resolver Supplier Internal');
  const internal = await createMaterial('INT-001');
  const supplierMaterial = await createMaterial('INT-SUP-MAT');

  await createSupplierMapping({
    material_id: supplierMaterial.id,
    supplier_master_id: supplier.id,
    supplier_code: 'INT-001',
    purchase_unit: 'box',
    stock_unit: 'pcs',
    conversion_factor: 12,
    is_active: true,
    is_default: true,
  } as any);

  const resolved = await materialResolverService.resolve({ code: 'INT-001', supplierMasterId: supplier.id });
  assert.equal(resolved.source, 'internal_code');
  assert.equal(resolved.materialId, internal.id);
});

test('material resolver prefers supplier mapping before generic code mapping', async () => {
  const supplier = await createSupplierMaster('Resolver Supplier Priority');
  const supplierMaterial = await createMaterial('SUP-MAT');
  const codeMaterial = await createMaterial('CODE-MAT');

  await createSupplierMapping({
    material_id: supplierMaterial.id,
    supplier_master_id: supplier.id,
    supplier_code: 'Shared External Code',
    purchase_unit: 'box',
    stock_unit: 'pcs',
    conversion_factor: 12,
    is_active: true,
    is_default: true,
  } as any);
  await createCodeMapping({
    material_id: codeMaterial.id,
    mapping_type: 'alias',
    external_code: 'Shared External Code',
    priority: 1,
    is_active: true,
  } as any);

  const resolved = await materialResolverService.resolve({ code: ' shared   external code ', supplierMasterId: supplier.id });
  assert.equal(resolved.source, 'supplier_mapping');
  assert.equal(resolved.materialId, supplierMaterial.id);
  assert.equal(resolved.transactionUnit, 'BOX');
  assert.equal(resolved.stockUnit, 'PCS');
  assert.equal(resolved.conversionFactor, 12);
});

test('material resolver uses generic code mapping when no supplier mapping matches', async () => {
  const codeMaterial = await createMaterial('CODE-ONLY-MAT');
  await createCodeMapping({
    material_id: codeMaterial.id,
    mapping_type: 'alias',
    external_code: 'Code Only External',
    priority: 1,
    is_active: true,
  } as any);

  const resolved = await materialResolverService.resolve({ code: 'CODE ONLY EXTERNAL' });
  assert.equal(resolved.source, 'code_mapping');
  assert.equal(resolved.materialId, codeMaterial.id);
});

test('material resolver falls back to legacy aliases when mapping tables do not match', async () => {
  const aliasMaterial = await createMaterial('ALIAS-MAT', { aliases: ['legacy-alias-001'] });

  const resolved = await materialResolverService.resolve({ code: 'legacy-alias-001' });
  assert.equal(resolved.source, 'legacy_alias');
  assert.equal(resolved.materialId, aliasMaterial.id);
});

test('material resolver falls back to legacy exact model/name matching after aliases', async () => {
  const legacyExactMaterial = await createMaterial('LEGACY-MAT', { model: 'legacy-model-001' });

  const resolved = await materialResolverService.resolve({ code: 'legacy-model-001' });
  assert.equal(resolved.source, 'legacy_exact');
  assert.equal(resolved.materialId, legacyExactMaterial.id);
});

test('material resolver respects allowLegacyFallback=false for otherwise valid legacy aliases', async () => {
  await createMaterial('NO-LEGACY-FALLBACK-MAT', { aliases: ['no-legacy-fallback-alias'] });

  await assert.rejects(
    () => materialResolverService.resolve({ code: 'no-legacy-fallback-alias', allowLegacyFallback: false }),
    (error: any) => error?.code === 'MATERIAL_NOT_RESOLVED',
  );
});

test('material resolver rejects empty and blank material codes', async () => {
  await assert.rejects(
    () => materialResolverService.resolve({ code: '' }),
    (error: any) => error?.code === 'MATERIAL_NOT_RESOLVED',
  );
  await assert.rejects(
    () => materialResolverService.resolve({ code: '   ' }),
    (error: any) => error?.code === 'MATERIAL_NOT_RESOLVED',
  );
});

test('material resolver treats SQL-like input as unresolved data, not a SQL failure', async () => {
  await assert.rejects(
    () => materialResolverService.resolve({ code: "'; DROP TABLE materials; --" }),
    (error: any) => error?.code === 'MATERIAL_NOT_RESOLVED',
  );
  assert.ok(await Material.count() >= 0);
});

test('material mapping repository treats zero material ids as real candidates during conflict and ambiguity checks', async () => {
  const zeroIdMaterial = await createMaterial('ZERO-ID-MAT', { id: 0 });
  assert.equal(zeroIdMaterial.id, 0, 'Precondition: material ID must be 0 for this test');

  await createUomConversion({
    material_id: zeroIdMaterial.id,
    from_unit: 'bag',
    to_unit: 'pcs',
    factor: 50,
    is_purchase_default: true,
    is_active: true,
  } as any);

  const zeroIdConverted = await materialResolverService.resolve({ code: 'ZERO-ID-MAT', transactionUnit: 'bag', stockUnit: 'pcs' });
  assert.equal(zeroIdConverted.materialId, 0);
  assert.equal(zeroIdConverted.conversionFactor, 50);
  assert.equal(zeroIdConverted.transactionUnit, 'BAG');
  assert.equal(zeroIdConverted.stockUnit, 'PCS');

  const normalMaterial = await createMaterial('ZERO-ID-OTHER-MAT');

  await createCodeMapping({
    material_id: normalMaterial.id,
    mapping_type: 'alias',
    external_code: 'zero-id-conflict-code',
    priority: 5,
    is_active: true,
  } as any);

  await assert.rejects(
    () => createCodeMapping({
      material_id: zeroIdMaterial.id,
      mapping_type: 'alias',
      external_code: '  zero-id-conflict-code  ',
      priority: 10,
      is_active: true,
    } as any),
    (error: any) => error?.code === 'MATERIAL_CODE_MAPPING_CONFLICT'
      && error?.status === 409
      && error?.details?.conflictingMaterialId === normalMaterial.id
      && error?.details?.mappingType === 'alias'
      && error?.details?.normalizedCode === 'zero-id-conflict-code',
  );

  const inactiveZeroConflict = await createCodeMapping({
    material_id: zeroIdMaterial.id,
    mapping_type: 'alias',
    external_code: 'zero-id-conflict-code',
    priority: 10,
    is_active: false,
  } as any);

  await assert.rejects(
    () => updateCodeMapping(zeroIdMaterial.id, (inactiveZeroConflict as any).id, { is_active: true } as any),
    (error: any) => error?.code === 'MATERIAL_CODE_MAPPING_CONFLICT'
      && error?.status === 409
      && error?.details?.conflictingMaterialId === normalMaterial.id
      && error?.details?.mappingType === 'alias'
      && error?.details?.normalizedCode === 'zero-id-conflict-code',
  );

  await createCodeMapping({
    material_id: zeroIdMaterial.id,
    mapping_type: 'alias',
    external_code: 'zero-id-ambiguous-code',
    priority: 10,
    is_active: true,
  } as any);
  await createCodeMapping({
    material_id: normalMaterial.id,
    mapping_type: 'legacy_code',
    external_code: 'zero-id-ambiguous-code',
    priority: 20,
    is_active: true,
  } as any);

  await assert.rejects(
    () => materialResolverService.resolve({ code: 'zero-id-ambiguous-code', allowLegacyFallback: false }),
    (error: any) => error?.code === 'MATERIAL_RESOLUTION_AMBIGUOUS' && error?.details?.materialIds?.includes(0),
  );
});

test('material resolver ignores inactive mappings and reports ambiguous active code mappings', async () => {
  const inactiveMaterial = await createMaterial('INACTIVE-MAT');
  await createCodeMapping({
    material_id: inactiveMaterial.id,
    mapping_type: 'alias',
    external_code: 'inactive-code',
    is_active: false,
  } as any);

  await assert.rejects(
    () => materialResolverService.resolve({ code: 'inactive-code', allowLegacyFallback: false }),
    (error: any) => error?.code === 'MATERIAL_NOT_RESOLVED',
  );

  const first = await createMaterial('AMBIG-001');
  const second = await createMaterial('AMBIG-002');
  await createCodeMapping({
    material_id: first.id,
    mapping_type: 'alias',
    external_code: 'ambiguous-code',
    priority: 10,
    is_active: true,
  } as any);
  await createCodeMapping({
    material_id: second.id,
    mapping_type: 'legacy_code',
    external_code: 'ambiguous-code',
    priority: 20,
    is_active: true,
  } as any);

  await assert.rejects(
    () => materialResolverService.resolve({ code: 'ambiguous-code', allowLegacyFallback: false }),
    (error: any) => error?.code === 'MATERIAL_RESOLUTION_AMBIGUOUS' && error?.status === 409,
  );
});

test('material resolver validates UOM conversion factors and requires conversion for mismatched units', async () => {
  const supplier = await createSupplierMaster('UOM Supplier');
  const material = await createMaterial('UOM-MAT', { unit: 'PCS' });

  await assert.rejects(
    () => materialResolverService.resolve({ code: 'UOM-MAT', transactionUnit: 'BOX', stockUnit: 'PCS' }),
    (error: any) => error?.code === 'MATERIAL_UOM_INVALID',
  );

  await createUomConversion({
    material_id: material.id,
    from_unit: 'box',
    to_unit: 'pcs',
    factor: 24,
    is_purchase_default: true,
    is_active: true,
  } as any);

  const converted = await materialResolverService.resolve({ code: 'UOM-MAT', transactionUnit: 'box', stockUnit: 'pcs' });
  assert.equal(converted.conversionFactor, 24);
  assert.equal(converted.transactionUnit, 'BOX');
  assert.equal(converted.stockUnit, 'PCS');

  const zeroFactorMaterial = await createMaterial('ZERO-UOM-MAT');
  await MaterialSupplierMapping.create({
    material_id: zeroFactorMaterial.id,
    supplier_master_id: supplier.id,
    supplier_code: 'zero-factor',
    normalized_supplier_code: normalizeMaterialExternalCode('zero-factor'),
    purchase_unit: 'box',
    stock_unit: 'pcs',
    conversion_factor: 0,
    is_active: true,
    is_default: true,
  } as any);

  await assert.rejects(
    () => materialResolverService.resolve({ code: 'zero-factor', supplierMasterId: supplier.id }),
    (error: any) => error?.code === 'MATERIAL_UOM_INVALID',
  );

  const negativeMaterial = await createMaterial('NEGATIVE-UOM-MAT');
  await MaterialSupplierMapping.create({
    material_id: negativeMaterial.id,
    supplier_master_id: supplier.id,
    supplier_code: 'negative-factor',
    normalized_supplier_code: normalizeMaterialExternalCode('negative-factor'),
    purchase_unit: 'box',
    stock_unit: 'pcs',
    conversion_factor: -1,
    is_active: true,
    is_default: true,
  } as any);

  await assert.rejects(
    () => materialResolverService.resolve({ code: 'negative-factor', supplierMasterId: supplier.id }),
    (error: any) => error?.code === 'MATERIAL_UOM_INVALID',
  );
});

test('material supplier mapping repository rejects non-positive conversion factors', async () => {
  const supplier = await createSupplierMaster('Repository Supplier');
  const material = await createMaterial('REPO-UOM-MAT');

  await assert.rejects(
    () => createSupplierMapping({
      material_id: material.id,
      supplier_master_id: supplier.id,
      supplier_code: 'repo-zero-factor',
      conversion_factor: 0,
    } as any),
    (error: any) => error?.code === 'MATERIAL_UOM_INVALID',
  );

  await assert.rejects(
    () => createSupplierMapping({
      material_id: material.id,
      supplier_master_id: supplier.id,
      supplier_code: 'repo-nan-factor',
      conversion_factor: Number.NaN,
    } as any),
    (error: any) => error?.code === 'MATERIAL_UOM_INVALID',
  );
});

test.after(async () => {
  await sequelize.close();
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
});
