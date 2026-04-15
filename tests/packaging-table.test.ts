import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregatePackaging } from '../src/lib/erp-engine/packagingTable';

test('aggregatePackaging supports plus-delimited left/right quantity', () => {
  const result = aggregatePackaging([
    {
      bz: '包装A',
      productModelName: 'P1',
      spec: '900*2100',
      mb: '门边A',
      qty: '2+3',
    },
  ], {
    supplierName: '方亮包装',
    mappings: { 包装A: '外协包装A' },
  });

  const row = Object.values(result)[0];
  assert.ok(row);
  assert.equal(row.totalLeft, 2);
  assert.equal(row.totalRight, 3);
  assert.equal(row.totalQty, 5);
});

test('aggregatePackaging keeps mirrored single-value qty consistent with total', () => {
  const result = aggregatePackaging([
    {
      bz: '包装A',
      productModelName: 'P1',
      spec: '900*2100',
      mb: '门边A',
      qty: '10',
    },
  ], {
    supplierName: '方亮包装',
    mappings: { 包装A: '外协包装A' },
  });

  const row = Object.values(result)[0];
  assert.ok(row);
  assert.equal(row.totalLeft, 10);
  assert.equal(row.totalRight, 10);
  assert.equal(row.totalQty, 20);
});
