import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/lib/api';
import type {
    InventoryItem,
    InventoryLocation,
    InventoryLocationListResponse,
    InventoryOutbound,
    InventoryOutboundListResponse,
    InventoryReceipt,
    Warehouse,
} from '@/types/inventory';

type InventoryQuery = {
    warehouseId?: number | string;
    locationId?: number | string;
    keyword?: string;
    lowStockOnly?: boolean;
};

type ReceiptQuery = {
    orderNo?: string;
    orderId?: number | string;
    warehouseId?: number | string;
    locationId?: number | string;
    keyword?: string;
    direction?: 'in' | 'reversal';
    reverseReason?: string;
    page?: number;
    pageSize?: number;
};

type OutboundQuery = {
    outboundNo?: string;
    keyword?: string;
    operator?: string;
    warehouseId?: number | string;
    locationId?: number | string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
};

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

function appendIfPresent(query: URLSearchParams, key: string, value: unknown) {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value).trim());
}

function escapeCsvCell(value: unknown) {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<unknown>>) {
    const csvContent = [
        headers.map(escapeCsvCell).join(','),
        ...rows.map((row) => row.map(escapeCsvCell).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export const useInventoryStore = defineStore('inventory', () => {
    const items = ref<InventoryItem[]>([]);
    const receipts = ref<InventoryReceipt[]>([]);
    const warehouses = ref<Warehouse[]>([]);
    const locations = ref<InventoryLocation[]>([]);
    const outbounds = ref<InventoryOutbound[]>([]);

    const loading = ref(false);
    const receiptsLoading = ref(false);
    const locationsLoading = ref(false);
    const outboundsLoading = ref(false);

    const receiptsTotal = ref(0);
    const receiptsPage = ref(1);
    const receiptsPageSize = ref(50);
    const outboundsTotal = ref(0);
    const outboundsPage = ref(1);
    const outboundsPageSize = ref(50);

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

    function buildInventoryQuery(params: InventoryQuery = {}) {
        const query = new URLSearchParams();
        appendIfPresent(query, 'warehouseId', params.warehouseId);
        appendIfPresent(query, 'locationId', params.locationId);
        appendIfPresent(query, 'keyword', params.keyword);
        if (params.lowStockOnly) {
            query.set('lowStockOnly', 'true');
        }
        return query.toString() ? `?${query.toString()}` : '';
    }

    async function fetchInventory(params: InventoryQuery = {}) {
        loading.value = true;
        try {
            const suffix = buildInventoryQuery(params);
            const res = await api.get<InventoryItem[]>(`/inventory${suffix}`);
            items.value = Array.isArray(res) ? res : [];
        } catch (e) {
            console.error('Failed to fetch inventory', e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function updateStock(id: number, newQuantity: number, minStock?: number) {
        try {
            const res = await api.put<InventoryItem>(`/inventory/${id}`, {
                stock_quantity: newQuantity,
                ...(minStock !== undefined ? { min_stock: minStock } : {}),
            });
            const index = items.value.findIndex((item) => item.id === id);
            if (index !== -1) {
                items.value[index] = res;
            }
            return res;
        } catch (e) {
            console.error('Failed to update stock', e);
            throw e;
        }
    }

    function buildReceiptQuery(params: ReceiptQuery = {}) {
        const query = new URLSearchParams();
        appendIfPresent(query, 'orderNo', params.orderNo);
        appendIfPresent(query, 'orderId', params.orderId);
        appendIfPresent(query, 'warehouseId', params.warehouseId);
        appendIfPresent(query, 'locationId', params.locationId);
        appendIfPresent(query, 'keyword', params.keyword);
        appendIfPresent(query, 'direction', params.direction);
        appendIfPresent(query, 'reverseReason', params.reverseReason);
        appendIfPresent(query, 'page', params.page);
        appendIfPresent(query, 'pageSize', params.pageSize);
        return query.toString() ? `?${query.toString()}` : '';
    }

    async function fetchInventoryReceipts(params: ReceiptQuery = {}) {
        receiptsLoading.value = true;
        try {
            const suffix = buildReceiptQuery(params);
            const res = await api.get<{ rows?: InventoryReceipt[]; total?: number; page?: number; pageSize?: number }>(`/inventory-receipts${suffix}`);
            receipts.value = Array.isArray(res?.rows) ? res.rows : [];
            receiptsTotal.value = Number(res?.total || 0);
            receiptsPage.value = Number(res?.page || params.page || 1);
            receiptsPageSize.value = Number(res?.pageSize || params.pageSize || 50);
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
        const pageSize = 200;
        let page = 1;
        let total = 0;
        const rows: InventoryReceipt[] = [];

        do {
            const suffix = buildReceiptQuery({ ...params, page, pageSize });
            const res = await api.get<{ rows?: InventoryReceipt[]; total?: number }>(`/inventory-receipts${suffix}`);
            const chunk = Array.isArray(res?.rows) ? res.rows : [];
            total = Number(res?.total || 0);
            rows.push(...chunk);
            if (chunk.length === 0) break;
            page += 1;
        } while (rows.length < total);

        return rows;
    }

    async function fetchInventoryReceipt(id: number | string) {
        return await api.get<InventoryReceipt>(`/inventory-receipts/${id}`);
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
        return await api.post<InventoryReceipt>(`/inventory-receipts/${id}/reverse`, payload);
    }

    async function fetchInventoryLocations() {
        locationsLoading.value = true;
        try {
            const res = await api.get<InventoryLocationListResponse>('/inventory-locations');
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
        const created = await api.post<InventoryLocation>('/inventory-locations', payload);
        const next = [...locations.value.filter((item) => item.id !== created.id), created];
        locations.value = next.sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id));
        return created;
    }

    async function updateInventoryLocation(id: number, payload: Partial<InventoryLocation>) {
        const updated = await api.put<InventoryLocation>(`/inventory-locations/${id}`, payload);
        const index = locations.value.findIndex((item) => item.id === id);
        if (index !== -1) {
            locations.value[index] = updated;
        }
        return updated;
    }

    function buildOutboundQuery(params: OutboundQuery = {}) {
        const query = new URLSearchParams();
        appendIfPresent(query, 'outboundNo', params.outboundNo);
        appendIfPresent(query, 'keyword', params.keyword);
        appendIfPresent(query, 'operator', params.operator);
        appendIfPresent(query, 'warehouseId', params.warehouseId);
        appendIfPresent(query, 'locationId', params.locationId);
        appendIfPresent(query, 'startDate', params.startDate);
        appendIfPresent(query, 'endDate', params.endDate);
        appendIfPresent(query, 'page', params.page);
        appendIfPresent(query, 'pageSize', params.pageSize);
        return query.toString() ? `?${query.toString()}` : '';
    }

    async function fetchInventoryOutbounds(params: OutboundQuery = {}) {
        outboundsLoading.value = true;
        try {
            const suffix = buildOutboundQuery(params);
            const res = await api.get<InventoryOutboundListResponse>(`/inventory-outbounds${suffix}`);
            outbounds.value = Array.isArray(res?.rows) ? res.rows : [];
            outboundsTotal.value = Number(res?.total || 0);
            outboundsPage.value = Number(res?.page || params.page || 1);
            outboundsPageSize.value = Number(res?.pageSize || params.pageSize || 50);
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
        return await api.get<InventoryOutbound>(`/inventory-outbounds/${id}`);
    }

    async function fetchAllInventoryOutbounds(params: Omit<OutboundQuery, 'page' | 'pageSize'> = {}) {
        const pageSize = 200;
        let page = 1;
        let total = 0;
        const rows: InventoryOutbound[] = [];

        do {
            const suffix = buildOutboundQuery({ ...params, page, pageSize });
            const res = await api.get<InventoryOutboundListResponse>(`/inventory-outbounds${suffix}`);
            const chunk = Array.isArray(res?.rows) ? res.rows : [];
            total = Number(res?.total || 0);
            rows.push(...chunk);
            if (chunk.length === 0) break;
            page += 1;
        } while (rows.length < total);

        return rows;
    }

    async function createInventoryOutbound(payload: InventoryOutboundPayload) {
        return await api.post<InventoryOutbound>('/inventory-outbounds', payload);
    }

    async function reverseInventoryOutbound(id: number | string, payload: {
        operator?: string;
        reason?: string;
        remark?: string;
        outbound_date?: string;
    } = {}) {
        return await api.post<InventoryOutbound>(`/inventory-outbounds/${id}/reverse`, payload);
    }

    function exportReceiptsToCSV(data: InventoryReceipt[]) {
        if (!Array.isArray(data) || data.length === 0) return;

        const headers = ['入库日期', '订单号', '仓库', '库位', '供应商', '物料', '方向', '数量', '单位', '撤销原因', '剩余可撤销', '操作人', '备注'];
        const rows = data.map((receipt) => [
            receipt.receipt_date || '',
            receipt.order_no,
            receipt.warehouse_name || '',
            receipt.location_name || receipt.location_code || '',
            receipt.supplier || '',
            receipt.item_name,
            receipt.direction === 'reversal' ? '撤销' : '入库',
            Number(receipt.quantity || 0),
            receipt.unit || '',
            receipt.reverse_reason || '',
            receipt.direction === 'reversal' ? '' : Number(receipt.reversible_quantity || 0),
            receipt.operator || '',
            receipt.remark || '',
        ]);

        downloadCsv(`采购入库记录_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    }

    function exportInventoryToCSV(data: InventoryItem[]) {
        if (!Array.isArray(data) || data.length === 0) return;

        const headers = ['物料编码', '物料型号', '物料名称', '分类', '总库存', '单位', '仓库', '库位编码', '库位名称', '库位库存', '常规供应商', '安全库存', '最后更新'];
        const rows = data.flatMap((item) => {
            const locations = Array.isArray(item.locations) && item.locations.length > 0
                ? item.locations
                : [{
                    warehouseName: '',
                    locationCode: '',
                    locationName: '',
                    quantity: Number(item.stock_quantity || 0),
                }];

            return locations.map((location) => [
                item.code || '',
                item.model || '',
                item.name || '',
                item.category || '',
                Number(item.stock_quantity || 0),
                item.unit || '',
                location.warehouseName || '',
                location.locationCode || '',
                location.locationName || '',
                Number(location.quantity || 0),
                item.supplier || '',
                Number(item.min_stock || 0),
                item.last_updated || '',
            ]);
        });

        downloadCsv(`库存库位余额_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    }

    function exportOutboundsToCSV(data: InventoryOutbound[]) {
        if (!Array.isArray(data) || data.length === 0) return;

        const headers = ['出库日期', '出库单号', '方向', '状态', '仓库', '库位编码', '库位名称', '物料编码', '物料', '数量', '单位', '用途/原因', '操作人', '备注'];
        const rows = data.flatMap((outbound) => {
            const items = Array.isArray(outbound.items) && outbound.items.length > 0
                ? outbound.items
                : [{
                    material_code: '',
                    item_name: '',
                    quantity: '',
                    unit: '',
                }];

            return items.map((item) => [
                outbound.outbound_date || '',
                outbound.outbound_no,
                outbound.direction === 'reversal' ? '冲销' : '出库',
                outbound.status === 'reversed' ? '已冲销' : '已过账',
                outbound.warehouse_name || '',
                outbound.location_code || '',
                outbound.location_name || '',
                item.material_code || '',
                item.item_name || '',
                item.quantity ?? '',
                item.unit || '',
                outbound.reason || '',
                outbound.operator || '',
                outbound.remark || '',
            ]);
        });

        downloadCsv(`正式出库记录_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    }

    return {
        items,
        receipts,
        warehouses,
        locations,
        outbounds,
        receiptsTotal,
        receiptsPage,
        receiptsPageSize,
        outboundsTotal,
        outboundsPage,
        outboundsPageSize,
        loading,
        receiptsLoading,
        locationsLoading,
        outboundsLoading,
        sortedItems,
        lowStockItems,
        sortedReceipts,
        sortedOutbounds,
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
        fetchAllInventoryOutbounds,
        createInventoryOutbound,
        reverseInventoryOutbound,
        updateStock,
        exportReceiptsToCSV,
        exportInventoryToCSV,
        exportOutboundsToCSV,
    };
});
