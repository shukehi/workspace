import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidOrder, normalizeOrderPayload } from '../src/stores/useProcurementStore';

test('normalizeOrderPayload accepts plain order payload and fills stable defaults', () => {
  const normalized = normalizeOrderPayload({
    id: 1,
    order_no: 'PO-001',
    supplier: '方亮包装',
    category: '包装',
    status: 'draft',
    created_at: '2026-03-06T08:15:00.000Z',
    items: [{ id: 1, name: '包装A', model: 'M', quantity: 1, unit: '套' }],
  });

  assert.ok(normalized);
  assert.equal(normalized?.order_no, 'PO-001');
  assert.equal(normalized?.created_at, '2026-03-06T08:15:00.000Z');
  assert.equal(normalized?.total_amount, 0);
  assert.equal(Array.isArray(normalized?.items), true);
  assert.equal(isValidOrder(normalized), true);
});

test('normalizeOrderPayload falls back to updated_at when created_at is missing', () => {
  const normalized = normalizeOrderPayload({
    id: 2,
    order_no: 'PO-002',
    supplier: '应志友',
    category: '锁叉',
    status: 'draft',
    updated_at: '2026-03-06T08:16:00.000Z',
    items: [],
  });

  assert.ok(normalized);
  assert.equal(normalized?.created_at, '2026-03-06T08:16:00.000Z');
  assert.equal(normalized?.total_amount, 0);
  assert.equal(Array.isArray(normalized?.items), true);
});
