import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateOrderSheetTableMinWidth,
  ORDER_SHEET_ACTION_COLUMN_WIDTH,
} from '../src/features/procurement/orderSheetTableLayout';

const columns = [{ key: 'no' }, { key: 'model' }, { key: 'remark' }];
const widths: Record<string, number> = { no: 36, model: 120, remark: 180 };

test('calculateOrderSheetTableMinWidth includes action column only when row actions are visible', () => {
  const getColumnWidth = (key: string) => widths[key] || 0;

  assert.equal(calculateOrderSheetTableMinWidth(columns, getColumnWidth, false), 336);
  assert.equal(
    calculateOrderSheetTableMinWidth(columns, getColumnWidth, true),
    336 + ORDER_SHEET_ACTION_COLUMN_WIDTH,
  );
});

test('ORDER_SHEET_ACTION_COLUMN_WIDTH documents the sticky action grid width', () => {
  assert.equal(ORDER_SHEET_ACTION_COLUMN_WIDTH, 76);
});
