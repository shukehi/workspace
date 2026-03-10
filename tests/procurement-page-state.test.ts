import test from 'node:test';
import assert from 'node:assert/strict';
import { useProcurementPageState } from '../src/features/procurement/useProcurementPageState';
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
      }
    ],
    ...overrides,
  };
}

test('useProcurementPageState computes summary, filters, and empty text', () => {
  const orders = [
    createOrder({ id: 1, order_no: 'PO-PKG-001', category: '包装', status: 'draft', total_amount: 120 }),
    createOrder({ id: 2, order_no: 'PO-LOCK-002', category: '锁叉', status: 'completed', total_amount: 80, supplier: '五金厂' }),
    createOrder({ id: 3, order_no: 'PO-CYL-003', category: '锁芯', status: 'submitted', total_amount: 60, supplier: '锁芯厂' }),
  ];

  const state = useProcurementPageState({
    loading: false,
    purchaseOrders: orders,
    sortedOrders: orders,
  });

  assert.equal(state.summaryStats.value.totalAmount, 260);
  assert.equal(state.summaryStats.value.pendingCount, 2);
  assert.equal(state.summaryStats.value.completedCount, 1);
  assert.equal(state.visibleOrderCount.value, 3);
  assert.equal(state.tableEmptyText.value, '暂无采购订单数据');
  assert.equal(state.hasActiveFilters.value, false);

  state.activeCategory.value = '锁叉';
  assert.equal(state.filteredOrders.value.length, 1);
  assert.equal(state.filteredOrders.value[0].order_no, 'PO-LOCK-002');
  assert.equal(state.hasActiveFilters.value, true);

  state.searchQuery.value = '锁芯厂';
  assert.equal(state.filteredOrders.value.length, 0);
  assert.equal(state.tableEmptyText.value, '没有匹配到订单');

  state.resetFilters();
  assert.equal(state.activeCategory.value, 'ALL');
  assert.equal(state.searchQuery.value, '');
  assert.equal(state.filteredOrders.value.length, 3);
});

test('useProcurementPageState tracks selection and loading empty text', () => {
  const order = createOrder({});
  const state = useProcurementPageState({
    loading: true,
    purchaseOrders: [order],
    sortedOrders: [order],
  });

  state.onSelectionChange([order]);
  assert.equal(state.selectedRows.value.length, 1);
  assert.equal(state.tableEmptyText.value, '加载中...');

  state.clearSelection();
  assert.equal(state.selectedRows.value.length, 0);
});
