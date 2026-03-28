import test from 'node:test';
import assert from 'node:assert/strict';
import { cloneOrderDraft, normalizeOrderDraft } from '../src/features/procurement/orderDraft';
import type { Order } from '../src/types/order';

const sampleOrder: Order = {
  id: 99,
  order_no: 'PO-2026-0305',
  supplier: '测试供应商',
  category: '包装',
  status: 'draft',
  total_amount: 1200,
  created_at: '2026-03-05T12:30:45.000Z',
  delivery_date: '2026-03-20T08:00:00.000Z',
  remark: '整单备注：周五前交付',
  items: [
    {
      id: 1,
      material_id: '',
      name: '外门板',
      model: 'A-100',
      spec: '',
      mb: '',
      quantity_left: 3,
      quantity_right: 4,
      quantity: 7,
      unit: '套',
      remark: '加急'
    }
  ],
  metadata: {
    customer_name: '客户A',
    printColumnWidths: {
      no: 44,
      productModelName: 220,
      spec: 170,
      mb: 74,
      qtyLeft: 74,
      qtyRight: 74,
      remark: 180
    }
  }
};

test('cloneOrderDraft creates deep-cloned copy', () => {
  const cloned = cloneOrderDraft(sampleOrder);
  assert.deepEqual(cloned, sampleOrder);

  cloned.items[0].name = '已修改';
  assert.equal(sampleOrder.items[0].name, '外门板');
});

test('normalizeOrderDraft fills display fields from model/orientation fallbacks', () => {
  const normalized = normalizeOrderDraft(sampleOrder);
  assert.equal(normalized.items[0].spec, 'A-100');
  assert.equal(normalized.items[0].mb, '-');
  assert.equal(normalized.items[0].item_key, 'order-item-1');
});

test('normalizeOrderDraft preserves existing item_key for stable row identity', () => {
  const normalized = normalizeOrderDraft({
    ...sampleOrder,
    items: [
      {
        ...sampleOrder.items[0],
        id: 0,
        item_key: 'draft-item-existing',
      }
    ]
  });

  assert.equal(normalized.items[0].item_key, 'draft-item-existing');
});
