import test from 'node:test';
import assert from 'node:assert/strict';
import { extractLockForkData } from '../src/lib/erp-engine/dataExtractors';

const mapping = {
  baseDimensions: {
    '10': {
      standard: {
        upper: { base1: 570, base2: 301 },
        lower: { base1: 570, base2: 301 },
      },
      withHangingFeet: {
        upper: { base1: 570, base2: 301 },
        lower: { base1: 570, base2: 313 },
      },
    },
  },
  edgeTypes: {
    T型: { nameModifier: 'T型' },
  },
  suppliers: {
    default: '应志友',
  },
};

test('extractLockForkData omits T modifier for 10cm inward-opening T-edge aluminum orders', () => {
  const rows = extractLockForkData(
    [
      {
        sc: '单头锁叉',
        qty: '2',
        mshd: '10',
        spec: '970*2040/10/内开外包',
        mb: 'T型铝材边',
      },
    ],
    {},
    mapping,
  );

  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((item) => item.type),
    ['单头锁叉 - 上头', '单头锁叉 - 下头'],
  );
});

test('extractLockForkData keeps T modifier for non-exception T-edge orders', () => {
  const rows = extractLockForkData(
    [
      {
        sc: '单头锁叉',
        qty: '2',
        mshd: '10',
        spec: '970*2040/10/外开外包',
        mb: 'T型铝材边',
      },
    ],
    {},
    mapping,
  );

  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((item) => item.type),
    ['单头锁叉 T型 - 上头', '单头锁叉 T型 - 下头'],
  );
});
