import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveProcurementItems, sortProcurementItems } from '../src/features/procurement/itemSort';

test('sortProcurementItems sorts lock items by derived product name', () => {
  const items = [
    { type: 'B款-下头', spec: '10', remark: 'CM 2100' },
    { type: 'A款-上头', spec: '10', remark: 'CM 2100' },
  ];

  const sorted = sortProcurementItems('锁叉', items);
  assert.deepEqual(sorted.map((item) => item.type), ['A款-上头', 'B款-下头']);
});

test('resolveProcurementItems preserves manual order in edit mode', () => {
  const items = [
    { type: 'B款-下头', spec: '10', remark: 'CM 2100' },
    { type: 'A款-上头', spec: '10', remark: 'CM 2100' },
  ];

  const visible = resolveProcurementItems('锁叉', items, { preserveManualOrder: true });
  assert.deepEqual(visible.map((item) => item.type), ['B款-下头', 'A款-上头']);
});
