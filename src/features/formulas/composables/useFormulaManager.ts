import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { formulaApi, type MutationError } from '@/services/formulaApi';
import type {
  FormulaBOMItem,
  FormulaDetail,
  FormulaRevisionMeta,
  FormulaSummary
} from '@/types/formula';
import { useToastStore } from '@/stores/useToastStore';
import { BOM_MATERIAL_CATEGORIES, type FormulaValidationErrors } from '@/features/formulas/types';

const LOCAL_DRAFT_KEY_PREFIX = '__local_draft__:';

function normalizeBomRow(row?: Partial<FormulaBOMItem>): FormulaBOMItem {
  return {
    materialId: String(row?.materialId || '').trim(),
    position: String(row?.position || '').trim(),
    materialCategory: (row?.materialCategory as any) || '',
    supplier: String(row?.supplier || '').trim(),
    usage: {
      single: Number(row?.usage?.single ?? 0),
      double: Number(row?.usage?.double ?? 0),
      paired: Number(row?.usage?.paired ?? 0),
    }
  };
}

function normalizeServerErrors(errors: MutationError[] | undefined): FormulaValidationErrors {
  const mapped: FormulaValidationErrors = {};
  for (const error of errors || []) {
    const key = error.field
      .replace(/^bom\[(\d+)\]$/, 'bom.$1')
      .replace(/^bom\[(\d+)\]\./, 'bom.$1.');
    mapped[key] = error.message;
  }
  return mapped;
}

function isLocalFormulaKey(formulaKey: string): boolean {
  return formulaKey.startsWith(LOCAL_DRAFT_KEY_PREFIX);
}

function isMeaningfulBomRow(row: FormulaBOMItem): boolean {
  const hasUsage = Number(row.usage.single || 0) > 0
    || Number(row.usage.double || 0) > 0
    || Number(row.usage.paired || 0) > 0;
  return Boolean(row.materialId || row.position || row.materialCategory || row.supplier || hasUsage);
}

