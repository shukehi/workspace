import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHandleGroups } from '../src/services/po-rules/handleRule';
import type { RuleContext } from '../src/services/po-rules/types';

const baseCtx: RuleContext = {
  sourceStore: {
    currentOrder: { list: [] },
    materialRequirements: null,
    hardwareRequirements: null,
  },
  configLoader: { getPackagingMapping: () => ({ supplierName: '方亮包装', mappings: {} }) },
  packagingMatcher: {
    syncFromMapping: () => {},
    match: (name: string) => name,
    consumeUnmatchedSummary: () => [],
  },
};

test('handle rule: groups by supplier and uses unit 付', () => {
  const ctx: RuleContext = {
    ...baseCtx,
    sourceStore: {
      ...baseCtx.sourceStore,
      hardwareRequirements: {
        handles: [
          { type: 'DJ-6847双活供应商名', spec: '10公分配件包', quantityLeft: 6, quantityRight: 6, quantity: 12 },
          { supplier: '供应商X', type: 'DJ-86-6B单活供应商名', spec: '7公分配件包', quantityLeft: 3, quantityRight: 5, quantity: 8, remark: '待人工处理：打标' },
        ],
      },
    },
  };

  const groups = buildHandleGroups(ctx);
  assert.equal(groups.length, 2);

  const fallback = groups.find((g) => g.supplierName === '待人工处理');
  const assigned = groups.find((g) => g.supplierName === '供应商X');
  assert.ok(fallback);
  assert.ok(assigned);
  assert.equal(fallback!.category, '拉手');
  assert.equal(fallback!.items[0].unit, '付');
  assert.equal(fallback!.items[0].quantity_left, 6);
  assert.equal(fallback!.items[0].quantity_right, 6);
  assert.equal(assigned!.items[0].remark, '待人工处理：打标');
});
