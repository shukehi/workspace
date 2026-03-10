
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/lib/api';
import { analyzeSourceOrder } from '@/services/sourceAnalysis';
import { loadSourceAnalysisConfig } from '@/services/sourceAnalysisConfig';
import type { SourceAnalysisResult } from '@/types/sourceAnalysis';

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
    const analysisResult = ref<SourceAnalysisResult | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    // Getters
    const hasOrder = computed(() => !!currentOrder.value);
    const orderItems = computed(() => currentOrder.value?.list || []);

    // Flattened Data for Views
    const flatMaterials = computed(() => analysisResult.value?.flatMaterials || []);
    const flatCylinders = computed(() => analysisResult.value?.flatCylinders || []);
    const flatHandles = computed(() => analysisResult.value?.flatHandles || []);
    const flatForks = computed(() => analysisResult.value?.flatForks || []);
    const flatPackaging = computed(() => analysisResult.value?.flatPackaging || []);

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
            const config = await loadSourceAnalysisConfig();
            const result = analyzeSourceOrder({
                order: currentOrder.value,
                items: itemsToProcess,
                config
            });

            analysisResult.value = result;
            materialRequirements.value = result.materialRequirements;
            hardwareRequirements.value = result.hardwareRequirements;
        } catch (e) {
            console.error('Calculation failed', e);
            analysisResult.value = null;
            materialRequirements.value = null;
            hardwareRequirements.value = null;
            error.value = 'Material calculation failed';
        }
    }

    function clear() {
        currentOrder.value = null;
        analysisResult.value = null;
        materialRequirements.value = null;
        hardwareRequirements.value = null;
        error.value = null;
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
        analysisResult,
        loading,
        error,
        hasOrder,
        orderItems,
        flatMaterials,
        flatCylinders,
        flatHandles,
        flatForks,
        flatPackaging,
        applyContractData,
        fetchContract,
        loadHistoryContractByCode,
        calculateMaterials,
        clear
    };
});
