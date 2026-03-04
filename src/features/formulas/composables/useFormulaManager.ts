import { computed, ref, watch } from 'vue';
import { formulaApi, type MutationError } from '@/services/formulaApi';
import type {
  FormulaBOMItem,
  FormulaDetail,
  FormulaRevisionMeta,
  FormulaSummary
} from '@/types/formula';
import { useToastStore } from '@/stores/useToastStore';
import { BOM_MATERIAL_CATEGORIES, type FormulaValidationErrors } from '@/features/formulas/types';

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
  const hasMore = computed(() => list.value.length < total.value);

  const newFormulaKey = ref('');
  const newDisplayName = ref('');
  const changeNote = ref('');

  const bomDraft = ref<FormulaBOMItem[]>([]);
  const validationErrors = ref<FormulaValidationErrors>({});
  const isDirty = ref(false);

  function markDirty() {
    isDirty.value = true;
  }

  function resetDraftWithDetail() {
    bomDraft.value = (detail.value?.bom || []).map((item) => normalizeBomRow(item));
    validationErrors.value = {};
    isDirty.value = false;
  }

  function localValidate(): boolean {
    const errors: FormulaValidationErrors = {};
    if (!detail.value?.formulaKey) errors.formulaKey = '配方编码不能为空';
    if (!detail.value?.displayName) errors.displayName = '配方名称不能为空';
    if (bomDraft.value.length === 0) errors.bom = 'BOM 不能为空';

    const seen = new Set<string>();
    bomDraft.value.forEach((row, idx) => {
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

  async function loadList(options: { append?: boolean } = {}) {
    const append = Boolean(options.append);
    if (append) {
      loadingMore.value = true;
    } else {
      loading.value = true;
    }

    try {
      const result = await formulaApi.list({
        keyword: keyword.value || undefined,
        status: statusFilter.value || undefined,
        page: page.value,
        pageSize: pageSize.value
      });

      const incoming = result.items || [];
      total.value = Number(result.total || 0);
      if (append) {
        const seen = new Set(list.value.map((item) => item.formulaKey));
        const merged = incoming.filter((item) => !seen.has(item.formulaKey));
        list.value = [...list.value, ...merged];
      } else {
        list.value = incoming;
      }

      if (!selectedKey.value && list.value.length > 0) {
        await loadDetail(list.value[0].formulaKey, true);
      }
    } catch (error) {
      console.error(error);
      toast({ title: '加载配方列表失败', variant: 'destructive' });
    } finally {
      if (append) {
        loadingMore.value = false;
      } else {
        loading.value = false;
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
    if (!newFormulaKey.value.trim() || !newDisplayName.value.trim()) {
      toast({ title: '请填写配方编码和名称', variant: 'destructive' });
      return;
    }

    try {
      const payload = {
        formulaKey: newFormulaKey.value.trim(),
        displayName: newDisplayName.value.trim(),
        bom: [],
        changeNote: '创建配方'
      };

      await formulaApi.create(payload);
      toast({ title: '配方已创建', variant: 'success' });
      newFormulaKey.value = '';
      newDisplayName.value = '';
      page.value = 1;
      await loadList();
      await loadDetail(payload.formulaKey, true);
    } catch (error: any) {
      console.error(error);
      validationErrors.value = normalizeServerErrors(error?.response?.data?.errors);
      toast({
        title: '创建失败',
        description: error?.response?.data?.errors?.[0]?.message || '请检查输入',
        variant: 'destructive'
      });
    }
  }

  async function saveDraft() {
    if (!detail.value || !draftRevision.value) return;
    if (!localValidate()) {
      toast({ title: '本地校验未通过，请修复错误后再保存', variant: 'destructive' });
      return;
    }

    saving.value = true;
    try {
      const oldFormulaKey = selectedKey.value || detail.value.formulaKey;
      const result = await formulaApi.updateDraft(oldFormulaKey, {
        revision: draftRevision.value.revision,
        formulaKey: detail.value.formulaKey,
        displayName: detail.value.displayName,
        bom: bomDraft.value.map((row) => normalizeBomRow(row)),
        changeNote: changeNote.value || '更新草稿'
      });

      draftRevision.value = result.revision;
      detail.value.bom = bomDraft.value.map((row) => normalizeBomRow(row));
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
    if (!detail.value) return;
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
    const confirmed = window.confirm(`确认删除配方 ${detail.value.formulaKey} 吗？删除后不可恢复。`);
    if (!confirmed) return;

    const reason = window.prompt('请输入删除原因（可选）：') || '';
    try {
      await formulaApi.remove(selectedKey.value || detail.value.formulaKey, { reason });
      toast({ title: '配方已删除', variant: 'success' });
      selectedKey.value = '';
      detail.value = null;
      draftRevision.value = null;
      publishedRevision.value = null;
      revisions.value = [];
      page.value = 1;
      await loadList();
    } catch (error: any) {
      const message = error?.response?.data?.errors?.[0]?.message || '删除失败';
      toast({ title: '删除失败', description: message, variant: 'destructive' });
    }
  }

  function initialize() {
    watch([keyword, statusFilter], () => {
      page.value = 1;
      total.value = 0;
      loadList({ append: false });
    });

    watch(isDirty, () => {
      window.onbeforeunload = isDirty.value ? () => '当前有未保存改动' : null;
    }, { immediate: true });

    loadList();
  }

  return {
    loading,
    loadingMore,
    saving,
    publishing,
    list,
    total,
    selectedKey,
    detail,
    draftRevision,
    publishedRevision,
    revisions,
    historyOpen,
    keyword,
    statusFilter,
    hasMore,
    newFormulaKey,
    newDisplayName,
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
