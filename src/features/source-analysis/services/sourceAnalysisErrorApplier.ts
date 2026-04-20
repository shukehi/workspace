import type { Ref } from 'vue';
import { clearSourceAnalysisResult, type SourceAnalysisStateRefs } from './sourceAnalysisStateApplier';

export interface SourceAnalysisErrorStateRefs extends SourceAnalysisStateRefs {
  error: Ref<string | null>;
}

export function failSourceAnalysisCalculation(
  state: SourceAnalysisErrorStateRefs,
  error: unknown,
  log: (message: string, error: unknown) => void = (message, err) => console.error(message, err),
) {
  log('Calculation failed', error);
  clearSourceAnalysisResult(state);
  state.error.value = 'Material calculation failed';
}

export function warnSourceAnalysisRehydrateFailure(
  error: unknown,
  warn: (message: string, error: unknown) => void = (message, err) => console.warn(message, err),
) {
  warn('[SourceStore] failed to re-calculate materials from snapshot:', error);
}
