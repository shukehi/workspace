import { computed, ref } from 'vue';
import { mappingConfigApi } from '@/services/mappingConfigApi';
import { useToastStore } from '@/stores/useToastStore';
import type { MappingValidationIssue } from '@/types/mapping';

type MappingConfigEditorOptions<T> = {
  endpoint: string;
  workflowProfileCode?: string;
  workflowBasePath?: string; // 新增：支持自定义 API 路径
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

export function useMappingConfigEditor<T>(options: MappingConfigEditorOptions<T>) {
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

  const isJsonDialogOpen = ref(false);
  const jsonDraft = ref('');
  const jsonDraftError = ref<string | null>(null);
  const jsonDraftIssues = ref<MappingValidationIssue[]>([]);

  const payload = computed(() => options.getPayload());
  const clientIssues = computed(() => options.getClientIssues());
  const jsonPreview = computed(() => JSON.stringify(payload.value, null, 2));

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
      isLoading.value = false;
    }
  }

  async function save() {
    if (isSaving.value) return;
    if (clientIssues.value.length > 0) {
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
