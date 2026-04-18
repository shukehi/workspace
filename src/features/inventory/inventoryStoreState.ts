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
import { createInventoryMetaState } from '@/features/inventory/inventoryStoreMetaState';

export function createInventoryStoreState() {
  const items = ref<InventoryItem[]>([]);
  const receipts = ref<InventoryReceipt[]>([]);
  const warehouses = ref<Warehouse[]>([]);
  const locations = ref<InventoryLocation[]>([]);
  const outbounds = ref<InventoryOutbound[]>([]);
  const movements = ref<InventoryMovement[]>([]);

  const metaState = createInventoryMetaState();

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
    ...metaState,
    ...derivedState,
  };
}


export type InventoryStoreState = ReturnType<typeof createInventoryStoreState>;
