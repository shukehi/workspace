import { computed, type Ref } from 'vue';
import type { SourceAnalysisResult } from '@/types/sourceAnalysis';

export function useSourceAnalysisDerivedState(analysisResult: Ref<SourceAnalysisResult | null>) {
  const flatMaterials = computed(() => analysisResult.value?.flatMaterials || []);
  const flatCylinders = computed(() => analysisResult.value?.flatCylinders || []);
  const flatLocks = computed(() => analysisResult.value?.flatLocks || []);
  const flatHandles = computed(() => analysisResult.value?.flatHandles || []);
  const flatForks = computed(() => analysisResult.value?.flatForks || []);
  const flatAccessories = computed(() => analysisResult.value?.flatAccessories || []);
  const flatPackaging = computed(() => analysisResult.value?.flatPackaging || []);

  return {
    flatMaterials,
    flatCylinders,
    flatLocks,
    flatHandles,
    flatForks,
    flatAccessories,
    flatPackaging,
  };
}
