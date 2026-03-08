import test from 'node:test';
import assert from 'node:assert/strict';
import { POGenerator } from '../src/services/poGenerator';
import type { RuleContext } from '../src/services/po-rules/types';

function createDeps(): RuleContext {
  return {
    sourceStore: {
      currentOrder: {
        code: 'CT-001',
        customerName: '客户A',
        list: [
          { bz: '包装A', productModelName: 'P1', spec: '900*2050', mb: '门边A', qty: '2/2' },
        ],
      },
      materialRequirements: {
        requirements: {
          m1: {
            supplierName: '原料供应商',
            materials: [{ materialId: 'RM-001', totalUsage: 2.4 }],
          },
        },
      },
      hardwareRequirements: {
        cylinders: [{ supplier: '忠恒', type: '锁芯A', eccentricity: '34.5*55.5', quantity: 10 }],
        handles: [{ supplier: '供应商X', type: 'DJ-6847双活供应商名', spec: '10公分配件包', quantityLeft: 2, quantityRight: 4, quantity: 6 }],
        lockForks: [{ supplier: '应志友', type: '锁叉A', spec: '570*301 = 871', quantity: 12 }],
        packaging: {
          p1: {
            internalName: '包装A',
            externalName: '外协包装A',
            productModelName: 'P1',
            spec: '900*2050',
            mb: '门边A',
            totalQty: 4,
            totalLeft: 2,
            totalRight: 2,
            supplierName: '方亮包装',
          },
        },
      },
    },
    configLoader: {
      getPackagingMapping: () => ({ supplierName: '方亮包装', mappings: { 包装A: '外协包装A' } }),
    },
    packagingMatcher: {
      syncFromMapping: () => {},
      match: (name: string) => `${name}(匹配)`,
      consumeUnmatchedSummary: () => [],
    },
  };
}

test('po generator integration: compose groups and create selected category orders', () => {
  const deps = createDeps();
  const generator = new POGenerator(deps);

  const proposal = generator.generateProposal({ mergeSameSpec: true });
  const proposalKeys = proposal.map((g) => `${g.category}_${g.supplierName}`).sort();
  assert.deepEqual(proposalKeys, [
    '包装_方亮包装',
    '拉手_供应商X',
    '锁叉_应志友',
    '锁芯_忠恒',
    '颜色_原料供应商',
  ]);

  const orders = generator.createOrders([
    { category: '包装', supplier: '方亮包装' },
    { category: '锁芯', supplier: '忠恒' },
  ], { mergeSameSpec: true });

  assert.equal(orders.length, 2);
  orders.forEach((order) => {
    assert.equal(order.order_no, 'PO-CT-001');
    assert.equal(order.metadata?.customer_name, '客户A');
    assert.equal(order.status, 'draft');
  });

  const packagingOrder = orders.find((o) => o.category === '包装');
  assert.ok(packagingOrder);
  assert.equal(packagingOrder!.items[0].remark, '');
  assert.equal(packagingOrder!.items[0].quantity_left, 2);
  assert.equal(packagingOrder!.items[0].quantity_right, 2);
});
