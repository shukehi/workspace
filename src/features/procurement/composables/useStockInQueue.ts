import { ref } from 'vue';
import type { Ref } from 'vue';
import type { Toast } from '@/stores/useToastStore';
import type { Order } from '@/types/order';
import { hasRemainingStockInItems } from '@/features/procurement/stockInEligibility';
import { API_ERROR_CODES } from '@/shared/constants/api';
import { useProcurementStore } from '@/stores/useProcurementStore';

type ToastFn = (payload: Omit<Toast, 'id'>) => void;

interface UseStockInQueueOptions {
    store: ReturnType<typeof useProcurementStore>;
    toast: ToastFn;
    loadOrders: () => Promise<void>;
    clearSelection: () => void;
}

export function useStockInQueue({ store, toast, loadOrders, clearSelection }: UseStockInQueueOptions) {
    const stockInOrder = ref<Order | null>(null);
    const stockInDialogOpen = ref(false);
    const stockInSaving = ref(false);
    const stockInQueue = ref<Order[]>([]);
    const stockInQueueIndex = ref(0);
    const stockInQueueCompletedCount = ref(0);

    function resetStockInFlow() {
        stockInDialogOpen.value = false;
        stockInOrder.value = null;
        stockInQueue.value = [];
        stockInQueueIndex.value = 0;
        stockInQueueCompletedCount.value = 0;
    }

    const openStockInDialog = (order: Order) => {
        if (!hasRemainingStockInItems(order)) {
            toast({ title: '当前订单没有可继续入库的明细', description: `订单 ${order.order_no} 已全部入库`, variant: 'destructive' });
            return;
        }
        stockInOrder.value = order;
        stockInDialogOpen.value = true;
    };

    const openStockInQueue = (orders: Order[]) => {
        const queue = orders.filter((order) => hasRemainingStockInItems(order));
        if (queue.length === 0) {
            toast({ title: '当前订单没有可继续入库的明细', description: '所选订单均已全部入库', variant: 'destructive' });
            return;
        }
        stockInQueue.value = queue;
        stockInQueueIndex.value = 0;
        stockInQueueCompletedCount.value = 0;
        stockInOrder.value = queue[0];
        stockInDialogOpen.value = true;
    };

    function handleStockInDialogOpenChange(open: boolean) {
        if (open) { stockInDialogOpen.value = true; return; }
        if (stockInSaving.value) return;
        const remaining = Math.max(stockInQueue.value.length - stockInQueueIndex.value, 0);
        if (remaining > 0) toast({ title: '批量入库已中止', description: `仍有 ${remaining} 张订单未处理`, variant: 'destructive' });
        resetStockInFlow();
    }

    const handleStockInOrder = async (payload?: Record<string, unknown>) => {
        if (!stockInOrder.value) return;
        const currentOrder = stockInOrder.value;
        stockInSaving.value = true;
        try {
            const updated = await store.stockInOrder(currentOrder.id, payload || { stocked_in_at: new Date().toISOString() });
            const isCompleted = updated.status === 'completed';
            const queueActive = stockInQueue.value.length > 1;
            const hasNext = queueActive && stockInQueueIndex.value < stockInQueue.value.length - 1;

            if (isCompleted) stockInQueueCompletedCount.value += 1;

            if (hasNext) {
                await loadOrders();
                stockInQueueIndex.value += 1;
                stockInOrder.value = stockInQueue.value[stockInQueueIndex.value];
                toast({ title: isCompleted ? '入库完成，进入下一单' : '部分入库成功，进入下一单', description: `已完成 ${stockInQueueIndex.value} / ${stockInQueue.value.length}`, variant: 'success' });
                return;
            }

            if (queueActive) clearSelection();
            await loadOrders();

            const completedCount = queueActive ? stockInQueueCompletedCount.value : 0;
            const pendingCount = queueActive ? stockInQueue.value.length - completedCount : 0;
            toast({
                title: queueActive
                    ? (pendingCount > 0 ? '批量入库流程已完成' : '批量入库已完成')
                    : (isCompleted ? '入库完成' : '部分入库成功'),
                description: queueActive && pendingCount > 0
                    ? `${completedCount} 张已完成入库，${pendingCount} 张仍有明细待入库`
                    : undefined,
                variant: 'success',
            });
            resetStockInFlow();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } }; message?: string };
            const errorCode = String(err?.response?.data?.error || '');
            const msg = errorCode === API_ERROR_CODES.receivedQuantityExceeded ? '数量超过剩余待入库数' : '入库失败';
            toast({ title: msg, variant: 'destructive' });
        } finally {
            stockInSaving.value = false;
        }
    };

    return {
        stockInOrder: stockInOrder as Ref<Order | null>,
        stockInDialogOpen,
        stockInSaving,
        stockInQueue,
        stockInQueueIndex,
        stockInQueueCompletedCount,
        openStockInDialog,
        openStockInQueue,
        resetStockInFlow,
        handleStockInDialogOpenChange,
        handleStockInOrder,
    };
}
