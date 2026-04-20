import test from 'node:test';
import assert from 'node:assert/strict';
import { runSourceOrderApplyPipeline } from '../src/features/source-analysis/services/sourceOrderApplyRunner';

test('source order apply runner executes contract state, cache, and analysis in order', async () => {
  const calls: string[] = [];
  await runSourceOrderApplyPipeline({
    orderData: { code: 'C-101', list: [{ id: 1 }] },
    persistCache: true,
    applyContractState: (orderData) => {
      calls.push(`state:${orderData.code}`);
    },
    applyContractCache: async ({ orderData, persistCache }) => {
      calls.push(`cache:${orderData.code}:${String(persistCache)}`);
    },
    calculateMaterials: async () => {
      calls.push('analyze');
    },
  });

  assert.deepEqual(calls, ['state:C-101', 'cache:C-101:true', 'analyze']);
});
