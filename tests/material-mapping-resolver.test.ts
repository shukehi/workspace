import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const requireForTest = createRequire(import.meta.url);
const TEST_DB = path.join(os.tmpdir(), `material-resolver-${crypto.randomBytes(8).toString('hex')}.sqlite`);

const purgeServerCache = () => {
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
  createUomConversion,
  normalizeMaterialExternalCode,
} = requireForTest('../server/services/materials/material-mapping.repository') as typeof import('../server/services/materials/material-mapping.repository');

async function createMaterial(code: string, overrides: Record<string, unknown> = {}) {
  return Material.create({
    code,
    name: `${code} name`,
    unit: 'PCS',
    category: 'test',
    ...overrides,
  } as any) as any;
}

test.before(async () => {
  await initDB();
});

test('material resolver uses internal, supplier, code and legacy fallback priority in order', async () => {
  const supplier = await SupplierMaster.create({
    supplier_name: 'Resolver Supplier',
    normalized_name: 'resolver supplier',
    status: 'active',
  } as any) as any;

  const internal = await createMaterial('INT-001');
  const supplierMaterial = await createMaterial('SUP-MAT');
  const codeMaterial = await createMaterial('CODE-MAT');
  const aliasMaterial = await createMaterial('ALIAS-MAT', { aliases: ['legacy-alias-001'] });
  const legacyExactMaterial = await createMaterial('LEGACY-MAT', { model: 'legacy-model-001' });

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

  const exact = await materialResolverService.resolve({ code: 'INT-001', supplierMasterId: supplier.id });
  assert.equal(exact.source, 'internal_code');
  assert.equal(exact.materialId, internal.id);

  const supplierResolved = await materialResolverService.resolve({ code: ' shared   external code ', supplierMasterId: supplier.id });
  assert.equal(supplierResolved.source, 'supplier_mapping');
  assert.equal(supplierResolved.materialId, supplierMaterial.id);
  assert.equal(supplierResolved.transactionUnit, 'BOX');
  assert.equal(supplierResolved.stockUnit, 'PCS');
  assert.equal(supplierResolved.conversionFactor, 12);

  const codeResolved = await materialResolverService.resolve({ code: 'SHARED EXTERNAL CODE' });
  assert.equal(codeResolved.source, 'code_mapping');
  assert.equal(codeResolved.materialId, codeMaterial.id);

  const aliasResolved = await materialResolverService.resolve({ code: 'legacy-alias-001' });
  assert.equal(aliasResolved.source, 'legacy_alias');
  assert.equal(aliasResolved.materialId, aliasMaterial.id);

  const legacyExactResolved = await materialResolverService.resolve({ code: 'legacy-model-001' });
  assert.equal(legacyExactResolved.source, 'legacy_exact');
  assert.equal(legacyExactResolved.materialId, legacyExactMaterial.id);
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
  const supplier = await SupplierMaster.create({
    supplier_name: 'UOM Supplier',
    normalized_name: 'uom supplier',
    status: 'active',
  } as any) as any;
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
  const supplier = await SupplierMaster.create({
    supplier_name: 'Repository Supplier',
    normalized_name: 'repository supplier',
    status: 'active',
  } as any) as any;
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
});

test.after(async () => {
  await sequelize.close();
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
});
