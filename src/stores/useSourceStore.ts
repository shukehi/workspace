
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { createSourceOrderWorkflow } from '@/features/source-analysis/services/sourceOrderWorkflow';
import { loadSourceOrderSnapshot } from '@/features/source-analysis/services/sourceOrderSnapshot';
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

    const {
        applyContractData,
        fetchContract,
        loadHistoryContractByCode,
        calculateMaterials,
        clear,
        rehydrateFromSnapshot,
    } = createSourceOrderWorkflow({
        currentOrder,
        materialRequirements,
        hardwareRequirements,
        analysisResult,
        loading,
        error,
    });

    // Rehydrate analysis data after browser refresh if an order snapshot exists.
    void rehydrateFromSnapshot();

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
