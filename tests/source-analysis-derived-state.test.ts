import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { useSourceAnalysisDerivedState } from '../src/features/source-analysis/composables/useSourceAnalysisDerivedState';

test('source analysis derived state exposes stable flat selectors from analysisResult', () => {
  const analysisResult = ref<any>({
    flatMaterials: [{ code: 'M1' }],
    flatCylinders: [{ code: 'C1' }],
    flatLocks: [{ code: 'L1' }],
    flatHandles: [{ code: 'H1' }],
    flatForks: [{ code: 'F1' }],
    flatAccessories: [{ code: 'A1' }],
    flatPackaging: [{ code: 'P1' }],
  });

  const state = useSourceAnalysisDerivedState(analysisResult);

  assert.deepEqual(state.flatMaterials.value, [{ code: 'M1' }]);
  assert.deepEqual(state.flatCylinders.value, [{ code: 'C1' }]);
  assert.deepEqual(state.flatLocks.value, [{ code: 'L1' }]);
  assert.deepEqual(state.flatHandles.value, [{ code: 'H1' }]);
  assert.deepEqual(state.flatForks.value, [{ code: 'F1' }]);
  assert.deepEqual(state.flatAccessories.value, [{ code: 'A1' }]);
  assert.deepEqual(state.flatPackaging.value, [{ code: 'P1' }]);

  analysisResult.value = null;
  assert.deepEqual(state.flatMaterials.value, []);
  assert.deepEqual(state.flatPackaging.value, []);
});
