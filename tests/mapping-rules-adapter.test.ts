import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptCylinderAccessoryPackRulesToRuleSet,
  adaptCylinderToHybridRulePayload,
  applyLockRulePreviewFallbacks,
  adaptLockForkFlatBottomRulesToRuleSet,
  adaptLockForkEdgeTypeRulesToRuleSet,
  adaptLockForkHangingFeetRulesToRuleSet,
  adaptLockForkTypeRulesToRuleSet,
  adaptLockMappingsToRuleSet,
} from '../src/services/mappings/mappingRules.adapter';

test('mapping rules adapter expands cylinder accessory-pack rules by thickness', () => {
  const ruleSet = adaptCylinderAccessoryPackRulesToRuleSet({
    dimensions: {},
    specialRules: [],
    secondaryDimensions: {},
    secondarySpecialRules: [],
    secondaryAccessoryPackRules: [
      {
        conditionField: 'fshz',
        keyword: '一号铝小面板',
        supplier: '巨力',
        itemName: '一号铝小面板',
        unit: '套',
        remark: '副锁护罩配件包',
        thicknessAccessoryPacks: {
          '7': '7公分配件包',
          '9': '9公分配件包',
        },
        thicknessMaterialCodes: {
          '7': 'ACC-FSHZ-YHLXMB-7',
          '9': 'ACC-FSHZ-YHLXMB-9',
        },
      },
    ],
    mappings: {},
    customLogos: [],
    excludedCylinders: [],
  });

  assert.equal(ruleSet.metadata.profileCode, 'accessory');
  assert.equal(ruleSet.rules.length, 2);
  assert.deepEqual(ruleSet.rules.map((rule) => rule.id), [
    'cylinder-secondary-accessory-1-7',
    'cylinder-secondary-accessory-1-9',
  ]);
  assert.deepEqual(ruleSet.rules[0].when, {
    operator: 'and',
    items: [
      { field: 'fshz', op: 'includes', value: '一号铝小面板' },
      { field: 'thickness', op: 'eq', value: '7' },
    ],
  });
  assert.equal(ruleSet.rules[0].scope, 'secondary');
  assert.equal(ruleSet.rules[0].then.categoryOverride, '五金/配件');
  assert.equal(ruleSet.rules[0].then.code, 'ACC-FSHZ-YHLXMB-7');
  assert.equal(ruleSet.rules[1].then.code, 'ACC-FSHZ-YHLXMB-9');
});

test('mapping rules adapter skips accessory rules with empty keyword', () => {
  const ruleSet = adaptCylinderAccessoryPackRulesToRuleSet({
    dimensions: {},
    specialRules: [],
    secondaryDimensions: {},
    secondarySpecialRules: [],
    secondaryAccessoryPackRules: [
      {
        conditionField: 'fshz',
        keyword: '   ',
        supplier: '巨力',
        thicknessAccessoryPacks: {
          '7': '7公分配件包',
        },
        thicknessMaterialCodes: {
          '7': 'ACC-FSHZ-YHLXMB-7',
        },
      },
    ],
    mappings: {},
    customLogos: [],
    excludedCylinders: [],
  });

  assert.equal(ruleSet.rules.length, 0);
});

test('mapping rules adapter returns hybrid payload with legacy payload preserved', () => {
  const legacy = {
    dimensions: {},
    specialRules: [],
    secondaryDimensions: {},
    secondarySpecialRules: [],
    secondaryAccessoryPackRules: [
      {
        conditionField: 'sxhz',
        keyword: '一号铝小面板',
        supplier: '巨力',
        thicknessAccessoryPacks: {
          '7': '7公分配件包',
        },
        thicknessMaterialCodes: {
          '7': 'ACC-FSHZ-YHLXMB-7',
        },
      },
    ],
    mappings: {},
    customLogos: [],
    excludedCylinders: [],
  };

  const hybrid = adaptCylinderToHybridRulePayload(legacy);
  assert.deepEqual(hybrid.legacy, legacy);
  assert.equal(hybrid.ruleSet?.rules.length, 1);
  assert.equal(hybrid.ruleSet?.rules[0].when.items[0].field, 'sxhz');
  assert.equal(hybrid.ruleSet?.rules[0].scope, 'primary');
  assert.equal(hybrid.ruleSet?.rules[0].then.code, 'ACC-FSHZ-YHLXMB-7');
});

