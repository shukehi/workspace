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
    packagingConfig: {
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
    packagingConfig: {
      getPackagingMapping: () => ({ supplierName: '方亮包装', mappings: { '3层黄卡美+C单瓦纸箱': '美+C单瓦' } }),
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
  assert.equal(groups[0].items[0].internal_name, '3层黄卡美+C单瓦纸箱');
  assert.equal(groups[0].items[0].external_name, '美+C单瓦');
});

test('packaging rule: merge=true should not fallback internal_name to spec', () => {
  const ctx = createCtx({
    sourceStore: {
      currentOrder: { list: [] },
      materialRequirements: null,
      hardwareRequirements: {
        packaging: {
          a: {
            internalName: '',
            externalName: '',
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
  assert.equal(groups[0].items[0].internal_name, '未匹配');
  assert.equal(groups[0].items[0].external_name, '未匹配');
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
    packagingConfig: {
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

test('packaging rule: merge=false uses 未匹配 when bz is empty', () => {
  let matchCalled = false;
  const ctx = createCtx({
    sourceStore: {
      currentOrder: {
        list: [
          {
            bz: '   ',
            productModelName: 'M3',
            spec: '900*2100',
            mb: '门边B',
            qty: '1/1',
          },
        ],
      },
      materialRequirements: null,
      hardwareRequirements: null,
    },
    packagingMatcher: {
      syncFromMapping: () => {},
      match: () => {
        matchCalled = true;
        return '不会被调用';
      },
      consumeUnmatchedSummary: () => [],
    },
  });

  const groups = buildPackagingGroups(ctx, { mergeSameSpec: false });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].items.length, 1);
  assert.equal(groups[0].items[0].internal_name, '未匹配');
  assert.equal(groups[0].items[0].external_name, '未匹配');
  assert.equal(matchCalled, false);
});

test('packaging rule: merge=false preserves explicit zero on right quantity', () => {
  const ctx = createCtx({
    sourceStore: {
      currentOrder: {
        list: [
          {
            bz: '包装A',
            productModelName: 'M4',
            spec: '900*2100',
            mb: '门边C',
            qty: '36/0',
          },
        ],
      },
      materialRequirements: null,
      hardwareRequirements: null,
    },
    packagingConfig: {
      getPackagingMapping: () => ({ supplierName: '方亮包装', mappings: { 包装A: '外协包装A' } }),
    },
  });

  const groups = buildPackagingGroups(ctx, { mergeSameSpec: false });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].items[0].quantity, 36);
  assert.equal(groups[0].items[0].quantity_left, 36);
  assert.equal(groups[0].items[0].quantity_right, 0);
});

test('packaging rule: merge=false supports plus-delimited left/right quantity', () => {
  const ctx = createCtx({
    sourceStore: {
      currentOrder: {
        list: [
          {
            bz: '包装A',
            productModelName: 'M5',
            spec: '900*2100',
            mb: '门边D',
            qty: '2+3',
          },
        ],
      },
      materialRequirements: null,
      hardwareRequirements: null,
    },
    packagingConfig: {
      getPackagingMapping: () => ({ supplierName: '方亮包装', mappings: { 包装A: '外协包装A' } }),
    },
  });

  const groups = buildPackagingGroups(ctx, { mergeSameSpec: false });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].items[0].quantity, 5);
  assert.equal(groups[0].items[0].quantity_left, 2);
  assert.equal(groups[0].items[0].quantity_right, 3);
});

test('packaging rule: merge=false keeps quantity consistent with mirrored single-value qty', () => {
  const ctx = createCtx({
    sourceStore: {
      currentOrder: {
        list: [
          {
            bz: '包装A',
            productModelName: 'M6',
            spec: '900*2100',
            mb: '门边E',
            qty: '10',
          },
        ],
      },
      materialRequirements: null,
      hardwareRequirements: null,
    },
    packagingConfig: {
      getPackagingMapping: () => ({ supplierName: '方亮包装', mappings: { 包装A: '外协包装A' } }),
    },
  });

  const groups = buildPackagingGroups(ctx, { mergeSameSpec: false });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].items[0].quantity, 20);
  assert.equal(groups[0].items[0].quantity_left, 10);
  assert.equal(groups[0].items[0].quantity_right, 10);
});
