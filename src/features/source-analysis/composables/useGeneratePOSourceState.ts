import { computed } from 'vue';

interface GeneratePOSourceStore {
  hasOrder: boolean;
  currentOrder: any;
}

export function useGeneratePOSourceState(sourceStore: GeneratePOSourceStore) {
  const hasOrder = computed(() => sourceStore.hasOrder);
  const currentOrder = computed(() => sourceStore.currentOrder);
  const currentOrderItems = computed(() => sourceStore.currentOrder?.list || []);
  const currentContractCode = computed(() => {
    const code = sourceStore.currentOrder?.code;
    return code === undefined || code === null ? '' : String(code).trim();
  });

  return {
    hasOrder,
    currentOrder,
    currentOrderItems,
    currentContractCode,
  };
}
