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

    async function reverseReceipt(id: number, payload: { operator?: string; remark?: string; reversed_at?: string; reverse_reason?: string; quantity?: number } = {}) {
        const receipt = await api.post<InventoryReceipt>(`/inventory-receipts/${id}/reverse`, payload);
        await fetchInventoryReceipts();
        await fetchInventory();
        return receipt;
    }

    function exportReceiptsToCSV(data: InventoryReceipt[]) {
        if (!Array.isArray(data) || data.length === 0) return;

        const escapeCell = (value: unknown) => {
            const text = String(value ?? '');
            if (/[",\n]/.test(text)) {
                return `"${text.replace(/"/g, '""')}"`;
            }
            return text;
        };

        const headers = ['入库日期', '订单号', '供应商', '物料', '方向', '数量', '单位', '撤销原因', '剩余可撤销', '操作人', '备注'];
        const rows = data.map((receipt) => [
            receipt.receipt_date || '',
            receipt.order_no,
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

        const csvContent = [
            headers.map(escapeCell).join(','),
            ...rows.map((row) => row.map(escapeCell).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `采购入库记录_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
        reverseReceipt,
        updateStock,
        exportReceiptsToCSV
    };
});
