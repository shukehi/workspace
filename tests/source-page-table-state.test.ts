import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { sourceColumns } from '../src/components/source/SourceColumns';
import { useSourcePageTableState } from '../src/features/source-analysis/composables/useSourcePageTableState';

test('source page table state exposes stable min width and column count', () => {
  const state = useSourcePageTableState(ref<'clip' | 'hover' | 'expand'>('hover'));

  assert.equal(state.columns.value.length, sourceColumns.length + 1);
  assert.equal(state.sourceTableMinWidth.value > 1000, true);
});
