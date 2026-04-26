import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDashboardActivityItems,
  buildDashboardStats,
  calculateInventoryValue,
  countActiveOrders,
} from '../src/features/dashboard/dashboardMetrics';

test('calculates inventory value from real stock quantity and material price', () => {
  assert.equal(calculateInventoryValue([
    { stock_quantity: 3, price: 12.5 },
    { stock_quantity: '2', price: '8' },
    { stock_quantity: 5, price: null },
    { stock_quantity: 3, price: 'N/A' },
  ]), 53.5);
});

test('counts only non-completed and non-cancelled orders as active', () => {
  assert.equal(countActiveOrders([
    { status: 'pending' },
    { status: 'processing' },
    { status: 'completed' },
    { status: 'cancelled' },
  ]), 2);
});

test('builds dashboard stats without placeholder inventory multipliers', () => {
  const stats = buildDashboardStats({
    orders: [{ status: 'pending' }, { status: 'completed' }],
    inventory: [{ stock_quantity: 4, price: 7 }],
    formulasCount: 9,
    currencyFormatter: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
  });

  assert.deepEqual(stats.map((item) => item.label), ['待处理订单', '库存总值', '活跃配方']);
  assert.deepEqual(stats.map((item) => item.value), ['1', '$28.00', '9']);
  assert.match(stats[1].desc, /真实估值/);
});

test('builds activity feed from live order, inventory, and formula summaries', () => {
  const items = buildDashboardActivityItems({
    orders: [{ status: 'pending' }],
    inventory: [
      { code: 'MAT-1', stock_quantity: 1, min_stock: 5 },
      { code: 'MAT-2', stock_quantity: 10, min_stock: 5 },
    ],
    formulasCount: 3,
  });

  assert.equal(items[0].title, '低库存：MAT-1');
  assert.equal(items[1].title, '待处理订单：1');
  assert.equal(items[2].title, '可用配方：3');
});
