import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLockForkGroups } from '../src/services/po-rules/lockForkRule';
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

test('lock-fork rule: groups by supplier and preserves spec/quantity', () => {
  const ctx: RuleContext = {
    ...baseCtx,
    sourceStore: {
      ...baseCtx.sourceStore,
      hardwareRequirements: {
        lockForks: [
          { type: '锁叉A', spec: '570*301 = 871', quantity: 12 },
          { supplier: '应志友', type: '锁叉B', spec: '580*301 = 881', quantity: 14, remark: '7CM 2050' },
        ],
      },
    },
  };

  const groups = buildLockForkGroups(ctx);
  assert.equal(groups.length, 2);

  const fallback = groups.find((g) => g.supplierName === '未分配五金');
  const assigned = groups.find((g) => g.supplierName === '应志友');
  assert.ok(fallback);
  assert.ok(assigned);
  assert.equal(fallback!.category, '锁叉');
  assert.equal(fallback!.items[0].spec, '570*301 = 871');
  assert.equal(assigned!.items[0].remark, '7CM 2050');
});

test('lock-fork rule: sorts same-door-height rows as upper then lower', () => {
  const ctx: RuleContext = {
    ...baseCtx,
    sourceStore: {
      ...baseCtx.sourceStore,
      hardwareRequirements: {
        lockForks: [
          { supplier: '应志友', type: '双头锁叉 - 上头 P66', spec: '738*301 = 1039', quantity: 20, remark: '7CM 2150' },
          { supplier: '应志友', type: '双头锁叉 - 上头 P66', spec: '688*301 = 989', quantity: 15, remark: '7CM 2050' },
          { supplier: '应志友', type: '双头锁叉 - 下头 P66', spec: '738*313 = 1051', quantity: 20, remark: '7CM 2150' },
          { supplier: '应志友', type: '双头锁叉 - 下头 P66', spec: '688*313 = 1001', quantity: 15, remark: '7CM 2050' },
        ],
      },
    },
  };

  const groups = buildLockForkGroups(ctx);
  assert.equal(groups.length, 1);
  assert.deepEqual(
    groups[0].items.map((item) => `${item.type}|${item.remark}`),
    [
      '双头锁叉 - 上头 P66|7CM 2050',
      '双头锁叉 - 下头 P66|7CM 2050',
      '双头锁叉 - 上头 P66|7CM 2150',
      '双头锁叉 - 下头 P66|7CM 2150',
    ]
  );
});
