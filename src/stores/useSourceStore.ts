
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/lib/api';
import { configLoader } from '@/services/configLoader';
import { calculateMaterialRequirements } from '@/lib/erp-engine/materialDecomposer';
import { extractCylinderData, extractLockForkData, extractPackagingData } from '@/lib/erp-engine/dataExtractors';
import type { ContractHistoryRow } from '@/types/source';

type ContractHistoryListResponse = {
    rows?: ContractHistoryRow[];
    total?: number;
};

const ORDER_SNAPSHOT_KEY = 'source_current_order_snapshot';

function loadOrderSnapshot() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(ORDER_SNAPSHOT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.list)) return null;
        return parsed;
    } catch {
        return null;
    }
}

function persistOrderSnapshot(orderData: any) {
    if (typeof window === 'undefined') return;
    try {
        if (!orderData || !Array.isArray(orderData.list)) {
            window.localStorage.removeItem(ORDER_SNAPSHOT_KEY);
            return;
        }
        window.localStorage.setItem(ORDER_SNAPSHOT_KEY, JSON.stringify(orderData));
    } catch (e) {
        console.warn('[SourceStore] persist order snapshot failed:', e);
    }
}

function clearOrderSnapshot() {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(ORDER_SNAPSHOT_KEY);
    } catch {}
}

