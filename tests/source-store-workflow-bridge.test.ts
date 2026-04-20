import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { useSourceStoreWorkflow } from '../src/features/source-analysis/composables/useSourceStoreWorkflow';

test('source store workflow bridge wires state into workflow factory and bootstraps rehydrate once', async () => {
  const state = {
    currentOrder: ref<any>(null),
    materialRequirements: ref<any>(null),
    hardwareRequirements: ref<any>(null),
    analysisResult: ref<any>(null),
    loading: ref(false),
    error: ref<string | null>(null),
  };
  const calls: string[] = [];

  const workflow = useSourceStoreWorkflow(state, {
    createWorkflow: (receivedState: any) => {
      assert.equal(receivedState, state);
      return {
        applyContractData: () => calls.push('apply'),
        fetchContract: () => calls.push('fetch'),
        loadHistoryContractByCode: () => calls.push('history'),
        calculateMaterials: () => calls.push('calculate'),
        clear: () => calls.push('clear'),
        rehydrateFromSnapshot: async () => {
          calls.push('rehydrate');
        },
      } as any;
    },
  });

  await Promise.resolve();
  assert.deepEqual(calls, ['rehydrate']);
  assert.equal(typeof workflow.fetchContract, 'function');
  assert.equal(typeof workflow.clear, 'function');
});
