import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRawMaterialGroups } from '../src/services/po-rules/rawMaterialRule';
import type { RuleContext } from '../src/services/po-rules/types';

const baseCtx: RuleContext = {
  sourceStore: {
    currentOrder: { list: [] },
    materialRequirements: null,
    hardwareRequirements: null,
  },
  configLoader: { getPackagingMapping: () => ({}) },
  packagingMatcher: {
    syncFromMapping: () => {},
    match: (name: string) => name,
    consumeUnmatchedSummary: () => [],
  },
};

test('raw-material rule: maps requirements into 原辅材料 groups with ceil quantity', () => {
  const ctx: RuleContext = {
    ...baseCtx,
    sourceStore: {
      ...baseCtx.sourceStore,
      materialRequirements: {
        requirements: {
          a: {
            supplierName: '供应商A',
            materials: [{ materialId: 'M-001', totalUsage: 3.2 }],
          },
        },
      },
    },
  };

  const groups = buildRawMaterialGroups(ctx);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].category, '原辅材料');
  assert.equal(groups[0].supplierName, '供应商A');
  assert.equal(groups[0].items[0].material_id, 'M-001');
  assert.equal(groups[0].items[0].quantity, 4);
});
