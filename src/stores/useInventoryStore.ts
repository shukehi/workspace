import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
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
    createInventoryLocationFlow,
    createInventoryOutboundFlow,
    fetchAllInventoryOutboundsFlow,
    fetchInventoryLocationsFlow,
    fetchInventoryOutboundFlow,
    fetchInventoryOutboundsFlow,
    mergeInventoryLocation,
    reverseInventoryOutboundFlow,
    updateInventoryLocationFlow,
} from '@/features/inventory/inventoryStoreFlows';
import {
    createInventoryAdjustmentFlow,
    fetchInventoryFlow,
    mergeInventoryItem,
    updateInventoryMinStockFlow,
} from '@/features/inventory/inventoryStoreCoreFlows';
import {
    fetchAllInventoryReceiptsFlow,
    fetchInventoryMovementsFlow,
    fetchInventoryReceiptFlow,
    fetchInventoryReceiptsFlow,
    reverseReceiptFlow,
} from '@/features/inventory/inventoryStoreHistoryFlows';
import type {
    InventoryItem,
    InventoryAdjustmentPayload,
    InventoryAdjustmentResponse,
    InventoryLocation,
    InventoryLocationListResponse,
    InventoryMovement,
    InventoryOutbound,
    InventoryReceipt,
    Warehouse,
} from '@/types/inventory';

type InventoryOutboundPayload = {
    warehouse_id: number;
    location_id: number;
    operator?: string;
    reason: string;
    remark?: string;
    outbound_date?: string;
    items: Array<{
        material_id: number | string;
        item_name?: string;
        unit?: string;
        quantity: number;
    }>;
};

