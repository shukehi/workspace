import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { runSourceOrderAnalysis } from '../src/features/source-analysis/services/sourceOrderAnalysisRunner';

test('source order analysis runner skips execution when no current order exists', async () => {
  let called = false;
  const result = await runSourceOrderAnalysis({
    state: { currentOrder: ref<any>(null) },
    analyzeOrder: async () => {
      called = true;
      return {} as any;
    },
  });

  assert.equal(called, false);
  assert.equal(result, null);
});

test('source order analysis runner delegates current order and optional items to analyzer', async () => {
  const state = { currentOrder: ref<any>({ code: 'C-123', list: [{ id: 1 }] }) };
  const result = await runSourceOrderAnalysis({
    state,
    items: [{ id: 9 }],
    analyzeOrder: async ({ order, items }) => {
      assert.equal(order.code, 'C-123');
      assert.deepEqual(items, [{ id: 9 }]);
      return { flatMaterials: [{ code: 'M1' }] } as any;
    },
  });

  assert.deepEqual(result, { flatMaterials: [{ code: 'M1' }] });
});
