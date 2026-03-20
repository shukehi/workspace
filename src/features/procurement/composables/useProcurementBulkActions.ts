import { computed } from 'vue';
import type { Ref } from 'vue';
import type { Toast } from '@/stores/useToastStore';
import type { Order } from '@/types/order';
import { hasRemainingStockInItems } from '@/features/procurement/stockInEligibility';
import { ORDER_STATUS_LABELS } from '@/shared/constants/order';
import { useProcurementStore } from '@/stores/useProcurementStore';

type ToastFn = (payload: Omit<Toast, 'id'>) => void;

interface UseProcurementBulkActionsOptions {
    store: ReturnType<typeof useProcurementStore>;
    toast: ToastFn;
    selectedRows: Ref<Order[]>;
    loadOrders: () => Promise<void>;
    clearSelection: () => void;
    requestBulkDelete: (rows: Order[], clearSelection: () => void) => void;
}

export function useProcurementBulkActions({
    store,
    toast,
    selectedRows,
    loadOrders,
    clearSelection,
    requestBulkDelete,
}: UseProcurementBulkActionsOptions) {
    const canBulkSubmit = computed(() => selectedRows.value.length > 0 && selectedRows.value.every(o => o.status === 'draft'));
    const canBulkProcess = computed(() => selectedRows.value.length > 0 && selectedRows.value.every(o => o.status === 'submitted'));
    const canBulkArrive = computed(() => selectedRows.value.length > 0 && selectedRows.value.every(o => o.status === 'processing'));
    const canBulkStockIn = computed(() => selectedRows.value.length > 0 && selectedRows.value.every(order => order.status === 'arrived' && hasRemainingStockInItems(order)));
    const canBulkRestoreDraft = computed(() => selectedRows.value.length > 0 && selectedRows.value.every(o => o.status === 'cancelled'));

    const handleBulkDelete = () => {
        requestBulkDelete(selectedRows.value, clearSelection);
    };

    const handleBulkStatusUpdate = async (status: Order['status']) => {
        const count = selectedRows.value.length;
        if (status === 'submitted' && !canBulkSubmit.value) {
            toast({ title: `当前所选订单不能批量设为${ORDER_STATUS_LABELS.submitted}`, variant: 'destructive' });
            return;
        }
        if (status === 'processing' && !canBulkProcess.value) {
            toast({ title: `当前所选订单不能批量设为${ORDER_STATUS_LABELS.processing}`, variant: 'destructive' });
            return;
        }
        if (status === 'draft' && !canBulkRestoreDraft.value) {
            toast({ title: `当前所选订单不能批量设为${ORDER_STATUS_LABELS.draft}`, variant: 'destructive' });
            return;
        }
        try {
            await store.bulkUpdateStatus(selectedRows.value.map(o => o.id), status);
            await loadOrders();
            clearSelection();
            toast({ title: '批量更新成功', description: `${count} 张订单已设为 ${ORDER_STATUS_LABELS[status]}`, variant: 'success' });
        } catch {
            toast({ title: '操作失败', variant: 'destructive' });
        }
    };

    const handleBulkArrive = async () => {
        if (!canBulkArrive.value) {
            toast({ title: '当前所选订单不能批量登记到货', variant: 'destructive' });
            return;
        }
        const orders = [...selectedRows.value];
        try {
            const result = await store.bulkMarkOrdersArrived(
                orders.map((order) => order.id),
                { arrived_at: new Date().toISOString() }
            );
            await loadOrders();

            if (result.successCount > 0 && result.failureCount > 0) {
                toast({
                    title: '批量到货部分完成',
                    description: `${result.successCount} / ${result.total} 张订单登记成功`,
                    variant: 'destructive'
                });
            } else if (result.successCount === result.total) {
                clearSelection();
                toast({ title: '批量登记到货完成', variant: 'success' });
            } else {
                toast({ title: '批量登记到货失败', variant: 'destructive' });
            }
        } catch {
            toast({ title: '批量登记到货失败', variant: 'destructive' });
        }
    };

    return {
        canBulkSubmit,
        canBulkProcess,
        canBulkArrive,
        canBulkStockIn,
        canBulkRestoreDraft,
        handleBulkDelete,
        handleBulkStatusUpdate,
        handleBulkArrive,
    };
}
