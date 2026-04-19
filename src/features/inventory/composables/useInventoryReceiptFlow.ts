import {
  useInventoryReceiptAuditState,
  type InventoryReceiptAuditState,
} from '@/features/inventory/composables/useInventoryReceiptAuditState';
import {
  useInventoryReceiptReverseState,
  type InventoryReceiptReverseControls,
} from '@/features/inventory/composables/useInventoryReceiptReverseState';
import type { InventoryReceiptReversePayload } from '@/features/inventory/inventoryStoreHistoryFlows';
import type { InventoryReceipt } from '@/types/inventory';

type ToastFn = (payload: {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}) => void;

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

  const {
    reverseDialogOpen,
    reverseReceiptTarget,
    reverseReason,
    reverseRemark,
    reverseQuantity,
    reversing,
    requestReverseReceipt,
    resetReceiptReverseQuantityToMax,
    confirmReverseReceipt,
  } = useInventoryReceiptReverseState({
    reverseReceipt: options.store.reverseReceipt,
    loadReceipts: options.loadReceipts,
    reloadInventory: options.reloadInventory,
    notifyProcurementRefresh: options.notifyProcurementRefresh,
    onReversed: () => {
      auditRows.value = [];
    },
    toast: options.toast,
  });

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
