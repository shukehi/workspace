import test from 'node:test';
import assert from 'node:assert/strict';
import { useSourceHistoryLoadState } from '../src/features/source-analysis/composables/useSourceHistoryLoadState';

test('source history load state exposes stable loading/hasOrder surface and error resolution', async () => {
  const calls: string[] = [];
  const state = useSourceHistoryLoadState({
    hasOrder: true,
    loading: false,
    error: 'fallback error',
    loadHistoryContractByCode: async (contractCode: string) => {
      calls.push(contractCode);
      return { code: contractCode };
    },
  });

  assert.equal(state.hasOrder.value, true);
  assert.equal(state.loading.value, false);
  assert.equal(state.loadButtonLabel.value, '加载该合同');
  await state.loadContract('H-001');
  assert.deepEqual(calls, ['H-001']);
  assert.equal(state.resolveLoadError(new Error('boom')), 'boom');
  assert.equal(state.resolveLoadError(null), 'fallback error');
});
