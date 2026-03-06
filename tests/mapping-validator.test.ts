import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCylinderMapping,
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
