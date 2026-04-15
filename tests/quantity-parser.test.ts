import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuantity, parseQuantityPair } from '../src/lib/erp-engine/parsers';

test('parseQuantityPair supports slash-delimited quantities with explicit zero', () => {
  assert.deepEqual(parseQuantityPair('36/0'), { left: 36, right: 0 });
});

test('parseQuantityPair supports plus-delimited left/right quantities', () => {
  assert.deepEqual(parseQuantityPair('2+3'), { left: 2, right: 3 });
});

test('parseQuantity treats single-value quantities as mirrored left/right totals', () => {
  assert.equal(parseQuantity('10'), 20);
});

test('parseQuantity sums slash and plus delimiters correctly', () => {
  assert.equal(parseQuantity('2/3'), 5);
  assert.equal(parseQuantity('2+3'), 5);
});
