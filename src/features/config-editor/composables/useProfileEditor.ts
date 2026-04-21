import { computed, ref } from 'vue';
import { mappingConfigApi, type MappingWorkflowDiff, type MappingWorkflowImpact, type MappingWorkflowReplay, type MappingWorkflowReferenceCheck, type SupplierMasterEntry } from '@/services/mappingConfigApi';
import { useToastStore } from '@/stores/useToastStore';
import type { MappingValidationIssue } from '@/types/mapping';

export type ProfileEditorOptions<T> = {
  endpoint: string;
  workflowProfileCode?: string;
  workflowBasePath?: string;
  loadErrorDescription: string;
  saveSuccessDescription: string;
  getPayload: () => T;
  getClientIssues: () => MappingValidationIssue[];
  validatePayload: (value: unknown) => MappingValidationIssue[];
  adaptPayload?: (value: unknown) => T;
  resetWithPayload: (value: T) => void;
  refreshRuntime: () => Promise<void>;
  scrollToFirstIssue?: () => Promise<void> | void;
};

export function useProfileEditor<T>(options: ProfileEditorOptions<T>) {
  const { toast } = useToastStore();
  const isLoading = ref(false);
  const isSaving = ref(false);
  const loadError = ref<string | null>(null);
  const serverIssues = ref<MappingValidationIssue[]>([]);
  const latestRevision = ref(0);
  const draftRevision = ref<number | null>(null);
  const publishedRevision = ref<number | null>(null);
  const auditLogs = ref<Array<{
    id: number;
    action: string;
    fromRevision: number | null;
    toRevision: number | null;
    operator: string;
    meta: Record<string, any>;
    createdAt: string;
  }>>([]);
  const diff = ref<MappingWorkflowDiff | null>(null);
  const diffLoading = ref(false);
  const impact = ref<MappingWorkflowImpact | null>(null);
  const impactLoading = ref(false);
  const replay = ref<MappingWorkflowReplay | null>(null);
  const replayLoading = ref(false);
  const referenceCheck = ref<MappingWorkflowReferenceCheck | null>(null);
  const referenceCheckLoading = ref(false);
  const supplierMaster = ref<SupplierMasterEntry[]>([]);
  const supplierMasterLoading = ref(false);

  const isJsonDialogOpen = ref(false);
  const jsonDraft = ref('');
  const jsonDraftError = ref<string | null>(null);
  const jsonDraftIssues = ref<MappingValidationIssue[]>([]);

  const payload = computed(() => options.getPayload());
  const clientIssues = computed(() => options.getClientIssues());
  const jsonPreview = computed(() => JSON.stringify(payload.value, null, 2));

  function buildClientIssueToastDescription() {
    if (clientIssues.value.length === 0) return '请检查配置后重试';
    const [firstIssue, ...rest] = clientIssues.value;
    if (rest.length === 0) {
      return `${firstIssue.path}: ${firstIssue.message}`;
    }
    return `${firstIssue.path}: ${firstIssue.message}；另有 ${rest.length} 条问题`;
  }

  async function load() {
    isLoading.value = true;
    loadError.value = null;
    serverIssues.value = [];
    try {
      if (options.workflowProfileCode) {
        const res = await mappingConfigApi.loadWorkflow<T>(options.workflowProfileCode, options.workflowBasePath);
        latestRevision.value = res.latestRevision;
        draftRevision.value = res.draftRevision;
        publishedRevision.value = res.publishedRevision;
        auditLogs.value = res.auditLogs;
        diffLoading.value = true;
        impactLoading.value = true;
        replayLoading.value = true;
        referenceCheckLoading.value = true;
        supplierMasterLoading.value = true;
        diff.value = await mappingConfigApi.loadWorkflowDiff(options.workflowProfileCode, options.workflowBasePath);
        impact.value = await mappingConfigApi.loadWorkflowImpact(options.workflowProfileCode, options.workflowBasePath);
        replay.value = await mappingConfigApi.loadWorkflowReplay(options.workflowProfileCode, options.workflowBasePath);
        referenceCheck.value = await mappingConfigApi.loadWorkflowReferenceCheck(options.workflowProfileCode, options.workflowBasePath);
        supplierMaster.value = await mappingConfigApi.loadSupplierMaster();
        options.resetWithPayload(res.payload);
      } else {
        const res = await mappingConfigApi.load<T>(options.endpoint);
        options.resetWithPayload(res);
      }
    } catch (e: any) {
      console.error(e);
      loadError.value = e?.message || '加载失败';
      toast({
        title: '加载失败',
        description: options.loadErrorDescription
      });
    } finally {
      diffLoading.value = false;
      impactLoading.value = false;
      replayLoading.value = false;
      referenceCheckLoading.value = false;
      supplierMasterLoading.value = false;
      isLoading.value = false;
    }
  }

  async function save() {
    if (isSaving.value) return;
    if (clientIssues.value.length > 0) {
      toast({
        title: '保存前需修正配置',
        description: buildClientIssueToastDescription(),
        variant: 'destructive'
      });
      await options.scrollToFirstIssue?.();
      return;
    }
    isSaving.value = true;
    serverIssues.value = [];
    try {
      const res = options.workflowProfileCode
        ? await mappingConfigApi.saveWorkflow<T>(options.workflowProfileCode, payload.value, latestRevision.value, options.workflowBasePath)
        : await mappingConfigApi.save<T>(options.endpoint, payload.value);
      if (!res.ok) {
        serverIssues.value = res.errors || [];
        await options.scrollToFirstIssue?.();
        return;
      }
      latestRevision.value = res.latestRevision ?? latestRevision.value;
      options.resetWithPayload(res.data || payload.value);
      await options.refreshRuntime();
      if (options.workflowProfileCode) {
        const refreshed = await mappingConfigApi.loadWorkflow<T>(options.workflowProfileCode, options.workflowBasePath);
        latestRevision.value = refreshed.latestRevision;
        draftRevision.value = refreshed.draftRevision;
        publishedRevision.value = refreshed.publishedRevision;
        auditLogs.value = refreshed.auditLogs;
        diffLoading.value = true;
        impactLoading.value = true;
        replayLoading.value = true;
        referenceCheckLoading.value = true;
        supplierMasterLoading.value = true;
        diff.value = await mappingConfigApi.loadWorkflowDiff(options.workflowProfileCode, options.workflowBasePath);
        impact.value = await mappingConfigApi.loadWorkflowImpact(options.workflowProfileCode, options.workflowBasePath);
        replay.value = await mappingConfigApi.loadWorkflowReplay(options.workflowProfileCode, options.workflowBasePath);
        referenceCheck.value = await mappingConfigApi.loadWorkflowReferenceCheck(options.workflowProfileCode, options.workflowBasePath);
        supplierMaster.value = await mappingConfigApi.loadSupplierMaster();
      }
      toast({
        title: '保存成功',
        description: options.saveSuccessDescription,
        variant: 'success'
      });
    } catch (e: any) {
      console.error(e);
      const errors = e?.response?.data?.errors;
      if (Array.isArray(errors)) {
        serverIssues.value = errors;
        await options.scrollToFirstIssue?.();
      } else {
        toast({
          title: '保存失败',
          description: '请检查配置后重试',
          variant: 'destructive'
        });
      }
    } finally {
      isSaving.value = false;
    }
  }

  function openJsonEditor() {
    jsonDraft.value = jsonPreview.value;
    jsonDraftError.value = null;
    jsonDraftIssues.value = [];
    isJsonDialogOpen.value = true;
  }

  function resetJsonDraft() {
    jsonDraft.value = jsonPreview.value;
    jsonDraftError.value = null;
    jsonDraftIssues.value = [];
  }

  function formatJsonDraft() {
    jsonDraftError.value = null;
    jsonDraftIssues.value = [];
    try {
      const parsed = JSON.parse(jsonDraft.value || '{}');
      jsonDraft.value = JSON.stringify(parsed, null, 2);
    } catch (e: any) {
      jsonDraftError.value = e?.message || 'JSON 解析失败';
    }
  }

  function applyJsonDraft() {
    jsonDraftError.value = null;
    jsonDraftIssues.value = [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonDraft.value || '{}');
    } catch (e: any) {
      jsonDraftError.value = e?.message || 'JSON 解析失败';
      return;
    }
    const issues = options.validatePayload(parsed);
    if (issues.length > 0) {
      jsonDraftIssues.value = issues;
      return;
    }
    const adapted = options.adaptPayload ? options.adaptPayload(parsed) : (parsed as T);
    options.resetWithPayload(adapted);
    isJsonDialogOpen.value = false;
    toast({
      title: '已应用 JSON',
      description: '配置已更新到页面'
    });
  }

  async function copyJsonPreview() {
    try {
      if (typeof window === 'undefined' || !window.navigator?.clipboard) {
        throw new Error('Clipboard API unavailable');
      }
      await window.navigator.clipboard.writeText(jsonPreview.value);
      toast({
        title: '已复制',
        description: 'JSON 已复制到剪贴板'
      });
    } catch {
      toast({
        title: '复制失败',
        description: '当前环境不支持剪贴板复制',
        variant: 'destructive'
      });
    }
  }

  return {
    isLoading,
    isSaving,
    loadError,
    serverIssues,
    latestRevision,
    draftRevision,
    publishedRevision,
    auditLogs,
    diff,
    diffLoading,
    impact,
    impactLoading,
    replay,
    replayLoading,
    referenceCheck,
    referenceCheckLoading,
    supplierMaster,
    supplierMasterLoading,
    payload,
    clientIssues,
    jsonPreview,
    isJsonDialogOpen,
    jsonDraft,
    jsonDraftError,
    jsonDraftIssues,
    load,
    save,
    openJsonEditor,
    resetJsonDraft,
    formatJsonDraft,
    applyJsonDraft,
    copyJsonPreview
  };
}
