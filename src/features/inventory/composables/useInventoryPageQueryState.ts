import { computed, ref } from 'vue';
import { refDebounced } from '@vueuse/core';
import type { InventoryItem, InventoryLocation } from '@/types/inventory';

export function useInventoryPageQueryState(options: {
  activeLocations: () => InventoryLocation[];
  sortedItems: () => InventoryItem[];
  items: () => InventoryItem[];
  initialWarehouseId?: string;
  initialLocationId?: string;
  initialLowStockOnly?: boolean;
}) {
  const activeCategory = ref('ALL');
  const searchQuery = ref('');
  const debouncedSearchQuery = refDebounced(searchQuery, 300);
  const selectedWarehouseFilter = ref(options.initialWarehouseId || '');
  const selectedLocationFilter = ref(options.initialLocationId || '');
  const lowStockOnly = ref(Boolean(options.initialLowStockOnly));
  const reconciliationOnly = ref(false);
  const selectedInventoryRows = ref<InventoryItem[]>([]);

  const availableInventoryLocations = computed(() => {
    const warehouseId = Number(selectedWarehouseFilter.value);
    const base = options.activeLocations();
    if (!Number.isInteger(warehouseId) || warehouseId <= 0) return base;
    return base.filter((location) => location.warehouse_id === warehouseId);
  });

  const filteredItems = computed(() => {
    let list = options.sortedItems();
    if (activeCategory.value !== 'ALL') {
      list = list.filter((item) => item.category === activeCategory.value);
    }
    if (reconciliationOnly.value) {
      list = list.filter((item) => {
        const locationTotal = item.locations.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
        return Number(item.stock_quantity || 0) !== locationTotal;
      });
    }
    return list;
  });

  const reconciliationSummary = computed(() => {
    const rows = options.items().map((item) => {
      const locationTotal = item.locations.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
      const diff = Number(item.stock_quantity || 0) - locationTotal;
      return {
        item,
        locationTotal,
        diff,
        hasDiff: diff !== 0,
      };
    });

    const mismatched = rows.filter((row) => row.hasDiff);
    const totalAbsoluteDiff = mismatched.reduce((sum, row) => sum + Math.abs(row.diff), 0);

    return {
      mismatchedCount: mismatched.length,
      totalAbsoluteDiff,
      matchedCount: rows.length - mismatched.length,
    };
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
    availableInventoryLocations,
    filteredItems,
    reconciliationSummary,
  };
}
