import { onBeforeUnmount, ref, watch } from 'vue';
import { formulaProfileApi, type FormulaCollectionProfileDetail } from '@/services/formulaProfileApi';
import type {
  FormulaBOMItem,
  FormulaDetail,
  FormulaRevisionMeta,
} from '@/types/formula';
import { useToastStore } from '@/stores/useToastStore';
import { BOM_MATERIAL_CATEGORIES, type FormulaValidationErrors } from '@/features/formulas/types';
import { useDirtyBeforeUnload } from '@/features/formulas/composables/useDirtyBeforeUnload';
import { useFormulaList } from '@/features/formulas/composables/useFormulaList';
import { useFormulaDetail } from '@/features/formulas/composables/useFormulaDetail';
import { useFormulaLocalDraft } from '@/features/formulas/composables/useFormulaLocalDraft';
import {
  isLocalFormulaKey,
  isMeaningfulBomRow,
  normalizeBomRow,
  normalizeServerErrors,
  validateFormulaDraft,
} from '@/features/formulas/model/formulaDraft';

export function useFormulaManager() {
  const { toast } = useToastStore();

  const saving = ref(false);
  const publishing = ref(false);

  const selectedKey = ref('');
  const detail = ref<FormulaDetail | null>(null);
  const draftRevision = ref<FormulaRevisionMeta | null>(null);
  const publishedRevision = ref<FormulaRevisionMeta | null>(null);
  const revisions = ref<FormulaRevisionMeta[]>([]);
  const historyOpen = ref(false);

  const initialized = ref(false);
  const stopHandles: Array<() => void> = [];

  const changeNote = ref('');
  const collectionProfileDetail = ref<FormulaCollectionProfileDetail | null>(null);
  const collectionProfileDiff = ref<any>(null);
  const collectionProfileImpact = ref<any>(null);
  const collectionProfileReplay = ref<any>(null);
  const collectionProfileReferenceCheck = ref<any>(null);
  const collectionSupplierMaster = ref<any[]>([]);

  const bomDraft = ref<FormulaBOMItem[]>([]);
  const validationErrors = ref<FormulaValidationErrors>({});

  function clearSelection() {
    selectedKey.value = '';
    detail.value = null;
    draftRevision.value = null;
    publishedRevision.value = null;
    revisions.value = [];
    bomDraft.value = [];
  }

  const {
    localDraftSummary,
    localDraftDetail,
    isLocalDraftSelected,
    isDirty,
    markDirty,
    resetDraftWithDetail,
    clearLocalDraft,
    createLocalDraft,
  } = useFormulaLocalDraft({
    selectedKey,
    detail,
    bomDraft,
    validationErrors,
  });

  function localValidate(options: { allowEmptyBom?: boolean; allowEmptyFormulaKey?: boolean } = {}): boolean {
    validationErrors.value = validateFormulaDraft(detail.value, bomDraft.value, options);
    return Object.keys(validationErrors.value).length === 0;
  }

  const {
    loadRemoteDetail,
    applyLocalDraftDetail,
  } = useFormulaDetail({
    selectedKey,
    detail,
    draftRevision,
    publishedRevision,
    revisions,
    bomDraft,
    validationErrors,
    resetDraftWithDetail,
    onLoadError: () => toast({ title: '加载配方详情失败', variant: 'destructive' }),
  });

  async function loadDetail(formulaKey: string, silent = false) {
    if (!silent && isDirty.value) {
      const confirmed = window.confirm('当前有未保存改动，确定切换配方吗？');
      if (!confirmed) return;
    }

    if (isLocalFormulaKey(formulaKey)) {
      if (!localDraftDetail.value) return;
      applyLocalDraftDetail(formulaKey, {
        ...localDraftDetail.value,
        bom: localDraftDetail.value.bom.map((item) => normalizeBomRow(item))
      }, localDraftDetail.value.bom.map((item) => normalizeBomRow(item)));
      isDirty.value = true;
      return;
    }

    await loadRemoteDetail(formulaKey);
  }

  const {
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
  } = useFormulaList({
    selectedKey,
    localDraftSummary,
    isLocalFormulaKey,
    loadDetail,
    clearSelection,
    onLoadError: () => toast({ title: '加载配方列表失败', variant: 'destructive' }),
  });

  function addBomRow() {
    bomDraft.value.push(normalizeBomRow());
    markDirty();
  }

  function removeBomRow(index: number) {
    bomDraft.value.splice(index, 1);
    markDirty();
  }

  async function createFormula() {
    if (localDraftSummary.value) {
      selectedKey.value = localDraftSummary.value.formulaKey;
      await loadDetail(localDraftSummary.value.formulaKey, true);
      toast({ title: '当前已有未保存新增配方', variant: 'destructive' });
      return;
    }

    if (isDirty.value) {
      const confirmed = window.confirm('当前有未保存改动，确定创建新的空白配方吗？');
      if (!confirmed) return;
    }

    createLocalDraft(list, clearSelection, changeNote);
    toast({ title: '已创建空白配方，请在右侧填写后保存', variant: 'success' });
  }

  async function saveDraft() {
    if (!detail.value) return;
    const creatingLocalDraft = !draftRevision.value && isLocalDraftSelected.value;
    const allowEmptyBom = creatingLocalDraft;
    const allowEmptyFormulaKey = creatingLocalDraft;
    if (!localValidate({ allowEmptyBom, allowEmptyFormulaKey })) {
      toast({ title: '本地校验未通过，请修复错误后再保存', variant: 'destructive' });
      return;
    }

    const normalizedBom = bomDraft.value.map((row) => normalizeBomRow(row));
    const meaningfulBom = normalizedBom.filter((row) => isMeaningfulBomRow(row));
    saving.value = true;
    try {
      if (creatingLocalDraft) {
        const created = await formulaProfileApi.create({
          formulaKey: detail.value.formulaKey,
          displayName: detail.value.displayName,
          bom: meaningfulBom,
          changeNote: changeNote.value || '创建配方'
        });

        clearLocalDraft(removeListItem);
        selectedKey.value = created.formula.formulaKey;
        isDirty.value = false;
        changeNote.value = '';
        page.value = 1;
        await loadList();
        await loadDetail(created.formula.formulaKey, true);
        toast({ title: '草稿已保存', variant: 'success' });
        return;
      }

      if (!draftRevision.value) return;
      const oldFormulaKey = selectedKey.value || detail.value.formulaKey;
      const result = await formulaProfileApi.updateDraft(oldFormulaKey, {
        revision: draftRevision.value.revision,
        formulaKey: detail.value.formulaKey,
        displayName: detail.value.displayName,
        bom: normalizedBom,
        changeNote: changeNote.value || '更新草稿'
      });

      draftRevision.value = result.revision;
      detail.value.bom = normalizedBom;
      selectedKey.value = detail.value.formulaKey;
      isDirty.value = false;
      changeNote.value = '';
      page.value = 1;
      await loadList();
      await loadDetail(detail.value.formulaKey, true);
      toast({ title: '草稿已保存', variant: 'success' });
    } catch (error: any) {
      const serverErrors = error?.response?.data?.errors;
      if (Array.isArray(serverErrors)) {
        validationErrors.value = {
          ...validationErrors.value,
          ...normalizeServerErrors(serverErrors)
        };
      }
      const message = serverErrors?.[0]?.message || '保存失败';
      toast({ title: '保存失败', description: message, variant: 'destructive' });
    } finally {
      saving.value = false;
    }
  }

  async function publishFormula() {
    if (!detail.value || !draftRevision.value) return;
    if (!window.confirm('发布后将影响物料计算，确认发布？')) return;

    publishing.value = true;
    try {
      const result = await formulaProfileApi.publish(selectedKey.value || detail.value.formulaKey, {
        fromRevision: draftRevision.value.revision,
        changeNote: changeNote.value || '发布版本'
      });

      publishedRevision.value = result.revision;
      changeNote.value = '';
      isDirty.value = false;
      await loadDetail(detail.value.formulaKey, true);
      page.value = 1;
      await loadList();
      toast({ title: '发布成功', variant: 'success' });
    } catch (error: any) {
      const message = error?.response?.data?.errors?.[0]?.message || '发布失败';
      toast({ title: '发布失败', description: message, variant: 'destructive' });
    } finally {
      publishing.value = false;
    }
  }

  async function archiveFormula() {
    if (!detail.value || isLocalDraftSelected.value) return;
    const reason = window.prompt('请输入归档原因（可选）：') || '';
    try {
      await formulaProfileApi.archive(selectedKey.value || detail.value.formulaKey, { reason });
      toast({ title: '已归档', variant: 'success' });
      page.value = 1;
      await loadList();
      await loadDetail(detail.value.formulaKey, true);
    } catch {
      toast({ title: '归档失败', variant: 'destructive' });
    }
  }

  async function rollbackFormula(revision: number) {
    if (!detail.value) return;
    if (!window.confirm(`确认回滚到 revision ${revision}？`)) return;

    const reason = window.prompt('请输入回滚原因（可选）：') || '';
    try {
      await formulaProfileApi.rollback(selectedKey.value || detail.value.formulaKey, { targetRevision: revision, reason });
      toast({ title: '回滚成功', variant: 'success' });
      await loadDetail(detail.value.formulaKey, true);
      page.value = 1;
      await loadList();
    } catch {
      toast({ title: '回滚失败', variant: 'destructive' });
    }
  }

  async function deleteFormula() {
    if (!detail.value) return;
    if (isLocalDraftSelected.value) {
      const confirmed = window.confirm('确认放弃当前新增配方吗？');
      if (!confirmed) return;
      clearLocalDraft(removeListItem);
      clearSelection();
      isDirty.value = false;
      changeNote.value = '';
      if (list.value.length > 0) {
        await loadDetail(list.value[0].formulaKey, true);
      }
      toast({ title: '已取消新增配方', variant: 'success' });
      return;
    }

    const confirmed = window.confirm(`确认删除配方 ${detail.value.formulaKey} 吗？删除后不可恢复。`);
    if (!confirmed) return;

    const reason = window.prompt('请输入删除原因（可选）：') || '';
    try {
      await formulaProfileApi.remove(selectedKey.value || detail.value.formulaKey, { reason });
      toast({ title: '配方已删除', variant: 'success' });
      clearSelection();
      page.value = 1;
      await loadList();
    } catch (error: any) {
      const message = error?.response?.data?.errors?.[0]?.message || '删除失败';
      toast({ title: '删除失败', description: message, variant: 'destructive' });
    }
  }

  function initialize() {
    if (initialized.value) return;
    initialized.value = true;

    stopHandles.push(watch([keyword, statusFilter], () => {
      page.value = 1;
      total.value = 0;
      loadList({ append: false });
    }));

    const dirtyGuard = useDirtyBeforeUnload(isDirty);
    stopHandles.push(dirtyGuard.stop);

    Promise.all([
      formulaProfileApi.profileDetail(),
      formulaProfileApi.profileDiff(),
      formulaProfileApi.profileImpact(),
      formulaProfileApi.profileReplay(),
      formulaProfileApi.profileReferenceCheck(),
      formulaProfileApi.supplierMaster(),
    ]).then(([detail, diff, impact, replay, referenceCheck, supplierMaster]) => {
      collectionProfileDetail.value = detail;
      collectionProfileDiff.value = diff;
      collectionProfileImpact.value = impact;
      collectionProfileReplay.value = replay;
      collectionProfileReferenceCheck.value = referenceCheck;
      collectionSupplierMaster.value = supplierMaster;
    }).catch((error) => {
      console.warn('Failed to load formula collection profile diagnostics', error);
      collectionProfileDetail.value = null;
      collectionProfileDiff.value = null;
      collectionProfileImpact.value = null;
      collectionProfileReplay.value = null;
      collectionProfileReferenceCheck.value = null;
      collectionSupplierMaster.value = [];
    });

    loadList();
  }

  onBeforeUnmount(() => {
    window.onbeforeunload = null;
    stopHandles.forEach((stop) => stop());
    stopHandles.length = 0;
    initialized.value = false;
  });

  return {
    loading,
    loadingMore,
    saving,
    publishing,
    list,
    total,
    displayTotal,
    selectedKey,
    detail,
    draftRevision,
    publishedRevision,
    revisions,
    historyOpen,
    keyword,
    statusFilter,
    isLocalDraftSelected,
    hasMore,
    changeNote,
    collectionProfileDetail,
    collectionProfileDiff,
    collectionProfileImpact,
    collectionProfileReplay,
    collectionProfileReferenceCheck,
    collectionSupplierMaster,
    bomDraft,
    validationErrors,
    bomMaterialCategories: BOM_MATERIAL_CATEGORIES,
    markDirty,
    loadNextPage,
    loadDetail,
    addBomRow,
    removeBomRow,
    createFormula,
    saveDraft,
    publishFormula,
    archiveFormula,
    rollbackFormula,
    deleteFormula,
    initialize
  };
}
