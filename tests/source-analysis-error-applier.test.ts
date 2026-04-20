import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import {
  failSourceAnalysisCalculation,
  warnSourceAnalysisRehydrateFailure,
} from '../src/features/source-analysis/services/sourceAnalysisErrorApplier';

test('source analysis error applier clears analysis refs and writes a stable error message', () => {
  const state = {
    materialRequirements: ref<any>({ rows: ['materials'] }),
    hardwareRequirements: ref<any>({ cylinders: [] }),
    analysisResult: ref<any>({ flatMaterials: [{ code: 'M1' }] }),
    error: ref<string | null>(null),
  };
  const calls: string[] = [];

  failSourceAnalysisCalculation(state, new Error('boom'), (message, error) => {
    calls.push(`${message}:${(error as Error).message}`);
  });

  assert.deepEqual(calls, ['Calculation failed:boom']);
  assert.equal(state.analysisResult.value, null);
  assert.equal(state.materialRequirements.value, null);
  assert.equal(state.hardwareRequirements.value, null);
  assert.equal(state.error.value, 'Material calculation failed');
});

test('source analysis error applier warns on snapshot rehydrate failures', () => {
  const calls: string[] = [];

  warnSourceAnalysisRehydrateFailure(new Error('rehydrate failed'), (message, error) => {
    calls.push(`${message}:${(error as Error).message}`);
  });

  assert.deepEqual(calls, ['[SourceStore] failed to re-calculate materials from snapshot::rehydrate failed']);
});
