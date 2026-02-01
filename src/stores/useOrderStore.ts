import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Order } from '@/types/order';
import api from '@/lib/api';

export const useOrderStore = defineStore('order', () => {
    const orders = ref<Order[]>([]);
    const currentOrder = ref<Order | null>(null);
    const loading = ref(false);

    // Getters
    const orderCount = computed(() => orders.value.length);
    const totalAmount = computed(() =>
        currentOrder.value?.items.reduce((sum, item) => sum + (item.total || 0), 0) || 0
    );

    // Actions
    async function fetchOrders() {
        loading.value = true;
        try {
            const data = await api.get<Order[]>('/orders');
            orders.value = data;
        } catch (error) {
            console.error('Failed to fetch orders', error);
        } finally {
            loading.value = false;
        }
    }

    function createDraft() {
        currentOrder.value = {
            id: '',
            order_no: '',
            supplier: '',
            items: [],
            total_amount: 0,
            status: 'draft',
            created_at: new Date().toISOString()
        };
    }

    return {
        orders,
        currentOrder,
        loading,
        orderCount,
        totalAmount,
        fetchOrders,
        createDraft
    };
});
