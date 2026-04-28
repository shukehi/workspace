import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import type { Router } from 'express';
import {
  createMaterialForMappingTest,
  createSupplierMasterForMappingTest,
} from './helpers/material-mapping-test-helpers';

const requireForTest = createRequire(import.meta.url);
const TEST_DB = path.join(os.tmpdir(), `material-mapping-api-${crypto.randomBytes(8).toString('hex')}.sqlite`);

const purgeServerCache = () => {
  Object.keys(requireForTest.cache).forEach((key) => {
    if (
      key.includes('/server/config/database')
      || key.includes('/server/models/')
      || key.includes('/server/services/materials/')
      || key.includes('/server/services/MaterialService')
      || key.includes('/server/routes/material')
    ) {
      delete requireForTest.cache[key];
    }
  });
};

purgeServerCache();
process.env.DB_STORAGE = TEST_DB;

const materialRoutes = (requireForTest('../server/routes/material') as { default: Router }).default;
const {
  initDB,
  sequelize,
  Material,
  SupplierMaster,
} = requireForTest('../server/models') as typeof import('../server/models');

type TestServer = ReturnType<ReturnType<typeof express>['listen']>;

let server: TestServer;
let baseUrl = '';

async function createMaterial(code: string, overrides: Record<string, unknown> = {}) {
  return createMaterialForMappingTest(Material, code, overrides);
}

async function createSupplierMaster(supplierName: string, overrides: Record<string, unknown> = {}) {
  return createSupplierMasterForMappingTest(SupplierMaster, supplierName, overrides);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/materials', materialRoutes);
  return await new Promise<{ server: TestServer; baseUrl: string }>((resolve) => {
    const s = app.listen(0, () => {
      const { port } = s.address() as { port: number };
      resolve({ server: s, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function readJson(response: Response) {
  return await response.json() as Record<string, any>;
}

test.before(async () => {
  await initDB();
  const started = await startServer();
  server = started.server;
  baseUrl = started.baseUrl;
});

test('material mapping API creates, lists, patches and resolves mappings', async () => {
  const supplier = await createSupplierMaster('Mapping API Supplier');
  const material = await createMaterial('API-MAT-001', { unit: 'PCS' });
  const otherMaterial = await createMaterial('API-MAT-OTHER', { unit: 'PCS' });

  const supplierCreate = await fetch(`${baseUrl}/api/materials/${material.id}/supplier-mappings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      supplier_master_id: supplier.id,
      supplier_code: 'Supplier Part 001',
      purchase_unit: 'box',
      stock_unit: 'pcs',
      conversion_factor: 12,
      is_default: true,
    }),
  });
  assert.equal(supplierCreate.status, 201);
  const supplierPayload = await readJson(supplierCreate);
  assert.equal(supplierPayload.success, true);
  assert.equal(supplierPayload.mapping.normalized_supplier_code, 'supplier part 001');

  const codeCreate = await fetch(`${baseUrl}/api/materials/${material.id}/code-mappings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mapping_type: 'alias',
      external_code: 'Alias Part 001',
      priority: 5,
      metadata_json: { source: 'api-test' },
    }),
  });
  assert.equal(codeCreate.status, 201);
  const codePayload = await readJson(codeCreate);
  assert.equal(codePayload.mapping.normalized_code, 'alias part 001');

  const uomCreate = await fetch(`${baseUrl}/api/materials/${material.id}/uom-conversions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ from_unit: 'box', to_unit: 'pcs', factor: 12, is_purchase_default: true }),
  });
  assert.equal(uomCreate.status, 201);
  const uomPayload = await readJson(uomCreate);
  assert.equal(uomPayload.conversion.from_unit, 'BOX');

  const codePatch = await fetch(`${baseUrl}/api/materials/${material.id}/code-mappings/${codePayload.mapping.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      external_code: 'Alias Part 002',
      normalized_code: 'client must not control this',
      material_id: otherMaterial.id,
      is_active: false,
    }),
  });
  assert.equal(codePatch.status, 200);
  const patchedCode = await readJson(codePatch);
  assert.equal(patchedCode.mapping.normalized_code, 'alias part 002');
  assert.equal(patchedCode.mapping.material_id, material.id);
  assert.equal(Boolean(patchedCode.mapping.is_active), false);

  const listResponse = await fetch(`${baseUrl}/api/materials/${material.id}/mappings`);
  assert.equal(listResponse.status, 200);
  const listed = await readJson(listResponse);
  assert.equal(listed.success, true);
  assert.equal(listed.mappings.supplierMappings.length, 1);
  assert.equal(listed.mappings.codeMappings.length, 1);
  assert.equal(listed.mappings.uomConversions.length, 1);

  const resolved = await readJson(await fetch(`${baseUrl}/api/materials/resolve?code=${encodeURIComponent('Supplier Part 001')}&supplier_master_id=${supplier.id}`));
  assert.equal(resolved.success, true);
  assert.equal(resolved.resolution.materialId, material.id);
  assert.equal(resolved.resolution.source, 'supplier_mapping');
  assert.equal(resolved.resolution.conversionFactor, 12);
});

test('material mapping API rejects duplicate active code mappings across materials', async () => {
  const first = await createMaterial('API-DUP-CODE-001', { unit: 'PCS' });
  const second = await createMaterial('API-DUP-CODE-002', { unit: 'PCS' });

  const firstCreate = await fetch(`${baseUrl}/api/materials/${first.id}/code-mappings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mapping_type: 'alias', external_code: 'Shared Duplicate Code' }),
  });
  assert.equal(firstCreate.status, 201);

  const duplicateCreate = await fetch(`${baseUrl}/api/materials/${second.id}/code-mappings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mapping_type: 'alias', external_code: '  shared   duplicate code  ' }),
  });
  assert.equal(duplicateCreate.status, 409);
  const duplicatePayload = await readJson(duplicateCreate);
  assert.equal(duplicatePayload.success, false);
  assert.equal(duplicatePayload.code, 'MATERIAL_CODE_MAPPING_CONFLICT');
  assert.equal(duplicatePayload.details.conflictingMaterialId, first.id);
  assert.equal(duplicatePayload.details.mappingType, 'alias');
  assert.equal(duplicatePayload.details.normalizedCode, 'shared duplicate code');

  const inactiveCreate = await fetch(`${baseUrl}/api/materials/${second.id}/code-mappings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mapping_type: 'alias',
      external_code: 'Shared Duplicate Code',
      is_active: false,
    }),
  });
  assert.equal(inactiveCreate.status, 201);
  const inactivePayload = await readJson(inactiveCreate);

  const activateDuplicate = await fetch(`${baseUrl}/api/materials/${second.id}/code-mappings/${inactivePayload.mapping.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ is_active: true }),
  });
  assert.equal(activateDuplicate.status, 409);
  const activatePayload = await readJson(activateDuplicate);
  assert.equal(activatePayload.success, false);
  assert.equal(activatePayload.code, 'MATERIAL_CODE_MAPPING_CONFLICT');
  assert.equal(activatePayload.details.conflictingMaterialId, first.id);
});

