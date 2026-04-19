import { ref, type Ref } from 'vue';
import type { InventoryItem } from '@/types/inventory';
import type { InventoryOutboundPayload } from '@/features/inventory/inventoryStoreFlows';

export function useInventoryOutboundSubmitState(options: {
  selectedInventoryRows: Ref<InventoryItem[]>;
  clearInventorySelection: () => void;
  refreshInventory: () => Promise<void>;
  loadOutbounds: () => Promise<void>;
  createInventoryOutbound: (payload: InventoryOutboundPayload) => Promise<unknown>;
  toast: (payload: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success';
  }) => void;
}) {
  const outboundDialogOpen = ref(false);
  const outboundSaving = ref(false);

  function openOutboundDialog() {
    if (options.selectedInventoryRows.value.length === 0) {
      options.toast({
        title: '请先勾选物料',
        description: '至少选择一项库存物料后才能登记出库',
        variant: 'destructive',
      });
      return;
    }
    outboundDialogOpen.value = true;
  }

  async function handleSubmitOutbound(payload: InventoryOutboundPayload) {
    outboundSaving.value = true;
    try {
      await options.createInventoryOutbound(payload);
      outboundDialogOpen.value = false;
      options.clearInventorySelection();
      await Promise.all([options.refreshInventory(), options.loadOutbounds()]);
      options.toast({
        title: '出库登记成功',
        description: `已生成 ${payload.items.length} 条出库明细`,
        variant: 'success',
      });
    } catch {
      options.toast({
        title: '出库登记失败',
        description: '请检查所选库位余额后重试',
        variant: 'destructive',
      });
    } finally {
      outboundSaving.value = false;
    }
  }

  return {
    outboundDialogOpen,
    outboundSaving,
    openOutboundDialog,
    handleSubmitOutbound,
  };
}
