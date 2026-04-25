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

test('sortProcurementItems keeps mixed center-lock rows behind the paired fork heads for the same door group', () => {
  const items = [
    { type: '螺纹中控', spec: '-', remark: '10CM 2400', quantity: 17 },
    { type: '单头锁叉 - 下头', spec: '524*272 = 796', remark: '10CM 2400', quantity: 42 },
    { type: '单头锁叉 - 上头', spec: '524*422 + 200 = 1146', remark: '10CM 2400', quantity: 42 },
  ];

  const sorted = sortProcurementItems('锁叉', items);
  assert.deepEqual(
    sorted.map((item) => `${item.type}|${item.remark}`),
    [
      '单头锁叉 - 上头|10CM 2400',
      '单头锁叉 - 下头|10CM 2400',
      '螺纹中控|10CM 2400',
    ],
  );
});

test('sortProcurementItems keeps real mixed lock-fork rows grouped by height before center-lock rows', () => {
  const items = [
    { type: '中控锁叉', spec: '-', remark: '7CM 2400', quantity: 6 },
    { type: '双头锁叉 - 上头 P66', spec: '570*376 + 200 = 1146', remark: '7CM 2400', quantity: 12 },
    { type: '双头锁叉 - 上头 P66', spec: '570*301 = 871', remark: '7CM 2050', quantity: 12 },
    { type: '双头锁叉 - 下头 P66', spec: '570*376 = 946', remark: '7CM 2400', quantity: 12 },
    { type: '双头锁叉 - 下头 P66', spec: '570*301 = 871', remark: '7CM 2050', quantity: 12 },
  ];

  const sorted = sortProcurementItems('锁叉', items);
  assert.deepEqual(
    sorted.map((item) => `${item.type}|${item.remark}`),
    [
      '双头锁叉 - 上头 P66|7CM 2050',
      '双头锁叉 - 下头 P66|7CM 2050',
      '双头锁叉 - 上头 P66|7CM 2400',
      '双头锁叉 - 下头 P66|7CM 2400',
      '中控锁叉|7CM 2400',
    ],
  );
});

test('resolveProcurementItems preserves manual order in edit mode', () => {
  const items = [
    { type: 'B款-下头', spec: '10', remark: 'CM 2100' },
    { type: 'A款-上头', spec: '10', remark: 'CM 2100' },
  ];

  const visible = resolveProcurementItems('锁叉', items, { preserveManualOrder: true });
  assert.deepEqual(visible.map((item) => item.type), ['B款-下头', 'A款-上头']);
});

test('resolveProcurementItems does not apply lock-fork sorting to hardware category', () => {
  const items = [
    { type: 'B款-下头', spec: '10', remark: 'CM 2100' },
    { type: 'A款-上头', spec: '10', remark: 'CM 2100' },
  ];

  const visible = resolveProcurementItems('五金/配件', items);
  assert.deepEqual(visible.map((item) => item.type), ['B款-下头', 'A款-上头']);
});
