const test = require('node:test');
const assert = require('node:assert/strict');

const {
  adaptPackagingMapping,
  adaptCylinderMapping,
  adaptLockMapping,
  adaptHandleMapping,
  adaptLockForkMapping,
} = require('../server/services/mappings/mapping.adapter');
const {
  validatePackagingMapping,
  validateCylinderMapping,
  validateLockMapping,
  validateHandleMapping,
  validateLockForkMapping,
} = require('../server/services/mappings/mapping.validator');

test('server mapping adapter: packaging adapter canonicalizes legacy dictionaries', () => {
  const payload = adaptPackagingMapping({ 包装A: '外协包装A' });

  assert.deepEqual(payload, {
    supplierName: '方亮包装',
    mappings: { 包装A: '外协包装A' },
  });
});

test('server mapping validator: packaging validator returns path-based issues', () => {
  const issues = validatePackagingMapping({
    supplierName: ' ',
    mappings: {
      'A B': '外协A',
      AB: '外协B',
      包装C: '',
    },
  });

  assert.ok(issues.some((item) => item.path === 'supplierName'));
  assert.ok(issues.some((item) => item.path === 'mappings["AB"]' && item.code === 'normalized-conflict'));
  assert.ok(issues.some((item) => item.path === 'mappings["包装C"]' && item.code === 'required'));
});

test('server mapping validator: cylinder and lock-fork validators expose nested paths', () => {
  const cylinderIssues = validateCylinderMapping({
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
  });

  const lockForkIssues = validateLockForkMapping({
    baseDimensions: {
      7: {
        standard: {
          upper: { base1: 'x', base2: 301 },
          lower: { base1: 570, base2: 'y' },
        },
      },
    },
    suppliers: {},
  });

  assert.ok(cylinderIssues.some((item) => item.path === 'specialRules[0].conditionField'));
  assert.ok(cylinderIssues.some((item) => item.path === 'specialRules[0].variants["内开"].code'));
  assert.ok(cylinderIssues.some((item) => item.path === 'mappings["锁芯A"].supplier'));
  assert.ok(lockForkIssues.some((item) => item.path === 'baseDimensions["7"].standard.upper.base1'));
  assert.ok(lockForkIssues.some((item) => item.path === 'suppliers["default"]'));
});

test('server mapping adapter: cylinder and lock-fork adapters preserve baseline defaults', () => {
  const cylinder = adaptCylinderMapping({
    dimensions: {
      7: { code: '90AB', eccentricity: '34.5*55.5' },
    },
  });
  const lockFork = adaptLockForkMapping({
    suppliers: { default: '应志友' },
  });

  assert.equal(cylinder.dimensions['7'].code, '90AB');
  assert.equal(lockFork.hangingFeet.standard, 35);
  assert.deepEqual(lockFork.hangingFeet.keywords, ['吊脚', 'diaojiao']);
});

test('server mapping adapter/validator: handle defaults and required fields', () => {
  const handle = adaptHandleMapping({
    thicknessAccessoryPacks: { '5': '5公分配件包' },
  });
  assert.equal(handle.defaultSupplier, '拉手供应商');
  assert.equal(handle.thicknessAccessoryPacks['5'], '5公分配件包');
  assert.equal(handle.thicknessAccessoryPacks['10'], '10公分配件包');

  const issues = validateHandleMapping({
    defaultSupplier: '',
    unmatchedSupplier: '',
    manualReviewLabel: '',
    singleKeywords: ['单活'],
    doubleKeywords: ['单活'],
    thicknessAccessoryPacks: { '5': '5公分配件包' },
    mappings: {
      拉手A: { supplier: '', vendorName: '' },
    },
  });

  assert.ok(issues.some((item) => item.path === 'defaultSupplier'));
  assert.ok(issues.some((item) => item.path === 'unmatchedSupplier'));
  assert.ok(issues.some((item) => item.path === 'doubleKeywords[0]' && item.code === 'duplicate'));
  assert.ok(issues.some((item) => item.path === 'mappings["拉手A"].vendorName'));

  const materialCodeIssues = validateHandleMapping({
    defaultSupplier: '默认供应商',
    unmatchedSupplier: '待人工处理',
    manualReviewLabel: '未匹配拉手',
    singleKeywords: ['单活'],
    doubleKeywords: ['双活'],
    thicknessAccessoryPacks: { '5': '5公分配件包', '7': '7公分配件包', '9': '9公分配件包', '10': '10公分配件包' },
    mappings: {
      拉手B: { supplier: '供应商A', vendorName: '拉手名称', materialCode: '   ' },
    },
  });
  assert.ok(materialCodeIssues.some((item) => item.path === 'mappings["拉手B"].materialCode'));
});

test('server mapping adapter/validator: lock defaults and normalized conflicts', () => {
  const lock = adaptLockMapping({
    mappings: {
      'SD-9030（6607大锁）': {
        supplier: '汇成',
        vendorName: '6607大锁'
      }
    }
  });
  assert.equal(lock.defaultUnit, '套');

  const issues = validateLockMapping({
    mappings: {
      'SD-9030（6607大锁）': { supplier: '汇成', vendorName: '6607大锁' },
      'SD-9030 ( 6607大锁 )': { supplier: '汇成', vendorName: '重复锁具' },
      'F02-A副锁': { supplier: '', vendorName: '', primarySpec: '副锁体' },
    },
  });

  assert.ok(issues.some((item) => item.path === 'mappings["SD-9030 ( 6607大锁 )"]' && item.code === 'normalized-conflict'));
  assert.ok(issues.some((item) => item.path === 'mappings["F02-A副锁"].supplier'));
});
