
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
    cacheErpContractSnapshot,
    fetchErpContract,
    fetchHistoryContractByCode,
} from '@/features/source-analysis/services/sourceContractService';
import {
    clearSourceOrderSnapshot,
    loadSourceOrderSnapshot,
    persistSourceOrderSnapshot,
} from '@/features/source-analysis/services/sourceOrderSnapshot';
import { sourceAnalysisRuntime } from '@/features/source-analysis/services/sourceAnalysisRuntime';
import type { SourceAnalysisResult } from '@/types/sourceAnalysis';

export const useSourceStore = defineStore('source', () => {
    // State
    const currentOrder = ref<any>(loadSourceOrderSnapshot()); // Raw ERP Order
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
    const flatLocks = computed(() => analysisResult.value?.flatLocks || []);
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
        persistSourceOrderSnapshot(orderData);

        if (persistCache) {
            try {
                await cacheErpContractSnapshot(orderData);
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
            const orderData = await fetchErpContract(contractId);

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
            const rawOrder = await fetchHistoryContractByCode(contractCode);

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
            const result = await sourceAnalysisRuntime.analyzeOrder({
                order: currentOrder.value,
                items: itemsToProcess,
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
        clearSourceOrderSnapshot();
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
        flatLocks,
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