export const useSourceStore = defineStore('source', () => {
    // State
    const currentOrder = ref<any>(loadOrderSnapshot()); // Raw ERP Order
    const materialRequirements = ref<any>(null);
    const hardwareRequirements = ref<any>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const historyLoading = ref(false);
    const historyRows = ref<ContractHistoryRow[]>([]);
    const historyPage = ref(1);
    const historyPageSize = ref(20);
    const historyTotal = ref(0);
    const historyFilters = ref({
        code: '',
        customer: ''
    });
    const historySelected = ref<ContractHistoryRow | null>(null);

    // Getters
    const hasOrder = computed(() => !!currentOrder.value);
    const orderItems = computed(() => currentOrder.value?.list || []);
    const historyTotalPages = computed(() => Math.max(1, Math.ceil(historyTotal.value / historyPageSize.value)));

    // Flattened Data for Views
    const flatMaterials = computed(() => {
        if (!materialRequirements.value?.requirements) return [];
        const list: any[] = [];
        Object.values(materialRequirements.value.requirements).forEach((group: any) => {
            group.materials.forEach((mat: any) => {
                list.push({ ...mat, supplierName: group.supplierName });
            });
        });
        return list;
    });

    const flatCylinders = computed(() => hardwareRequirements.value?.cylinders || []);
    const flatForks = computed(() => hardwareRequirements.value?.lockForks || []);
    const flatPackaging = computed(() => {
        const pkgMap = hardwareRequirements.value?.packaging || {};
        return Object.values(pkgMap);
    });

    // Actions
    async function applyContractData(orderData: any, options: { persistCache?: boolean } = {}) {
        const persistCache = options.persistCache ?? true;

        if (!orderData || !Array.isArray(orderData.list)) {
            throw new Error('Contract not found or empty');
        }

        currentOrder.value = orderData;
        persistOrderSnapshot(orderData);

        if (persistCache) {
            try {
                await api.post('/contracts/cache', orderData);
            } catch (cacheErr) {
                console.warn('[SourceStore] failed to cache ERP contract snapshot:', cacheErr);
            }
        }

        await calculateMaterials();
    }

    async function fetchContract(contractId: string) {
        if (!contractId) return;

        loading.value = true;
        error.value = null;

        try {
            // 1. Fetch from ERP Proxy
            // Note: usage of 'any' because strict typing of raw ERP response is complex
            // Remove /api prefix as it is handled by baseURL
            // Use 'code' instead of 'contractNo' based on user feedback
            const res = await api.get<any>(`/getOutContractDetail?code=${contractId}`);

            // Adapter for different response structures
            // Legacy api often returns { rows: [...] } or direct object
            let orderData = res;
            if (res.rows && Array.isArray(res.rows) && res.rows.length > 0) {
                orderData = res.rows[0];
            } else if (Array.isArray(res)) {
                orderData = res[0];
            }

            await applyContractData(orderData, { persistCache: true });

        } catch (e: any) {
            console.error('Fetch failed', e);
            error.value = e.message || 'Failed to fetch contract';
            // Keep the previous loaded order to avoid clearing analysis context on transient fetch failures.
        } finally {
            loading.value = false;
        }
    }

    async function fetchHistoryContracts(resetPage = false) {
        if (resetPage) historyPage.value = 1;

        historyLoading.value = true;
        error.value = null;

        try {
            const res = await api.get<ContractHistoryListResponse>('/contracts', {
                params: {
                    page: historyPage.value,
                    pageSize: historyPageSize.value,
                    code: historyFilters.value.code || undefined,
                    customer: historyFilters.value.customer || undefined
                }
            });

            historyRows.value = Array.isArray(res?.rows) ? res.rows : [];
            historyTotal.value = Number(res?.total || 0);

            if (
                historySelected.value &&
                !historyRows.value.some((row) => row.contract_code === historySelected.value?.contract_code)
            ) {
                historySelected.value = null;
            }
        } catch (e: any) {
            console.error('Fetch history contracts failed', e);
            error.value = e.message || '历史合同列表加载失败，请稍后重试';
            historyRows.value = [];
            historyTotal.value = 0;
        } finally {
            historyLoading.value = false;
        }
    }

    async function loadHistoryContractByCode(code: string) {
        const contractCode = String(code || '').trim();
        if (!contractCode) {
            throw new Error('合同号不能为空');
        }

        loading.value = true;
        error.value = null;

        try {
            const cached = await api.get<any>(`/contracts/${encodeURIComponent(contractCode)}`);
            const rawOrder = cached?.raw_json;

            if (!rawOrder || !Array.isArray(rawOrder.list)) {
                throw new Error('历史合同数据不完整，无法加载');
            }

            await applyContractData(rawOrder, { persistCache: false });
            return rawOrder;
        } catch (e: any) {
            console.error('Load history contract failed', e);
            const message = e?.response?.status === 404
                ? '未找到历史合同'
                : (e.message || '历史合同加载失败，请稍后重试');
            error.value = message;
            throw new Error(message);
        } finally {
            loading.value = false;
        }
    }

    async function calculateMaterials(itemsToProcess?: any[]) {
        if (!currentOrder.value) return;

        try {
            // Ensure config is loaded
            await configLoader.loadAll();
            // Always try refreshing published formulas so material analysis reflects latest changes.
            await configLoader.refreshFormulas();

            // Use provided items or default to all items from current order
            const targetItems = itemsToProcess || currentOrder.value.list;
            
            if (!targetItems || targetItems.length === 0) {
                materialRequirements.value = null;
                hardwareRequirements.value = null;
                return;
            }

            const items = targetItems.map((item: any, index: number) => ({
                ...item,
                _originOrder: currentOrder.value.code,
                _originIndex: index
            }));

            const result = calculateMaterialRequirements(
                items,
                configLoader.getFormulas(),
                configLoader.getMaterials()
            );

            const hardwareResult = {
                cylinders: extractCylinderData(targetItems, currentOrder.value, configLoader.getCylinderMapping()),
                lockForks: extractLockForkData(targetItems, currentOrder.value, configLoader.getLockForkMapping()),
                packaging: extractPackagingData(targetItems, configLoader.getPackagingMapping())
            };

            materialRequirements.value = result;
            hardwareRequirements.value = hardwareResult;

        } catch (e) {
            console.error('Calculation failed', e);
            materialRequirements.value = null;
            hardwareRequirements.value = null;
            error.value = 'Material calculation failed';
        }
    }

    function clear() {
        currentOrder.value = null;
        materialRequirements.value = null;
        hardwareRequirements.value = null;
        error.value = null;
        historySelected.value = null;
        clearOrderSnapshot();
    }

    // Rehydrate analysis data after browser refresh if an order snapshot exists.
    if (currentOrder.value && Array.isArray(currentOrder.value.list)) {
        void calculateMaterials().catch((e) => {
            console.warn('[SourceStore] failed to re-calculate materials from snapshot:', e);
        });
    }

    return {
        currentOrder,
        materialRequirements,
        hardwareRequirements,
        loading,
        error,
        historyLoading,
        historyRows,
        historyPage,
        historyPageSize,
        historyTotal,
        historyTotalPages,
        historyFilters,
        historySelected,
        hasOrder,
        orderItems,
        flatMaterials,
        flatCylinders,
        flatForks,
        flatPackaging,
        applyContractData,
        fetchContract,
        fetchHistoryContracts,
        loadHistoryContractByCode,
        calculateMaterials,
        clear
    };
});
