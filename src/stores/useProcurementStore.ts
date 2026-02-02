import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import type { Order } from '@/types/order';

export const useProcurementStore = defineStore('procurement', () => {
    // State
    const purchaseOrders = ref<Order[]>([]);
    const loading = ref(false);

    // Getters
    const sortedOrders = computed(() => {
        return [...purchaseOrders.value].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    });

    // Actions
    async function fetchOrders() {
        loading.value = true;
        try {
            const res = await axios.get('/api/orders');
            // Backend returns sorted by created_at DESC usually, but we can sort again if needed
            purchaseOrders.value = res.data;
        } catch (e) {
            console.error('Failed to fetch orders', e);
        } finally {
            loading.value = false;
        }
    }

    async function addOrder(order: Order) {
        try {
            const res = await axios.post('/api/orders', order);
            // Replace the temp order with the real one from DB (with ID)
            purchaseOrders.value.unshift(res.data);
            return res.data;
        } catch (e) {
            console.error('Failed to add order', e);
            throw e;
        }
    }

    async function deleteOrder(id: string) {
        try {
            await axios.delete(`/api/orders/${id}`);
            purchaseOrders.value = purchaseOrders.value.filter(o => o.id !== id);
        } catch (e) {
            console.error('Failed to delete order', e);
            throw e;
        }
    }

    function clearOrders() {
        purchaseOrders.value = [];
    }

    async function updateOrder(id: string, updates: Partial<Order>) {
        try {
            const res = await axios.put(`/api/orders/${id}`, updates);
            const index = purchaseOrders.value.findIndex(o => o.id === id);
            if (index !== -1) {
                purchaseOrders.value[index] = res.data;
            }
        } catch (e) {
            console.error('Failed to update order', e);
            throw e;
        }
    }

    // Initialize
    fetchOrders();

    return {
        purchaseOrders,
        sortedOrders,
        loading,
        fetchOrders,
        addOrder,
        deleteOrder,
        updateOrder,
        clearOrders
    };
});
