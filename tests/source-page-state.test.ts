import test from 'node:test';
import assert from 'node:assert/strict';
import { useSourcePageState } from '../src/features/source-analysis/composables/useSourcePageState';
import { sourceColumns } from '../src/components/source/SourceColumns';

test('useSourcePageState trims contract input and exposes source table columns', () => {
  const fetchCalls: string[] = [];
  const state = useSourcePageState({
    loading: false,
    fetchContract: (contractId) => {
      fetchCalls.push(contractId);
    },
  });

  state.contractInput.value = '  C20260313-001  ';
  state.handleSearch();

  assert.deepEqual(fetchCalls, ['C20260313-001']);
  assert.equal(state.columns.value.length, sourceColumns.length + 1);
  assert.equal(state.sourceTableMinWidth.value > 1000, true);

  state.handleHistoryLoaded('HISTORY-001');
  assert.equal(state.contractInput.value, 'HISTORY-001');
});

test('useSourcePageState ignores empty searches', () => {
  let callCount = 0;
  const state = useSourcePageState({
    loading: false,
    fetchContract: () => {
      callCount += 1;
    },
  });

  state.contractInput.value = '   ';
  state.handleSearch();

  assert.equal(callCount, 0);
});
