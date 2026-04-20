import { ref } from 'vue';
import { loadSourceOrderSnapshot } from '@/features/source-analysis/services/sourceOrderSnapshot';
import type { SourceAnalysisResult } from '@/types/sourceAnalysis';

export function useSourceStoreState() {
  const currentOrder = ref<any>(loadSourceOrderSnapshot());
  const materialRequirements = ref<any>(null);
  const hardwareRequirements = ref<any>(null);
  const analysisResult = ref<SourceAnalysisResult | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  return {
    currentOrder,
    materialRequirements,
    hardwareRequirements,
    analysisResult,
    loading,
    error,
  };
}
