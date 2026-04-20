import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { createSourceOrderWorkflow } from '../src/features/source-analysis/services/sourceOrderWorkflow';
import type { SourceAnalysisResult } from '../src/types/sourceAnalysis';

function createResult(): SourceAnalysisResult {
  return {
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
}

function createState() {
  return {
    currentOrder: ref<any>(null),
    materialRequirements: ref<any>(null),
    hardwareRequirements: ref<any>(null),
    analysisResult: ref<SourceAnalysisResult | null>(null),
    loading: ref(false),
    error: ref<string | null>(null),
  };
}

test('source order workflow applies ERP contract data, persists snapshot, and analyzes materials', async () => {
  const state = createState();
  const calls: string[] = [];
  const workflow = createSourceOrderWorkflow(state, {
    fetchErpContract: async (contractId: string) => {
      calls.push(`fetch:${contractId}`);
      return {
        code: contractId,
        list: [{ id: 1 }],
      };
    },
    persistSourceOrderSnapshot: (orderData: any) => {
      calls.push(`persist:${orderData.code}`);
    },
    cacheErpContractSnapshot: async (orderData: any) => {
      calls.push(`cache:${orderData.code}`);
    },
    analyzeOrder: async ({ order }) => {
      calls.push(`analyze:${order.code}`);
      return createResult();
    },
  });

  await workflow.fetchContract(' C-7001 ');

  assert.equal(state.currentOrder.value.code, 'C-7001');
  assert.deepEqual(state.currentOrder.value.list, [{ id: 1 }]);
  assert.deepEqual(state.analysisResult.value?.flatMaterials, [{ code: 'M1' }]);
  assert.deepEqual(calls, [
    'fetch:C-7001',
    'persist:C-7001',
    'cache:C-7001',
    'analyze:C-7001',
  ]);
});

test('source order workflow rehydrates from snapshot and can clear state', async () => {
  const state = createState();
  state.currentOrder.value = {
    code: 'SNAPSHOT-01',
    list: [{ id: 1 }],
  };
  const calls: string[] = [];
  const workflow = createSourceOrderWorkflow(state, {
    analyzeOrder: async ({ order }) => {
      calls.push(`analyze:${order.code}`);
      return createResult();
    },
    clearSourceOrderSnapshot: () => {
      calls.push('clearSnapshot');
    },
  });

  await workflow.rehydrateFromSnapshot();
  workflow.clear();

  assert.deepEqual(calls, ['analyze:SNAPSHOT-01', 'clearSnapshot']);
  assert.equal(state.currentOrder.value, null);
  assert.equal(state.analysisResult.value, null);
  assert.equal(state.materialRequirements.value, null);
  assert.equal(state.hardwareRequirements.value, null);
});


test('source order workflow skips cache side effect for history loads', async () => {
  const state = createState();
  const calls: string[] = [];
  const workflow = createSourceOrderWorkflow(state, {
    fetchHistoryContractByCode: async (contractCode: string) => ({
      code: contractCode,
      list: [{ id: 9 }],
    }),
    persistSourceOrderSnapshot: (orderData: any) => {
      calls.push(`persist:${orderData.code}`);
    },
    cacheErpContractSnapshot: async (orderData: any) => {
      calls.push(`cache:${orderData.code}`);
    },
    analyzeOrder: async ({ order }) => {
      calls.push(`analyze:${order.code}`);
      return createResult();
    },
  });

  await workflow.loadHistoryContractByCode('HISTORY-009');

  assert.deepEqual(calls, ['persist:HISTORY-009', 'analyze:HISTORY-009']);
});


test('source order workflow writes normalized fetch error message into request state', async () => {
  const state = createState();
  const workflow = createSourceOrderWorkflow(state, {
    fetchErpContract: async () => {
      throw new Error('network failed');
    },
  });

  await workflow.fetchContract('C-ERR');

  assert.equal(state.loading.value, false);
  assert.equal(state.error.value, 'network failed');
});
