import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { useSourceOrderSelectors } from '../src/features/source-analysis/composables/useSourceOrderSelectors';

test('source order selectors expose stable currentOrder-derived views', () => {
  const currentOrder = ref<any>(null);
  const selectors = useSourceOrderSelectors(currentOrder);

  assert.equal(selectors.hasOrder.value, false);
  assert.deepEqual(selectors.orderItems.value, []);

  currentOrder.value = { code: 'C-001', list: [{ id: 1 }, { id: 2 }] };
  assert.equal(selectors.hasOrder.value, true);
  assert.deepEqual(selectors.orderItems.value, [{ id: 1 }, { id: 2 }]);
});
