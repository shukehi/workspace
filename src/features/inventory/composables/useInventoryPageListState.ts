import { watch, type Ref } from 'vue';
import type { InventoryItem, InventoryLocation } from '@/types/inventory';

export function useInventoryPageListState(options: {
  fetchInventory: (params: {
    warehouseId?: string;
    locationId?: string;
    keyword?: string;
    lowStockOnly?: boolean;
  }) => Promise<void>;
  exportInventoryToCSV: (rows: InventoryItem[]) => void;
  exportReconciliationToCSV: (rows: InventoryItem[]) => void;
  toast: (payload: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success';
  }) => void;
  selectedWarehouseFilter: Ref<string>;
  selectedLocationFilter: Ref<string>;
  lowStockOnly: Ref<boolean>;
  debouncedSearchQuery: Ref<string>;
  availableInventoryLocations: Ref<InventoryLocation[]>;
  filteredItems: Ref<InventoryItem[]>;
}) {
  async function loadInventoryList() {
    try {
      await options.fetchInventory({
        warehouseId: options.selectedWarehouseFilter.value || undefined,
        locationId: options.selectedLocationFilter.value || undefined,
        keyword: options.debouncedSearchQuery.value.trim() || undefined,
        lowStockOnly: options.lowStockOnly.value,
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
    if (options.filteredItems.value.length === 0) {
      options.toast({
        title: '暂无可导出的库存结果',
        variant: 'destructive',
      });
      return;
    }

    options.exportInventoryToCSV(options.filteredItems.value);
    options.toast({
      title: '导出成功',
      description: `已导出 ${options.filteredItems.value.length} 条库存物料及库位余额`,
      variant: 'success',
    });
  }

  function handleExportReconciliation() {
    const mismatchedItems = options.filteredItems.value.filter((item) => {
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

    options.exportReconciliationToCSV(mismatchedItems);
    options.toast({
      title: '导出成功',
      description: `已导出 ${mismatchedItems.length} 条对账异常物料`,
      variant: 'success',
    });
  }

  watch(options.selectedWarehouseFilter, (warehouseId) => {
    if (!warehouseId) {
      options.selectedLocationFilter.value = '';
      return;
    }
    const valid = options.availableInventoryLocations.value.some((location) => location.id === Number(options.selectedLocationFilter.value));
    if (!valid) {
      options.selectedLocationFilter.value = '';
    }
  });

  watch(
    [options.selectedWarehouseFilter, options.selectedLocationFilter, options.lowStockOnly, options.debouncedSearchQuery],
    () => {
      void loadInventoryList();
    },
  );

  return {
    loadInventoryList,
    handleExportInventory,
    handleExportReconciliation,
  };
}
