import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPackagingGroups } from '../src/services/po-rules/packagingRule';
import type { RuleContext } from '../src/services/po-rules/types';

function createCtx(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    sourceStore: {
      currentOrder: { list: [] },
      materialRequirements: null,
      hardwareRequirements: null,
    },
    configLoader: {
      getPackagingMapping: () => ({ supplierName: '方亮包装', mappings: {} }),
    },
    packagingMatcher: {
      syncFromMapping: () => {},
      match: (name: string) => `${name}(匹配)`,
      consumeUnmatchedSummary: () => [],
    },
    ...overrides,
  };
}

test('packaging rule: merge=true builds rows from aggregated packaging requirements', () => {
  const ctx = createCtx({
    sourceStore: {
      currentOrder: { list: [] },
      materialRequirements: null,
      hardwareRequirements: {
        packaging: {
          a: {
            internalName: '3层黄卡美+C单瓦纸箱',
            externalName: '美+C单瓦',
            productModelName: 'M1',
            spec: '960*2050',
            mb: '新元宝边',
            totalQty: 8,
            totalLeft: 3,
            totalRight: 5,
            supplierName: '方亮包装',
          },
        },
      },
    },
  });

  const groups = buildPackagingGroups(ctx, { mergeSameSpec: true });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].category, '包装');
  assert.equal(groups[0].supplierName, '方亮包装');
  assert.equal(groups[0].items.length, 1);
  assert.equal(groups[0].items[0].quantity_left, 3);
  assert.equal(groups[0].items[0].quantity_right, 5);
  assert.equal(groups[0].items[0].remark, '');
});

test('packaging rule: merge=false maps qty pair and falls back to matcher', () => {
  let matchedInput = '';
  const ctx = createCtx({
    sourceStore: {
      currentOrder: {
        list: [
          {
            bz: '未映射包装名',
            productModelName: 'M2',
            spec: '880*2050',
            mb: '门边A',
            qty: '2/4',
          },
        ],
      },
      materialRequirements: null,
      hardwareRequirements: null,
    },
    configLoader: {
      getPackagingMapping: () => ({ supplierName: '方亮包装', mappings: {} }),
    },
    packagingMatcher: {
      syncFromMapping: () => {},
      match: (name: string) => {
        matchedInput = name;
        return '匹配结果';
      },
      consumeUnmatchedSummary: () => [],
    },
  });

  const groups = buildPackagingGroups(ctx, { mergeSameSpec: false });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].items.length, 1);
  assert.equal(matchedInput, '未映射包装名');
  assert.equal(groups[0].items[0].external_name, '匹配结果');
  assert.equal(groups[0].items[0].quantity, 6);
  assert.equal(groups[0].items[0].quantity_left, 2);
  assert.equal(groups[0].items[0].quantity_right, 4);
});
