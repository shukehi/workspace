
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { createSourceOrderWorkflow } from '@/features/source-analysis/services/sourceOrderWorkflow';
import { useSourceAnalysisDerivedState } from '@/features/source-analysis/composables/useSourceAnalysisDerivedState';
import { useSourceOrderSelectors } from '@/features/source-analysis/composables/useSourceOrderSelectors';
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
    const {
        hasOrder,
        orderItems,
    } = useSourceOrderSelectors(currentOrder);

    // Flattened Data for Views
    const {
        flatMaterials,
        flatCylinders,
        flatLocks,
        flatHandles,
        flatForks,
        flatAccessories,
        flatPackaging,
    } = useSourceAnalysisDerivedState(analysisResult);

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
        flatAccessories,
        flatPackaging,
        applyContractData,
        fetchContract,
        loadHistoryContractByCode,
        calculateMaterials,
        clear
    };
});
