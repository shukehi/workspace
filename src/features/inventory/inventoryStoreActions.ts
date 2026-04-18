import { createInventoryExportActions } from '@/features/inventory/inventoryStoreExportActions';
import { createInventoryStatefulActions } from '@/features/inventory/inventoryStoreStatefulActions';
import type { InventoryStoreState } from '@/features/inventory/inventoryStoreState';

export function createInventoryStoreActions(state: InventoryStoreState) {
  const statefulActions = createInventoryStatefulActions(state);
  const exportActions = createInventoryExportActions();

  return {
    ...statefulActions,
    ...exportActions,
  };
}
