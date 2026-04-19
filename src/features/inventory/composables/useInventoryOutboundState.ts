import { watch, type Ref } from 'vue';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useInventoryOutboundQueryState } from '@/features/inventory/composables/useInventoryOutboundQueryState';
import {
  useInventoryOutboundReverseState,
  type InventoryOutboundReverseControls,
} from '@/features/inventory/composables/useInventoryOutboundReverseState';
import { useInventoryOutboundDetailState } from '@/features/inventory/composables/useInventoryOutboundDetailState';
import { useInventoryOutboundSubmitState } from '@/features/inventory/composables/useInventoryOutboundSubmitState';
import type { InventoryItem, InventoryOutbound } from '@/types/inventory';

type ToastFn = (payload: {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}) => void;

type InventoryStore = ReturnType<typeof useInventoryStore>;

export function useInventoryOutboundState(options: {
  store: InventoryStore;
  toast: ToastFn;
  selectedInventoryRows: Ref<InventoryItem[]>;
  clearInventorySelection: () => void;
  refreshInventory: () => Promise<void>;
}) {
  const {
    outboundNoFilter,
    outboundKeyword,
    debouncedOutboundKeyword,
    outboundOperatorFilter,
    outboundWarehouseFilter,
    outboundLocationFilter,
    outboundStartDate,
    outboundEndDate,
    outboundPage,
    outboundPageSize,
    availableOutboundLocations,
    outboundSummary,
    outboundTotalPages,
  } = useInventoryOutboundQueryState({
    activeLocations: () => options.store.activeLocations,
    sortedOutbounds: () => options.store.sortedOutbounds,
    outboundsTotal: () => options.store.outboundsTotal,
    outboundsPageSize: () => options.store.outboundsPageSize,
  });

  async function loadOutbounds() {
    try {
      await options.store.fetchInventoryOutbounds({
        outboundNo: outboundNoFilter.value.trim() || undefined,
        keyword: debouncedOutboundKeyword.value.trim() || undefined,
        operator: outboundOperatorFilter.value.trim() || undefined,
        warehouseId: outboundWarehouseFilter.value || undefined,
        locationId: outboundLocationFilter.value || undefined,
        startDate: outboundStartDate.value || undefined,
        endDate: outboundEndDate.value || undefined,
        page: outboundPage.value,
        pageSize: outboundPageSize.value,
      });
    } catch {
      options.toast({
        title: '出库记录加载失败',
        description: '无法获取最新出库流水，请稍后重试',
        variant: 'destructive',
      });
    }
  }

  function handleExportOutbounds() {
    options.store.fetchAllInventoryOutbounds({
      outboundNo: outboundNoFilter.value.trim() || undefined,
      keyword: debouncedOutboundKeyword.value.trim() || undefined,
      operator: outboundOperatorFilter.value.trim() || undefined,
      warehouseId: outboundWarehouseFilter.value || undefined,
      locationId: outboundLocationFilter.value || undefined,
      startDate: outboundStartDate.value || undefined,
      endDate: outboundEndDate.value || undefined,
    }).then((rows) => {
      if (rows.length === 0) {
        options.toast({
          title: '暂无可导出的出库记录',
          variant: 'destructive',
        });
        return;
      }

      options.store.exportOutboundsToCSV(rows);
      options.toast({
        title: '导出成功',
        description: `已导出 ${rows.length} 张正式出库单`,
        variant: 'success',
      });
    }).catch(() => {
      options.toast({
        title: '导出失败',
        description: '无法获取完整的正式出库记录，请稍后重试',
        variant: 'destructive',
      });
    });
  }

  const {
    reverseOutboundDialogOpen,
    reverseOutboundTarget,
    reverseOutboundReason,
    reverseOutboundRemark,
    reversingOutbound,
    requestReverseOutbound,
    confirmReverseOutbound,
  } = useInventoryOutboundReverseState({
    reverseInventoryOutbound: options.store.reverseInventoryOutbound,
    refreshInventory: options.refreshInventory,
    loadOutbounds,
    toast: options.toast,
  });

  const {
    selectedOutboundDetail,
    openOutboundDetail,
    closeOutboundDetail,
  } = useInventoryOutboundDetailState({
    fetchInventoryOutbound: options.store.fetchInventoryOutbound,
  });

  const {
    outboundDialogOpen,
    outboundSaving,
    openOutboundDialog,
    handleSubmitOutbound,
  } = useInventoryOutboundSubmitState({
    selectedInventoryRows: options.selectedInventoryRows,
    clearInventorySelection: options.clearInventorySelection,
    refreshInventory: options.refreshInventory,
    loadOutbounds,
    createInventoryOutbound: options.store.createInventoryOutbound,
    toast: options.toast,
  });

  function nextOutboundPage() {
    if (outboundPage.value >= outboundTotalPages.value) return;
    outboundPage.value += 1;
  }

  function prevOutboundPage() {
    if (outboundPage.value <= 1) return;
    outboundPage.value -= 1;
  }

  watch(outboundWarehouseFilter, (warehouseId) => {
    if (!warehouseId) {
      outboundLocationFilter.value = '';
      return;
    }
    const valid = availableOutboundLocations.value.some((location) => location.id === Number(outboundLocationFilter.value));
    if (!valid) {
      outboundLocationFilter.value = '';
    }
  });

  watch(
    [
      outboundNoFilter,
      debouncedOutboundKeyword,
      outboundOperatorFilter,
      outboundWarehouseFilter,
      outboundLocationFilter,
      outboundStartDate,
      outboundEndDate,
    ],
    () => {
      outboundPage.value = 1;
      void loadOutbounds();
    },
  );

  watch([outboundPage, outboundPageSize], () => {
    void loadOutbounds();
  });

  return {
    outboundDialogOpen,
    outboundSaving,
    outboundNoFilter,
    outboundKeyword,
    debouncedOutboundKeyword,
    outboundOperatorFilter,
    outboundWarehouseFilter,
    outboundLocationFilter,
    outboundStartDate,
    outboundEndDate,
    outboundPage,
    outboundPageSize,
    selectedOutboundDetail,
    reverseOutboundDialogOpen,
    reverseOutboundTarget,
    reverseOutboundReason,
    reverseOutboundRemark,
    reversingOutbound,
    availableOutboundLocations,
    outboundSummary,
    outboundTotalPages,
    loadOutbounds,
    handleExportOutbounds,
    requestReverseOutbound,
    openOutboundDialog,
    handleSubmitOutbound,
    confirmReverseOutbound,
    nextOutboundPage,
    prevOutboundPage,
    openOutboundDetail,
    closeOutboundDetail,
  };
}
