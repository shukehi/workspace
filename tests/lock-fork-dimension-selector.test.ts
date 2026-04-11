import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveLockForkDimensionRuleLegacy,
  resolveLockForkDimensionRuleWithRules,
} from '../src/services/mappings/lockForkDimensionSelector';

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
  },
  lockTypes: {},
  edgeTypes: {},
  hangingFeet: {
    standard: 35,
    keywords: ['吊脚', 'diaojiao'],
  },
  heightReference: 2050,
  suppliers: {
    default: '应志友',
  },
};

const cases = [
  { thickness: '5', doorHeight: 2050, useHangingFeetDimensions: false },
  { thickness: '5', doorHeight: 2050, useHangingFeetDimensions: true },
  { thickness: '7', doorHeight: 2198, useHangingFeetDimensions: false },
  { thickness: '7', doorHeight: 2400, useHangingFeetDimensions: false },
  { thickness: '7', doorHeight: 2400, useHangingFeetDimensions: true },
  { thickness: '9', doorHeight: 2050, useHangingFeetDimensions: false },
];

test('lock fork dimension selector rule path matches legacy selection path', () => {
  cases.forEach((params) => {
    const legacy = resolveLockForkDimensionRuleLegacy(mapping, params);
    const rules = resolveLockForkDimensionRuleWithRules(mapping, params);

    assert.deepEqual(
      {
        dimensions: rules.dimensions,
        heightReference: rules.heightReference,
        selectedThicknessKey: rules.selectedThicknessKey,
        selectedVariant: rules.selectedVariant,
        source: rules.source,
      },
      {
        dimensions: legacy.dimensions,
        heightReference: legacy.heightReference,
        selectedThicknessKey: legacy.selectedThicknessKey,
        selectedVariant: legacy.selectedVariant,
        source: legacy.source,
      },
      `selector mismatch for ${JSON.stringify(params)}`,
    );
  });
});
