import type { Ref } from 'vue';
import { clearSourceAnalysisResult, type SourceAnalysisStateRefs } from './sourceAnalysisStateApplier';
import { clearSourceOrderContractData, type SourceOrderContractStateRefs } from './sourceOrderContractStateApplier';

export interface SourceOrderClearStateRefs extends SourceAnalysisStateRefs, SourceOrderContractStateRefs {
  error: Ref<string | null>;
}

export function clearSourceOrderWorkflowState(
  state: SourceOrderClearStateRefs,
  clearSourceOrderSnapshot: () => void,
) {
  clearSourceOrderContractData(state);
  clearSourceAnalysisResult(state);
  state.error.value = null;
  clearSourceOrderSnapshot();
}
