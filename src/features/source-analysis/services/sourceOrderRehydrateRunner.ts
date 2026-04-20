import type { Ref } from 'vue';

export interface SourceOrderRehydrateState {
  currentOrder: Ref<any>;
}

export async function runSourceOrderRehydrate(options: {
  state: SourceOrderRehydrateState;
  calculateMaterials: () => Promise<void>;
  warn: (error: unknown) => void;
}) {
  const { state, calculateMaterials, warn } = options;
  if (!state.currentOrder.value || !Array.isArray(state.currentOrder.value.list)) return;

  try {
    await calculateMaterials();
  } catch (error) {
    warn(error);
  }
}
