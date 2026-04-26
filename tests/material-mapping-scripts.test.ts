import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const requireForTest = createRequire(import.meta.url);
const TEST_DB = path.join(os.tmpdir(), `material-scripts-${crypto.randomBytes(8).toString('hex')}.sqlite`);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TSX_BIN = path.join(REPO_ROOT, 'node_modules/.bin/tsx');

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
  MaterialCodeMapping,
  MaterialSupplierMapping,
  MaterialUomConversion,
  SupplierMaster,
} = requireForTest('../server/models') as typeof import('../server/models');
const { createCodeMapping } = requireForTest('../server/services/materials/material-mapping.repository') as typeof import('../server/services/materials/material-mapping.repository');

type JsonObject = Record<string, any>;

function parseJsonFromOutput(output: string): JsonObject {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  assert.ok(start >= 0 && end > start, `Expected JSON object in output: ${output}`);
  return JSON.parse(output.slice(start, end + 1));
}

function runScript(script: string, args: string[] = []): JsonObject {
  const output = execFileSync(TSX_BIN, [script, ...args], {
    cwd: REPO_ROOT,
    env: { ...process.env, DB_STORAGE: TEST_DB },
    encoding: 'utf8',
  });
  return parseJsonFromOutput(output);
}

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

test('backfill dry-run plans code and UOM mappings without writing rows or default supplier mappings', async () => {
  const supplier = await SupplierMaster.create({
    supplier_name: 'Script Supplier',
    normalized_name: 'script supplier',
    status: 'active',
  } as any) as any;
  await createMaterial('SCRIPT-MAT-001', {
    model: 'script-model-001',
    aliases: ['script-alias-001'],
    supplier: 'Script Supplier',
    supplier_master_id: supplier.id,
    unit: 'pcs',
  });

  const summary = runScript('server/scripts/backfill_material_mappings.ts', ['--dry-run', '--json']);

  assert.equal(summary.mode, 'dry-run');
  assert.ok(summary.scannedMaterials >= 1);
  assert.equal(summary.conflictCount, 0);
  assert.ok(summary.supplierLinkCandidateCount >= 1);
  assert.ok(summary.plannedByTable.material_code_mappings >= 3);
  assert.ok(summary.plannedByTable.material_uom_conversions >= 1);
  assert.equal(summary.plannedByTable.material_supplier_mappings, undefined);
  assert.ok(
    summary.supplierLinkCandidatePreview.some((item: any) => /--include-supplier-code-fallback/.test(item.note)),
  );

  assert.equal(await MaterialCodeMapping.count(), 0);
  assert.equal(await MaterialSupplierMapping.count(), 0);
  assert.equal(await MaterialUomConversion.count(), 0);
});

test('backfill apply writes supplier mappings only when fallback flag is explicit', async () => {
  const summary = runScript('server/scripts/backfill_material_mappings.ts', [
    '--apply',
    '--include-supplier-code-fallback',
    '--json',
  ]);

  assert.equal(summary.mode, 'apply');
  assert.equal(summary.conflictCount, 0);
  assert.ok(summary.plannedByTable.material_supplier_mappings >= 1);
  assert.equal(await MaterialCodeMapping.count(), summary.plannedByTable.material_code_mappings);
  assert.equal(await MaterialSupplierMapping.count(), summary.plannedByTable.material_supplier_mappings);
  assert.equal(await MaterialUomConversion.count(), summary.plannedByTable.material_uom_conversions);
});

test('audit script reports duplicate active code mappings across different materials', async () => {
  const first = await createMaterial('SCRIPT-DUP-001');
  const second = await createMaterial('SCRIPT-DUP-002');
  await createCodeMapping({
    material_id: first.id,
    mapping_type: 'alias',
    external_code: 'duplicate-external-code',
    is_active: true,
  } as any);
  await createCodeMapping({
    material_id: second.id,
    mapping_type: 'alias',
    external_code: 'duplicate-external-code',
    is_active: true,
  } as any);

  const audit = runScript('server/scripts/audit_material_mapping_conflicts.ts', ['--json']);

  assert.equal(audit.codeDuplicateCount, 1);
  assert.equal(audit.supplierDuplicateCount, 0);
  assert.equal(audit.codeDuplicates[0].normalized_code, 'duplicate-external-code');
});

test.after(async () => {
  await sequelize.close();
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
});