test('material mapping API preserves old material list shape and returns typed resolver errors', async () => {
  await createMaterial('API-LIST-MAT');

  const listResponse = await fetch(`${baseUrl}/api/materials?q=API-LIST-MAT`);
  assert.equal(listResponse.status, 200);
  const listPayload = await readJson(listResponse);
  assert.ok(Array.isArray(listPayload));
  assert.ok(listPayload.some((item: any) => item.code === 'API-LIST-MAT'));

  const missingResponse = await fetch(`${baseUrl}/api/materials/resolve?code=UNKNOWN-MAPPING-CODE&allow_legacy_fallback=false`);
  assert.equal(missingResponse.status, 404);
  const missingPayload = await readJson(missingResponse);
  assert.equal(missingPayload.success, false);
  assert.equal(missingPayload.code, 'MATERIAL_NOT_RESOLVED');

  const invalidSupplierId = await fetch(`${baseUrl}/api/materials/resolve?code=API-LIST-MAT&supplier_master_id=abc`);
  assert.equal(invalidSupplierId.status, 400);
  const invalidSupplierIdPayload = await readJson(invalidSupplierId);
  assert.equal(invalidSupplierIdPayload.success, false);
  assert.equal(invalidSupplierIdPayload.code, 'MATERIAL_MAPPING_INVALID');
});

test('material mapping API rejects invalid mapping payloads', async () => {
  const material = await createMaterial('API-INVALID-MAT');

  const badCode = await fetch(`${baseUrl}/api/materials/${material.id}/code-mappings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mapping_type: 'bad_type', external_code: 'bad' }),
  });
  assert.equal(badCode.status, 400);

  const badUom = await fetch(`${baseUrl}/api/materials/${material.id}/uom-conversions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ from_unit: 'box', to_unit: 'pcs', factor: 0 }),
  });
  assert.equal(badUom.status, 400);
  const badUomPayload = await readJson(badUom);
  assert.equal(badUomPayload.code, 'MATERIAL_UOM_INVALID');

  const invalidSupplierNumber = await fetch(`${baseUrl}/api/materials/${material.id}/supplier-mappings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ supplier_code: 'bad-number', conversion_factor: 'abc' }),
  });
  assert.equal(invalidSupplierNumber.status, 400);
  const invalidSupplierPayload = await readJson(invalidSupplierNumber);
  assert.equal(invalidSupplierPayload.code, 'MATERIAL_MAPPING_INVALID');

  const invalidUomNumber = await fetch(`${baseUrl}/api/materials/${material.id}/uom-conversions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ from_unit: 'box', to_unit: 'pcs', factor: 'abc' }),
  });
  assert.equal(invalidUomNumber.status, 400);

  const codeCreate = await fetch(`${baseUrl}/api/materials/${material.id}/code-mappings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mapping_type: 'alias', external_code: 'valid-patch-code' }),
  });
  const codePayload = await readJson(codeCreate);
  const invalidCodePatch = await fetch(`${baseUrl}/api/materials/${material.id}/code-mappings/${codePayload.mapping.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mapping_type: 'bad_type' }),
  });
  assert.equal(invalidCodePatch.status, 400);

  const supplierCreate = await fetch(`${baseUrl}/api/materials/${material.id}/supplier-mappings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ supplier_code: 'valid-patch-supplier' }),
  });
  const supplierPayload = await readJson(supplierCreate);
  const invalidSupplierPatch = await fetch(`${baseUrl}/api/materials/${material.id}/supplier-mappings/${supplierPayload.mapping.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ supplier_code: '   ' }),
  });
  assert.equal(invalidSupplierPatch.status, 400);
});

test.after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
  await sequelize.close();
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
});
