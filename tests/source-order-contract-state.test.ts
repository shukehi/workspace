import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import {
  applySourceOrderContractData,
  assertSourceOrderData,
  clearSourceOrderContractData,
} from '../src/features/source-analysis/services/sourceOrderContractStateApplier';

test('source order contract state applier validates, writes, and clears current order', () => {
  const state = { currentOrder: ref<any>(null) };
  const calls: string[] = [];
  const orderData = { code: 'C-001', list: [{ id: 1 }] };

  assert.doesNotThrow(() => assertSourceOrderData(orderData));
  applySourceOrderContractData(state, orderData, (payload) => {
    calls.push(`persist:${payload.code}`);
  });

  assert.equal(state.currentOrder.value.code, 'C-001');
  assert.deepEqual(calls, ['persist:C-001']);

  clearSourceOrderContractData(state);
  assert.equal(state.currentOrder.value, null);
});

test('source order contract state applier rejects invalid contract payload', () => {
  assert.throws(() => assertSourceOrderData(null), /Contract not found or empty/);
  assert.throws(() => assertSourceOrderData({ code: 'C-002' }), /Contract not found or empty/);
});
