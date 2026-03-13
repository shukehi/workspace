import { computed, ref, type Ref } from 'vue';
import type { FormulaBOMItem, FormulaDetail, FormulaSummary } from '@/types/formula';
import {
  LOCAL_DRAFT_KEY_PREFIX,
  isLocalFormulaKey,
  normalizeBomRow,
} from '@/features/formulas/model/formulaDraft';

interface UseFormulaLocalDraftOptions {
  selectedKey: Ref<string>;
  detail: Ref<FormulaDetail | null>;
  bomDraft: Ref<FormulaBOMItem[]>;
  validationErrors: Ref<Record<string, string>>;
}

export function useFormulaLocalDraft(options: UseFormulaLocalDraftOptions) {
  const { selectedKey, detail, bomDraft, validationErrors } = options;

  const localDraftSummary = ref<FormulaSummary | null>(null);
  const localDraftDetail = ref<FormulaDetail | null>(null);
  const isDirty = ref(false);
  const isLocalDraftSelected = computed(() => isLocalFormulaKey(selectedKey.value));

  function syncLocalDraftSnapshot() {
    if (!isLocalDraftSelected.value || !localDraftSummary.value || !detail.value) return;
    localDraftSummary.value.displayName = String(detail.value.displayName || '').trim();
    localDraftSummary.value.updatedAt = new Date().toISOString();
    localDraftDetail.value = {
      ...detail.value,
      bom: bomDraft.value.map((item) => normalizeBomRow(item)),
      updatedAt: new Date().toISOString(),
    };
  }

  function markDirty() {
    isDirty.value = true;
    syncLocalDraftSnapshot();
  }

  function resetDraftWithDetail() {
    bomDraft.value = (detail.value?.bom || []).map((item) => normalizeBomRow(item));
    validationErrors.value = {};
    isDirty.value = false;
  }

  function clearLocalDraft(removeListItem?: (formulaKey: string) => void) {
    if (localDraftSummary.value) {
      removeListItem?.(localDraftSummary.value.formulaKey);
    }
    localDraftSummary.value = null;
    localDraftDetail.value = null;
  }

  function createLocalDraft(list: Ref<FormulaSummary[]>, clearSelection: () => void, changeNote: Ref<string>) {
    const now = new Date().toISOString();
    const localKey = `${LOCAL_DRAFT_KEY_PREFIX}${Date.now()}`;
    const localId = -Date.now();

    localDraftSummary.value = {
      id: localId,
      formulaKey: localKey,
      displayName: '',
      status: 'draft',
      activeRevision: null,
      updatedAt: now,
    };
    localDraftDetail.value = {
      id: localId,
      formulaKey: '',
      displayName: '',
      status: 'draft',
      activeRevision: null,
      bom: [],
      updatedAt: now,
    };

    clearSelection();
    list.value = [localDraftSummary.value, ...list.value];
    selectedKey.value = localKey;
    detail.value = {
      ...localDraftDetail.value,
      bom: [],
    };
    validationErrors.value = {};
    bomDraft.value = [];
    changeNote.value = '';
    isDirty.value = true;
  }

  return {
    localDraftSummary,
    localDraftDetail,
    isLocalDraftSelected,
    isDirty,
    markDirty,
    resetDraftWithDetail,
    clearLocalDraft,
    createLocalDraft,
  };
}
