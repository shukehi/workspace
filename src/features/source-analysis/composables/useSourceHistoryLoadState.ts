import { computed } from 'vue';

interface SourceHistoryLoadStore {
  hasOrder: boolean;
  loading: boolean;
  error: string | null;
  loadHistoryContractByCode: (contractCode: string) => Promise<unknown>;
}

export function useSourceHistoryLoadState(store: SourceHistoryLoadStore) {
  const hasOrder = computed(() => store.hasOrder);
  const loading = computed(() => store.loading);
  const loadButtonLabel = computed(() => store.loading ? '加载中...' : '加载该合同');

  async function loadContract(contractCode: string) {
    return await store.loadHistoryContractByCode(contractCode);
  }

  function resolveLoadError(error: unknown) {
    return (error as any)?.message || store.error || '历史合同加载失败，请稍后重试';
  }

  return {
    hasOrder,
    loading,
    loadButtonLabel,
    loadContract,
    resolveLoadError,
  };
}
