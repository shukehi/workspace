import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/lib/api';
import type { InventoryItem, InventoryReceipt } from '@/types/inventory';

export const useInventoryStore = defineStore('inventory', () => {
    // State
    const items = ref<InventoryItem[]>([]);
    const receipts = ref<InventoryReceipt[]>([]);
    const loading = ref(false);
    const receiptsLoading = ref(false);

    // Getters
    const sortedItems = computed(() => {
        return [...items.value].sort((a, b) => 
            (a.stock_quantity - (a.min_stock || 0)) - (b.stock_quantity - (b.min_stock || 0))
        );
    });

    const lowStockItems = computed(() => {
        return items.value.filter(item => item.stock_quantity <= (item.min_stock || 0));
    });

    const sortedReceipts = computed(() => {
        return [...receipts.value].sort((a, b) =>
            new Date(b.receipt_date || b.created_at || 0).getTime()
            - new Date(a.receipt_date || a.created_at || 0).getTime()
        );
    });

    // Actions
    async function fetchInventory() {
        loading.value = true;
        try {
            const res = await api.get<InventoryItem[]>('/inventory');
            items.value = res;
        } catch (e) {
            console.error('Failed to fetch inventory', e);
        } finally {
            loading.value = false;
        }
    }

    async function updateStock(id: number, newQuantity: number) {
        try {
            const res = await api.put<InventoryItem>(`/inventory/${id}`, { stock_quantity: newQuantity });
            const index = items.value.findIndex(i => i.id === id);
            if (index !== -1) {
                items.value[index] = res;
            }
        } catch (e) {
            console.error('Failed to update stock', e);
            throw e;
        }
    }

    async function fetchInventoryReceipts(params: { orderNo?: string; orderId?: number | string } = {}) {
        receiptsLoading.value = true;
        try {
            const query = new URLSearchParams();
            if (params.orderNo) query.set('orderNo', String(params.orderNo).trim());
            if (params.orderId !== undefined && params.orderId !== null && String(params.orderId).trim()) {
                query.set('orderId', String(params.orderId).trim());
            }
            const suffix = query.toString() ? `?${query.toString()}` : '';
            const res = await api.get<InventoryReceipt[]>(`/inventory-receipts${suffix}`);
            receipts.value = Array.isArray(res) ? res : [];
        } catch (e) {
            receipts.value = [];
            console.error('Failed to fetch inventory receipts', e);
            throw e;
        } finally {
            receiptsLoading.value = false;
        }
    }

    return { 
        items, 
        receipts,
        loading, 
        receiptsLoading,
        sortedItems, 
        lowStockItems, 
        sortedReceipts,
        fetchInventory, 
        fetchInventoryReceipts,
        updateStock 
    };
});
