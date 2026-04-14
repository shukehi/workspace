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

test('extractLockForkData keeps suffix matching independent from P66 base-dimension override', () => {
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
  assert.deepEqual(
    rows.map((item) => item.spec),
    ['570*301 = 871', '570*301 = 871'],
  );
  assert.deepEqual(rows[0].matchedRules, ['lock-fork-type-F02-A副锁', 'lock-fork-dimension-base-7-standard']);
  assert.deepEqual(rows[0].winningRules, ['lock-fork-type-F02-A副锁', 'lock-fork-dimension-base-7-standard']);
  assert.deepEqual(rows[1].matchedRules, ['lock-fork-type-F02-A副锁', 'lock-fork-dimension-base-7-standard']);
  assert.deepEqual(rows[1].winningRules, ['lock-fork-type-F02-A副锁', 'lock-fork-dimension-base-7-standard']);
});

test('extractLockForkData uses P66-specific base dimensions for 7cm doors below 2200', () => {
  const rows = extractLockForkData(
    [
      {
        sc: '单头锁叉',
        qty: '2',
        mshd: '7',
        spec: '960*2050/7/内开外包',
        sj: 'SD-9030（6607大锁）',
      },
    ],
    {},
    {
      ...mapping,
      lockTypes: {
        'SD-9030（6607大锁）': {
          category: 'P66',
          nameModifier: 'P66',
        },
      },
    },
  );

  assert.deepEqual(
    rows.map((item) => item.type),
    ['单头锁叉 - 上头 P66', '单头锁叉 - 下头 P66'],
  );
  assert.deepEqual(
    rows.map((item) => item.spec),
    ['497*301 = 798', '497*301 = 798'],
  );
});

test('extractLockForkData preserves explicit zero on right quantity', () => {
  const rows = extractLockForkData(
    [
      {
        sc: '单头锁叉',
        qty: '36/0',
        mshd: '7',
        spec: '960*2050/7/外开外包',
        sj: '主锁',
      },
    ],
    {},
    mapping,
  );

  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((item) => item.quantity), [36, 36]);
});

test('extractLockForkData uses P66-specific high-height dimensions for 7cm doors at or above 2200', () => {
  const rows = extractLockForkData(
    [
      {
        sc: '单头锁叉',
        qty: '2',
        mshd: '7',
        spec: '960*2400/7/内开外包',
        sj: 'SD-9030（6607大锁）',
      },
    ],
    {},
    {
      ...mapping,
      lockTypes: {
        'SD-9030（6607大锁）': {
          category: 'P66',
          nameModifier: 'P66',
        },
      },
    },
  );

  assert.deepEqual(
    rows.map((item) => item.type),
    ['单头锁叉 - 上头 P66', '单头锁叉 - 下头 P66'],
  );
  assert.deepEqual(
    rows.map((item) => item.spec),
    ['497*376 + 200 = 1073', '497*376 = 873'],
  );
});

test('extractLockForkData keeps hanging-feet calculation unchanged for sj-triggered P66 override', () => {
  const rows = extractLockForkData(
    [
      {
        sc: '单头锁叉',
        qty: '2',
        mshd: '7',
        spec: '960*2050/7/内开外包',
        sj: 'SD-9030（6607大锁）',
        xsbz: '吊脚5mm',
      },
    ],
    {},
    {
      ...mapping,
      lockTypes: {
        'SD-9030（6607大锁）': {
          category: 'P66',
          nameModifier: 'P66',
        },
      },
    },
  );

  assert.deepEqual(
    rows.map((item) => item.spec),
    ['497*301 = 798', '497*313 + 30 = 840'],
  );
});

test('extractLockForkData falls back to 7cm base dimensions for 5cm doors below high-height threshold', () => {
  const rows = extractLockForkData(
    [
      {
        sc: '单头锁叉',
        qty: '2',
        mshd: '5',
        spec: '960*2050/5/内开外包',
      },
    ],
    {},
    mapping,
  );

  assert.deepEqual(
    rows.map((item) => item.spec),
    ['570*301 = 871', '570*301 = 871'],
  );
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
  assert.deepEqual(rows[0].matchedRules, ['lock-fork-edge-T型', 'lock-fork-dimension-base-10-standard']);
  assert.deepEqual(rows[0].winningRules, ['lock-fork-edge-T型', 'lock-fork-dimension-base-10-standard']);
  assert.deepEqual(rows[1].matchedRules, ['lock-fork-edge-T型', 'lock-fork-dimension-base-10-standard']);
  assert.deepEqual(rows[1].winningRules, ['lock-fork-edge-T型', 'lock-fork-dimension-base-10-standard']);
});

test('extractLockForkData keeps 7cm doors below 2200 on base dimensions', () => {
  const rows = extractLockForkData(
    [
      {
        sc: '单头锁叉',
        qty: '2',
        mshd: '7',
        spec: '960*2198/7/内开外包',
      },
    ],
    {},
    mapping,
  );

  assert.deepEqual(
    rows.map((item) => item.spec),
    ['570*301 + 74 = 945', '570*301 + 74 = 945'],
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
    ['570*376 + 200 = 1146', '570*376 = 946'],
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
    ['570*376 + 200 = 1146', '570*388 = 958'],
  );
  assert.deepEqual(flatBottomRows[0].winningRules, ['lock-fork-flat-bottom', 'lock-fork-dimension-high_height-7-withHangingFeet']);
  assert.deepEqual(flatBottomRows[1].winningRules, ['lock-fork-flat-bottom', 'lock-fork-dimension-high_height-7-withHangingFeet']);

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
    ['570*376 + 200 = 1146', '570*388 + 30 = 988'],
  );
  assert.deepEqual(hangingFeetRows[0].winningRules, ['lock-fork-hanging-feet-吊脚', 'lock-fork-dimension-high_height-7-withHangingFeet']);
  assert.deepEqual(hangingFeetRows[1].winningRules, ['lock-fork-hanging-feet-吊脚', 'lock-fork-dimension-high_height-7-withHangingFeet']);
});

test('extractLockForkData treats flat-bottom as higher priority than hanging-feet when both markers exist', () => {
  const rows = extractLockForkData(
    [
      {
        sc: '单头锁叉',
        qty: '2',
        mshd: '7',
        spec: '960*2400/7/内开外包',
        xsbz: '4CM平下档 吊脚5mm',
      },
    ],
    {},
    mapping,
  );

  assert.deepEqual(
    rows.map((item) => item.spec),
    ['570*376 + 200 = 1146', '570*388 = 958'],
  );
  assert.deepEqual(rows[0].winningRules, ['lock-fork-flat-bottom', 'lock-fork-dimension-high_height-7-withHangingFeet']);
  assert.deepEqual(rows[1].winningRules, ['lock-fork-flat-bottom', 'lock-fork-dimension-high_height-7-withHangingFeet']);
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
