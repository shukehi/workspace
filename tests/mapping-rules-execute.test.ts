import test from 'node:test';
import assert from 'node:assert/strict';
import { executeRuleSet } from '../src/services/mappings/mappingRules.execute';

test('mapping rules execute returns matched and winning rules with defaults applied', () => {
  const executed = executeRuleSet({
    metadata: {
      profileCode: 'lock',
      schemaVersion: 1,
    },
    defaults: {
      supplier: '待人工处理',
      unit: '把',
      primaryLabel: '主锁体',
    },
    rules: [
      {
        id: 'fallback-lock',
        profile: 'lock',
        enabled: true,
        priority: 10,
        stage: 'base_mapping',
        scope: 'primary',
        when: {
          operator: 'and',
          items: [{ field: 'meta.normalizedModel', op: 'eq', value: 'F02-A副锁' }],
        },
        then: {
          type: 'F02-A副锁',
          spec: '基础规格',
        },
      },
      {
        id: 'preferred-lock',
        profile: 'lock',
        enabled: true,
        priority: 100,
        stage: 'base_mapping',
        scope: 'primary',
        when: {
          operator: 'and',
          items: [{ field: 'meta.normalizedModel', op: 'eq', value: 'F02-A副锁' }],
        },
        then: {
          supplier: '汇成',
          spec: '高优先级规格',
        },
      },
    ],
  }, {
    model: ' F02-A副锁 ',
    meta: {
      normalizedModel: 'F02-A副锁',
    },
  });

  assert.equal(executed.profile, 'lock');
  assert.deepEqual(executed.matchedRules, ['preferred-lock', 'fallback-lock']);
  assert.deepEqual(executed.winningRules, ['preferred-lock', 'fallback-lock']);
  assert.equal(executed.output.supplier, '汇成');
  assert.equal(executed.output.spec, '高优先级规格');
  assert.equal(executed.output.type, 'F02-A副锁');
  assert.equal(executed.output.unit, '把');
  assert.equal(executed.output.extra?.primaryLabel, '主锁体');
});

test('mapping rules execute returns defaults only when nothing matches', () => {
  const executed = executeRuleSet({
    metadata: {
      profileCode: 'accessory',
      schemaVersion: 1,
    },
    defaults: {
      unit: '个',
      unmatchedSupplier: '待人工处理',
    },
    rules: [],
  }, {
    fshz: '无',
    thickness: '7',
  });

  assert.deepEqual(executed.matchedRules, []);
  assert.deepEqual(executed.winningRules, []);
  assert.equal(executed.output.unit, '个');
  assert.equal(executed.output.extra?.unmatchedSupplier, '待人工处理');
});
