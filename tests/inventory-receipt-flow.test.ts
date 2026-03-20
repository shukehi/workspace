import test from 'node:test';
import assert from 'node:assert/strict';
import { reactive } from 'vue';
import { useInventoryReceiptFlow } from '../src/features/inventory/composables/useInventoryReceiptFlow';
import type { InventoryReceipt } from '../src/types/inventory';

function createReceipt(overrides: Partial<InventoryReceipt> = {}): InventoryReceipt {
  return {
    id: 1,
    order_id: 11,
    order_no: 'PO-1001',
    order_item_id: 101,
    direction: 'in',
    source_receipt_id: null,
    material_id: 'MAT-1',
    item_name: '锁芯',
    supplier: '汇成',
    quantity: 10,
    unit: 'pcs',
    receipt_date: '2026-03-13T10:00:00.000Z',
    created_at: '2026-03-13T10:00:00.000Z',
    updated_at: '2026-03-13T10:00:00.000Z',
    operator: '仓管A',
    remark: '',
    reverse_reason: '',
    reversed_quantity: 0,
    reversible_quantity: 10,
    ...overrides,
  } as InventoryReceipt;
}

test('useInventoryReceiptFlow manages audit state and reverse flow', async () => {
  const originalReceipt = createReceipt();
  const reversalReceipt = createReceipt({
    id: 2,
    direction: 'reversal',
    source_receipt_id: 1,
    quantity: -4,
    reverse_reason: 'entry_error',
    reversible_quantity: null,
  });
  const store = reactive({
    receipts: [originalReceipt, reversalReceipt],
    fetchAllInventoryReceipts: async () => [originalReceipt, reversalReceipt],
    reverseReceipt: async () => reversalReceipt,
  });
  const toastCalls: Array<{ title: string; description?: string; variant?: string }> = [];
  const loadCalls: string[] = [];
  let refreshCount = 0;
  let inventoryReloadCount = 0;

  const flow = useInventoryReceiptFlow({
    store,
    toast: (payload) => {
      toastCalls.push(payload);
    },
    loadReceipts: async (orderNo = '') => {
      loadCalls.push(orderNo);
    },
    reloadInventory: async () => {
      inventoryReloadCount += 1;
    },
    notifyProcurementRefresh: () => {
      refreshCount += 1;
    },
  });

  await flow.openReceiptAudit(originalReceipt);
  assert.equal(flow.auditReceiptId.value, 1);
  assert.equal(flow.selectedReceiptAudit.value?.reversals.length, 1);
  assert.equal(flow.selectedReceiptAudit.value?.netQuantity, 6);

  flow.requestReverseReceipt(originalReceipt);
  assert.equal(flow.reverseDialogOpen.value, true);
  assert.equal(flow.reverseReceiptTarget.value?.id, 1);
  flow.reverseReason.value = 'duplicate_receipt';
  flow.reverseRemark.value = '重复登记';
  flow.reverseQuantity.value = '2';

  await flow.confirmReverseReceipt('PO-1001');

  assert.equal(loadCalls[0], 'PO-1001');
  assert.equal(inventoryReloadCount, 1);
  assert.equal(refreshCount, 1);
  assert.equal(flow.reverseDialogOpen.value, false);
  assert.equal(flow.reverseReceiptTarget.value, null);
  assert.equal(flow.reverseRemark.value, '');
  assert.equal(flow.reverseQuantity.value, '');
  assert.equal(flow.auditRows.value.length, 0);
  assert.equal(toastCalls.at(-1)?.title, '撤销成功');

  flow.closeReceiptAudit();
  assert.equal(flow.auditReceiptId.value, null);
  assert.equal(flow.selectedReceiptAudit.value, null);
});
