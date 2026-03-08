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

test('mapping source guard: config loader should use packaging API endpoint first', () => {
  const loader = read('src/services/configLoader.ts');
  const apiIndex = loader.indexOf("'/api/config/packaging'");
  const fallbackIndex = loader.indexOf("'/data/packaging-mapping.json'");
  assert.notEqual(apiIndex, -1);
  assert.notEqual(fallbackIndex, -1);
  assert.ok(apiIndex < fallbackIndex);
});

test('mapping source guard: mapping JSON runtime reads stay inside configLoader', () => {
  assert.deepEqual(rgFiles('/data/packaging-mapping\\.json'), ['src/services/configLoader.ts']);
  assert.deepEqual(rgFiles('/data/cylinder-mapping\\.json'), ['src/services/configLoader.ts']);
  assert.deepEqual(rgFiles('/data/lock-fork-mapping\\.json'), ['src/services/configLoader.ts']);
  assert.deepEqual(rgFiles('/data/handle-mapping\\.json'), ['src/services/configLoader.ts']);
  assert.deepEqual(rgFiles('/api/config/packaging'), ['src/services/configLoader.ts']);
  assert.deepEqual(rgFiles('/api/config/handle'), ['src/services/configLoader.ts']);
});

test('mapping source guard: runtime mapping read points stay explicitly inventoried', () => {
  assert.deepEqual(
    rgFiles('packaging-mapping\\.json|cylinder-mapping\\.json|lock-fork-mapping\\.json|handle-mapping\\.json', ['src', 'server']).sort(),
    ['server/routes/configData.js', 'src/services/configLoader.ts'],
  );
});

test('mapping source guard: server runtime must not start reading cylinder/lock-fork JSON directly', () => {
  assert.deepEqual(rgFiles('cylinder-mapping\\.json|lock-fork-mapping\\.json|handle-mapping\\.json', ['server']), ['server/routes/configData.js']);
});

test('mapping source guard: duplicated packaging mapping files should stay in sync', () => {
  const dataMapping = JSON.parse(read('data/packaging-mapping.json'));
  const publicMapping = JSON.parse(read('public/data/packaging-mapping.json'));
  assert.deepEqual(dataMapping, publicMapping);
});