test('mapping rules adapter builds lock preview rules for primary and secondary modes', () => {
  const payload = {
    defaultUnit: '把',
    primaryLabel: '主锁体',
    secondaryLabel: '副锁体',
    mappings: {
      ' F02-A副锁 ': {
        supplier: '汇成',
        vendorName: 'F02-A副锁',
        primarySpec: '主锁规格',
        secondarySpec: '副锁规格',
        remark: '锁具备注',
      },
    },
  };

  const primaryRuleSet = adaptLockMappingsToRuleSet(payload, 'primary', (value) => value.replace(/\s+/g, ''));
  const secondaryRuleSet = adaptLockMappingsToRuleSet(payload, 'secondary', (value) => value.replace(/\s+/g, ''));

  assert.equal(primaryRuleSet.metadata.profileCode, 'lock');
  assert.equal(primaryRuleSet.rules[0].scope, 'primary');
  assert.deepEqual(primaryRuleSet.rules[0].when, {
    operator: 'and',
    items: [{ field: 'meta.normalizedModel', op: 'eq', value: 'F02-A副锁' }],
  });
  assert.equal(primaryRuleSet.rules[0].then.spec, '主锁规格');
  assert.equal(primaryRuleSet.rules[0].then.type, 'F02-A副锁');
  assert.equal(secondaryRuleSet.rules[0].scope, 'secondary');
  assert.equal(secondaryRuleSet.rules[0].then.spec, '副锁规格');
});

test('mapping rules adapter applies lock preview fallbacks for unmatched output', () => {
  const output = applyLockRulePreviewFallbacks({
    defaultUnit: '把',
    primaryLabel: '主锁体',
    secondaryLabel: '副锁体',
    mappings: {},
  }, 'primary', 'F02-A副锁', {
    supplier: '待人工处理',
  });

  assert.equal(output.type, 'F02-A副锁');
  assert.equal(output.spec, '主锁体');
  assert.equal(output.unit, '把');
});

test('mapping rules adapter builds lock fork type preview rules', () => {
  const ruleSet = adaptLockForkTypeRulesToRuleSet({
    baseDimensions: {},
    highHeightRules: {},
    lockTypes: {
      'F02-A副锁': {
        category: 'single-head',
        nameModifier: 'P66',
        upper: '直杆',
        lower: '弯杆',
      },
    },
    edgeTypes: {},
    hangingFeet: {
      standard: 35,
      keywords: ['吊脚'],
    },
    heightReference: 2050,
    suppliers: { default: '' },
  });

  assert.equal(ruleSet.metadata.profileCode, 'lock_fork');
  assert.equal(ruleSet.rules.length, 1);
  assert.deepEqual(ruleSet.rules[0].when, {
    operator: 'or',
    items: [
      { field: 'sj', op: 'eq', value: 'F02-A副锁' },
      { field: 'fssj', op: 'eq', value: 'F02-A副锁' },
    ],
  });
  assert.equal(ruleSet.rules[0].then.extra?.nameModifier, 'P66');
  assert.equal(ruleSet.rules[0].then.extra?.upper, '直杆');
  assert.equal(ruleSet.rules[0].then.extra?.lower, '弯杆');
});

test('mapping rules adapter builds lock fork edge preview rules', () => {
  const ruleSet = adaptLockForkEdgeTypeRulesToRuleSet({
    baseDimensions: {},
    highHeightRules: {},
    lockTypes: {},
    edgeTypes: {
      T型: {
        nameModifier: 'T型',
      },
    },
    hangingFeet: {
      standard: 35,
      keywords: ['吊脚'],
    },
    heightReference: 2050,
    suppliers: { default: '' },
  });

  assert.equal(ruleSet.metadata.profileCode, 'lock_fork');
  assert.equal(ruleSet.rules.length, 1);
  assert.deepEqual(ruleSet.rules[0].when, {
    operator: 'and',
    items: [{ field: 'mb', op: 'includes', value: 'T型' }],
  });
  assert.equal(ruleSet.rules[0].then.extra?.nameModifier, 'T型');
});

test('mapping rules adapter builds lock fork hanging-feet preview rules', () => {
  const ruleSet = adaptLockForkHangingFeetRulesToRuleSet({
    baseDimensions: {},
    highHeightRules: {},
    lockTypes: {},
    edgeTypes: {},
    hangingFeet: {
      standard: 35,
      keywords: ['吊脚', 'diaojiao'],
    },
    heightReference: 2050,
    suppliers: { default: '' },
  });

  assert.equal(ruleSet.metadata.profileCode, 'lock_fork');
  assert.deepEqual(ruleSet.rules.map((rule) => rule.id), [
    'lock-fork-hanging-feet-吊脚',
    'lock-fork-hanging-feet-diaojiao',
  ]);
  assert.deepEqual(ruleSet.rules[0].when, {
    operator: 'and',
    items: [{ field: 'xsbz', op: 'includes', value: '吊脚' }],
  });
  assert.equal(ruleSet.rules[0].then.extra?.mode, 'hanging_feet');
});

test('mapping rules adapter builds lock fork flat-bottom preview rules', () => {
  const ruleSet = adaptLockForkFlatBottomRulesToRuleSet();

  assert.equal(ruleSet.metadata.profileCode, 'lock_fork');
  assert.equal(ruleSet.rules.length, 1);
  assert.deepEqual(ruleSet.rules[0].when, {
    operator: 'and',
    items: [{ field: 'xsbz', op: 'includes', value: '平下档' }],
  });
  assert.equal(ruleSet.rules[0].then.extra?.mode, 'flat_bottom');
});
