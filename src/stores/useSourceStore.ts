
import { defineStore } from 'pinia';
import { useSourceStoreWorkflow } from '@/features/source-analysis/composables/useSourceStoreWorkflow';
import { useSourceStoreState } from '@/features/source-analysis/composables/useSourceStoreState';
import { useSourceAnalysisDerivedState } from '@/features/source-analysis/composables/useSourceAnalysisDerivedState';
import { useSourceOrderSelectors } from '@/features/source-analysis/composables/useSourceOrderSelectors';
import type { SourceAnalysisResult } from '@/types/sourceAnalysis';

export const useSourceStore = defineStore('source', () => {
    // State
    const {
        currentOrder,
        materialRequirements,
        hardwareRequirements,
        analysisResult,
        loading,
        error,
    } = useSourceStoreState();

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
        fetchContract,
        loadHistoryContractByCode,
        clear,
    } = useSourceStoreWorkflow({
        currentOrder,
        materialRequirements,
        hardwareRequirements,
        analysisResult,
        loading,
        error,
    });

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
        fetchContract,
        loadHistoryContractByCode,
        clear
    };
});
