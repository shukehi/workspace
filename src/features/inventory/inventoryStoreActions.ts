import { createInventoryExportActions } from '@/features/inventory/inventoryStoreExportActions';
import { createInventoryCoreActions } from '@/features/inventory/inventoryStoreCoreActions';
import { createInventoryFlowActions } from '@/features/inventory/inventoryStoreFlowActions';
import { createInventoryHistoryActions } from '@/features/inventory/inventoryStoreHistoryActions';
import { createInventoryStoreState } from '@/features/inventory/inventoryStoreState';

export type InventoryStoreState = ReturnType<typeof createInventoryStoreState>;

export function createInventoryStoreActions(state: InventoryStoreState) {
  const exportActions = createInventoryExportActions();

  const {
    fetchInventory,
    updateMinStock,
    createInventoryAdjustment,
  } = createInventoryCoreActions({
    items: state.items,
    loading: state.loading,
  });

  const {
    fetchInventoryReceipts,
    fetchAllInventoryReceipts,
    fetchInventoryReceipt,
    reverseReceipt,
    fetchInventoryMovements,
  } = createInventoryHistoryActions({
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

  const {
    fetchInventoryLocations,
    createInventoryLocation,
    updateInventoryLocation,
    fetchInventoryOutbounds,
    fetchInventoryOutbound,
    fetchAllInventoryOutbounds,
    createInventoryOutbound,
    reverseInventoryOutbound,
  } = createInventoryFlowActions({
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
    fetchInventory,
    updateMinStock,
    createInventoryAdjustment,
    fetchInventoryReceipts,
    fetchAllInventoryReceipts,
    fetchInventoryReceipt,
    reverseReceipt,
    fetchInventoryMovements,
    fetchInventoryLocations,
    createInventoryLocation,
    updateInventoryLocation,
    fetchInventoryOutbounds,
    fetchInventoryOutbound,
    fetchAllInventoryOutbounds,
    createInventoryOutbound,
    reverseInventoryOutbound,
    ...exportActions,
  };
}
