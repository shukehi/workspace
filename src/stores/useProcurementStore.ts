import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/lib/api';
import {
    buildFacetCountsFromOrders,
    buildSummaryFromOrders,
} from '@/features/procurement/model/orderSummary';
import {
    isNotFoundError,
    isValidOrder,
    logInvalidOrders,
    normalizeOrderListPayload,
    normalizeOrderPayload,
} from '@/features/procurement/model/orderNormalizer';
import type {
    Order,
    StockInOrderItemInput,
    ProcurementOrderFacetCounts,
    ProcurementOrderListResponse,
    ProcurementOrderQuery,
    ProcurementOrderSummary
} from '@/types/order';

export const useProcurementStore = defineStore('procurement', () => {
    // AbortController for cancelling in-flight fetchOrders requests on rapid filter changes
    let fetchOrdersController: AbortController | null = null;

    // State
    const purchaseOrders = ref<Order[]>([]);
    const loading = ref(false);
    const ordersTotal = ref(0);
    const ordersPage = ref(1);
    const ordersPageSize = ref(50);
    const serverPaginationEnabled = ref(false);
    const query = ref<ProcurementOrderQuery>({
        page: 1,
        pageSize: 50,
    });
    const summarySnapshot = ref<ProcurementOrderSummary>({
        totalAmount: 0,
        pendingCount: 0,
        completedCount: 0,
        todayCount: 0,
    });
    const facetCounts = ref<ProcurementOrderFacetCounts>({
        statusCounts: { ALL: 0 },
        categoryCounts: { ALL: 0 },
        riskCounts: { ALL: 0, RISK: 0, MANUAL: 0 },
    });

    // Getters
    const sortedOrders = computed(() => {
        return purchaseOrders.value
            .filter(isValidOrder)
            .sort((a, b) =>
                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
            );
    });

    // Actions
    async function fetchOrders(nextQuery?: ProcurementOrderQuery) {
        // Cancel any in-flight request triggered by a previous filter change
        fetchOrdersController?.abort();
        fetchOrdersController = new AbortController();
        const signal = fetchOrdersController.signal;

        loading.value = true;
        try {
            if (nextQuery) {
                query.value = {
                    ...query.value,
                    ...nextQuery,
                };
            }

            if (nextQuery) {
                const res = await api.get<ProcurementOrderListResponse>('/orders', {
                    params: query.value,
                    signal,
                });
                const normalized = normalizeOrderListPayload(res);
                if (!normalized) {
                    throw new Error('Invalid paginated order payload returned by /api/orders');
                }
                logInvalidOrders('GET /orders (paginated)', normalized.rows);
                purchaseOrders.value = normalized.rows;
                ordersTotal.value = normalized.total;
                ordersPage.value = normalized.page;
                ordersPageSize.value = normalized.pageSize;
                summarySnapshot.value = normalized.summary;
                facetCounts.value = normalized.facets;
                serverPaginationEnabled.value = true;
                return;
            }

            const res = await api.get<Order[]>('/orders', { signal });
            logInvalidOrders('GET /orders', Array.isArray(res) ? res : []);
            const normalizedOrders = Array.isArray(res) ? res.filter(isValidOrder) : [];
            purchaseOrders.value = normalizedOrders;
            ordersTotal.value = normalizedOrders.length;
            ordersPage.value = 1;
            ordersPageSize.value = normalizedOrders.length || 20;
            summarySnapshot.value = buildSummaryFromOrders(normalizedOrders);
            facetCounts.value = buildFacetCountsFromOrders(normalizedOrders);
            serverPaginationEnabled.value = false;
        } catch (e: unknown) {
            // Ignore cancellation errors — they are intentional, not failures
            if (e && typeof e === 'object' && 'name' in e) {
                const name = (e as { name: string }).name;
                if (name === 'AbortError' || name === 'CanceledError') return;
            }
            const msg = (e as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error
                ?? (e as { message?: string })?.message
                ?? '获取订单失败';
            console.error('fetchOrders failed', { error: msg });
            throw new Error(msg);
        } finally {
            loading.value = false;
        }
    }

    async function fetchAllOrders(nextQuery: ProcurementOrderQuery = {}) {
        const pageSize = 200;
        let page = 1;
        let total = 0;
        const rows: Order[] = [];

        do {
            const res = await api.get<ProcurementOrderListResponse>('/orders', {
                params: {
                    ...nextQuery,
                    page,
                    pageSize,
                },
            });
            const normalized = normalizeOrderListPayload(res);
            if (!normalized) {
                throw new Error('Invalid paginated order payload returned by /api/orders');
            }
            if (page === 1) {
                total = normalized.total;
            }
            rows.push(...normalized.rows);
            page += 1;
            if (normalized.rows.length === 0) break;
        } while (rows.length < total);

        return rows;
    }

    function replaceOrderInState(order: Order) {
        const index = purchaseOrders.value.findIndex((item) => item && item.id === order.id);
        if (index !== -1) {
            purchaseOrders.value[index] = order;
        } else {
            purchaseOrders.value.unshift(order);
        }
    }

    async function addOrder(order: Order) {
        try {
            const res = await api.post<Order>('/orders', order);
            const normalized = normalizeOrderPayload(res);
            // Replace the temp order with the real one from DB (with ID)
            if (!normalized) {
                console.warn('[ProcurementStore] invalid payload from POST /orders:', {
                    id: (res as any)?.id,
                    order_no: (res as any)?.order_no,
                    created_at: (res as any)?.created_at,
                    payloadType: typeof res,
                    payloadKeys: res && typeof res === 'object' ? Object.keys(res as any) : []
                });
                throw new Error('Invalid order payload returned by /api/orders');
            }
            purchaseOrders.value.unshift(normalized);
            return normalized;
        } catch (e) {
            console.error('Failed to add order', e);
            throw e;
        }
    }

    async function deleteOrder(id: number) {
        try {
            await api.delete(`/orders/${id}`);
        } catch (e) {
            if (!isNotFoundError(e)) {
                console.error('Failed to delete order', e);
                throw e;
            }
            console.warn('[ProcurementStore] deleteOrder got 404, treating as already deleted', { id });
        } finally {
            // Keep client state idempotent with server-side delete semantics.
            purchaseOrders.value = purchaseOrders.value.filter(o => o && o.id !== id);
        }
    }

    async function bulkDelete(ids: number[]) {
        loading.value = true;
        try {
            const results = await Promise.allSettled(ids.map(id => api.delete(`/orders/${id}`)));
            const fatalErrors = results
                .map((result, idx) => ({ result, id: ids[idx] }))
                .filter(({ result }) => result.status === 'rejected')
                .map(({ result, id }) => ({ id, reason: (result as PromiseRejectedResult).reason }))
                .filter(({ reason }) => !isNotFoundError(reason));

            if (fatalErrors.length > 0) {
                console.error('Bulk delete failed', fatalErrors);
                throw (fatalErrors[0] as any).reason;
            }
        } catch (e) {
            console.error('Failed to delete order', e);
            throw e;
        } finally {
            purchaseOrders.value = purchaseOrders.value.filter(o => o && !ids.includes(o.id));
            loading.value = false;
        }
    }

    async function bulkUpdateStatus(ids: number[], status: Order['status']) {
        loading.value = true;
        try {
            const results = await Promise.all(ids.map(id => api.put<Order>(`/orders/${id}`, { status })));
            let shouldRefetch = false;

            ids.forEach((id, resultIndex) => {
                const index = purchaseOrders.value.findIndex(o => o && o.id === id);
                if (index !== -1) {
                    const normalized = normalizeOrderPayload(results[resultIndex]);
                    if (normalized) {
                        purchaseOrders.value[index] = normalized;
                    } else {
                        shouldRefetch = true;
                        purchaseOrders.value[index] = {
                            ...purchaseOrders.value[index],
                            status,
                        };
                    }
                }
            });

            if (shouldRefetch) {
                await fetchOrders();
            }
        } catch (e) {
            console.error('Bulk update failed', e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function markOrderArrived(id: number, payload: {
        arrived_at?: string;
        arrived_by?: string;
        arrived_remark?: string;
    } = {}) {
        try {
            const res = await api.post<Order>(`/orders/${id}/arrive`, payload);
            const normalized = normalizeOrderPayload(res);
            if (!normalized) {
                throw new Error('Invalid order payload returned by POST /api/orders/:id/arrive');
            }
            replaceOrderInState(normalized);
            return normalized;
        } catch (e) {
            console.error('Failed to mark order arrived', e);
            throw e;
        }
    }

    async function stockInOrder(id: number, payload: {
        stocked_in_at?: string;
        operator?: string;
        remark?: string;
        items?: StockInOrderItemInput[];
    } = {}) {
        try {
            const res = await api.post<Order>(`/orders/${id}/stock-in`, payload);
            const normalized = normalizeOrderPayload(res);
            if (!normalized) {
                throw new Error('Invalid order payload returned by POST /api/orders/:id/stock-in');
            }
            replaceOrderInState(normalized);
            return normalized;
        } catch (e) {
            console.error('Failed to stock in order', e);
            throw e;
        }
    }

    function clearOrders() {
        purchaseOrders.value = [];
        ordersTotal.value = 0;
        ordersPage.value = 1;
        ordersPageSize.value = 20;
        serverPaginationEnabled.value = false;
    }

    async function updateOrder(id: number, updates: Partial<Order>) {
        try {
            const res = await api.put<Order>(`/orders/${id}`, updates);
            const normalized = normalizeOrderPayload(res);
            const index = purchaseOrders.value.findIndex(o => o && o.id === id);
            if (index !== -1) {
                if (!normalized) {
                    console.warn('[ProcurementStore] invalid payload from PUT /orders/:id', {
                        id: (res as any)?.id,
                        order_no: (res as any)?.order_no,
                        created_at: (res as any)?.created_at
                    });
                    throw new Error('Invalid order payload returned by PUT /api/orders/:id');
                }
                purchaseOrders.value[index] = normalized;
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

    return {
        purchaseOrders,
        sortedOrders,
        ordersTotal,
        ordersPage,
        ordersPageSize,
        serverPaginationEnabled,
        query,
        summarySnapshot,
        facetCounts,
        loading,
        fetchOrders,
        fetchAllOrders,
        addOrder,
        deleteOrder,
        bulkDelete,
        bulkUpdateStatus,
        markOrderArrived,
        stockInOrder,
        updateOrder,
        clearOrders,
        exportToCSV
    };
});
