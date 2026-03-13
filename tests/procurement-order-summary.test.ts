import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFacetCountsFromOrders,
  buildSummaryFromOrders,
} from '../src/features/procurement/model/orderSummary';
import type { Order } from '../src/types/order';

function createOrder(overrides: Partial<Order>): Order {
  return {
    id: 1,
    order_no: 'PO-001',
    supplier: '方亮包装',
    category: '包装',
    status: 'draft',
    total_amount: 100,
    created_at: '2026-03-09T10:00:00.000Z',
    items: [
      {
        id: 1,
        material_id: 'm-1',
        name: '包装箱',
        model: 'BX-01',
        quantity: 1,
        unit: '套',
      },
    ],
    ...overrides,
  };
}

test('buildSummaryFromOrders computes aggregate totals deterministically', () => {
  const orders = [
    createOrder({ id: 1, status: 'draft', total_amount: 120 }),
    createOrder({ id: 2, status: 'arrived', total_amount: 80 }),
    createOrder({ id: 3, status: 'completed', total_amount: 60, created_at: '2026-03-08T10:00:00.000Z' }),
  ];

  assert.deepEqual(buildSummaryFromOrders(orders, '2026-03-09'), {
    totalAmount: 260,
    pendingCount: 2,
    completedCount: 1,
    todayCount: 2,
  });
});

test('buildFacetCountsFromOrders groups by status and category', () => {
  const orders = [
    createOrder({ id: 1, status: 'draft', category: '包装' }),
    createOrder({ id: 2, status: 'draft', category: '包装' }),
    createOrder({ id: 3, status: 'arrived', category: '锁叉' }),
  ];

  assert.deepEqual(buildFacetCountsFromOrders(orders), {
    statusCounts: {
      ALL: 3,
      draft: 2,
      arrived: 1,
    },
    categoryCounts: {
      ALL: 3,
      包装: 2,
      锁叉: 1,
    },
    riskCounts: {
      ALL: 3,
      RISK: 0,
      MANUAL: 0,
    },
  });
});
