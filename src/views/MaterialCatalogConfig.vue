<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '@/lib/api';
import { useToastStore } from '@/stores/useToastStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import CodeMirrorEditor from '@/components/ui/CodeMirrorEditor.vue';
import { refreshMaterialsRuntime } from '@/services/configRuntime';

type RevisionMeta = {
  revision: number;
  state: string;
  changeNote: string;
  createdBy: string;
  createdAt: string;
};

type AuditLog = {
  id: number;
  action: string;
  fromRevision: number | null;
  toRevision: number | null;
  operator: string;
  meta: Record<string, any>;
  createdAt: string;
};

type CatalogDetail = {
  profile: {
    profileCode: string;
    displayName: string;
    status: string;
    activeRevision: number | null;
  };
  latestRevision: RevisionMeta | null;
  draftRevision: RevisionMeta | null;
  publishedRevision: RevisionMeta | null;
  draftPayload: Record<string, any> | null;
  publishedPayload: Record<string, any> | null;
};

const { toast } = useToastStore();

const isLoading = ref(false);
const isSaving = ref(false);
const loadError = ref<string | null>(null);
const jsonDraft = ref('{}');
const changeNote = ref('');
const detail = ref<CatalogDetail | null>(null);
const auditLogs = ref<AuditLog[]>([]);

const currentPayload = computed<Record<string, any>>(() => {
  return detail.value?.draftPayload || detail.value?.publishedPayload || {};
});

const entryCount = computed(() => Object.keys(currentPayload.value || {}).length);

const latestRevisionLabel = computed(() => detail.value?.latestRevision?.revision ?? '-');
const publishedRevisionLabel = computed(() => detail.value?.publishedRevision?.revision ?? '-');
const activeRevisionLabel = computed(() => detail.value?.profile.activeRevision ?? '-');

function syncDraftFromDetail() {
  jsonDraft.value = JSON.stringify(currentPayload.value, null, 2);
}

async function loadDetail() {
  isLoading.value = true;
  loadError.value = null;
  try {
    const [detailRes, logsRes] = await Promise.all([
      api.get<{ success: true; catalog: CatalogDetail }>('/config/material-catalog/detail'),
      api.get<{ success: true; items: AuditLog[] }>('/config/material-catalog/audit-logs'),
    ]);
    detail.value = detailRes.catalog;
    auditLogs.value = Array.isArray(logsRes.items) ? logsRes.items : [];
    syncDraftFromDetail();
  } catch (e: any) {
    console.error(e);
    loadError.value = e?.message || '加载物料目录失败';
    toast({
      title: '加载失败',
      description: '无法读取物料目录配置',
      variant: 'destructive',
    });
  } finally {
    isLoading.value = false;
  }
}

function formatDraft() {
  try {
    const parsed = JSON.parse(jsonDraft.value || '{}');
    jsonDraft.value = JSON.stringify(parsed, null, 2);
  } catch (e: any) {
    toast({
      title: 'JSON 无效',
      description: e?.message || '请修正 JSON 格式',
      variant: 'destructive',
    });
  }
}

async function saveAndPublish() {
  if (isSaving.value) return;

  let payload: Record<string, any>;
  try {
    const parsed = JSON.parse(jsonDraft.value || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('物料目录必须是对象');
    }
    payload = parsed;
  } catch (e: any) {
    toast({
      title: 'JSON 无效',
      description: e?.message || '请修正 JSON 格式',
      variant: 'destructive',
    });
    return;
  }

  isSaving.value = true;
  try {
    const revision = detail.value?.latestRevision?.revision ?? 0;
    const draftRes = await api.put<{ success: boolean; revision: RevisionMeta }>('/config/material-catalog/draft', {
      revision,
      payload,
      changeNote: changeNote.value || '前端更新物料目录草稿',
    });

    await api.post<{ success: boolean; revision: RevisionMeta }>('/config/material-catalog/publish', {
      fromRevision: draftRes.revision.revision,
      changeNote: changeNote.value || '前端发布物料目录',
    });

    await refreshMaterialsRuntime();
    await loadDetail();
    changeNote.value = '';
    toast({
      title: '保存成功',
      description: '物料目录已发布并同步到运行时',
      variant: 'success',
    });
  } catch (e: any) {
    console.error(e);
    const message = e?.response?.data?.errors?.[0]?.message || e?.message || '保存失败';
    toast({
      title: '保存失败',
      description: message,
      variant: 'destructive',
    });
  } finally {
    isSaving.value = false;
  }
}

