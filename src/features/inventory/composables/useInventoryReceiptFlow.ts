import { ref, type Ref } from 'vue';
import {
  useInventoryReceiptAuditState,
  type InventoryReceiptAuditState,
} from '@/features/inventory/composables/useInventoryReceiptAuditState';
import type { InventoryReceiptReversePayload } from '@/features/inventory/inventoryStoreHistoryFlows';
import type { InventoryReceipt } from '@/types/inventory';

type ToastFn = (payload: {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}) => void;

export type InventoryReceiptReverseControls = {
  reverseDialogOpen: Ref<boolean>;
  reverseReceiptTarget: Ref<InventoryReceipt | null>;
  reverseReason: Ref<string>;
  reverseRemark: Ref<string>;
  reverseQuantity: Ref<string>;
  reversing: Ref<boolean>;
  confirmReverseReceipt: () => Promise<void>;
};

type InventoryStoreLike = {
  receipts: InventoryReceipt[];
  fetchAllInventoryReceipts: (params: { orderNo?: string; orderId?: number | string }) => Promise<InventoryReceipt[]>;
  reverseReceipt: (
    id: number,
    payload: InventoryReceiptReversePayload,
  ) => Promise<InventoryReceipt>;
};

export function useInventoryReceiptFlow(options: {
  store: InventoryStoreLike;
  toast: ToastFn;
  loadReceipts: (orderNo?: string) => Promise<void>;
  notifyProcurementRefresh: () => void;
  reloadInventory?: () => Promise<void>;
}) {
  const reverseDialogOpen = ref(false);
  const reverseReceiptTarget = ref<InventoryReceipt | null>(null);
  const reverseReason = ref('entry_error');
  const reverseRemark = ref('');
  const reverseQuantity = ref('');
  const reversing = ref(false);
  const {
    auditReceiptId,
    auditRows,
    selectedReceiptAudit,
    openReceiptAudit,
    closeReceiptAudit,
    reconcileReceiptAudit,
  } = useInventoryReceiptAuditState({
    receipts: () => options.store.receipts,
    fetchAllInventoryReceipts: options.store.fetchAllInventoryReceipts,
    toast: options.toast,
  });

  function requestReverseReceipt(receipt: InventoryReceipt) {
    reverseReceiptTarget.value = receipt;
    reverseReason.value = 'entry_error';
    reverseRemark.value = '';
    reverseQuantity.value = '';
    reverseDialogOpen.value = true;
  }

  function resetReceiptReverseQuantityToMax() {
    reverseQuantity.value = String(reverseReceiptTarget.value?.reversible_quantity || '');
  }

  function resetReverseDialog() {
    reverseDialogOpen.value = false;
    reverseReceiptTarget.value = null;
    reverseRemark.value = '';
    reverseQuantity.value = '';
  }

  async function confirmReverseReceipt(orderNo = '') {
    if (!reverseReceiptTarget.value || !reverseReason.value) return;

    reversing.value = true;
    const quantityValue = reverseQuantity.value.trim();

    try {
      await options.store.reverseReceipt(reverseReceiptTarget.value.id, {
        reversed_at: new Date().toISOString(),
        reverse_reason: reverseReason.value,
        remark: reverseRemark.value.trim() || undefined,
        quantity: quantityValue ? Number(quantityValue) : undefined,
      });
      await Promise.all([
        options.loadReceipts(orderNo),
        options.reloadInventory?.(),
      ]);
      options.toast({
        title: '撤销成功',
        description: `已撤销 ${reverseReceiptTarget.value.order_no} 的入库记录`,
        variant: 'success',
      });
      options.notifyProcurementRefresh();
      auditRows.value = [];
      resetReverseDialog();
    } catch (error: any) {
      const errorCode = String(error?.response?.data?.error || '');
      options.toast({
        title: '撤销失败',
        description: errorCode === 'RECEIPT_ALREADY_REVERSED'
          ? '该入库记录已经撤销过'
          : errorCode === 'RECEIPT_ALREADY_FULLY_REVERSED'
            ? '该入库记录已经全部撤销'
            : errorCode === 'REVERSE_QUANTITY_EXCEEDED'
              ? '本次撤销数量超过剩余可撤销量'
              : errorCode === 'REVERSE_REASON_REQUIRED'
                ? '请选择撤销原因'
                : '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      reversing.value = false;
    }
  }

  return {
    reverseDialogOpen,
    reverseReceiptTarget,
    auditReceiptId,
    auditRows,
    reverseReason,
    reverseRemark,
    reverseQuantity,
    reversing,
    selectedReceiptAudit,
    requestReverseReceipt,
    resetReceiptReverseQuantityToMax,
    confirmReverseReceipt,
    openReceiptAudit,
    closeReceiptAudit,
    reconcileReceiptAudit,
  };
}
