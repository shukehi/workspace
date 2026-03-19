import test from 'node:test';
import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { api } from '../src/lib/api';
import { useProcurementStore } from '../src/stores/useProcurementStore';

test('bulkUpdateStatus replaces updated orders with normalized payloads so status changes are immediately reactive', async () => {
  setActivePinia(createPinia());
  const store = useProcurementStore();

  store.purchaseOrders = [
    {
      id: 1,
      order_no: 'PO-001',
      supplier: '供应商A',
      category: '包装',
      status: 'cancelled',
      total_amount: 0,
      created_at: '2026-03-10T10:00:00.000Z',
      items: [],
      metadata: { customer_name: '客户A' },
    },
  ] as any;

  const originalOrderRef = store.purchaseOrders[0];
  const originalPut = api.put;
  const originalGet = api.get;

  let getCalled = false;

  api.put = async () => ({
    id: 1,
    order_no: 'PO-001',
    supplier: '供应商A',
    category: '包装',
    status: 'draft',
    total_amount: 0,
    created_at: '2026-03-10T10:00:00.000Z',
    items: [],
    metadata: { customer_name: '客户A' },
  }) as any;

  api.get = (async () => {
    getCalled = true;
    return [];
  }) as any;

  try {
    await store.bulkUpdateStatus([1], 'draft');
  } finally {
    api.put = originalPut;
    api.get = originalGet;
  }

  assert.equal(store.purchaseOrders[0].status, 'draft');
  assert.notEqual(store.purchaseOrders[0], originalOrderRef);
  assert.equal(getCalled, false);
});
