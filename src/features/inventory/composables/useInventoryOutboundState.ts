import type { Ref } from 'vue';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useInventoryOutboundQueryState } from '@/features/inventory/composables/useInventoryOutboundQueryState';
import { useInventoryOutboundReverseState } from '@/features/inventory/composables/useInventoryOutboundReverseState';
import { useInventoryOutboundDetailState } from '@/features/inventory/composables/useInventoryOutboundDetailState';
import { useInventoryOutboundListState } from '@/features/inventory/composables/useInventoryOutboundListState';
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

  const {
    loadOutbounds,
    handleExportOutbounds,
    nextOutboundPage,
    prevOutboundPage,
  } = useInventoryOutboundListState({
    fetchInventoryOutbounds: options.store.fetchInventoryOutbounds,
    fetchAllInventoryOutbounds: options.store.fetchAllInventoryOutbounds,
    exportOutboundsToCSV: options.store.exportOutboundsToCSV,
    toast: options.toast,
    outboundNoFilter,
    debouncedOutboundKeyword,
    outboundOperatorFilter,
    outboundWarehouseFilter,
    outboundLocationFilter,
    outboundStartDate,
    outboundEndDate,
    outboundPage,
    outboundPageSize,
    outboundTotalPages,
    availableOutboundLocations,
  });

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
