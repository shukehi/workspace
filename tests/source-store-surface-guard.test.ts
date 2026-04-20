import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ROOT = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(`${ROOT}/${filePath}`, 'utf8');
}

test('source store surface guard: only consumer-facing workflow actions stay exported', () => {
  const store = read('src/stores/useSourceStore.ts');

  assert.match(store, /fetchContract,/);
  assert.match(store, /loadHistoryContractByCode,/);
  assert.match(store, /clear/);
  assert.doesNotMatch(store, /applyContractData,/);
  assert.doesNotMatch(store, /calculateMaterials,/);
});