onMounted(loadDetail);
</script>

<template>
  <div class="h-full flex flex-col gap-6 p-6 md:p-8 bg-muted/20">
    <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
      <div>
        <h2 class="text-3xl font-semibold tracking-tight">物料目录配置</h2>
        <p class="text-muted-foreground mt-1">管理 BOM 计算使用的材料目录发布态与审计记录。</p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" :disabled="isLoading || isSaving" @click="loadDetail">刷新</Button>
        <Button variant="outline" :disabled="isSaving" @click="formatDraft">格式化 JSON</Button>
        <Button :disabled="isLoading || isSaving" @click="saveAndPublish">
          {{ isSaving ? '发布中...' : '保存并发布' }}
        </Button>
      </div>
    </div>

    <Card v-if="loadError">
      <CardContent class="p-4 text-sm text-destructive">
        {{ loadError }}
      </CardContent>
    </Card>

    <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)] gap-6 flex-1 min-h-0">
      <div class="flex flex-col gap-6 min-h-0">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-xs text-muted-foreground">目录条目数</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold">{{ entryCount }}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-xs text-muted-foreground">当前 Active Revision</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold">{{ activeRevisionLabel }}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-xs text-muted-foreground">Latest Revision</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold">{{ latestRevisionLabel }}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-xs text-muted-foreground">Published Revision</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold">{{ publishedRevisionLabel }}</div>
            </CardContent>
          </Card>
        </div>

        <Card class="flex-1 min-h-0">
          <CardHeader class="space-y-4">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <CardTitle>目录 JSON</CardTitle>
                <CardDescription>直接编辑物料目录对象。保存后将创建 draft 并立即发布。</CardDescription>
              </div>
              <div class="w-full lg:w-[320px]">
                <Input v-model="changeNote" placeholder="变更说明，例如：补充华荣材料编码" />
              </div>
            </div>
          </CardHeader>
          <CardContent class="h-[60vh]">
            <CodeMirrorEditor v-model="jsonDraft" class="h-full" />
          </CardContent>
        </Card>
      </div>

      <div class="flex flex-col gap-6 min-h-0">
        <Card>
          <CardHeader>
            <CardTitle>当前状态</CardTitle>
            <CardDescription>展示当前 profile 与最近 revision 状态。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">Profile</span>
              <span class="font-medium">{{ detail?.profile.displayName || '-' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">状态</span>
              <span class="font-medium">{{ detail?.profile.status || '-' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">Draft Revision</span>
              <span class="font-medium">{{ detail?.draftRevision?.revision ?? '-' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">Published Revision</span>
              <span class="font-medium">{{ detail?.publishedRevision?.revision ?? '-' }}</span>
            </div>
          </CardContent>
        </Card>

        <Card class="flex-1 min-h-0">
          <CardHeader>
            <CardTitle>审计记录</CardTitle>
            <CardDescription>按时间倒序显示本目录的变更动作。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3 overflow-auto max-h-[50vh]">
            <div v-if="auditLogs.length === 0" class="text-sm text-muted-foreground">暂无审计记录</div>
            <div
              v-for="log in auditLogs"
              :key="log.id"
              class="rounded-md border bg-background px-3 py-3"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="font-medium text-sm">{{ log.action }}</div>
                <div class="text-xs text-muted-foreground">{{ new Date(log.createdAt).toLocaleString() }}</div>
              </div>
              <div class="mt-2 text-xs text-muted-foreground space-y-1">
                <div>operator: {{ log.operator }}</div>
                <div>from: {{ log.fromRevision ?? '-' }} -> to: {{ log.toRevision ?? '-' }}</div>
                <div v-if="log.meta?.changeNote">note: {{ log.meta.changeNote }}</div>
                <div v-if="log.meta?.source">source: {{ log.meta.source }}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
