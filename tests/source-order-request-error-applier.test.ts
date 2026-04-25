import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import {
  failSourceOrderFetch,
  failSourceOrderHistoryLoad,
} from '../src/features/source-analysis/services/sourceOrderRequestErrorApplier';

test('source order request error applier normalizes fetch failures into request state', () => {
  const state = {
    loading: ref(true),
    error: ref<string | null>(null),
  };
  const calls: string[] = [];

  failSourceOrderFetch(state, new Error('network failed'), (message, error) => {
    calls.push(`${message}:${(error as Error).message}`);
  });

  assert.deepEqual(calls, ['Fetch failed:network failed']);
  assert.equal(state.error.value, 'network failed');
});

test('source order request error applier normalizes history load failures', () => {
  const state = {
    loading: ref(true),
    error: ref<string | null>(null),
  };
  const calls: string[] = [];

  const message404 = failSourceOrderHistoryLoad(state, { response: { status: 404 } }, (message, error) => {
    const status = (error as { response?: { status?: number } })?.response?.status;
    calls.push(`${message}:${String(status || '')}`);
  });
  assert.equal(message404, '未找到历史合同');
  assert.equal(state.error.value, '未找到历史合同');

  const messageDefault = failSourceOrderHistoryLoad(state, new Error('boom'), (message, error) => {
    calls.push(`${message}:${(error as Error).message}`);
  });
  assert.equal(messageDefault, 'boom');
  assert.equal(state.error.value, 'boom');
  assert.deepEqual(calls, ['Load history contract failed:404', 'Load history contract failed:boom']);
});
