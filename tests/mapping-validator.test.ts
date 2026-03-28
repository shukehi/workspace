import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCylinderMapping,
  validateHandleMapping,
  validateLockMapping,
  validateLockForkMapping,
  validatePackagingMapping,
} from '../src/services/mappings';

test('frontend mapping validator: packaging validator returns path-based conflicts', () => {
  const issues = validatePackagingMapping({
    supplierName: ' ',
    mappings: {
      'A B': '外协A',
      AB: '外协B',
      包装C: ' ',
    },
  });

  assert.ok(issues.some((item) => item.path === 'supplierName'));
  assert.ok(issues.some((item) => item.path === 'mappings["AB"]' && item.code === 'normalized-conflict'));
  assert.ok(issues.some((item) => item.path === 'mappings["包装C"]' && item.code === 'required'));
});

test('frontend mapping validator: cylinder validator reports nested rule paths', () => {
  const issues = validateCylinderMapping({
    dimensions: {
      7: { code: '', eccentricity: '' },
    },
    specialRules: [
      {
        conditionField: '',
        keyword: '',
        thickness: '9',
        variants: {
          内开: { code: '', eccentricity: '' },
        },
      },
    ],
    mappings: {
      锁芯A: { supplier: '', template: '' },
    },
    customLogos: 'invalid',
  });

  assert.ok(issues.some((item) => item.path === 'specialRules[0].conditionField'));
  assert.ok(issues.some((item) => item.path === 'specialRules[0].variants["内开"].code'));
  assert.ok(issues.some((item) => item.path === 'mappings["锁芯A"].supplier'));
  assert.ok(issues.some((item) => item.path === 'customLogos' && item.code === 'invalid-type'));
});

test('frontend mapping validator: cylinder validator rejects duplicate custom logos', () => {
  const issues = validateCylinderMapping({
    dimensions: {
      7: { code: '90AB', eccentricity: '34.5*55.5/中心孔偏心' },
    },
    customLogos: ['ZSF', ' zsf '],
  });

  assert.ok(issues.some((item) => item.path === 'customLogos[1]' && item.code === 'duplicate'));
});

test('frontend mapping validator: lock-fork validator reports structural gaps', () => {
  const issues = validateLockForkMapping({
    baseDimensions: {
      7: {
        standard: {
          upper: { base1: 'x', base2: 301 },
          lower: { base1: 570, base2: 'y' },
        },
      },
    },
    edgeTypes: {
      T型: {},
    },
    hangingFeet: {
      standard: 'bad',
      keywords: [],
    },
    suppliers: {},
  });

  assert.ok(issues.some((item) => item.path === 'baseDimensions["7"].standard.upper.base1'));
  assert.ok(issues.some((item) => item.path === 'edgeTypes["T型"].nameModifier'));
  assert.ok(issues.some((item) => item.path === 'hangingFeet.keywords' && item.code === 'required'));
  assert.ok(issues.some((item) => item.path === 'suppliers["default"]'));
});

test('frontend mapping validator: lock-fork validator reports high-height rule issues', () => {
  const issues = validateLockForkMapping({
    highHeightRules: {
      7: {
        minHeight: 'bad',
        heightReference: '',
        standard: {
          upper: { base1: 570, base2: 'x' },
          lower: { base1: 'y', base2: 376 },
        },
      },
    },
    suppliers: { default: '应志友' },
  });

  assert.ok(issues.some((item) => item.path === 'highHeightRules["7"].minHeight'));
  assert.ok(issues.some((item) => item.path === 'highHeightRules["7"].heightReference'));
  assert.ok(issues.some((item) => item.path === 'highHeightRules["7"].standard.upper.base2'));
  assert.ok(issues.some((item) => item.path === 'highHeightRules["7"].standard.lower.base1'));
});

test('frontend mapping validator: handle validator validates keywords/thickness/mappings', () => {
  const issues = validateHandleMapping({
    defaultSupplier: '',
    unmatchedSupplier: '待人工处理',
    manualReviewLabel: '未匹配拉手',
    singleKeywords: ['单活'],
    doubleKeywords: [' 单 活 '],
    thicknessAccessoryPacks: {
      '5': '5公分配件包',
      '7': '',
      '9': '9公分配件包',
    },
    mappings: {
      拉手A: { supplier: '', vendorName: '' },
    },
  });

  assert.ok(issues.some((item) => item.path === 'defaultSupplier'));
  assert.ok(issues.some((item) => item.path === 'doubleKeywords[0]' && item.code === 'duplicate'));
  assert.ok(issues.every((item) => item.path !== 'mappings["拉手A"].supplier'));
  assert.ok(issues.every((item) => item.path !== 'mappings["拉手A"].vendorName'));
  assert.ok(issues.every((item) => item.path !== 'mappings["拉手A"].materialCode'));

  const materialCodeIssues = validateHandleMapping({
    defaultSupplier: '默认供应商',
    unmatchedSupplier: '待人工处理',
    manualReviewLabel: '未匹配拉手',
    singleKeywords: ['单活'],
    doubleKeywords: ['双活'],
    thicknessAccessoryPacks: {
      '5': '5公分配件包',
      '7': '7公分配件包',
      '9': '9公分配件包',
      '10': '10公分配件包',
    },
    mappings: {
      拉手B: { supplier: '供应商A', vendorName: '拉手名称', materialCode: '   ' },
    },
  });
  assert.ok(materialCodeIssues.every((item) => item.path !== 'mappings["拉手B"].materialCode'));
});

test('frontend mapping validator: lock validator detects normalized conflicts and missing fields', () => {
  const issues = validateLockMapping({
    mappings: {
      'SD-9030（6607大锁）': { supplier: '汇成', vendorName: '6607大锁' },
      'SD-9030 ( 6607大锁 )': { supplier: '汇成', vendorName: '6607大锁-重复' },
      'F02-A副锁': { supplier: '', vendorName: '', primarySpec: '副锁体' },
    },
  });

  assert.ok(issues.some((item) => item.path === 'mappings["SD-9030 ( 6607大锁 )"]' && item.code === 'normalized-conflict'));
  assert.ok(issues.some((item) => item.path === 'mappings["F02-A副锁"].supplier'));
  assert.ok(issues.some((item) => item.path === 'mappings["F02-A副锁"].vendorName'));
});
