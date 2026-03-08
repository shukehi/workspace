import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCylinderGroups } from '../src/services/po-rules/cylinderRule';
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

test('cylinder rule: groups by supplier with fallback and keeps key fields', () => {
  const ctx: RuleContext = {
    ...baseCtx,
    sourceStore: {
      ...baseCtx.sourceStore,
      hardwareRequirements: {
        cylinders: [
          { type: '锁芯A', eccentricity: '34.5*55.5', quantity: 10 },
          { supplier: '忠恒', type: '锁芯B', eccentricity: '35*60', quantity: 20, remark: '备注' },
        ],
      },
    },
  };

  const groups = buildCylinderGroups(ctx);
  assert.equal(groups.length, 2);

  const fallback = groups.find((g) => g.supplierName === '未分配五金');
  const assigned = groups.find((g) => g.supplierName === '忠恒');
  assert.ok(fallback);
  assert.ok(assigned);
  assert.equal(fallback!.category, '锁芯');
  assert.equal(fallback!.items[0].type, '锁芯A');
  assert.equal(assigned!.items[0].remark, '备注');
});
