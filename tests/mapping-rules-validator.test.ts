import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMappingRuleSet } from '../src/services/mappings/mappingRules.validator';

test('mapping rules validator accepts a minimal valid rule set', () => {
  const issues = validateMappingRuleSet({
    metadata: {
      profileCode: 'lock',
      schemaVersion: 1,
    },
    rules: [
      {
        id: 'lock-secondary-f02-a',
        profile: 'lock',
        enabled: true,
        priority: 100,
        stage: 'base_mapping',
        scope: 'secondary',
        when: {
          operator: 'and',
          items: [
            { field: 'fssj', op: 'eq', value: 'F02-A副锁' },
          ],
        },
        then: {
          supplier: '汇成',
          type: 'F02-A副锁',
          spec: '副锁体',
          unit: '套',
        },
      },
    ],
  });

  assert.deepEqual(issues, []);
});

test('mapping rules validator rejects duplicate rule ids and invalid profile mismatch', () => {
  const issues = validateMappingRuleSet({
    metadata: {
      profileCode: 'cylinder',
      schemaVersion: 1,
    },
    rules: [
      {
        id: 'dup-rule',
        profile: 'lock',
        enabled: true,
        priority: 1,
        stage: 'base_mapping',
        when: {
          operator: 'and',
          items: [
            { field: 'sj', op: 'eq', value: 'B-AB' },
          ],
        },
        then: {
          supplier: '待人工处理',
        },
      },
      {
        id: 'dup-rule',
        profile: 'cylinder',
        enabled: true,
        priority: 2,
        stage: 'derived_mapping',
        when: {
          operator: 'and',
          items: [
            { field: 'thickness', op: 'eq', value: '7' },
          ],
        },
        then: {
          eccentricity: '30*60/中心孔偏心',
        },
      },
    ],
  });

  assert.ok(issues.some((item) => item.path === 'rules[0].profile' && item.code === 'profile-mismatch'));
  assert.ok(issues.some((item) => item.path === 'rules[1].id' && item.code === 'duplicate-rule-id'));
});

test('mapping rules validator rejects invalid conditions and missing outputs', () => {
  const issues = validateMappingRuleSet({
    metadata: {
      profileCode: 'accessory',
      schemaVersion: 1,
    },
    rules: [
      {
        id: 'bad-accessory-rule',
        profile: 'accessory',
        enabled: true,
        priority: 10,
        stage: 'derived_mapping',
        when: {
          operator: 'xor',
          items: [
            { field: 'unknown', op: 'contains', value: '一号铝小面板' },
          ],
        },
        then: {},
      },
    ],
  });

  assert.ok(issues.some((item) => item.path === 'rules[0].when.operator' && item.code === 'invalid-value'));
  assert.ok(issues.some((item) => item.path === 'rules[0].when.items[0].field' && item.code === 'invalid-value'));
  assert.ok(issues.some((item) => item.path === 'rules[0].when.items[0].op' && item.code === 'invalid-value'));
  assert.ok(issues.some((item) => item.path === 'rules[0].then' && item.code === 'missing-output'));
});
