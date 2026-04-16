import { computed, ref, watch, type Ref } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useInventoryStore } from '@/stores/useInventoryStore';
import type { InventoryItem, InventoryMovement } from '@/types/inventory';

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
  const activeCategory = ref('ALL');
  const searchQuery = ref('');
  const debouncedSearchQuery = refDebounced(searchQuery, 300);
  const selectedWarehouseFilter = ref(options.initialWarehouseId || '');
  const selectedLocationFilter = ref(options.initialLocationId || '');
  const lowStockOnly = ref(Boolean(options.initialLowStockOnly));
  const reconciliationOnly = ref(false);
  const selectedInventoryRows = ref<InventoryItem[]>([]);
  const selectedMovementItem = ref<InventoryItem | null>(null);

  const availableInventoryLocations = computed(() => {
    const warehouseId = Number(selectedWarehouseFilter.value);
    const base = options.store.activeLocations;
    if (!Number.isInteger(warehouseId) || warehouseId <= 0) return base;
    return base.filter((location) => location.warehouse_id === warehouseId);
  });

  const filteredItems = computed(() => {
    let list = options.store.sortedItems;
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
    const rows = options.store.items.map((item) => {
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

  const selectedMovementSummary = computed(() => {
    if (!selectedMovementItem.value) return null;
    const rows = options.store.sortedMovements;
    const netChange = rows.reduce((sum, row) => sum + Number(row.delta_quantity || 0), 0);
    const lastMovement = rows[0];
    return {
      total: options.store.movementsTotal,
      netChange,
      lastOccurredAt: lastMovement?.occurred_at || lastMovement?.created_at || '',
    };
  });

  function formatMovementSourceLabel(sourceType: InventoryMovement['source_type']) {
    if (sourceType === 'manual_adjustment') return '手工调账';
    if (sourceType === 'receipt_in') return '采购入库';
    if (sourceType === 'receipt_reversal') return '入库撤销';
    if (sourceType === 'outbound') return '正式出库';
    if (sourceType === 'outbound_reversal') return '出库冲销';
    return sourceType || '-';
  }

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

  async function openMovementSheet(item: InventoryItem) {
    selectedMovementItem.value = item;
    try {
      await options.store.fetchInventoryMovements({
        materialId: item.id,
        page: 1,
        pageSize: 20,
      });
    } catch {
      selectedMovementItem.value = null;
      options.toast({
        title: '轨迹加载失败',
        description: '无法获取该物料的库存变动记录，请稍后重试',
        variant: 'destructive',
      });
    }
  }

  function closeMovementSheet() {
    selectedMovementItem.value = null;
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
