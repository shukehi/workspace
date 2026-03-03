import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import type { InventoryItem } from '@/types/inventory';

export const useInventoryStore = defineStore('inventory', () => {
    // State
    const items = ref<InventoryItem[]>([]);
    const loading = ref(false);

    // Getters
    const sortedItems = computed(() => {
        return [...items.value].sort((a, b) => 
            (a.stock_quantity - (a.min_stock || 0)) - (b.stock_quantity - (b.min_stock || 0))
        );
    });

    const lowStockItems = computed(() => {
        return items.value.filter(item => item.stock_quantity <= (item.min_stock || 0));
    });

    // Actions
    async function fetchInventory() {
        loading.value = true;
        try {
            const res = await axios.get('/api/inventory');
            items.value = res.data;
        } catch (e) {
            console.error('Failed to fetch inventory', e);
        } finally {
            loading.value = false;
        }
    }

    async function updateStock(id: string, newQuantity: number) {
        try {
            const res = await axios.put(`/api/inventory/${id}`, { stock_quantity: newQuantity });
            const index = items.value.findIndex(i => i.id === id);
            if (index !== -1) {
                items.value[index] = res.data;
            }
        } catch (e) {
            console.error('Failed to update stock', e);
            throw e;
        }
    }

    return { 
        items, 
        loading, 
        sortedItems, 
        lowStockItems, 
        fetchInventory, 
        updateStock 
    };
});
