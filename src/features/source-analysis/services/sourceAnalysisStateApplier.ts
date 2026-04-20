import type { Ref } from 'vue';
import type { SourceAnalysisResult } from '@/types/sourceAnalysis';

export interface SourceAnalysisStateRefs {
  materialRequirements: Ref<any>;
  hardwareRequirements: Ref<any>;
  analysisResult: Ref<SourceAnalysisResult | null>;
}

export function applySourceAnalysisResult(
  state: SourceAnalysisStateRefs,
  result: SourceAnalysisResult,
) {
  state.analysisResult.value = result;
  state.materialRequirements.value = result.materialRequirements;
  state.hardwareRequirements.value = result.hardwareRequirements;
}

export function clearSourceAnalysisResult(state: SourceAnalysisStateRefs) {
  state.analysisResult.value = null;
  state.materialRequirements.value = null;
  state.hardwareRequirements.value = null;
}
