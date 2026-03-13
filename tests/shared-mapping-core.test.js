const test = require('node:test');
const assert = require('node:assert/strict');

const {
  adaptPackagingMapping,
  adaptCylinderMapping,
  adaptLockMapping,
  adaptLockForkMapping,
} = require('../shared/mappings/mapping-adapter-core');
const {
  validatePackagingMapping,
  validateCylinderMapping,
  validateLockMapping,
  validateLockForkMapping,
} = require('../shared/mappings/mapping-validator-core');

test('shared mapping adapter core: packaging canonicalizes legacy dictionary shape', () => {
  const payload = adaptPackagingMapping({
    包装A: '外协包装A',
  });

  assert.deepEqual(payload, {
    supplierName: '方亮包装',
    mappings: { 包装A: '外协包装A' },
  });
});

test('shared mapping validator core: packaging exposes normalized conflict path', () => {
  const issues = validatePackagingMapping({
    supplierName: '方亮包装',
    mappings: {
      'A B': '外协A',
      AB: '外协B',
    },
  });

  assert.ok(
    issues.some((item) => item.path === 'mappings["AB"]' && item.code === 'normalized-conflict')
  );
});

test('shared mapping core: cylinder adapter defaults and validator nested paths stay stable', () => {
  const adapted = adaptCylinderMapping({
    dimensions: {
      7: { code: '90AB', eccentricity: '34.5*55.5' },
    },
  });
  const issues = validateCylinderMapping({
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

  assert.equal(adapted.dimensions['7'].code, '90AB');
  assert.ok(issues.some((item) => item.path === 'specialRules[0].conditionField'));
  assert.ok(issues.some((item) => item.path === 'specialRules[0].variants["内开"].code'));
  assert.ok(issues.some((item) => item.path === 'mappings["锁芯A"].supplier'));
});

test('shared mapping core: lock and lock-fork validator paths remain compatible', () => {
  const lockIssues = validateLockMapping({
    mappings: {
      'SD-9030（6607大锁）': { supplier: '汇成', vendorName: '6607大锁' },
      'SD-9030 ( 6607大锁 )': { supplier: '汇成', vendorName: '重复锁具' },
    },
  });
  const lockForkAdapted = adaptLockForkMapping({
    suppliers: { default: '应志友' },
    highHeightRules: {
      7: {
        minHeight: 2200,
        heightReference: 2200,
        standard: {
          upper: { base1: 570, base2: 376 },
          lower: { base1: 570, base2: 376 },
        },
      },
    },
  });
  const lockForkIssues = validateLockForkMapping({
    highHeightRules: {
      7: {
        minHeight: 'oops',
        heightReference: '',
        standard: {
          upper: { base1: 570, base2: 'x' },
          lower: { base1: 'y', base2: 376 },
        },
      },
    },
    suppliers: { default: '应志友' },
  });

  assert.equal(lockForkAdapted.hangingFeet.standard, 35);
  assert.ok(
    lockIssues.some((item) => item.path === 'mappings["SD-9030 ( 6607大锁 )"]' && item.code === 'normalized-conflict')
  );
  assert.ok(lockForkIssues.some((item) => item.path === 'highHeightRules["7"].minHeight'));
  assert.ok(lockForkIssues.some((item) => item.path === 'highHeightRules["7"].standard.upper.base2'));
});
