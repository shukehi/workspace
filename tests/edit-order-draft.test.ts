import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapOrderDraft, createEmptyItem, createEmptyOrderDraft } from '../src/features/procurement/editOrderDraft';
import type { Order } from '../src/types/order';

test('createEmptyItem creates category-specific packaging fields', () => {
  const packagingItem = createEmptyItem('packaging');
  assert.match(String(packagingItem.item_key), /^draft-item-/);
  assert.equal(packagingItem.unit, '套');
  assert.equal(packagingItem.internal_name, '');
  assert.equal(packagingItem.quantity_left, 0);

  const handleItem = createEmptyItem('handle');
  assert.equal(handleItem.unit, '付');
  assert.equal(handleItem.type, '');
});

test('createEmptyOrderDraft seeds packaging order defaults', () => {
  const draft = createEmptyOrderDraft('包装');
  assert.equal(draft.category, '包装');
  assert.equal(draft.status, 'draft');
  assert.equal(Array.isArray(draft.items), true);
  assert.equal(draft.items.length, 1);
  assert.match(draft.order_no, /^PO-MANUAL-/);
  assert.ok(draft.metadata?.printColumnWidths);
  assert.equal(draft.metadata?.aggregateSideQuantities, false);
});

test('bootstrapOrderDraft preserves edit payload and resolved widths', () => {
  const order: Order = {
    id: 88,
    order_no: 'PO-88',
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    total_amount: 200,
    created_at: '2026-03-09T10:00:00.000Z',
    delivery_date: '2026-03-12T10:00:00.000Z',
    remark: '',
    items: [
      {
        id: 1,
        material_id: 'm1',
        internal_name: '3层黄卡美+C单瓦纸箱',
        external_name: '美+C单瓦',
        name: '纸箱',
        model: '1050',
        quantity: 2,
        quantity_left: 1,
        quantity_right: 1,
        unit: '套',
      }
    ],
    metadata: {
      customer_name: '客户A',
      internal_name: '3层黄卡美+C单瓦纸箱',
      external_name: '美+C单瓦',
      printColumnWidths: {
        no: 40,
        productModelName: 200,
        spec: 150,
        mb: 80,
        qtyLeft: 70,
        qtyRight: 70,
        remark: 160,
      },
    },
  };

  const { draft, widths } = bootstrapOrderDraft({ mode: 'edit', order });
  assert.equal(draft.order_no, 'PO-88');
  assert.equal(draft.metadata?.printColumnWidths?.productModelName, widths.productModelName);
  assert.equal(typeof widths.remark, 'number');
});
