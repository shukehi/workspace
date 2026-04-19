import type { Ref } from 'vue';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useInventoryPageQueryState } from '@/features/inventory/composables/useInventoryPageQueryState';
import { useInventoryMovementDetailState } from '@/features/inventory/composables/useInventoryMovementDetailState';
import { useInventoryPageListState } from '@/features/inventory/composables/useInventoryPageListState';
import type { InventoryItem } from '@/types/inventory';

type ToastFn = (payload: {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}) => void;

type InventoryStore = ReturnType<typeof useInventoryStore>;

export function useInventoryPageState(options: {
  store: InventoryStore;
  toast: ToastFn;
  initialWarehouseId?: string;
  initialLocationId?: string;
  initialLowStockOnly?: boolean;
}) {
  const {
    activeCategory,
    searchQuery,
    debouncedSearchQuery,
    selectedWarehouseFilter,
    selectedLocationFilter,
    lowStockOnly,
    reconciliationOnly,
    selectedInventoryRows,
    availableInventoryLocations,
    filteredItems,
    reconciliationSummary,
  } = useInventoryPageQueryState({
    activeLocations: () => options.store.activeLocations,
    sortedItems: () => options.store.sortedItems,
    items: () => options.store.items,
    initialWarehouseId: options.initialWarehouseId,
    initialLocationId: options.initialLocationId,
    initialLowStockOnly: options.initialLowStockOnly,
  });

  const {
    selectedMovementItem,
    selectedMovementSummary,
    formatMovementSourceLabel,
    openMovementSheet,
    closeMovementSheet,
  } = useInventoryMovementDetailState({
    sortedMovements: () => options.store.sortedMovements,
    movementsTotal: () => options.store.movementsTotal,
    fetchInventoryMovements: options.store.fetchInventoryMovements,
    toast: options.toast,
  });

  const {
    loadInventoryList,
    handleExportInventory,
    handleExportReconciliation,
  } = useInventoryPageListState({
    fetchInventory: options.store.fetchInventory,
    exportInventoryToCSV: options.store.exportInventoryToCSV,
    exportReconciliationToCSV: options.store.exportReconciliationToCSV,
    toast: options.toast,
    selectedWarehouseFilter,
    selectedLocationFilter,
    lowStockOnly,
    debouncedSearchQuery,
    availableInventoryLocations,
    filteredItems,
  });

  return {
    activeCategory,
    searchQuery,
    debouncedSearchQuery,
    selectedWarehouseFilter,
    selectedLocationFilter,
    lowStockOnly,
    reconciliationOnly,
    selectedInventoryRows,
    selectedMovementItem,
    availableInventoryLocations,
    filteredItems,
    reconciliationSummary,
    selectedMovementSummary,
    formatMovementSourceLabel,
    loadInventoryList,
    handleExportInventory,
    handleExportReconciliation,
    openMovementSheet,
    closeMovementSheet,
  };
}
