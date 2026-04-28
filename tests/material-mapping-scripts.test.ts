import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  createMaterialForMappingTest,
  createSupplierMasterForMappingTest,
} from './helpers/material-mapping-test-helpers';

const requireForTest = createRequire(import.meta.url);
const TEST_DB = path.join(os.tmpdir(), `material-scripts-${crypto.randomBytes(8).toString('hex')}.sqlite`);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TSX_BIN = path.join(REPO_ROOT, 'node_modules/.bin/tsx');

const purgeServerCache = () => {
  // Keep this before server imports so child scripts and this process share the
  // same isolated sqlite file via DB_STORAGE instead of the default dev DB.
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
  const trimmed = output.trim();
  for (let start = trimmed.lastIndexOf('{'); start >= 0; start = trimmed.lastIndexOf('{', start - 1)) {
    try {
      return JSON.parse(trimmed.slice(start));
    } catch {
      // Keep scanning backwards: bootstrap logs or nested JSON objects can also contain "{".
    }
  }
  throw new Error(`Expected JSON object in script stdout, received:\n${output}`);
}

function runRawScript(script: string, args: string[] = []) {
  return spawnSync(TSX_BIN, [script, ...args], {
    cwd: REPO_ROOT,
    env: { ...process.env, DB_STORAGE: TEST_DB },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function runScript(script: string, args: string[] = []): JsonObject {
  const result = runRawScript(script, args);

  if (result.error || result.status !== 0) {
    throw new Error([
      `Script failed: ${script} ${args.join(' ')}`,
      `status=${result.status}`,
      result.error ? `error=${result.error.message}` : '',
      `stdout:\n${result.stdout}`,
      `stderr:\n${result.stderr}`,
    ].filter(Boolean).join('\n'));
  }

  return parseJsonFromOutput(result.stdout);
}

async function createMaterial(code: string, overrides: Record<string, unknown> = {}) {
  return createMaterialForMappingTest(Material, code, overrides);
}

async function createSupplierMaster(supplierName: string, overrides: Record<string, unknown> = {}) {
  return createSupplierMasterForMappingTest(SupplierMaster, supplierName, overrides);
}

async function countMappingRows() {
  return {
    code: await MaterialCodeMapping.count(),
    supplier: await MaterialSupplierMapping.count(),
    uom: await MaterialUomConversion.count(),
  };
}

async function seedScriptMaterial(seed: string) {
  const supplier = await createSupplierMaster(`Script Supplier ${seed}`);
  return createMaterial(`SCRIPT-MAT-${seed}`, {
    model: `script-model-${seed}`,
    aliases: [`script-alias-${seed}`],
    supplier: `Script Supplier ${seed}`,
    supplier_master_id: supplier.id,
    unit: 'pcs',
  });
}

test.before(async () => {
  await initDB();
});

test('backfill dry-run plans code and UOM mappings without writing rows or default supplier mappings', async () => {
  await seedScriptMaterial('DRY-RUN');
  const before = await countMappingRows();

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

  assert.deepEqual(await countMappingRows(), before);
});

test('backfill apply writes supplier mappings only when fallback flag is explicit', async () => {
  await seedScriptMaterial('APPLY');
  const before = await countMappingRows();

  const summary = runScript('server/scripts/backfill_material_mappings.ts', [
    '--apply',
    '--include-supplier-code-fallback',
    '--json',
  ]);

  assert.equal(summary.mode, 'apply');
  assert.equal(summary.conflictCount, 0);
  assert.ok(summary.plannedByTable.material_supplier_mappings >= 1);
  assert.equal(await MaterialCodeMapping.count() - before.code, summary.plannedByTable.material_code_mappings);
  assert.equal(await MaterialSupplierMapping.count() - before.supplier, summary.plannedByTable.material_supplier_mappings);
  assert.equal(await MaterialUomConversion.count() - before.uom, summary.plannedByTable.material_uom_conversions);
});

test('backfill apply is idempotent when all planned mappings already exist', async () => {
  const summary = runScript('server/scripts/backfill_material_mappings.ts', [
    '--apply',
    '--include-supplier-code-fallback',
    '--json',
  ]);

  assert.equal(summary.mode, 'apply');
  assert.equal(summary.plannedInsertCount, 0);
  assert.deepEqual(summary.plannedByTable, {});
});

test('backfill apply rolls back all planned inserts when one insert fails', async () => {
  const supplier = await createSupplierMaster('Script Supplier Transaction Rollback');
  await createMaterial('SCRIPT-TX-DUP CODE', {
    supplier: supplier.supplier_name,
    supplier_master_id: supplier.id,
    unit: 'pcs',
  });
  await createMaterial('SCRIPT-TX-DUP   CODE', {
    supplier: supplier.supplier_name,
    supplier_master_id: supplier.id,
    unit: 'pcs',
  });
  const before = await countMappingRows();

  const result = runRawScript('server/scripts/backfill_material_mappings.ts', [
    '--apply',
    '--include-supplier-code-fallback',
    '--json',
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /backfill_material_mappings.*failed|Validation error|SQLITE_CONSTRAINT/i);
  assert.deepEqual(await countMappingRows(), before);
});

test('audit script reports zero duplicates for clean active mappings', async () => {
  const audit = runScript('server/scripts/audit_material_mapping_conflicts.ts', ['--json']);

  assert.equal(audit.codeDuplicateCount, 0);
  assert.equal(audit.supplierDuplicateCount, 0);
});

test('backfill dry-run reports code conflicts before writing new mappings', async () => {
  const existingMaterial = await createMaterial('SCRIPT-CONFLICT-EXISTING');
  await createCodeMapping({
    material_id: existingMaterial.id,
    mapping_type: 'legacy_code',
    external_code: 'script-conflict-model',
    is_active: true,
  } as any);
  await createMaterial('SCRIPT-CONFLICT-NEW', { model: 'script-conflict-model' });

  const summary = runScript('server/scripts/backfill_material_mappings.ts', ['--dry-run', '--json']);

  assert.ok(summary.conflictCount > 0);
  assert.ok(
    summary.conflicts.some((conflict: any) => conflict.payload?.normalized_code === 'script-conflict-model'),
  );
});

test('backfill apply refuses detected planning conflicts before writing rows', async () => {
  const existingMaterial = await createMaterial('SCRIPT-CONFLICT-APPLY-EXISTING');
  await createCodeMapping({
    material_id: existingMaterial.id,
    mapping_type: 'legacy_code',
    external_code: 'script-conflict-apply-model',
    is_active: true,
  } as any);
  await createMaterial('SCRIPT-CONFLICT-APPLY-NEW', { model: 'script-conflict-apply-model' });
  const before = await countMappingRows();

  const result = runRawScript('server/scripts/backfill_material_mappings.ts', ['--apply', '--json']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing to apply material mapping backfill with .* conflict/i);
  const summary = parseJsonFromOutput(result.stdout);
  assert.ok(summary.conflictCount > 0);
  assert.ok(
    summary.conflicts.some((conflict: any) => conflict.payload?.normalized_code === 'script-conflict-apply-model'),
  );
  assert.deepEqual(await countMappingRows(), before);
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
