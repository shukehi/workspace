import test from 'node:test';
import assert from 'node:assert/strict';
import { useProcurementPageState } from '../src/features/procurement/useProcurementPageState';
import type { Order } from '../src/types/order';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

test('useProcurementPageState computes summary, filters, and empty text', async () => {
  const orders = [
    createOrder({ id: 1, order_no: 'PO-PKG-001', category: '包装', status: 'draft', total_amount: 120 }),
    createOrder({
      id: 2,
      order_no: 'PO-LOCK-002',
      category: '锁叉',
      status: 'arrived',
      total_amount: 80,
      supplier: '五金厂',
      items: [{ id: 2, material_id: 'm-2', supplier: '待人工处理', name: '锁叉A', model: 'LC-1', quantity: 1, unit: '个' }]
    }),
    createOrder({
      id: 3,
      order_no: 'PO-CYL-003',
      category: '锁芯',
      status: 'submitted',
      total_amount: 60,
      supplier: '锁芯厂',
      items: [{ id: 3, material_id: 'm-3', supplier: '锁芯厂', name: '锁芯A', model: 'LX-1', quantity: 1, unit: '套', remark: '待确认：偏心缺失' }]
    }),
    createOrder({ id: 4, order_no: 'PO-HW-004', category: 'hardware', status: 'processing', total_amount: 40, supplier: '配件厂' }),
    createOrder({ id: 5, order_no: 'PO-CAN-005', category: '锁具', status: 'cancelled', total_amount: 0, supplier: '锁具厂' }),
  ];

  const state = useProcurementPageState({
    loading: false,
    purchaseOrders: orders,
    sortedOrders: orders,
  });

  assert.equal(state.summaryStats.value.totalAmount, 300);
  assert.equal(state.summaryStats.value.pendingCount, 4);
  assert.equal(state.summaryStats.value.completedCount, 0);
  assert.equal(state.visibleOrderCount.value, 5);
  assert.equal(state.tableEmptyText.value, '暂无采购订单数据');
  assert.equal(state.hasActiveFilters.value, false);

  assert.deepEqual(
    state.statusOptions.value,
    [
      { id: 'ALL', label: '全部订单', count: 5 },
      { id: 'draft', label: '草稿', count: 1 },
      { id: 'submitted', label: '已提交', count: 1 },
      { id: 'processing', label: '处理中', count: 1 },
      { id: 'arrived', label: '已到货', count: 1 },
      { id: 'completed', label: '已入库', count: 0 },
      { id: 'cancelled', label: '已取消', count: 1 },
    ]
  );
  assert.deepEqual(
    state.categoryOptions.value.map((item) => item.label),
    ['全部类别', '包装材料', '锁芯', '锁具', '拉手', '锁叉', '五金/配件']
  );
  assert.deepEqual(
    state.riskOptions.value,
    [
      { id: 'ALL', label: '全部', count: 5 },
      { id: 'RISK', label: '风险订单', count: 2 },
      { id: 'MANUAL', label: '待人工处理', count: 1 },
    ]
  );

  state.activeStatus.value = 'arrived';
  assert.equal(state.filteredOrders.value.length, 1);
  assert.equal(state.filteredOrders.value[0].order_no, 'PO-LOCK-002');
  assert.equal(state.hasActiveFilters.value, true);

  state.activeStatus.value = 'cancelled';
  assert.equal(state.filteredOrders.value.length, 1);
  assert.equal(state.filteredOrders.value[0].order_no, 'PO-CAN-005');

  state.resetFilters();
  state.setFilterPreset({ status: 'PENDING' });
  assert.equal(state.filteredOrders.value.length, 4);
  assert.deepEqual(
    state.filteredOrders.value.map((order) => order.order_no),
    ['PO-PKG-001', 'PO-LOCK-002', 'PO-CYL-003', 'PO-HW-004']
  );

  state.resetFilters();
  state.setFilterPreset({ createdDate: '2026-03-09' });
  assert.equal(state.filteredOrders.value.length, 5);

  state.resetFilters();
  state.setFilterPreset({ createdDate: '2026-03-10' });
  assert.equal(state.filteredOrders.value.length, 0);

  state.resetFilters();
  state.activeCategory.value = 'lock';
  assert.equal(state.filteredOrders.value.length, 1);
  assert.equal(state.filteredOrders.value[0].order_no, 'PO-LOCK-002');
  assert.equal(state.hasActiveFilters.value, true);

  state.resetFilters();
  state.activeStatus.value = 'submitted';
  state.activeRiskFilter.value = 'RISK';
  assert.equal(state.filteredOrders.value.length, 1);
  assert.deepEqual(
    state.filteredOrders.value.map((order) => order.order_no),
    ['PO-CYL-003']
  );

  state.resetFilters();
  state.activeRiskFilter.value = 'MANUAL';
  assert.equal(state.filteredOrders.value.length, 1);
  assert.equal(state.filteredOrders.value[0].order_no, 'PO-LOCK-002');

  state.activeRiskFilter.value = 'ALL';
  state.searchQuery.value = '锁芯厂';
  await sleep(350);
  assert.equal(state.filteredOrders.value.length, 1);
  state.searchQuery.value = '不存在的供应商';
  await sleep(350);
  assert.equal(state.filteredOrders.value.length, 0);
  assert.equal(state.tableEmptyText.value, '没有匹配到订单');

  state.resetFilters();
  await sleep(350);
  assert.equal(state.activeStatus.value, 'ALL');
  assert.equal(state.activeCategory.value, 'ALL');
  assert.equal(state.activeRiskFilter.value, 'ALL');
  assert.equal(state.activeCreatedDate.value, '');
  assert.equal(state.searchQuery.value, '');
  assert.equal(state.filteredOrders.value.length, 5);
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
