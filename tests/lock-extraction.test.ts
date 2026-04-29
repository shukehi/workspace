import test from 'node:test';
import assert from 'node:assert/strict';
import { extractLockData } from '../src/lib/erp-engine/dataExtractors';

test('lock extraction: normalized mapping matches bracket variants and swaps left/right on 内开', () => {
  const result = extractLockData([
    {
      sj: 'SD-9030 ( 6607大锁 )',
      fssj: 'F02-A副锁',
      qty: '15/20',
      spec: '970*2040/10/内开外包',
    },
  ], {
    customerName: '客户A',
  }, {
    primaryLabel: '主锁',
    secondaryLabel: '副锁',
    mappings: {
      'SD-9030（6607大锁）': {
        supplier: '汇成',
        vendorName: '6607大锁',
        primarySpec: '主锁体',
      },
      'F02-A副锁': {
        supplier: '汇成',
        vendorName: 'F02-A副锁',
        secondarySpec: '副锁体',
      },
    },
  });

  assert.equal(result.length, 2);
  const primary = result.find((item) => item.type === '6607大锁');
  const secondary = result.find((item) => item.type === 'F02-A副锁');
  assert.ok(primary);
  assert.ok(secondary);
  assert.equal(primary!.supplier, '汇成');
  assert.equal(primary!.spec, '主锁体');
  assert.equal(primary!.unit, '套');
  assert.equal(primary!.remark, '');
  assert.equal(primary!.quantityLeft, 20);
  assert.equal(primary!.quantityRight, 15);
  assert.equal(primary!.quantity, 35);
  assert.deepEqual(primary!.matchedRules, ['lock-primary-sd-9030(6607大锁)']);
  assert.deepEqual(primary!.winningRules, ['lock-primary-sd-9030(6607大锁)']);
  assert.equal(secondary!.quantityLeft, 20);
  assert.equal(secondary!.quantityRight, 15);
  assert.equal(secondary!.spec, '副锁体');
  assert.equal(secondary!.remark, '');
  assert.deepEqual(secondary!.matchedRules, ['lock-secondary-f02-a副锁']);
  assert.deepEqual(secondary!.winningRules, ['lock-secondary-f02-a副锁']);
});

test('lock extraction: missing or empty lock defaults fall back through the shared adapter', () => {
  const result = extractLockData([
    {
      sj: 'SD-9030（6607大锁）',
      fssj: 'F02-A副锁',
      qty: '1/2',
      spec: '970*2040/10/外开外包',
    },
  ], {
    customerName: '客户A',
  }, {
    defaultUnit: '   ',
    primaryLabel: '',
    secondaryLabel: undefined,
    mappings: {
      'SD-9030（6607大锁）': {
        supplier: '汇成',
        vendorName: '6607大锁',
      },
    },
  });

  assert.equal(result.length, 2);
  const primary = result.find((item) => item.type === '6607大锁');
  const secondary = result.find((item) => item.type === 'F02-A副锁');
  assert.ok(primary);
  assert.ok(secondary);
  assert.equal(primary!.unit, '套');
  assert.equal(primary!.spec, '主锁');
  assert.equal(secondary!.unit, '套');
  assert.equal(secondary!.spec, '副锁');
});

test('lock extraction: keeps configured default unit', () => {
  const result = extractLockData([
    {
      sj: 'SD-9030（6607大锁）',
      qty: '2/3',
      spec: '970*2040/10/外开外包',
    },
  ], {
    customerName: '客户A',
  }, {
    defaultUnit: '把',
    primaryLabel: '主锁',
    mappings: {
      'SD-9030（6607大锁）': {
        supplier: '汇成',
        vendorName: '6607大锁',
        primarySpec: '主锁体',
      },
    },
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].unit, '把');
  assert.deepEqual(result[0].winningRules, ['lock-primary-sd-9030(6607大锁)']);
});

test('lock extraction: remark only keeps mapping remark', () => {
  const result = extractLockData([
    {
      sj: '4018金边锁',
      qty: '2/3',
      spec: '970*2040/10/内开外包',
    },
  ], {
    customerName: '外贸马其顿Orient（三部）',
  }, {
    defaultUnit: '把',
    primaryLabel: '主锁',
    mappings: {
      '4018金边锁': {
        supplier: '三多',
        vendorName: 'SD-708',
        remark: '单活',
      },
    },
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].remark, '单活');
  assert.deepEqual(result[0].winningRules, ['lock-primary-4018金边锁']);
});

test('lock extraction: only swaps when 开向段 contains 内开', () => {
  const result = extractLockData([
    {
      sj: 'SD-9030（6607大锁）',
      qty: '15/20',
      spec: '970*2040/10/外开外包/备注内开字样',
    },
  ], {
    customerName: '客户A',
  }, {
    primaryLabel: '主锁',
    mappings: {
      'SD-9030（6607大锁）': {
        supplier: '汇成',
        vendorName: '6607大锁',
        primarySpec: '主锁体',
      },
    },
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].quantityLeft, 15);
  assert.equal(result[0].quantityRight, 20);
  assert.equal(result[0].quantity, 35);
  assert.deepEqual(result[0].winningRules, ['lock-primary-sd-9030(6607大锁)']);
});

test('lock extraction: preserves explicit zero on right quantity', () => {
  const result = extractLockData([
    {
      sj: 'SD-9030（6607大锁）',
      qty: '36/0',
      spec: '970*2040/10/外开外包',
    },
  ], {
    customerName: '客户A',
  }, {
    primaryLabel: '主锁',
    mappings: {
      'SD-9030（6607大锁）': {
        supplier: '汇成',
        vendorName: '6607大锁',
        primarySpec: '主锁体',
      },
    },
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].quantityLeft, 36);
  assert.equal(result[0].quantityRight, 0);
  assert.equal(result[0].quantity, 36);
});
