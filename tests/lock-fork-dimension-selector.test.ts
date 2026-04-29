import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLockForkDimensionRuleWithRules } from '../src/services/mappings/lockForkDimensionSelector';

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
    '11': {},
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
  {
    name: 'falls back from 5cm to 7cm base dimensions when no 5cm base exists',
    params: { thickness: '5', doorHeight: 2050, useHangingFeetDimensions: false },
    expected: {
      dimensions: {
        upper: { base1: 570, base2: 301 },
        lower: { base1: 570, base2: 301 },
      },
      heightReference: 2050,
      matchedRules: ['lock-fork-dimension-fallback_7-7-standard'],
      winningRules: ['lock-fork-dimension-fallback_7-7-standard'],
      selectedThicknessKey: '7',
      selectedVariant: 'standard',
      source: 'fallback_7',
    },
  },
  {
    name: 'uses hanging-feet dimensions for the fallback 7cm rule',
    params: { thickness: '5', doorHeight: 2050, useHangingFeetDimensions: true },
    expected: {
      dimensions: {
        upper: { base1: 570, base2: 301 },
        lower: { base1: 570, base2: 313 },
      },
      heightReference: 2050,
      matchedRules: ['lock-fork-dimension-fallback_7-7-withHangingFeet'],
      winningRules: ['lock-fork-dimension-fallback_7-7-withHangingFeet'],
      selectedThicknessKey: '7',
      selectedVariant: 'withHangingFeet',
      source: 'fallback_7',
    },
  },
  {
    name: 'selects the high-height 7cm rule at and above the configured threshold',
    params: { thickness: '7', doorHeight: 2400, useHangingFeetDimensions: false },
    expected: {
      dimensions: {
        upper: { base1: 570, base2: 376 },
        lower: { base1: 570, base2: 376 },
      },
      heightReference: 2200,
      matchedRules: [
        'lock-fork-dimension-high_height-7-standard',
        'lock-fork-dimension-base-7-standard',
      ],
      winningRules: ['lock-fork-dimension-high_height-7-standard'],
      selectedThicknessKey: '7',
      selectedVariant: 'standard',
      source: 'high_height',
    },
  },
  {
    name: 'selects base 9cm dimensions when no high-height rule applies',
    params: { thickness: '9', doorHeight: 2050, useHangingFeetDimensions: false },
    expected: {
      dimensions: {
        upper: { base1: 524, base2: 301 },
        lower: { base1: 524, base2: 301 },
      },
      heightReference: 2050,
      matchedRules: ['lock-fork-dimension-base-9-standard'],
      winningRules: ['lock-fork-dimension-base-9-standard'],
      selectedThicknessKey: '9',
      selectedVariant: 'standard',
      source: 'base',
    },
  },
  {
    name: 'returns no dimensions when the selected base thickness is missing dimension groups',
    params: { thickness: '11', doorHeight: 2050, useHangingFeetDimensions: false },
    expected: {
      dimensions: null,
      heightReference: 2050,
      matchedRules: ['lock-fork-dimension-base-11-standard'],
      winningRules: ['lock-fork-dimension-base-11-standard'],
      selectedThicknessKey: '11',
      selectedVariant: 'standard',
      source: 'base',
    },
  },
];

test('lock fork dimension selector resolves explicit rule-contract outputs', () => {
  cases.forEach(({ name, params, expected }) => {
    const rules = resolveLockForkDimensionRuleWithRules(mapping, params);

    assert.deepEqual(
      {
        dimensions: rules.dimensions,
        heightReference: rules.heightReference,
        matchedRules: rules.matchedRules,
        winningRules: rules.winningRules,
        selectedThicknessKey: rules.selectedThicknessKey,
        selectedVariant: rules.selectedVariant,
        source: rules.source,
      },
      expected,
      name,
    );
  });
});
