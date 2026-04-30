import test from 'node:test';
import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { api } from '../src/lib/api';
import { useProcurementStore } from '../src/stores/useProcurementStore';

function createPaginatedPayload() {
  return {
    rows: [
      {
        id: 1,
        order_no: 'PO-001',
        supplier: '供应商A',
        category: '包装',
        status: 'arrived',
        total_amount: 0,
        created_at: '2026-04-09T08:00:00.000Z',
        items: [],
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
    summary: { totalAmount: 0, pendingCount: 0, completedCount: 0, todayCount: 0 },
    facets: {
      statusCounts: { ALL: 1, arrived: 1 },
      categoryCounts: { ALL: 1, packaging: 1 },
      riskCounts: { ALL: 1, RISK: 0, MANUAL: 0 },
    },
  };
}

test('fetchOrders does not keep stale keyword/orderNo after filters are cleared', async () => {
  setActivePinia(createPinia());
  const store = useProcurementStore();
  const originalGet = api.get;
  const paramsCalls: Array<Record<string, unknown>> = [];

  api.get = (async (_url: string, config?: { params?: Record<string, unknown> }) => {
    paramsCalls.push({ ...(config?.params || {}) });
    return createPaginatedPayload() as any;
  }) as any;

  try {
    await store.fetchOrders({
      page: 1,
      pageSize: 20,
      status: 'arrived',
      keyword: 'PO-001',
      orderNo: 'PO-001',
    } as any);

    await store.fetchOrders({
      page: 1,
      pageSize: 20,
      status: 'arrived',
    } as any);
  } finally {
    api.get = originalGet;
  }

  assert.equal(paramsCalls.length, 2);
  assert.equal(paramsCalls[0].keyword, 'PO-001');
  assert.equal(paramsCalls[0].orderNo, 'PO-001');
  assert.equal('keyword' in paramsCalls[1], false);
  assert.equal('orderNo' in paramsCalls[1], false);
});

test('fetchOrders ignores shared API cancellation errors without surfacing a failure', async () => {
  setActivePinia(createPinia());
  const store = useProcurementStore();
  const originalGet = api.get;

  api.get = (async () => {
    throw { code: 'ERR_CANCELED', message: 'request canceled' };
  }) as any;

  try {
    await store.fetchOrders({ page: 1, pageSize: 20 } as any);
  } finally {
    api.get = originalGet;
  }

  assert.equal(store.loading, false);
});
