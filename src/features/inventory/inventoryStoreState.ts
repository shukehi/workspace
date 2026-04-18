import { ref } from 'vue';
import type {
  InventoryItem,
  InventoryLocation,
  InventoryMovement,
  InventoryOutbound,
  InventoryReceipt,
  Warehouse,
} from '@/types/inventory';
import { createInventoryDerivedState } from '@/features/inventory/inventoryStoreDerivedState';

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

  const derivedState = createInventoryDerivedState({
    items,
    receipts,
    locations,
    outbounds,
    movements,
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
    ...derivedState,
  };
}


export type InventoryStoreState = ReturnType<typeof createInventoryStoreState>;
