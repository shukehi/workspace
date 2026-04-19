import type { Ref } from 'vue';
import type { InventoryReceiptAuditState } from '@/features/inventory/composables/useInventoryReceiptFlow';
import { useInventoryStore } from '@/stores/useInventoryStore';
import type { InventoryItem, InventoryOutbound } from '@/types/inventory';

type ToastFn = (payload: {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}) => void;

type InventoryStore = ReturnType<typeof useInventoryStore>;

export function useInventoryDetailPanels(options: {
  store: InventoryStore;
  toast: ToastFn;
  selectedMovementItem: Ref<InventoryItem | null>;
  selectedOutboundDetail: Ref<InventoryOutbound | null>;
  openMovementSheet: (item: InventoryItem) => Promise<void>;
  closeMovementSheet: () => void;
  closeOutboundDetail: () => void;
  selectedReceiptAudit: Ref<InventoryReceiptAuditState | null>;
  closeReceiptAudit: () => void;
}) {
  async function handleOpenOutboundDetail(outbound: InventoryOutbound) {
    options.selectedOutboundDetail.value = await options.store.fetchInventoryOutbound(outbound.id);
  }

  async function handleOpenMovementDetail(item: InventoryItem) {
    await options.openMovementSheet(item);
  }

  return {
    handleOpenOutboundDetail,
    handleOpenMovementDetail,
    closeMovementSheet: options.closeMovementSheet,
    closeOutboundDetail: options.closeOutboundDetail,
    closeReceiptAudit: options.closeReceiptAudit,
  };
}
