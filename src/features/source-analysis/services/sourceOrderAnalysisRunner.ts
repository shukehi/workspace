import type { Ref } from 'vue';
import type { SourceAnalysisResult } from '@/types/sourceAnalysis';

export interface SourceOrderAnalysisRunnerState {
  currentOrder: Ref<any>;
}

export async function runSourceOrderAnalysis(options: {
  state: SourceOrderAnalysisRunnerState;
  analyzeOrder: (params: { order: any; items?: any[] }) => Promise<SourceAnalysisResult>;
  items?: any[];
}) {
  const { state, analyzeOrder, items } = options;
  if (!state.currentOrder.value) return null;

  return await analyzeOrder({
    order: state.currentOrder.value,
    items,
  });
}
