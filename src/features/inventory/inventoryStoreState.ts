import { computed, ref } from 'vue';
import type {
  InventoryItem,
  InventoryLocation,
  InventoryMovement,
  InventoryOutbound,
  InventoryReceipt,
  Warehouse,
} from '@/types/inventory';

export function createInventoryStoreState() {
  const items = ref<InventoryItem[]>([]);
  const receipts = ref<InventoryReceipt[]>([]);
  const warehouses = ref<Warehouse[]>([]);
  const locations = ref<InventoryLocation[]>([]);
  const outbounds = ref<InventoryOutbound[]>([]);
  const movements = ref<InventoryMovement[]>([]);

  const loading = ref(false);
  const receiptsLoading = ref(false);
  const locationsLoading = ref(false);
  const outboundsLoading = ref(false);
  const movementsLoading = ref(false);

  const receiptsTotal = ref(0);
  const receiptsPage = ref(1);
  const receiptsPageSize = ref(50);
  const outboundsTotal = ref(0);
  const outboundsPage = ref(1);
  const outboundsPageSize = ref(50);
  const movementsTotal = ref(0);
  const movementsPage = ref(1);
  const movementsPageSize = ref(20);

  const sortedItems = computed(() => {
    return [...items.value].sort((a, b) =>
      (a.stock_quantity - (a.min_stock || 0)) - (b.stock_quantity - (b.min_stock || 0)),
    );
  });

  const lowStockItems = computed(() => {
    return items.value.filter((item) => {
      const minStock = item.min_stock || 0;
      return minStock > 0 && item.stock_quantity <= minStock;
    });
  });

  const sortedReceipts = computed(() => {
    return [...receipts.value].sort((a, b) =>
      new Date(b.receipt_date || b.created_at || 0).getTime()
      - new Date(a.receipt_date || a.created_at || 0).getTime(),
    );
  });

  const sortedOutbounds = computed(() => {
    return [...outbounds.value].sort((a, b) =>
      new Date(b.outbound_date || b.created_at || 0).getTime()
      - new Date(a.outbound_date || a.created_at || 0).getTime(),
    );
  });

  const activeLocations = computed(() => {
    return locations.value.filter((location) => location.status === 'active');
  });

  const sortedMovements = computed(() => {
    return [...movements.value].sort((a, b) =>
      new Date(b.occurred_at || b.created_at || 0).getTime()
      - new Date(a.occurred_at || a.created_at || 0).getTime(),
    );
  });

  return {
    items,
    receipts,
    warehouses,
    locations,
    outbounds,
    movements,
    loading,
    receiptsLoading,
    locationsLoading,
    outboundsLoading,
    movementsLoading,
    receiptsTotal,
    receiptsPage,
    receiptsPageSize,
    outboundsTotal,
    outboundsPage,
    outboundsPageSize,
    movementsTotal,
    movementsPage,
    movementsPageSize,
    sortedItems,
    lowStockItems,
    sortedReceipts,
    sortedOutbounds,
    activeLocations,
    sortedMovements,
  };
}
