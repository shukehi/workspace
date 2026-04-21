import { ref, type Ref } from 'vue';
import { formulaProfileApi } from '@/services/formulaProfileApi';
import type { FormulaBOMItem, FormulaDetail, FormulaRevisionMeta } from '@/types/formula';

interface FormulaDetailApi {
  detail(formulaKey: string): Promise<{
    formula: FormulaDetail;
    draftRevision: FormulaRevisionMeta | null;
    publishedRevision: FormulaRevisionMeta | null;
  }>;
  revisions(formulaKey: string): Promise<{
    success: boolean;
    items: FormulaRevisionMeta[];
  }>;
}

interface UseFormulaDetailOptions {
  selectedKey: Ref<string>;
  detail: Ref<FormulaDetail | null>;
  draftRevision: Ref<FormulaRevisionMeta | null>;
  publishedRevision: Ref<FormulaRevisionMeta | null>;
  revisions: Ref<FormulaRevisionMeta[]>;
  bomDraft: Ref<FormulaBOMItem[]>;
  validationErrors: Ref<Record<string, string>>;
  resetDraftWithDetail: () => void;
  onLoadError: () => void;
  api?: FormulaDetailApi;
}

export function useFormulaDetail(options: UseFormulaDetailOptions) {
  const {
    selectedKey,
    detail,
    draftRevision,
    publishedRevision,
    revisions,
    bomDraft,
    validationErrors,
    resetDraftWithDetail,
    onLoadError,
    api = formulaProfileApi,
  } = options;

  const detailLoading = ref(false);

  async function loadRevisions(formulaKey: string) {
    try {
      const data = await api.revisions(formulaKey);
      revisions.value = data.items || [];
    } catch {
      revisions.value = [];
    }
  }

  async function loadRemoteDetail(formulaKey: string) {
    detailLoading.value = true;
    try {
      const data = await api.detail(formulaKey);
      selectedKey.value = formulaKey;
      detail.value = data.formula;
      draftRevision.value = data.draftRevision;
      publishedRevision.value = data.publishedRevision;
      resetDraftWithDetail();
      await loadRevisions(formulaKey);
      return true;
    } catch (error) {
      console.error(error);
      onLoadError();
      return false;
    } finally {
      detailLoading.value = false;
    }
  }

  function applyLocalDraftDetail(nextFormulaKey: string, nextDetail: FormulaDetail, nextBomDraft: FormulaBOMItem[]) {
    selectedKey.value = nextFormulaKey;
    detail.value = nextDetail;
    draftRevision.value = null;
    publishedRevision.value = null;
    revisions.value = [];
    bomDraft.value = nextBomDraft;
    validationErrors.value = {};
  }

  return {
    detailLoading,
    loadRevisions,
    loadRemoteDetail,
    applyLocalDraftDetail,
  };
}
