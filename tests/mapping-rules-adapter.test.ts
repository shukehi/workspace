import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptCylinderAccessoryPackRulesToRuleSet,
  adaptCylinderToHybridRulePayload,
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
