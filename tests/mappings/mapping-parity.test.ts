import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptPackagingMapping as adaptPackagingMappingFront,
  adaptCylinderMapping as adaptCylinderMappingFront,
  adaptLockMapping as adaptLockMappingFront,
  adaptLockForkMapping as adaptLockForkMappingFront
} from '../../src/services/mappings/mappingAdapter';
import {
  validatePackagingMapping as validatePackagingMappingFront,
  validateCylinderMapping as validateCylinderMappingFront,
  validateLockMapping as validateLockMappingFront,
  validateLockForkMapping as validateLockForkMappingFront
} from '../../src/services/mappings/mappingValidator';

import {
  adaptPackagingMapping as adaptPackagingMappingBack,
  adaptCylinderMapping as adaptCylinderMappingBack,
  adaptLockMapping as adaptLockMappingBack,
  adaptLockForkMapping as adaptLockForkMappingBack
} from '../../server/services/mappings/mapping.adapter';
import {
  validatePackagingMapping as validatePackagingMappingBack,
  validateCylinderMapping as validateCylinderMappingBack,
  validateLockMapping as validateLockMappingBack,
  validateLockForkMapping as validateLockForkMappingBack
} from '../../server/services/mappings/mapping.validator';

const packagingSamples: unknown[] = [
  {
    supplierName: '方亮包装',
    mappings: {
      A箱: '采购A箱',
      ' B 箱 ': '采购B箱'
    }
  },
  {
    'A箱': '采购A箱',
    ' ': '非法'
  }
];

const cylinderSamples: unknown[] = [
  {
    dimensions: {
      '7': { code: '90AB', eccentricity: '34.5*55.5/中心孔偏心' }
    },
    specialRules: [
      {
        conditionField: 'sxhz',
        keyword: '16-7-5+ZS17',
        thickness: '7',
        variants: {
          内开: { code: '84AB', eccentricity: '28*56/中心孔偏心' }
        }
      }
    ],
    secondaryDimensions: {
      '7': {
        variants: {
          内开: { code: '90', eccentricity: '30*60' }
        }
      }
    },
    secondarySpecialRules: [],
    mappings: {
      'F01-A': { supplier: '供应商A', template: '{code}模板' }
    },
    customLogos: ['LOGO1'],
    excludedCylinders: ['指纹锁配套锁芯', '内置锁芯']
  },
  {
    dimensions: {
      '': { code: '', eccentricity: '' }
    },
    mappings: {
      '': { supplier: '', template: '' }
    }
  }
];

const lockForkSamples: unknown[] = [
  {
    baseDimensions: {
      '7': {
        standard: {
          upper: { base1: 120, base2: 180 },
          lower: { base1: 110, base2: 170 }
        },
        withHangingFeet: {
          upper: { base1: 130, base2: 190 },
          lower: { base1: 120, base2: 180 }
        }
      }
    },
    lockTypes: {
      'F02-A副锁': { category: 'dual-head', nameModifier: 'P66', upper: '直杆', lower: '弯杆' }
    },
    edgeTypes: {
      T型: { nameModifier: 'T型' }
    },
    hangingFeet: {
      standard: 35,
      keywords: ['吊脚', 'diaojiao']
    },
    heightReference: 2050,
    suppliers: {
      default: '应志友'
    }
  },
  {
    baseDimensions: {},
    lockTypes: {},
    edgeTypes: {},
    hangingFeet: {
      standard: 'bad-number',
      keywords: []
    },
    heightReference: 'oops',
    suppliers: {}
  }
];

const lockSamples: unknown[] = [
  {
    defaultUnit: '套',
    primaryLabel: '主锁',
    secondaryLabel: '副锁',
    mappings: {
      'SD-9030（6607大锁）': { supplier: '汇成', vendorName: '6607大锁', primarySpec: '主锁体' }
    }
  },
  {
    mappings: {
      'SD-9030（6607大锁）': { supplier: '汇成', vendorName: '6607大锁' },
      'SD-9030 ( 6607大锁 )': { supplier: '汇成', vendorName: '重复锁具' }
    }
  }
];

function assertParity(
  sample: unknown,
  adaptFront: (value: unknown) => unknown,
  adaptBack: (value: unknown) => unknown,
  validateFront: (value: unknown) => unknown,
  validateBack: (value: unknown) => unknown
) {
  assert.deepEqual(adaptFront(sample), adaptBack(sample));
  assert.deepEqual(validateFront(sample), validateBack(sample));
}

test('packaging adapter/validator parity between frontend and backend', () => {
  packagingSamples.forEach((sample) => {
    assertParity(
      sample,
      adaptPackagingMappingFront,
      adaptPackagingMappingBack,
      validatePackagingMappingFront,
      validatePackagingMappingBack
    );
  });
});

test('cylinder adapter/validator parity between frontend and backend', () => {
  cylinderSamples.forEach((sample) => {
    assertParity(
      sample,
      adaptCylinderMappingFront,
      adaptCylinderMappingBack,
      validateCylinderMappingFront,
      validateCylinderMappingBack
    );
  });
});

test('lock adapter/validator parity between frontend and backend', () => {
  lockSamples.forEach((sample) => {
    assertParity(
      sample,
      adaptLockMappingFront,
      adaptLockMappingBack,
      validateLockMappingFront,
      validateLockMappingBack
    );
  });
});

test('lock-fork adapter/validator parity between frontend and backend', () => {
  lockForkSamples.forEach((sample) => {
    assertParity(
      sample,
      adaptLockForkMappingFront,
      adaptLockForkMappingBack,
      validateLockForkMappingFront,
      validateLockForkMappingBack
    );
  });
});
