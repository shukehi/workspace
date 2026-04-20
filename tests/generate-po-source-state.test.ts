import test from 'node:test';
import assert from 'node:assert/strict';
import { useGeneratePOSourceState } from '../src/features/source-analysis/composables/useGeneratePOSourceState';

test('generate-po source state exposes stable source-store reads for dialogs', () => {
  const state = useGeneratePOSourceState({
    hasOrder: true,
    currentOrder: { code: ' C-001 ', list: [{ id: 1 }, { id: 2 }] },
  });

  assert.equal(state.hasOrder.value, true);
  assert.equal(state.currentOrder.value.code, ' C-001 ');
  assert.deepEqual(state.currentOrderItems.value, [{ id: 1 }, { id: 2 }]);
  assert.equal(state.currentContractCode.value, 'C-001');
});
