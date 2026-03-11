import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLockGroups } from '../src/services/po-rules/lockRule';
import type { RuleContext } from '../src/services/po-rules/types';

const baseCtx: RuleContext = {
  sourceStore: {
    currentOrder: { list: [] },
    materialRequirements: null,
    hardwareRequirements: null,
  },
  packagingConfig: { getPackagingMapping: () => ({ supplierName: '方亮包装', mappings: {} }) },
  packagingMatcher: {
    syncFromMapping: () => {},
    match: (name: string) => name,
    consumeUnmatchedSummary: () => [],
  },
};

test('lock rule: groups by supplier and keeps lockset item fields', () => {
  const ctx: RuleContext = {
    ...baseCtx,
    sourceStore: {
      ...baseCtx.sourceStore,
      hardwareRequirements: {
        locks: [
          { type: '智能锁体A', spec: '主锁', unit: '把', quantityLeft: 3, quantityRight: 5, quantity: 8, remark: '主锁 | 960/7/外开 | 客户A' },
          { supplier: '汇成', type: '副锁锁体B', spec: '副锁', unit: '把', quantityLeft: 2, quantityRight: 4, quantity: 6, remark: '副锁 | 960/7/外开 | 客户A' },
        ],
      },
    },
  };

  const groups = buildLockGroups(ctx);
  assert.equal(groups.length, 2);

  const fallback = groups.find((g) => g.supplierName === '待人工处理');
  const assigned = groups.find((g) => g.supplierName === '汇成');
  assert.ok(fallback);
  assert.ok(assigned);
  assert.equal(fallback!.category, '锁具');
  assert.equal(fallback!.items[0].unit, '把');
  assert.equal(fallback!.items[0].quantity_left, 3);
  assert.equal(fallback!.items[0].quantity_right, 5);
  assert.equal(assigned!.items[0].spec, '副锁');
});
