import { createInventoryCollections } from '@/features/inventory/inventoryStoreCollections';
import { createInventoryDerivedState } from '@/features/inventory/inventoryStoreDerivedState';
import { createInventoryMetaState } from '@/features/inventory/inventoryStoreMetaState';

export function createInventoryStoreState() {
  const collections = createInventoryCollections();

  const metaState = createInventoryMetaState();

  const derivedState = createInventoryDerivedState({
    items: collections.items,
    receipts: collections.receipts,
    locations: collections.locations,
    outbounds: collections.outbounds,
    movements: collections.movements,
  });

  return {
    ...collections,
    ...metaState,
    ...derivedState,
  };
}


export type InventoryStoreState = ReturnType<typeof createInventoryStoreState>;
