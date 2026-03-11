import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesOrderRiskFilter, resolveOrderRisk } from '../src/features/procurement/orderRisk';
import type { Order } from '../src/types/order';

function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    order_no: 'PO-001',
    supplier: '测试供应商',
    category: '锁具',
    status: 'draft',
    total_amount: 0,
    created_at: '2026-03-10T10:00:00.000Z',
    items: [],
    ...overrides,
  };
}

test('resolveOrderRisk identifies manual-review orders as high risk', () => {
  const order = createOrder({
    items: [
      {
        id: 1,
        material_id: 'm-1',
        supplier: '待人工处理',
        name: '锁具A',
        model: 'LK-1',
        quantity: 1,
        unit: '把',
        remark: '',
      }
    ]
  });

  const risk = resolveOrderRisk(order);
  assert.equal(risk.level, 'high');
  assert.equal(risk.reason, '存在待人工处理明细');
  assert.equal(matchesOrderRiskFilter(order, 'RISK'), true);
  assert.equal(matchesOrderRiskFilter(order, 'MANUAL'), true);
});

test('resolveOrderRisk identifies confirmation-needed orders as medium risk', () => {
  const order = createOrder({
    items: [
      {
        id: 1,
        material_id: 'm-2',
        supplier: '正常供应商',
        name: '拉手A',
        model: 'LS-1',
        quantity: 1,
        unit: '付',
        remark: '待确认：门厚异常',
      }
    ]
  });

  const risk = resolveOrderRisk(order);
  assert.equal(risk.level, 'medium');
  assert.equal(matchesOrderRiskFilter(order, 'RISK'), true);
  assert.equal(matchesOrderRiskFilter(order, 'MANUAL'), false);
});
