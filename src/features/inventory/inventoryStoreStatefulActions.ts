import { createInventoryCoreActions } from '@/features/inventory/inventoryStoreCoreActions';
import { createInventoryFlowActions } from '@/features/inventory/inventoryStoreFlowActions';
import { createInventoryHistoryActions } from '@/features/inventory/inventoryStoreHistoryActions';
import type { InventoryStoreState } from '@/features/inventory/inventoryStoreState';

export function createInventoryStatefulActions(state: InventoryStoreState) {
  const coreActions = createInventoryCoreActions({
    items: state.items,
    loading: state.loading,
  });

  const historyActions = createInventoryHistoryActions({
    receipts: state.receipts,
    receiptsLoading: state.receiptsLoading,
    receiptsTotal: state.receiptsTotal,
    receiptsPage: state.receiptsPage,
    receiptsPageSize: state.receiptsPageSize,
    movements: state.movements,
    movementsLoading: state.movementsLoading,
    movementsTotal: state.movementsTotal,
    movementsPage: state.movementsPage,
    movementsPageSize: state.movementsPageSize,
  });

  const flowActions = createInventoryFlowActions({
    warehouses: state.warehouses,
    locations: state.locations,
    outbounds: state.outbounds,
    locationsLoading: state.locationsLoading,
    outboundsLoading: state.outboundsLoading,
    outboundsTotal: state.outboundsTotal,
    outboundsPage: state.outboundsPage,
    outboundsPageSize: state.outboundsPageSize,
  });

  return {
    ...coreActions,
    ...historyActions,
    ...flowActions,
  };
}
