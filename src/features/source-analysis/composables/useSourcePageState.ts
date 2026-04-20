import { computed, ref } from 'vue';
import { useSourceStore } from '@/stores/useSourceStore';
import { useSourcePageTableState } from './useSourcePageTableState';

type LongTextMode = 'clip' | 'hover' | 'expand';

interface SourcePageStateStore {
  loading: boolean;
  hasOrder: boolean;
  orderItems: any[];
  currentOrder: any;
  fetchContract: (contractId: string) => void | Promise<void>;
}

interface SourcePageStateOptions {
  store?: SourcePageStateStore;
  renderLongTextCell?: (params: {
    text: string | number | null | undefined;
    mode: LongTextMode;
    maxWidth: number;
    label: string;
  }) => unknown;
}

export function useSourcePageState(options: SourcePageStateOptions = {}) {
  const store = options.store || useSourceStore();
  const contractInput = ref('');
  const longTextMode = ref<LongTextMode>('hover');
  const historyDialogOpen = ref(false);

  const {
    sourceTableMinWidth,
    columns,
  } = useSourcePageTableState(longTextMode, options);

  function handleSearch() {
    const contractCode = contractInput.value.trim();
    if (!contractCode) return;
    void store.fetchContract(contractCode);
  }

  function handleHistoryLoaded(contractCode: string) {
    contractInput.value = contractCode;
  }

  return {
    contractInput,
    longTextMode,
    historyDialogOpen,
    sourceTableMinWidth,
    columns,
    loading: computed(() => store.loading),
    searchButtonLabel: computed(() => store.loading ? 'Fetching...' : '获取合同'),
    hasOrder: computed(() => store.hasOrder),
    orderItems: computed(() => store.orderItems),
    currentOrder: computed(() => store.currentOrder),
    handleSearch,
    handleHistoryLoaded,
  };
}
