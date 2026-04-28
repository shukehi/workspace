import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

const ROOT = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(`${ROOT}/${filePath}`, 'utf8');
}

function rgFiles(pattern: string, roots: string[] = ['src']): string[] {
  try {
    const output = execFileSync('rg', ['-l', pattern, ...roots], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    return output ? output.split('\n') : [];
  } catch (error) {
    if ((error as { status?: number }).status === 1) return [];
    throw error;
  }
}

const LEGACY_CONFIG_JSON_PATTERN =
  '(materials-catalog|packaging-mapping|cylinder-mapping|lock-mapping|lock-fork-mapping|handle-mapping|color-formulas)\\.json';
const LEGACY_MAPPING_CONFIG_FILES_PATTERN =
  'CONFIG_FILES\\.(materialsCatalog|[A-Za-z]+Mapping)';

test('config source guard: workflow published endpoints must be the default mapping sources', () => {
  const repository = read('src/services/configRepository.ts');
  assert.notEqual(repository.indexOf('/api/config/profiles/${workflowType}/detail'), -1);
  assert.notEqual(repository.indexOf('/api/config/profiles/material_catalog/detail'), -1);
});

test('config source guard: legacy config endpoints stay isolated to repository and compatibility tests', () => {
  assert.deepEqual(
    rgFiles('/api/config/materials', ['src', 'tests']).sort(),
    [
      'tests/config-endpoint-source-guard.test.ts',
    ],
  );
  assert.deepEqual(
    rgFiles('/api/config/packaging', ['src', 'tests']).sort(),
    ['tests/config-endpoint-source-guard.test.ts'],
  );
  assert.deepEqual(
    rgFiles('/api/config/cylinder', ['src', 'tests']).sort(),
    ['tests/config-endpoint-source-guard.test.ts'],
  );
  assert.deepEqual(
    rgFiles('/api/config/lock', ['src', 'tests']).sort(),
    ['tests/config-endpoint-source-guard.test.ts'],
  );
  assert.deepEqual(
    rgFiles('/api/config/handle', ['src', 'tests']).sort(),
    ['tests/config-endpoint-source-guard.test.ts'],
  );
  assert.deepEqual(
    rgFiles('/api/config/packaging-mapping', ['src', 'tests']).sort(),
    ['tests/config-endpoint-source-guard.test.ts'],
  );
});



test('config source guard: material catalog request workflow must not bridge to legacy JSON', () => {
  const workflow = read('server/services/materials/materialCatalog.workflow.ts');
  const repository = read('server/services/materials/materialCatalog.repository.ts');

  assert.equal(workflow.includes('readLegacyCatalog'), false);
  assert.equal(workflow.includes('writeLegacyCatalog'), false);
  assert.equal(workflow.includes('materials-catalog.json'), false);
  assert.equal(workflow.includes('CONFIG_FILES.materialsCatalog'), false);
  assert.equal(repository.includes('readLegacyCatalog'), false);
  assert.equal(repository.includes('writeLegacyCatalog'), false);
  assert.equal(repository.includes('CONFIG_FILES.materialsCatalog'), false);
});

test('config source guard: mapping detail must not read legacy cylinder JSON on request path', () => {
  const workflow = read('server/services/mappings/mapping.workflow.ts');
  assert.equal(workflow.includes('CONFIG_FILES.cylinderMapping'), false);
  assert.equal(workflow.includes('cylinder-mapping.json'), false);
  assert.equal(workflow.includes('readLegacyCylinderPayload'), false);
});

test('config source guard: static JSON fallback reads are removed for mappings', () => {
  assert.deepEqual(rgFiles('/data/packaging-mapping\\.json'), []);
  assert.deepEqual(rgFiles('/data/cylinder-mapping\\.json'), []);
  assert.deepEqual(rgFiles('/data/lock-mapping\\.json'), []);
  assert.deepEqual(rgFiles('/data/lock-fork-mapping\\.json'), []);
  assert.deepEqual(rgFiles('/data/handle-mapping\\.json'), []);
  assert.deepEqual(rgFiles('/data/materials-catalog\\.json'), []);
});

test('config source guard: src must not add new direct dependencies on legacy compatibility routes', () => {
  assert.deepEqual(rgFiles('/api/config/materials', ['src']).sort(), []);
  assert.deepEqual(rgFiles('/api/config/packaging', ['src']).sort(), []);
  assert.deepEqual(rgFiles('/api/config/cylinder', ['src']).sort(), []);
  assert.deepEqual(rgFiles('/api/config/lock', ['src']).sort(), []);
  assert.deepEqual(rgFiles('/api/config/lock-fork', ['src']).sort(), []);
  assert.deepEqual(rgFiles('/api/config/handle', ['src']).sort(), []);
  assert.deepEqual(rgFiles('/api/config/packaging-mapping', ['src']).sort(), []);
});

test('config source guard: legacy config JSON access stays in fixture and import/migration boundaries', () => {
  const allowedLegacyConfigReaders = [
    'scripts/import_csv.js',
    'scripts/migrate_material_schema.js',
    'server/config/index.ts',
    'server/config/paths.ts',
    'server/scripts/importMaterials.ts',
    'server/scripts/migrate_formulas_to_sqlite.ts',
    'server/scripts/seed_mapping_profiles.ts',
    'tests/config-endpoint-source-guard.test.ts',
    'tests/cylinder-secondary-special-rules-shape.test.ts',
    'tests/manual/test_cylinder_logic.js',
    'tests/mapping-adapter-baseline.test.ts',
    'tests/mapping-runtime-derived-regression.test.ts',
    'tests/mapping-runtime-regression.test.ts',
    'tests/materials-workflow.test.ts',
  ];

  assert.deepEqual(
    rgFiles(
      `(data/config|CONFIG_FILES\\.|${LEGACY_CONFIG_JSON_PATTERN})`,
      ['scripts', 'server', 'src', 'tests'],
    ).sort(),
    allowedLegacyConfigReaders,
  );
});

test('config source guard: runtime and front-end sources must not reference legacy config JSON files', () => {
  assert.deepEqual(
    rgFiles(
      `(data/config|/data/${LEGACY_CONFIG_JSON_PATTERN}|${LEGACY_CONFIG_JSON_PATTERN}|${LEGACY_MAPPING_CONFIG_FILES_PATTERN})`,
      ['src', 'server/services'],
    ).sort(),
    [],
  );
});

test('config source guard: front-end direct `/config/formulas` reads stay isolated behind formula adapter files only', () => {
  assert.deepEqual(
    rgFiles('/config/formulas', ['src']).sort(),
    [],
  );
});

test('config source guard: compatibility shims must not regain production consumers', () => {
  assert.equal(fs.existsSync(`${ROOT}/src/features/config-editor/composables/useMappingConfigEditor.ts`), false);
  assert.equal(fs.existsSync(`${ROOT}/src/services/formulaApi.ts`), false);
  assert.equal(fs.existsSync(`${ROOT}/src/features/config-editor/components/ConfigPageLayout.vue`), false);
  assert.deepEqual(rgFiles('ConfigPageLayout', ['src']).sort(), []);
  assert.deepEqual(rgFiles('useMappingConfigEditor', ['src']).sort(), []);
  assert.deepEqual(rgFiles('formulaApi', ['src']).sort(), []);
});

test('config source guard: legacy route mounts stay isolated to dedicated bridge contract tests', () => {
  assert.deepEqual(
    rgFiles("app.use\\('/api/config/formulas'", ['tests']).sort(),
    [],
  );
  assert.deepEqual(
    rgFiles("app.use\\('/api/config/material-catalog'", ['tests']).sort(),
    [],
  );
  assert.deepEqual(
    rgFiles("app.use\\('/api/config/materials'", ['tests']).sort(),
    [],
  );
  assert.deepEqual(
    rgFiles("app.use\\('/api/config/mappings'", ['tests']).sort(),
    [],
  );
});
