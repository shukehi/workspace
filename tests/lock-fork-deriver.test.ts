import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveLockForkRows } from '../src/services/lockForkDeriver';

test('lock fork deriver builds single-head row names and dimensions', () => {
  const result = deriveLockForkRows({
    baseName: '单头锁叉 T型',
    dimensions: {
      upper: { base1: 570, base2: 301 },
      lower: { base1: 570, base2: 313 },
    },
    thickness: '7',
    doorHeight: 2400,
    upperHeightAdjustment: 100,
    lowerHeightAdjustment: 100,
    hangingFeetAdjustment: 30,
    flatBottomRail: null,
    hangingFeetValue: 5,
    lockTypeConfig: {
      category: 'single-head',
      nameModifier: 'P66',
    },
  });

  assert.equal(result.remark, '7CM 2400, 吊脚5mm');
  assert.deepEqual(result.rows, [
    {
      type: '单头锁叉 T型 - 上头 P66',
      spec: '570*301 + 100 = 971',
      remark: '7CM 2400, 吊脚5mm',
    },
    {
      type: '单头锁叉 T型 - 下头 P66',
      spec: '570*313 + 130 = 1013',
      remark: '7CM 2400, 吊脚5mm',
    },
  ]);
});

test('lock fork deriver builds dual-head names and flat-bottom remark', () => {
  const result = deriveLockForkRows({
    baseName: '单头锁叉',
    dimensions: {
      upper: { base1: 570, base2: 376 },
      lower: { base1: 570, base2: 388 },
    },
    thickness: '7',
    doorHeight: 2400,
    upperHeightAdjustment: 200,
    lowerHeightAdjustment: 0,
    hangingFeetAdjustment: 0,
    flatBottomRail: '4CM平下档',
    hangingFeetValue: null,
    lockTypeConfig: {
      category: 'dual-head',
      upper: '直杆',
      lower: '弯杆',
    },
  });

  assert.equal(result.remark, '7CM 2400, 4CM平下档');
  assert.deepEqual(result.rows, [
    {
      type: '单头锁叉 - 上头 直杆',
      spec: '570*376 + 200 = 1146',
      remark: '7CM 2400, 4CM平下档',
    },
    {
      type: '单头锁叉 - 下头 弯杆',
      spec: '570*388 = 958',
      remark: '7CM 2400, 4CM平下档',
    },
  ]);
});
