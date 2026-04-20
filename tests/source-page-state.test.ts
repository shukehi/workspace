import test from 'node:test';
import assert from 'node:assert/strict';
import { useSourcePageState } from '../src/features/source-analysis/composables/useSourcePageState';

test('useSourcePageState trims contract input and exposes source table columns', () => {
  const fetchCalls: string[] = [];
  const state = useSourcePageState({
    loading: false,
    hasOrder: true,
    orderItems: [{ id: 1 }],
    currentOrder: { code: 'C20260313-001', customerName: '客户A' },
    fetchContract: (contractId) => {
      fetchCalls.push(contractId);
    },
  });

  state.contractInput.value = '  C20260313-001  ';
  state.handleSearch();

  assert.deepEqual(fetchCalls, ['C20260313-001']);
  assert.equal(state.columns.value.length > 1, true);
  assert.equal(state.sourceTableMinWidth.value > 1000, true);
  assert.equal(state.loading.value, false);
  assert.equal(state.searchButtonLabel.value, '获取合同');
  assert.equal(state.hasOrder.value, true);
  assert.deepEqual(state.orderItems.value, [{ id: 1 }]);
  assert.equal(state.currentOrder.value.code, 'C20260313-001');

  state.handleHistoryLoaded('HISTORY-001');
  assert.equal(state.contractInput.value, 'HISTORY-001');
});

test('useSourcePageState ignores empty searches', () => {
  let callCount = 0;
  const state = useSourcePageState({
    loading: false,
    hasOrder: false,
    orderItems: [],
    currentOrder: null,
    fetchContract: () => {
      callCount += 1;
    },
  });

  state.contractInput.value = '   ';
  state.handleSearch();

  assert.equal(callCount, 0);
});
