import test from 'node:test';
import assert from 'node:assert/strict';
import { nextTick } from 'vue';
import { useProcurementDialogs } from '../src/features/procurement/useProcurementDialogs';
import type { Order } from '../src/types/order';

function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 11,
    order_no: 'PO-2026-0011',
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    total_amount: 1000,
    created_at: '2026-03-09T09:00:00.000Z',
    delivery_date: '2026-03-12T09:00:00.000Z',
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
    },
    ...overrides,
  };
}

test('useProcurementDialogs manages edit and preview orchestration', async () => {
  const toasts: Array<{ title: string; description?: string; variant?: string }> = [];
  const dialogs = useProcurementDialogs({
    store: {
      deleteOrder: async () => {},
      bulkDelete: async () => {},
    },
    toast: (payload) => {
      toasts.push(payload);
    }
  });

  const order = createOrder();
  dialogs.openEdit(order);
  assert.equal(dialogs.isEditDialogOpen.value, true);
  assert.equal(dialogs.editDialogMode.value, 'edit');
  assert.equal(dialogs.selectedOrder.value?.order_no, order.order_no);

  const editedDraft = createOrder({
    id: order.id,
    remark: 'edited',
    items: [{ ...order.items[0], remark: 'edited-item' }]
  });
  dialogs.syncDraftForPreview(editedDraft);
  assert.equal(dialogs.previewOrder.value?.remark, 'edited');

  dialogs.previewDraft(editedDraft);
  assert.equal(dialogs.isPreviewDialogOpen.value, true);
  assert.equal(dialogs.previewOrder.value?.remark, 'edited');

  dialogs.editFromPreview(order);
  assert.equal(dialogs.isPreviewDialogOpen.value, false);
  assert.equal(dialogs.isEditDialogOpen.value, true);

  dialogs.isEditDialogOpen.value = false;
  await nextTick();
  assert.equal(dialogs.previewOrder.value?.order_no, order.order_no);
  assert.equal(toasts.length, 0);
});

test('useProcurementDialogs builds delete confirmations and clears selection after bulk delete', async () => {
  const deletedIds: number[] = [];
  const toasts: Array<{ title: string; description?: string; variant?: string }> = [];
  const dialogs = useProcurementDialogs({
    store: {
      deleteOrder: async (id) => {
        deletedIds.push(id);
      },
      bulkDelete: async (ids) => {
        deletedIds.push(...ids);
      },
    },
    toast: (payload) => {
      toasts.push(payload);
    }
  });

  const orderA = createOrder({ id: 21, order_no: 'PO-21' });
  const orderB = createOrder({ id: 22, order_no: 'PO-22' });

  dialogs.requestDelete(orderA);
  assert.equal(dialogs.confirmState.value.show, true);
  assert.match(dialogs.confirmState.value.message, /PO-21/);
  await dialogs.confirmState.value.onConfirm();
  assert.deepEqual(deletedIds, [21]);
  assert.equal(dialogs.confirmState.value.show, false);

  let selectionCleared = false;
  dialogs.requestBulkDelete([orderA, orderB], () => {
    selectionCleared = true;
  });
  assert.equal(dialogs.confirmState.value.confirmText, '批量删除');
  await dialogs.confirmState.value.onConfirm();
  assert.deepEqual(deletedIds, [21, 21, 22]);
  assert.equal(selectionCleared, true);
  assert.equal(toasts.at(-1)?.title, '批量删除成功');
});

test('useProcurementDialogs blocks edit for arrived and completed orders', () => {
  const toasts: Array<{ title: string; description?: string; variant?: string }> = [];
  const dialogs = useProcurementDialogs({
    store: {
      deleteOrder: async () => {},
      bulkDelete: async () => {},
    },
    toast: (payload) => {
      toasts.push(payload);
    }
  });

  dialogs.openEdit(createOrder({ status: 'arrived' }));
  assert.equal(dialogs.isEditDialogOpen.value, false);
  assert.equal(toasts.at(-1)?.title, '当前订单不可编辑明细');

  dialogs.openEdit(createOrder({ status: 'completed' }));
  assert.equal(dialogs.isEditDialogOpen.value, false);
  assert.equal(toasts.length, 2);

  dialogs.editFromPreview(createOrder({ status: 'arrived' }));
  assert.equal(dialogs.isPreviewDialogOpen.value, false);
  assert.equal(dialogs.isEditDialogOpen.value, false);
  assert.equal(toasts.length, 3);
});
