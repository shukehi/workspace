import { ref, type Ref } from 'vue';
import type { InventoryOutbound } from '@/types/inventory';

export type InventoryOutboundReverseControls = {
  reverseOutboundDialogOpen: Ref<boolean>;
  reverseOutboundTarget: Ref<InventoryOutbound | null>;
  reverseOutboundReason: Ref<string>;
  reverseOutboundRemark: Ref<string>;
  reversingOutbound: Ref<boolean>;
  confirmReverseOutbound: () => Promise<void>;
};

export function useInventoryOutboundReverseState(options: {
  reverseInventoryOutbound: (id: number | string, payload: {
    reason?: string;
    remark?: string;
    outbound_date?: string;
  }) => Promise<unknown>;
  refreshInventory: () => Promise<void>;
  loadOutbounds: () => Promise<void>;
  toast: (payload: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success';
  }) => void;
}) {
  const reverseOutboundDialogOpen = ref(false);
  const reverseOutboundTarget = ref<InventoryOutbound | null>(null);
  const reverseOutboundReason = ref('出库冲销');
  const reverseOutboundRemark = ref('');
  const reversingOutbound = ref(false);

  function requestReverseOutbound(outbound: InventoryOutbound) {
    reverseOutboundTarget.value = outbound;
    reverseOutboundReason.value = '出库冲销';
    reverseOutboundRemark.value = '';
    reverseOutboundDialogOpen.value = true;
  }

  async function confirmReverseOutbound() {
    if (!reverseOutboundTarget.value) return;
    reversingOutbound.value = true;
    try {
      await options.reverseInventoryOutbound(reverseOutboundTarget.value.id, {
        reason: reverseOutboundReason.value.trim() || '出库冲销',
        remark: reverseOutboundRemark.value.trim() || undefined,
        outbound_date: new Date().toISOString(),
      });
      reverseOutboundDialogOpen.value = false;
      reverseOutboundTarget.value = null;
      reverseOutboundReason.value = '出库冲销';
      reverseOutboundRemark.value = '';
      await Promise.all([options.refreshInventory(), options.loadOutbounds()]);
      options.toast({
        title: '出库冲销成功',
        description: '已恢复对应库位余额和总库存',
        variant: 'success',
      });
    } catch {
      options.toast({
        title: '出库冲销失败',
        description: '当前出库单可能已冲销或库存数据异常',
        variant: 'destructive',
      });
    } finally {
      reversingOutbound.value = false;
    }
  }

  return {
    reverseOutboundDialogOpen,
    reverseOutboundTarget,
    reverseOutboundReason,
    reverseOutboundRemark,
    reversingOutbound,
    requestReverseOutbound,
    confirmReverseOutbound,
  };
}
