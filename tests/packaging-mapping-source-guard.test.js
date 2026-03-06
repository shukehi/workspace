const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const ROOT = process.cwd();

function read(path) {
  return fs.readFileSync(`${ROOT}/${path}`, 'utf8');
}

test('packaging mapping source guard: config loader should use API endpoint first', () => {
  const loader = read('src/services/configLoader.ts');
  assert.match(loader, /fetch\('\/api\/config\/packaging-mapping'\)/);
});

test('packaging mapping source guard: duplicated mapping files should stay in sync', () => {
  const dataMapping = JSON.parse(read('data/packaging-mapping.json'));
  const publicMapping = JSON.parse(read('public/data/packaging-mapping.json'));
  assert.deepEqual(dataMapping, publicMapping);
});
