import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import {
  applySourceAnalysisResult,
  clearSourceAnalysisResult,
} from '../src/features/source-analysis/services/sourceAnalysisStateApplier';

test('source analysis state applier writes and clears analysis refs consistently', () => {
  const state = {
    materialRequirements: ref<any>(null),
    hardwareRequirements: ref<any>(null),
    analysisResult: ref<any>(null),
  };

  const result = {
    materialRequirements: { rows: ['materials'] },
    hardwareRequirements: {
      cylinders: [],
      locks: [],
      handles: [],
      lockForks: [],
      accessories: [],
      packaging: {},
    },
    flatMaterials: [{ code: 'M1' }],
    flatCylinders: [],
    flatLocks: [],
    flatHandles: [],
    flatForks: [],
    flatAccessories: [],
    flatPackaging: [],
  };

  applySourceAnalysisResult(state, result as any);
  assert.deepEqual(state.analysisResult.value, result);
  assert.deepEqual(state.materialRequirements.value, result.materialRequirements);
  assert.deepEqual(state.hardwareRequirements.value, result.hardwareRequirements);

  clearSourceAnalysisResult(state);
  assert.equal(state.analysisResult.value, null);
  assert.equal(state.materialRequirements.value, null);
  assert.equal(state.hardwareRequirements.value, null);
});