export const useInventoryStore = defineStore('inventory', () => {
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

    const sortedItems = computed(() => {
        return [...items.value].sort((a, b) =>
            (a.stock_quantity - (a.min_stock || 0)) - (b.stock_quantity - (b.min_stock || 0))
        );
    });

    const lowStockItems = computed(() => {
        return items.value.filter((item) => {
            const minStock = item.min_stock || 0;
            return minStock > 0 && item.stock_quantity <= minStock;
        });
    });

    const sortedReceipts = computed(() => {
        return [...receipts.value].sort((a, b) =>
            new Date(b.receipt_date || b.created_at || 0).getTime()
            - new Date(a.receipt_date || a.created_at || 0).getTime()
        );
    });

    const sortedOutbounds = computed(() => {
        return [...outbounds.value].sort((a, b) =>
            new Date(b.outbound_date || b.created_at || 0).getTime()
            - new Date(a.outbound_date || a.created_at || 0).getTime()
        );
    });

    const activeLocations = computed(() => {
        return locations.value.filter((location) => location.status === 'active');
    });

    const sortedMovements = computed(() => {
        return [...movements.value].sort((a, b) =>
            new Date(b.occurred_at || b.created_at || 0).getTime()
            - new Date(a.occurred_at || a.created_at || 0).getTime()
        );
    });

    async function fetchInventory(params: InventoryQuery = {}) {
        loading.value = true;
        try {
            items.value = await fetchInventoryFlow(params);
        } catch (e) {
            console.error('Failed to fetch inventory', e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function updateMinStock(id: number, minStock: number) {
        try {
            const updated = await updateInventoryMinStockFlow(id, minStock);
            items.value = mergeInventoryItem(items.value, updated);
            return updated;
        } catch (e) {
            console.error('Failed to update stock', e);
            throw e;
        }
    }

    async function createInventoryAdjustment(payload: InventoryAdjustmentPayload) {
        try {
            const res = await createInventoryAdjustmentFlow(payload);
            const item = res?.item;
            if (item && typeof item.id === 'number') {
                items.value = mergeInventoryItem(items.value, item);
            }
            return res;
        } catch (e) {
            console.error('Failed to create inventory adjustment', e);
            throw e;
        }
    }

    async function fetchInventoryReceipts(params: ReceiptQuery = {}) {
        receiptsLoading.value = true;
        try {
            const normalized = await fetchInventoryReceiptsFlow(params);
            receipts.value = normalized.rows;
            receiptsTotal.value = normalized.total;
            receiptsPage.value = normalized.page;
            receiptsPageSize.value = normalized.pageSize;
        } catch (e) {
            receipts.value = [];
            receiptsTotal.value = 0;
            console.error('Failed to fetch inventory receipts', e);
            throw e;
        } finally {
            receiptsLoading.value = false;
        }
    }

    async function fetchAllInventoryReceipts(params: Omit<ReceiptQuery, 'page' | 'pageSize'> = {}) {
        return await fetchAllInventoryReceiptsFlow(params);
    }

    async function fetchInventoryReceipt(id: number | string) {
        return await fetchInventoryReceiptFlow(id);
    }

    async function reverseReceipt(
        id: number,
        payload: {
            operator?: string;
            remark?: string;
            reversed_at?: string;
            reverse_reason?: string;
            quantity?: number;
        } = {},
    ) {
        return await reverseReceiptFlow(id, payload);
    }

    async function fetchInventoryLocations() {
        locationsLoading.value = true;
        try {
            const res = await fetchInventoryLocationsFlow();
            warehouses.value = Array.isArray(res?.warehouses) ? res.warehouses : [];
            locations.value = Array.isArray(res?.locations) ? res.locations : [];
            return res;
        } catch (e) {
            console.error('Failed to fetch inventory locations', e);
            throw e;
        } finally {
            locationsLoading.value = false;
        }
    }

    async function createInventoryLocation(payload: {
        warehouse_id: number;
        code: string;
        name: string;
        status?: 'active' | 'inactive';
        remark?: string;
        sort_order?: number;
    }) {
        const created = await createInventoryLocationFlow(payload);
        locations.value = mergeInventoryLocation(locations.value, created);
        return created;
    }

    async function updateInventoryLocation(id: number, payload: Partial<InventoryLocation>) {
        const updated = await updateInventoryLocationFlow(id, payload);
        locations.value = mergeInventoryLocation(locations.value, updated);
        return updated;
    }

    async function fetchInventoryOutbounds(params: OutboundQuery = {}) {
        outboundsLoading.value = true;
        try {
            const normalized = await fetchInventoryOutboundsFlow(params);
            outbounds.value = normalized.rows;
            outboundsTotal.value = normalized.total;
            outboundsPage.value = normalized.page;
            outboundsPageSize.value = normalized.pageSize;
        } catch (e) {
            outbounds.value = [];
            outboundsTotal.value = 0;
            console.error('Failed to fetch inventory outbounds', e);
            throw e;
        } finally {
            outboundsLoading.value = false;
        }
    }

    async function fetchInventoryOutbound(id: number | string) {
        return await fetchInventoryOutboundFlow(id);
    }

    async function fetchInventoryMovements(params: MovementQuery = {}) {
        movementsLoading.value = true;
        try {
            const normalized = await fetchInventoryMovementsFlow(params);
            movements.value = normalized.rows;
            movementsTotal.value = normalized.total;
            movementsPage.value = normalized.page;
            movementsPageSize.value = normalized.pageSize;
            return normalized;
        } catch (e) {
            movements.value = [];
            movementsTotal.value = 0;
            console.error('Failed to fetch inventory movements', e);
            throw e;
        } finally {
            movementsLoading.value = false;
        }
    }

    async function fetchAllInventoryOutbounds(params: Omit<OutboundQuery, 'page' | 'pageSize'> = {}) {
        return await fetchAllInventoryOutboundsFlow(params);
    }

    async function createInventoryOutbound(payload: InventoryOutboundPayload) {
        return await createInventoryOutboundFlow(payload);
    }

    async function reverseInventoryOutbound(id: number | string, payload: {
        operator?: string;
        reason?: string;
        remark?: string;
        outbound_date?: string;
    } = {}) {
        return await reverseInventoryOutboundFlow(id, payload);
    }

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