export function useFormulaManager() {
  const { toast } = useToastStore();

  const loading = ref(false);
  const loadingMore = ref(false);
  const saving = ref(false);
  const publishing = ref(false);

  const list = ref<FormulaSummary[]>([]);
  const total = ref(0);

  const selectedKey = ref('');
  const detail = ref<FormulaDetail | null>(null);
  const draftRevision = ref<FormulaRevisionMeta | null>(null);
  const publishedRevision = ref<FormulaRevisionMeta | null>(null);
  const revisions = ref<FormulaRevisionMeta[]>([]);
  const historyOpen = ref(false);

  const keyword = ref('');
  const statusFilter = ref('');
  const page = ref(1);
  const pageSize = ref(20);
  const localDraftSummary = ref<FormulaSummary | null>(null);
  const localDraftDetail = ref<FormulaDetail | null>(null);
  const displayTotal = computed(() => total.value + (localDraftSummary.value ? 1 : 0));
  const hasMore = computed(() => {
    const localCount = localDraftSummary.value ? 1 : 0;
    const remoteLoadedCount = Math.max(list.value.length - localCount, 0);
    return remoteLoadedCount < total.value;
  });
  const isLocalDraftSelected = computed(() => isLocalFormulaKey(selectedKey.value));
  const listFetchVersion = ref(0);
  const pendingListLoads = ref(0);
  const pendingAppendLoads = ref(0);
  const initialized = ref(false);
  const stopHandles: Array<() => void> = [];

  const changeNote = ref('');

  const bomDraft = ref<FormulaBOMItem[]>([]);
  const validationErrors = ref<FormulaValidationErrors>({});
  const isDirty = ref(false);

  function markDirty() {
    isDirty.value = true;
    syncLocalDraftSnapshot();
  }

  function resetDraftWithDetail() {
    bomDraft.value = (detail.value?.bom || []).map((item) => normalizeBomRow(item));
    validationErrors.value = {};
    isDirty.value = false;
  }

  function clearSelection() {
    selectedKey.value = '';
    detail.value = null;
    draftRevision.value = null;
    publishedRevision.value = null;
    revisions.value = [];
    bomDraft.value = [];
  }

  function syncLocalDraftSnapshot() {
    if (!isLocalDraftSelected.value || !localDraftSummary.value || !detail.value) return;
    localDraftSummary.value.displayName = String(detail.value.displayName || '').trim();
    localDraftSummary.value.updatedAt = new Date().toISOString();
    localDraftDetail.value = {
      ...detail.value,
      bom: bomDraft.value.map((item) => normalizeBomRow(item)),
      updatedAt: new Date().toISOString()
    };
  }

  function localValidate(options: { allowEmptyBom?: boolean } = {}): boolean {
    const { allowEmptyBom = false } = options;
    const errors: FormulaValidationErrors = {};
    if (!detail.value?.formulaKey) errors.formulaKey = '配方编码不能为空';
    if (!detail.value?.displayName) errors.displayName = '配方名称不能为空';
    if (!allowEmptyBom && bomDraft.value.length === 0) errors.bom = 'BOM 不能为空';

    const seen = new Set<string>();
    bomDraft.value.forEach((row, idx) => {
      if (allowEmptyBom && !isMeaningfulBomRow(row)) return;
      if (!row.materialId) errors[`bom.${idx}.materialId`] = '物料ID不能为空';
      if (!row.position) errors[`bom.${idx}.position`] = '位置不能为空';
      if (!row.materialCategory) errors[`bom.${idx}.materialCategory`] = '请选择类别';
      if (!row.supplier) errors[`bom.${idx}.supplier`] = '供应商不能为空';
      ['single', 'double', 'paired'].forEach((key) => {
        const val = Number((row.usage as Record<string, unknown>)[key]);
        if (Number.isNaN(val) || val < 0) {
          errors[`bom.${idx}.usage.${key}`] = '用量必须为非负数';
        }
      });
      const dup = `${row.materialId}::${row.position}`;
      if (seen.has(dup)) errors[`bom.${idx}.dup`] = '存在重复物料+位置';
      seen.add(dup);
    });

    validationErrors.value = errors;
    return Object.keys(errors).length === 0;
  }

  function prependLocalDraft(listItems: FormulaSummary[]): FormulaSummary[] {
    if (!localDraftSummary.value) return listItems;
    const withoutLocal = listItems.filter((item) => item.formulaKey !== localDraftSummary.value?.formulaKey);
    return [localDraftSummary.value, ...withoutLocal];
  }

  function clearLocalDraft() {
    if (localDraftSummary.value) {
      const localKey = localDraftSummary.value.formulaKey;
      list.value = list.value.filter((item) => item.formulaKey !== localKey);
    }
    localDraftSummary.value = null;
    localDraftDetail.value = null;
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
      const result = await formulaApi.list({
        keyword: keyword.value || undefined,
        status: statusFilter.value || undefined,
        page: page.value,
        pageSize: pageSize.value
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
      toast({ title: '加载配方列表失败', variant: 'destructive' });
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

  async function loadRevisions(formulaKey: string) {
    try {
      const data = await formulaApi.revisions(formulaKey);
      revisions.value = data.items || [];
    } catch {
      revisions.value = [];
    }
  }

  async function loadDetail(formulaKey: string, silent = false) {
    if (!silent && isDirty.value) {
      const confirmed = window.confirm('当前有未保存改动，确定切换配方吗？');
      if (!confirmed) return;
    }

    if (isLocalFormulaKey(formulaKey)) {
      if (!localDraftDetail.value) return;
      selectedKey.value = formulaKey;
      detail.value = {
        ...localDraftDetail.value,
        bom: localDraftDetail.value.bom.map((item) => normalizeBomRow(item))
      };
      draftRevision.value = null;
      publishedRevision.value = null;
      revisions.value = [];
      bomDraft.value = localDraftDetail.value.bom.map((item) => normalizeBomRow(item));
      validationErrors.value = {};
      isDirty.value = true;
      return;
    }

    try {
      const data = await formulaApi.detail(formulaKey);
      selectedKey.value = formulaKey;
      detail.value = data.formula;
      draftRevision.value = data.draftRevision;
      publishedRevision.value = data.publishedRevision;
      resetDraftWithDetail();
      await loadRevisions(formulaKey);
    } catch (error) {
      console.error(error);
      toast({ title: '加载配方详情失败', variant: 'destructive' });
    }
  }

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

    const now = new Date().toISOString();
    const localKey = `${LOCAL_DRAFT_KEY_PREFIX}${Date.now()}`;
    localDraftSummary.value = {
      id: -Date.now(),
      formulaKey: localKey,
      displayName: '',
      status: 'draft',
      activeRevision: null,
      updatedAt: now
    };
    localDraftDetail.value = {
      id: localDraftSummary.value.id,
      formulaKey: '',
      displayName: '',
      status: 'draft',
      activeRevision: null,
      bom: [],
      updatedAt: now
    };

    clearSelection();
    list.value = [localDraftSummary.value, ...list.value];
    selectedKey.value = localKey;
    detail.value = {
      ...localDraftDetail.value,
      bom: []
    };
    validationErrors.value = {};
    bomDraft.value = [];
    changeNote.value = '';
    isDirty.value = true;
    toast({ title: '已创建空白配方，请在右侧填写后保存', variant: 'success' });
  }

  async function saveDraft() {
    if (!detail.value) return;
    const creatingLocalDraft = !draftRevision.value && isLocalDraftSelected.value;
    const allowEmptyBom = creatingLocalDraft;
    if (!localValidate({ allowEmptyBom })) {
      toast({ title: '本地校验未通过，请修复错误后再保存', variant: 'destructive' });
      return;
    }

    const normalizedBom = bomDraft.value.map((row) => normalizeBomRow(row));
    const meaningfulBom = normalizedBom.filter((row) => isMeaningfulBomRow(row));
    saving.value = true;
    try {
      if (creatingLocalDraft) {
        const created = await formulaApi.create({
          formulaKey: detail.value.formulaKey,
          displayName: detail.value.displayName,
          bom: meaningfulBom,
          changeNote: changeNote.value || '创建配方'
        });

        clearLocalDraft();
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
      const result = await formulaApi.updateDraft(oldFormulaKey, {
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
      const result = await formulaApi.publish(selectedKey.value || detail.value.formulaKey, {
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
      await formulaApi.archive(selectedKey.value || detail.value.formulaKey, { reason });
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
      await formulaApi.rollback(selectedKey.value || detail.value.formulaKey, { targetRevision: revision, reason });
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
      clearLocalDraft();
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
      await formulaApi.remove(selectedKey.value || detail.value.formulaKey, { reason });
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

    stopHandles.push(watch(isDirty, () => {
      window.onbeforeunload = isDirty.value ? () => '当前有未保存改动' : null;
    }, { immediate: true }));

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
