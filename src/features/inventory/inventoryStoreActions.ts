import { createInventoryExportActions } from '@/features/inventory/inventoryStoreExportActions';
import { createInventoryStatefulActions } from '@/features/inventory/inventoryStoreStatefulActions';
import { createInventoryStoreState } from '@/features/inventory/inventoryStoreState';

export type InventoryStoreState = ReturnType<typeof createInventoryStoreState>;

export function createInventoryStoreActions(state: InventoryStoreState) {
  const statefulActions = createInventoryStatefulActions(state);
  const exportActions = createInventoryExportActions();

  return {
    ...statefulActions,
    ...exportActions,
  };
}
