import test from 'node:test';
import assert from 'node:assert/strict';
import { useSourceStoreState } from '../src/features/source-analysis/composables/useSourceStoreState';

test('source store state exposes stable refs with empty defaults', () => {
  const state = useSourceStoreState();

  assert.equal(state.currentOrder.value, null);
  assert.equal(state.materialRequirements.value, null);
  assert.equal(state.hardwareRequirements.value, null);
  assert.equal(state.analysisResult.value, null);
  assert.equal(state.loading.value, false);
  assert.equal(state.error.value, null);
});
