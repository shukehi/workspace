import test from 'node:test';
import assert from 'node:assert/strict';
import { extractLockForkData } from '../src/lib/erp-engine/dataExtractors';

const mapping = {
  baseDimensions: {
    '7': {
      standard: {
        upper: { base1: 570, base2: 301 },
        lower: { base1: 570, base2: 301 },
      },
      withHangingFeet: {
        upper: { base1: 570, base2: 301 },
        lower: { base1: 570, base2: 313 },
      },
    },
    '9': {
      standard: {
        upper: { base1: 524, base2: 301 },
        lower: { base1: 524, base2: 301 },
      },
      withHangingFeet: {
        upper: { base1: 524, base2: 301 },
        lower: { base1: 524, base2: 313 },
      },
    },
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
  highHeightRules: {
    '5': {
      minHeight: 2200,
      heightReference: 2200,
      standard: {
        upper: { base1: 570, base2: 376 },
        lower: { base1: 570, base2: 376 },
      },
      withHangingFeet: {
        upper: { base1: 570, base2: 376 },
        lower: { base1: 570, base2: 388 },
      },
    },
    '7': {
      minHeight: 2200,
      heightReference: 2200,
      standard: {
        upper: { base1: 570, base2: 376 },
        lower: { base1: 570, base2: 376 },
      },
      withHangingFeet: {
        upper: { base1: 570, base2: 376 },
        lower: { base1: 570, base2: 388 },
      },
    },
    '9': {
      minHeight: 2210,
      heightReference: 2210,
      standard: {
        upper: { base1: 524, base2: 422 },
        lower: { base1: 524, base2: 272 },
      },
      withHangingFeet: {
        upper: { base1: 524, base2: 422 },
        lower: { base1: 524, base2: 272 },
      },
    },
  },
  edgeTypes: {
    T型: { nameModifier: 'T型' },
  },
  hangingFeet: {
    standard: 35,
    keywords: ['吊脚', 'diaojiao'],
  },
  suppliers: {
    default: '应志友',
  },
};

test('extractLockForkData uses rule-based lock type matching for suffixes', () => {
  const rows = extractLockForkData(
    [
      {
        sc: '单头锁叉',
        qty: '2',
        mshd: '7',
        spec: '960*2050/7/内开外包',
        sj: '主锁',
        fssj: ' F02-A副锁 ',
      },
    ],
    {},
    {
      ...mapping,
      lockTypes: {
        'F02-A副锁': {
          category: 'single-head',
          nameModifier: 'P66',
          upper: '直杆',
          lower: '弯杆',
        },
      },
    },
  );

  assert.deepEqual(
    rows.map((item) => item.type),
    ['单头锁叉 - 上头 P66', '单头锁叉 - 下头 P66'],
  );
  assert.deepEqual(rows[0].matchedRules, ['lock-fork-type-F02-A副锁']);
  assert.deepEqual(rows[0].winningRules, ['lock-fork-type-F02-A副锁']);
  assert.deepEqual(rows[1].matchedRules, ['lock-fork-type-F02-A副锁']);
  assert.deepEqual(rows[1].winningRules, ['lock-fork-type-F02-A副锁']);
});

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

test('extractLockForkData uses high-height dimensions for 7cm doors at or above 2200', () => {
  const rows = extractLockForkData(
    [
      {
        sc: '单头锁叉',
        qty: '2',
        mshd: '7',
        spec: '960*2400/7/内开外包',
      },
    ],
    {},
    mapping,
  );

  assert.deepEqual(
    rows.map((item) => item.spec),
    ['570*376 + 100 = 1046', '570*376 + 100 = 1046'],
  );
});

test('extractLockForkData uses high-height hanging-feet dimensions for 7cm flat-bottom or hanging-feet doors', () => {
  const flatBottomRows = extractLockForkData(
    [
      {
        sc: '单头锁叉',
        qty: '2',
        mshd: '7',
        spec: '960*2400/7/内开外包',
        xsbz: '4CM平下档',
      },
    ],
    {},
    mapping,
  );

  assert.deepEqual(
    flatBottomRows.map((item) => item.spec),
    ['570*376 + 100 = 1046', '570*388 + 100 = 1058'],
  );

  const hangingFeetRows = extractLockForkData(
    [
      {
        sc: '单头锁叉',
        qty: '2',
        mshd: '7',
        spec: '960*2400/7/内开外包',
        xsbz: '吊脚5mm',
      },
    ],
    {},
    mapping,
  );

  assert.deepEqual(
    hangingFeetRows.map((item) => item.spec),
    ['570*376 + 100 = 1046', '570*388 + 130 = 1088'],
  );
});

test('extractLockForkData uses 9cm high-height rule at or above 2210', () => {
  const rows = extractLockForkData(
    [
      {
        sc: '单头锁叉',
        qty: '2',
        mshd: '9',
        spec: '960*2410/9/内开外包',
      },
    ],
    {},
    mapping,
  );

  assert.deepEqual(
    rows.map((item) => item.spec),
    ['524*422 + 100 = 1046', '524*272 + 100 = 896'],
  );
});
