import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { clearSourceOrderWorkflowState } from '../src/features/source-analysis/services/sourceOrderClearApplier';

test('source order clear applier clears contract, analysis, error, and snapshot side effects together', () => {
  const state = {
    currentOrder: ref<any>({ code: 'C-001', list: [{ id: 1 }] }),
    materialRequirements: ref<any>({ rows: ['materials'] }),
    hardwareRequirements: ref<any>({ cylinders: [] }),
    analysisResult: ref<any>({ flatMaterials: [{ code: 'M1' }] }),
    error: ref<string | null>('boom'),
  };
  const calls: string[] = [];

  clearSourceOrderWorkflowState(state, () => {
    calls.push('clearSnapshot');
  });

  assert.equal(state.currentOrder.value, null);
  assert.equal(state.materialRequirements.value, null);
  assert.equal(state.hardwareRequirements.value, null);
  assert.equal(state.analysisResult.value, null);
  assert.equal(state.error.value, null);
  assert.deepEqual(calls, ['clearSnapshot']);
});
