import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import {
  beginSourceOrderRequest,
  failSourceOrderRequest,
  finishSourceOrderRequest,
} from '../src/features/source-analysis/services/sourceOrderRequestStateApplier';

test('source order request state applier drives loading and error transitions', () => {
  const state = {
    loading: ref(false),
    error: ref<string | null>('old error'),
  };

  beginSourceOrderRequest(state);
  assert.equal(state.loading.value, true);
  assert.equal(state.error.value, null);

  failSourceOrderRequest(state, 'fetch failed');
  assert.equal(state.error.value, 'fetch failed');

  finishSourceOrderRequest(state);
  assert.equal(state.loading.value, false);
});
