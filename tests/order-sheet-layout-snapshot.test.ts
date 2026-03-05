import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORY_SCHEMAS } from '../src/features/procurement/order-sheet.schema';
import { CATEGORY_DEFAULT_WIDTHS } from '../src/features/procurement/sheetWidthResolver';

const expected = {
  packaging: {
    columns: ['no', 'productModelName', 'spec', 'mb', 'qtyLeft', 'qtyRight', 'remark'],
    widths: { no: 44, productModelName: 220, spec: 160, mb: 74, qtyLeft: 72, qtyRight: 72, remark: 194 }
  },
  cylinder: {
    columns: ['no', 'type', 'eccentricity', 'quantity', 'unit', 'remark'],
    widths: { no: 44, type: 240, eccentricity: 160, quantity: 72, unit: 58, remark: 230 }
  },
  lock: {
    columns: ['no', 'type', 'spec', 'quantity', 'unit', 'remark'],
    widths: { no: 44, type: 240, spec: 200, quantity: 72, unit: 58, remark: 150 }
  },
  hardware: {
    columns: ['no', 'type', 'spec', 'quantity', 'remark'],
    widths: { no: 44, type: 240, spec: 200, quantity: 72, remark: 208 }
  }
} as const;

test('layout snapshot: category schemas and default widths stay in sync with baseline', () => {
  const current = {
    packaging: {
      columns: CATEGORY_SCHEMAS.packaging.columns.map((c) => c.key),
      widths: CATEGORY_DEFAULT_WIDTHS.packaging
    },
    cylinder: {
      columns: CATEGORY_SCHEMAS.cylinder.columns.map((c) => c.key),
      widths: CATEGORY_DEFAULT_WIDTHS.cylinder
    },
    lock: {
      columns: CATEGORY_SCHEMAS.lock.columns.map((c) => c.key),
      widths: CATEGORY_DEFAULT_WIDTHS.lock
    },
    hardware: {
      columns: CATEGORY_SCHEMAS.hardware.columns.map((c) => c.key),
      widths: CATEGORY_DEFAULT_WIDTHS.hardware
    }
  };

  assert.deepEqual(current, expected);
});
