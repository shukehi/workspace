import { ref } from 'vue';
import type {
  InventoryItem,
  InventoryLocation,
  InventoryMovement,
  InventoryOutbound,
  InventoryReceipt,
  Warehouse,
} from '@/types/inventory';

export function createInventoryCollections() {
  const items = ref<InventoryItem[]>([]);
  const receipts = ref<InventoryReceipt[]>([]);
  const warehouses = ref<Warehouse[]>([]);
  const locations = ref<InventoryLocation[]>([]);
  const outbounds = ref<InventoryOutbound[]>([]);
  const movements = ref<InventoryMovement[]>([]);

  return {
    items,
    receipts,
    warehouses,
    locations,
    outbounds,
    movements,
  };
}
