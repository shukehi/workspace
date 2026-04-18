import { computed, type Ref } from 'vue';
import type {
  InventoryItem,
  InventoryLocation,
  InventoryMovement,
  InventoryOutbound,
  InventoryReceipt,
} from '@/types/inventory';

export function createInventoryDerivedState(state: {
  items: Ref<InventoryItem[]>;
  receipts: Ref<InventoryReceipt[]>;
  locations: Ref<InventoryLocation[]>;
  outbounds: Ref<InventoryOutbound[]>;
  movements: Ref<InventoryMovement[]>;
}) {
  const sortedItems = computed(() => {
    return [...state.items.value].sort((a, b) =>
      (a.stock_quantity - (a.min_stock || 0)) - (b.stock_quantity - (b.min_stock || 0)),
    );
  });

  const lowStockItems = computed(() => {
    return state.items.value.filter((item) => {
      const minStock = item.min_stock || 0;
      return minStock > 0 && item.stock_quantity <= minStock;
    });
  });

  const sortedReceipts = computed(() => {
    return [...state.receipts.value].sort((a, b) =>
      new Date(b.receipt_date || b.created_at || 0).getTime()
      - new Date(a.receipt_date || a.created_at || 0).getTime(),
    );
  });

  const sortedOutbounds = computed(() => {
    return [...state.outbounds.value].sort((a, b) =>
      new Date(b.outbound_date || b.created_at || 0).getTime()
      - new Date(a.outbound_date || a.created_at || 0).getTime(),
    );
  });

  const activeLocations = computed(() => {
    return state.locations.value.filter((location) => location.status === 'active');
  });

  const sortedMovements = computed(() => {
    return [...state.movements.value].sort((a, b) =>
      new Date(b.occurred_at || b.created_at || 0).getTime()
      - new Date(a.occurred_at || a.created_at || 0).getTime(),
    );
  });

  return {
    sortedItems,
    lowStockItems,
    sortedReceipts,
    sortedOutbounds,
    activeLocations,
    sortedMovements,
  };
}
