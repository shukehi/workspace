import test from 'node:test';
import assert from 'node:assert/strict';
import { isCanceledRequestError, normalizeApiEnvelope, resolveApiErrorMessage } from '../src/lib/api';

test('normalizeApiEnvelope unwraps success envelopes and keeps raw payloads intact', () => {
  assert.deepEqual(
    normalizeApiEnvelope({
      success: true,
      data: { rows: [1, 2], total: 2 },
      message: 'ok',
    }),
    { rows: [1, 2], total: 2 },
  );

  assert.deepEqual(
    normalizeApiEnvelope([{ id: 1 }, { id: 2 }]),
    [{ id: 1 }, { id: 2 }],
  );
});

test('resolveApiErrorMessage prefers validation item messages over generic fields', () => {
  assert.equal(
    resolveApiErrorMessage({
      response: {
        data: {
          code: 'ORDER_ITEMS_REQUIRED',
          message: 'generic',
          errors: [
            { field: 'items', code: 'required', message: '请至少填写一条本次入库明细' },
          ],
        },
      },
      message: 'fallback',
    }),
    '请至少填写一条本次入库明细',
  );
});

test('resolveApiErrorMessage falls back through message, code, error and native error message', () => {
  assert.equal(
    resolveApiErrorMessage({ response: { data: { message: '接口错误' } }, message: 'fallback' }),
    '接口错误',
  );
  assert.equal(
    resolveApiErrorMessage({ response: { data: { code: 'INVALID_STATUS_TRANSITION' } }, message: 'fallback' }),
    'INVALID_STATUS_TRANSITION',
  );
  assert.equal(
    resolveApiErrorMessage({ response: { data: { error: 'MATERIAL_NOT_FOUND' } }, message: 'fallback' }),
    'MATERIAL_NOT_FOUND',
  );
  assert.equal(resolveApiErrorMessage(new Error('network failed')), 'network failed');
});


test('isCanceledRequestError recognizes axios cancellation without treating it as a server error', () => {
  assert.equal(isCanceledRequestError({ code: 'ERR_CANCELED' }), true);
  assert.equal(isCanceledRequestError({ name: 'CanceledError' }), true);
  assert.equal(isCanceledRequestError({ response: { status: 500 }, message: 'server failed' }), false);
});
