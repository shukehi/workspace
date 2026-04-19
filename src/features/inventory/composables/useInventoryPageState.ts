import { watch, type Ref } from 'vue';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useInventoryPageQueryState } from '@/features/inventory/composables/useInventoryPageQueryState';
import { useInventoryMovementDetailState } from '@/features/inventory/composables/useInventoryMovementDetailState';
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

  async function loadInventoryList() {
    try {
      await options.store.fetchInventory({
        warehouseId: selectedWarehouseFilter.value || undefined,
        locationId: selectedLocationFilter.value || undefined,
        keyword: debouncedSearchQuery.value.trim() || undefined,
        lowStockOnly: lowStockOnly.value,
      });
    } catch {
      options.toast({
        title: '库存加载失败',
        description: '无法获取最新库存数据，请稍后重试',
        variant: 'destructive',
      });
    }
  }

  function handleExportInventory() {
    if (filteredItems.value.length === 0) {
      options.toast({
        title: '暂无可导出的库存结果',
        variant: 'destructive',
      });
      return;
    }

    options.store.exportInventoryToCSV(filteredItems.value);
    options.toast({
      title: '导出成功',
      description: `已导出 ${filteredItems.value.length} 条库存物料及库位余额`,
      variant: 'success',
    });
  }

  function handleExportReconciliation() {
    const mismatchedItems = filteredItems.value.filter((item) => {
      const locationTotal = item.locations.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
      return Number(item.stock_quantity || 0) !== locationTotal;
    });

    if (mismatchedItems.length === 0) {
      options.toast({
        title: '暂无可导出的对账异常',
        variant: 'destructive',
      });
      return;
    }

    options.store.exportReconciliationToCSV(mismatchedItems);
    options.toast({
      title: '导出成功',
      description: `已导出 ${mismatchedItems.length} 条对账异常物料`,
      variant: 'success',
    });
  }

  watch(selectedWarehouseFilter, (warehouseId) => {
    if (!warehouseId) {
      selectedLocationFilter.value = '';
      return;
    }
    const valid = availableInventoryLocations.value.some((location) => location.id === Number(selectedLocationFilter.value));
    if (!valid) {
      selectedLocationFilter.value = '';
    }
  });

  watch(
    [selectedWarehouseFilter, selectedLocationFilter, lowStockOnly, debouncedSearchQuery],
    () => {
      void loadInventoryList();
    },
  );

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
