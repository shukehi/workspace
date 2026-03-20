import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFullStockInItems,
  buildSelectedStockInItems,
  buildStockInDraftItems,
} from '../src/features/procurement/stockInDraft';
import type { Order } from '../src/types/order';

function createOrder(): Order {
  return {
    id: 51,
    order_no: 'PO-51',
    supplier: '测试供应商',
    category: '包装',
    status: 'arrived',
    total_amount: 100,
    created_at: '2026-03-20T10:00:00.000Z',
    items: [
      {
        id: 1,
        item_key: 'item-1',
        material_id: 'm-1',
        name: '纸箱A',
        model: 'A',
        quantity: 10,
        ordered_quantity: 12,
        received_quantity: 2,
        unit: '套',
      },
      {
        id: 2,
        item_key: 'item-2',
        material_id: 'm-2',
        name: '纸箱B',
        model: 'B',
        quantity: 5,
        received_quantity: 5,
        unit: '套',
      },
      {
        id: 3,
        item_key: 'item-3',
        material_id: 'm-3',
        name: '纸箱C',
        model: 'C',
        quantity: 4,
        received_quantity: 1,
        unit: '套',
      },
    ],
  };
}

test('stock-in draft helpers derive remaining rows and quick-fill payloads', () => {
  const draftItems = buildStockInDraftItems(createOrder());

  assert.equal(draftItems.length, 2);
  assert.deepEqual(
    draftItems.map((item) => ({ id: item.order_item_id, remaining: item.remaining })),
    [
      { id: 1, remaining: 10 },
      { id: 3, remaining: 3 },
    ]
  );

  draftItems[0].quantity = '4';
  draftItems[1].quantity = '';
  assert.deepEqual(buildSelectedStockInItems(draftItems), [
    { order_item_id: 1, item_key: 'item-1', quantity: 4 },
  ]);

  assert.deepEqual(buildFullStockInItems(draftItems), [
    { order_item_id: 1, item_key: 'item-1', quantity: 10 },
    { order_item_id: 3, item_key: 'item-3', quantity: 3 },
  ]);
});
