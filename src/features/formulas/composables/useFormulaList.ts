import { computed, ref, type Ref } from 'vue';
import { formulaApi } from '@/services/formulaApi';
import type { FormulaSummary } from '@/types/formula';

interface FormulaListApi {
  list(params: { keyword?: string; status?: string; page?: number; pageSize?: number }): Promise<{
    items: FormulaSummary[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}

interface UseFormulaListOptions {
  selectedKey: Ref<string>;
  localDraftSummary: Ref<FormulaSummary | null>;
  isLocalFormulaKey: (formulaKey: string) => boolean;
  loadDetail: (formulaKey: string, silent?: boolean) => Promise<void>;
  clearSelection: () => void;
  onLoadError: () => void;
  api?: FormulaListApi;
}

export function useFormulaList(options: UseFormulaListOptions) {
  const {
    selectedKey,
    localDraftSummary,
    isLocalFormulaKey,
    loadDetail,
    clearSelection,
    onLoadError,
    api = formulaApi,
  } = options;

  const loading = ref(false);
  const loadingMore = ref(false);
  const list = ref<FormulaSummary[]>([]);
  const total = ref(0);
  const keyword = ref('');
  const statusFilter = ref('');
  const page = ref(1);
  const pageSize = ref(20);
  const listFetchVersion = ref(0);
  const pendingListLoads = ref(0);
  const pendingAppendLoads = ref(0);

  const displayTotal = computed(() => total.value + (localDraftSummary.value ? 1 : 0));
  const hasMore = computed(() => {
    const localCount = localDraftSummary.value ? 1 : 0;
    const remoteLoadedCount = Math.max(list.value.length - localCount, 0);
    return remoteLoadedCount < total.value;
  });

  function prependLocalDraft(listItems: FormulaSummary[]): FormulaSummary[] {
    if (!localDraftSummary.value) return listItems;
    const withoutLocal = listItems.filter((item) => item.formulaKey !== localDraftSummary.value?.formulaKey);
    return [localDraftSummary.value, ...withoutLocal];
  }

  function removeListItem(formulaKey: string) {
    list.value = list.value.filter((item) => item.formulaKey !== formulaKey);
  }

  async function loadList(options: { append?: boolean } = {}) {
    const append = Boolean(options.append);
    const requestVersion = ++listFetchVersion.value;
    if (append) {
      pendingAppendLoads.value += 1;
      loadingMore.value = true;
    } else {
      pendingListLoads.value += 1;
      loading.value = true;
    }

    try {
      const result = await api.list({
        keyword: keyword.value || undefined,
        status: statusFilter.value || undefined,
        page: page.value,
        pageSize: pageSize.value,
      });

      if (requestVersion !== listFetchVersion.value) return;

      const incoming = result.items || [];
      total.value = Number(result.total || 0);
      if (append) {
        const remoteList = list.value.filter((item) => !isLocalFormulaKey(item.formulaKey));
        const seen = new Set(remoteList.map((item) => item.formulaKey));
        const merged = incoming.filter((item) => !seen.has(item.formulaKey));
        list.value = prependLocalDraft([...remoteList, ...merged]);
      } else {
        list.value = prependLocalDraft(incoming);
      }

      const selectedExists = list.value.some((item) => item.formulaKey === selectedKey.value);
      if (!selectedExists) {
        if (list.value.length > 0) {
          await loadDetail(list.value[0].formulaKey, true);
        } else {
          clearSelection();
        }
      }
    } catch (error) {
      console.error(error);
      onLoadError();
    } finally {
      if (append) {
        pendingAppendLoads.value = Math.max(0, pendingAppendLoads.value - 1);
        loadingMore.value = pendingAppendLoads.value > 0;
      } else {
        pendingListLoads.value = Math.max(0, pendingListLoads.value - 1);
        loading.value = pendingListLoads.value > 0;
      }
    }
  }

  async function loadNextPage() {
    if (loading.value || loadingMore.value || !hasMore.value) return;
    page.value += 1;
    await loadList({ append: true });
  }

  return {
    loading,
    loadingMore,
    list,
    total,
    keyword,
    statusFilter,
    page,
    pageSize,
    displayTotal,
    hasMore,
    loadList,
    loadNextPage,
    removeListItem,
  };
}
