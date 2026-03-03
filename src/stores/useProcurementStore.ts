import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/lib/api';
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
            const res = await api.get<Order[]>('/orders');
            // Backend returns sorted by created_at DESC usually, but we can sort again if needed
            purchaseOrders.value = res;
        } catch (e) {
            console.error('Failed to fetch orders', e);
        } finally {
            loading.value = false;
        }
    }

    async function addOrder(order: Order) {
        try {
            const res = await api.post<Order>('/orders', order);
            // Replace the temp order with the real one from DB (with ID)
            purchaseOrders.value.unshift(res);
            return res;
        } catch (e) {
            console.error('Failed to add order', e);
            throw e;
        }
    }

    async function deleteOrder(id: number) {
        try {
            await api.delete(`/orders/${id}`);
            purchaseOrders.value = purchaseOrders.value.filter(o => o.id !== id);
        } catch (e) {
            console.error('Failed to delete order', e);
            throw e;
        }
    }

    async function bulkDelete(ids: number[]) {
        loading.value = true;
        try {
            // Sequential deletion to ensure DB integrity, or use Promise.all for speed
            await Promise.all(ids.map(id => api.delete(`/orders/${id}`)));
            purchaseOrders.value = purchaseOrders.value.filter(o => !ids.includes(o.id));
        } catch (e) {
            console.error('Bulk delete failed', e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function bulkUpdateStatus(ids: number[], status: Order['status']) {
        loading.value = true;
        try {
            await Promise.all(ids.map(id => api.put(`/orders/${id}`, { status })));
            // Refresh local state
            ids.forEach(id => {
                const index = purchaseOrders.value.findIndex(o => o.id === id);
                if (index !== -1) {
                    purchaseOrders.value[index].status = status;
                }
            });
        } catch (e) {
            console.error('Bulk update failed', e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    function clearOrders() {
        purchaseOrders.value = [];
    }

    async function updateOrder(id: number, updates: Partial<Order>) {
        try {
            const res = await api.put<Order>(`/orders/${id}`, updates);
            const index = purchaseOrders.value.findIndex(o => o.id === id);
            if (index !== -1) {
                purchaseOrders.value[index] = res;
            }
        } catch (e) {
            console.error('Failed to update order', e);
            throw e;
        }
    }

    function exportToCSV(orders: Order[]) {
        if (orders.length === 0) return;

        // Header
        const headers = ['订单号', '分类', '供应商', '金额', '状态', '下单时间'];
        const rows = orders.map(o => [
            o.order_no,
            o.category || '常规',
            o.supplier,
            o.total_amount,
            o.status,
            new Date(o.created_at).toLocaleString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `采购订单导出_${new Date().toLocaleDateString()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
        bulkDelete,
        bulkUpdateStatus,
        updateOrder,
        clearOrders,
        exportToCSV
    };
});
