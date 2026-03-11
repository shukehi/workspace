const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const ROOT = process.cwd();

function read(path) {
  return fs.readFileSync(`${ROOT}/${path}`, 'utf8');
}

function rgFiles(pattern, roots = ['src']) {
  try {
    const output = execFileSync('rg', ['-l', pattern, ...roots], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    return output ? output.split('\n') : [];
  } catch (error) {
    if (error.status === 1) return [];
    throw error;
  }
}

test('config source guard: workflow published endpoints must be the default mapping sources', () => {
  const repository = read('src/services/configRepository.ts');
  assert.notEqual(repository.indexOf('/api/config/mappings/${workflowType}/published'), -1);
  assert.notEqual(repository.indexOf('/api/config/material-catalog/published'), -1);
});

test('config source guard: legacy config endpoints stay isolated to repository and compatibility tests', () => {
  assert.deepEqual(
    rgFiles('/api/config/materials', ['src', 'tests']).sort(),
    ['src/services/configRepository.ts', 'tests/config-endpoint-source-guard.test.js', 'tests/config-routes.test.js'],
  );
  assert.deepEqual(
    rgFiles('/api/config/packaging', ['src', 'tests']).sort(),
    ['tests/config-endpoint-source-guard.test.js', 'tests/config-loader-mapping.test.ts', 'tests/config-routes.test.js'],
  );
  assert.deepEqual(
    rgFiles('/api/config/lock', ['src', 'tests']).sort(),
    ['tests/config-endpoint-source-guard.test.js', 'tests/config-routes.test.js'],
  );
  assert.deepEqual(
    rgFiles('/api/config/handle', ['src', 'tests']).sort(),
    ['tests/config-endpoint-source-guard.test.js', 'tests/config-loader-mapping.test.ts', 'tests/config-routes.test.js'],
  );
});

test('config source guard: static JSON fallback reads stay inside configRepository', () => {
  assert.deepEqual(rgFiles('/data/packaging-mapping\\.json'), ['src/services/configRepository.ts']);
  assert.deepEqual(rgFiles('/data/cylinder-mapping\\.json'), ['src/services/configRepository.ts']);
  assert.deepEqual(rgFiles('/data/lock-mapping\\.json'), ['src/services/configRepository.ts']);
  assert.deepEqual(rgFiles('/data/lock-fork-mapping\\.json'), ['src/services/configRepository.ts']);
  assert.deepEqual(rgFiles('/data/handle-mapping\\.json'), ['src/services/configRepository.ts']);
  assert.deepEqual(rgFiles('/data/materials-catalog\\.json'), ['src/services/configRepository.ts']);
});

test('config source guard: src must not add new direct dependencies on legacy compatibility routes', () => {
  assert.deepEqual(rgFiles('/api/config/materials', ['src']).sort(), ['src/services/configRepository.ts']);
  assert.deepEqual(rgFiles('/api/config/packaging', ['src']).sort(), []);
  assert.deepEqual(rgFiles('/api/config/cylinder', ['src']).sort(), []);
  assert.deepEqual(rgFiles('/api/config/lock', ['src']).sort(), []);
  assert.deepEqual(rgFiles('/api/config/lock-fork', ['src']).sort(), []);
  assert.deepEqual(rgFiles('/api/config/handle', ['src']).sort(), []);
  assert.deepEqual(rgFiles('/api/config/packaging-mapping', ['src']).sort(), []);
});
