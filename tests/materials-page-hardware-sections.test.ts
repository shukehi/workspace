import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ROOT = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(`${ROOT}/${filePath}`, 'utf8');
}

test('materials page exposes all hardware analysis sections', () => {
  const view = read('src/views/Materials.vue');
  const columns = read('src/components/materials/MaterialColumns.ts');
  const pageState = read('src/features/materials/composables/useMaterialsPageState.ts');
  const derived = read('src/features/source-analysis/composables/useSourceAnalysisDerivedState.ts');

  assert.match(view, /Locks \(锁具\)/);
  assert.match(view, /Handles \(拉手\)/);
  assert.match(view, /Accessories \(五金配件\)/);
  assert.match(view, /flatLocks/);
  assert.match(view, /flatHandles/);
  assert.match(view, /flatAccessories/);
  assert.doesNotMatch(view, /store\.flatLocks/);
  assert.doesNotMatch(view, /store\.flatHandles/);
  assert.doesNotMatch(view, /store\.flatAccessories/);

  assert.match(columns, /export const lockColumns/);
  assert.match(columns, /export const handleColumns/);
  assert.match(columns, /export const accessoryColumns/);
  assert.match(columns, /export const forkColumns/);
  assert.match(columns, /accessorKey: 'matchedRules'/);
  assert.match(columns, /accessorKey: 'winningRules'/);

  assert.match(pageState, /useSourceStore/);
  assert.match(pageState, /flatAccessories: computed/);
  assert.match(derived, /const flatAccessories = computed/);
});
