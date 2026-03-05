import test from 'node:test';
import assert from 'node:assert/strict';
import { getSheetSchema, getDisplayValue } from '../src/features/procurement/order-sheet.schema';

test('schema: packaging columns keep expected order', () => {
  const schema = getSheetSchema('packaging');
  assert.deepEqual(schema.columns.map((c) => c.key), ['no', 'productModelName', 'spec', 'mb', 'qtyLeft', 'qtyRight', 'remark']);
});

test('display value: spec/mb fallback works for preview consistency', () => {
  const item = {
    model: 'M-100',
    orientation: '左',
    spec: '',
    mb: ''
  };
  assert.equal(getDisplayValue(item as any, 'spec', 0), 'M-100');
  assert.equal(getDisplayValue(item as any, 'mb', 0), '左');
});
