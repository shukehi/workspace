import { ref } from 'vue';

interface SourceLoadStore {
  loadHistoryContractByCode: (contractCode: string) => Promise<unknown>;
}

interface SourceLoadFeedback {
  toast: (payload: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success';
  }) => void;
  push: (path: string) => unknown;
}

export function useContractsHistorySourceLoadState(
  store: SourceLoadStore,
  feedback: SourceLoadFeedback,
) {
  const loadingContractId = ref<string | null>(null);

  async function loadContract(code: string) {
    loadingContractId.value = code;
    try {
      await store.loadHistoryContractByCode(code);
      feedback.toast({
        title: '加载成功',
        description: `合同 ${code} 已成功载入数据源`,
        variant: 'success',
      });
      feedback.push('/source');
    } catch (e: any) {
      feedback.toast({
        title: '加载失败',
        description: e.message || '由于未知错误无法加载该合同',
        variant: 'destructive',
      });
    } finally {
      loadingContractId.value = null;
    }
  }

  return {
    loadingContractId,
    loadContract,
  };
}
