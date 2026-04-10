import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptCylinderAccessoryPackRulesToRuleSet } from '../src/services/mappings/mappingRules.adapter';
import { explainRuleSet } from '../src/services/mappings/mappingRules.explain';

test('mapping rules explain returns matching accessory rule and merged output', () => {
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

  const explained = explainRuleSet(ruleSet, {
    fshz: '一号铝小面板',
    thickness: '7',
    qtyTotal: 70,
  });

  assert.equal(explained.profile, 'accessory');
  assert.deepEqual(explained.winningRules, ['cylinder-secondary-accessory-1-7']);
  assert.equal(explained.traces[0].matched, true);
  assert.equal(explained.output.supplier, '巨力');
  assert.equal(explained.output.code, 'ACC-FSHZ-YHLXMB-7');
  assert.equal(explained.output.spec, '7公分配件包');
});

test('mapping rules explain reports non-match when conditions fail', () => {
  const ruleSet = adaptCylinderAccessoryPackRulesToRuleSet({
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
  });

  const explained = explainRuleSet(ruleSet, {
    sxhz: '无',
    thickness: '7',
  });

  assert.deepEqual(explained.winningRules, []);
  assert.equal(explained.traces[0].matched, false);
  assert.equal(explained.traces[0].skippedReason, 'conditions-not-met');
  assert.equal(explained.output.unit, '个');
  assert.equal(explained.output.extra?.unmatchedSupplier, '待人工处理');
  assert.deepEqual(explained.winningRules, []);
});

test('mapping rules explain keeps higher-priority outputs and narrows winningRules to effective winners', () => {
  const explained = explainRuleSet({
    metadata: {
      profileCode: 'accessory',
      schemaVersion: 1,
    },
    defaults: {
      unit: '个',
      unmatchedSupplier: '待人工处理',
    },
    rules: [
      {
        id: 'low-priority-fallback',
        profile: 'accessory',
        enabled: true,
        priority: 10,
        stage: 'derived_mapping',
        when: {
          operator: 'and',
          items: [
            { field: 'fshz', op: 'includes', value: '面板' },
          ],
        },
        then: {
          supplier: '低优先级供应商',
          spec: '低优先级规格',
          unit: '套',
          code: 'LOW-CODE',
        },
      },
      {
        id: 'high-priority-override',
        profile: 'accessory',
        enabled: true,
        priority: 100,
        stage: 'derived_mapping',
        when: {
          operator: 'and',
          items: [
            { field: 'fshz', op: 'includes', value: '面板' },
          ],
        },
        then: {
          supplier: '高优先级供应商',
          code: 'HIGH-CODE',
        },
      },
    ],
  }, {
    fshz: '一号铝小面板',
  });

  assert.deepEqual(explained.traces.map((item) => [item.ruleId, item.matched]), [
    ['high-priority-override', true],
    ['low-priority-fallback', true],
  ]);
  assert.equal(explained.output.supplier, '高优先级供应商');
  assert.equal(explained.output.code, 'HIGH-CODE');
  assert.equal(explained.output.spec, '低优先级规格');
  assert.equal(explained.output.unit, '套');
  assert.deepEqual(explained.winningRules, ['high-priority-override', 'low-priority-fallback']);
});
