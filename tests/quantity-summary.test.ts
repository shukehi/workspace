import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDocPageQuantitySummary, computeItemQuantitySummary } from '../src/features/procurement/quantitySummary';

test('computeItemQuantitySummary: packaging uses left/right and total', () => {
  const summary = computeItemQuantitySummary('packaging', [
    { quantity_left: 2, quantity_right: 3 } as any,
    { quantity_left: 1, quantity_right: 4 } as any,
  ]);

  assert.equal(summary.leftTotal, 3);
  assert.equal(summary.rightTotal, 7);
  assert.equal(summary.total, 10);
});

test('computeItemQuantitySummary: non-packaging uses quantity total', () => {
  const summary = computeItemQuantitySummary('cylinder', [
    { quantity: 2 } as any,
    { quantity: 3 } as any,
  ]);

  assert.equal(summary.leftTotal, 0);
  assert.equal(summary.rightTotal, 0);
  assert.equal(summary.total, 5);
});

test('computeItemQuantitySummary: handle uses left/right and total', () => {
  const summary = computeItemQuantitySummary('handle', [
    { quantity_left: 3, quantity_right: 2 } as any,
    { quantity_left: 1, quantity_right: 4 } as any,
  ]);

  assert.equal(summary.leftTotal, 4);
  assert.equal(summary.rightTotal, 6);
  assert.equal(summary.total, 10);
});

test('computeItemQuantitySummary: lockset uses left/right and total', () => {
  const summary = computeItemQuantitySummary('lockset', [
    { quantity_left: 6, quantity_right: 2 } as any,
    { quantity_left: 1, quantity_right: 5 } as any,
  ]);

  assert.equal(summary.leftTotal, 7);
  assert.equal(summary.rightTotal, 7);
  assert.equal(summary.total, 14);
});

test('computeDocPageQuantitySummary: packaging row summary', () => {
  const summary = computeDocPageQuantitySummary({
    pageKey: 'p1',
    title: '',
    category: 'packaging',
    mode: 'signature',
    customerName: '',
    code: '',
    orderDate: '',
    deliveryDate: '',
    supplier: '',
    orderRemark: '',
    internalName: '',
    externalName: '',
    columns: [],
    rows: [
      { rowType: 'item', values: { qtyLeft: 2, qtyRight: 1 } },
      { rowType: 'item', values: { qtyLeft: 3, qtyRight: 4 } },
      { rowType: 'total', values: { qtyLeft: 5, qtyRight: 5 } },
    ],
  });

  assert.equal(summary.leftTotal, 5);
  assert.equal(summary.rightTotal, 5);
  assert.equal(summary.total, 10);
});
