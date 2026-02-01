
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
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
    function addOrder(order: Order) {
        // Prepend to list
        purchaseOrders.value.unshift(order);
    }

    function deleteOrder(id: string) {
        purchaseOrders.value = purchaseOrders.value.filter(o => o.id !== id);
    }

    function clearOrders() {
        purchaseOrders.value = [];
    }

    // Persistence
    function loadFromStorage() {
        try {
            const saved = localStorage.getItem('procurement_orders');
            if (saved) {
                purchaseOrders.value = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load orders', e);
        }
    }

    // Auto-save watch
    watch(purchaseOrders, (newVal) => {
        localStorage.setItem('procurement_orders', JSON.stringify(newVal));
    }, { deep: true });

    // Initialize
    loadFromStorage();

    return {
        purchaseOrders,
        sortedOrders,
        addOrder,
        deleteOrder,
        clearOrders
    };
});
