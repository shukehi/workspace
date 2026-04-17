import { defineStore } from 'pinia';
import {
    type InventoryQuery,
    type MovementQuery,
    type OutboundQuery,
    type ReceiptQuery,
} from '@/features/inventory/inventoryQueryBuilders';
import {
    exportInventoryToCSV,
    exportOutboundsToCSV,
    exportReceiptsToCSV,
    exportReconciliationToCSV,
} from '@/features/inventory/inventoryCsvExports';
import {
    createInventoryFlowActions,
    type InventoryOutboundPayload,
} from '@/features/inventory/inventoryStoreFlowActions';
import { createInventoryCoreActions } from '@/features/inventory/inventoryStoreCoreActions';
import { createInventoryStoreState } from '@/features/inventory/inventoryStoreState';
import { createInventoryHistoryActions } from '@/features/inventory/inventoryStoreHistoryActions';

export const useInventoryStore = defineStore('inventory', () => {
    const {
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
    } = createInventoryStoreState();

    const {
        fetchInventory,
        updateMinStock,
        createInventoryAdjustment,
    } = createInventoryCoreActions({
        items,
        loading,
    });

    const {
        fetchInventoryReceipts,
        fetchAllInventoryReceipts,
        fetchInventoryReceipt,
        reverseReceipt,
        fetchInventoryMovements,
    } = createInventoryHistoryActions({
        receipts,
        receiptsLoading,
        receiptsTotal,
        receiptsPage,
        receiptsPageSize,
        movements,
        movementsLoading,
        movementsTotal,
        movementsPage,
        movementsPageSize,
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
        warehouses,
        locations,
        outbounds,
        locationsLoading,
        outboundsLoading,
        outboundsTotal,
        outboundsPage,
        outboundsPageSize,
    });

    return {
        items,
        receipts,
        warehouses,
        locations,
        outbounds,
        movements,
        receiptsTotal,
        receiptsPage,
        receiptsPageSize,
        outboundsTotal,
        outboundsPage,
        outboundsPageSize,
        movementsTotal,
        movementsPage,
        movementsPageSize,
        loading,
        receiptsLoading,
        locationsLoading,
        outboundsLoading,
        movementsLoading,
        sortedItems,
        lowStockItems,
        sortedReceipts,
        sortedOutbounds,
        sortedMovements,
        activeLocations,
        fetchInventory,
        fetchInventoryReceipts,
        fetchAllInventoryReceipts,
        fetchInventoryReceipt,
        reverseReceipt,
        fetchInventoryLocations,
        createInventoryLocation,
        updateInventoryLocation,
        fetchInventoryOutbounds,
        fetchInventoryOutbound,
        fetchInventoryMovements,
        fetchAllInventoryOutbounds,
        createInventoryOutbound,
        reverseInventoryOutbound,
        createInventoryAdjustment,
        updateMinStock,
        exportReceiptsToCSV,
        exportInventoryToCSV,
        exportReconciliationToCSV,
        exportOutboundsToCSV,
    };
});
