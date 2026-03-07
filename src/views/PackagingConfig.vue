<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CodeMirrorEditor from '@/components/ui/CodeMirrorEditor.vue';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { configLoader } from '@/services/configLoader';
import { adaptPackagingMapping, normalizePackagingMappingKey, validatePackagingMapping } from '@/services/mappings';
import type { MappingValidationIssue, PackagingMappingConfig } from '@/types/mapping';
import { useToastStore } from '@/stores/useToastStore';

type MappingRow = {
  id: string;
  key: string;
  value: string;
};

const { toast } = useToastStore();

const supplierName = ref('');
const rows = ref<MappingRow[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);
const serverIssues = ref<MappingValidationIssue[]>([]);
const loadError = ref<string | null>(null);
const searchQuery = ref('');
const baselineSnapshot = ref('');
const isJsonDialogOpen = ref(false);
const jsonDraft = ref('');
const jsonDraftError = ref<string | null>(null);
const jsonDraftIssues = ref<MappingValidationIssue[]>([]);

const payload = computed<PackagingMappingConfig>(() => {
  const mappings: Record<string, string> = {};
  rows.value.forEach((row) => {
    mappings[row.key] = row.value;
  });
  return {
    supplierName: supplierName.value,
    mappings
  };
});

const clientIssues = computed(() => {
  const issues = [...validatePackagingMapping(payload.value)];
  const normalizedSeen = new Map<string, string>();
  const exactSeen = new Set<string>();
  rows.value.forEach((row, index) => {
    const key = row.key.trim();
    if (!key) return;
    if (exactSeen.has(key)) {
      issues.push({
        path: `rows[${index}].key`,
        code: 'duplicate-key',
        message: '包装映射 key 重复'
      });
    } else {
      exactSeen.add(key);
    }
    const normalized = normalizePackagingMappingKey(key);
    const existing = normalizedSeen.get(normalized);
    if (existing && existing !== key) {
      issues.push({
        path: `rows[${index}].key`,
        code: 'normalized-conflict',
        message: '包装映射存在 normalize 后冲突'
      });
    } else {
      normalizedSeen.set(normalized, key);
    }
  });
  return issues;
});

const normalizedPreview = computed(() => {
  const preview = new Map<string, string>();
  rows.value.forEach((row) => {
    preview.set(row.id, normalizePackagingMappingKey(row.key));
  });
  return preview;
});

const jsonPreview = computed(() => JSON.stringify(payload.value, null, 2));

const filteredRows = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  if (!keyword) return rows.value;
  return rows.value.filter((row) => {
    return row.key.toLowerCase().includes(keyword) || row.value.toLowerCase().includes(keyword);
  });
});

const hasUnsavedChanges = computed(() => {
  return serializePayload(payload.value) !== baselineSnapshot.value;
});

const showSidePanel = computed(() => {
  return clientIssues.value.length > 0 || serverIssues.value.length > 0;
});

function serializePayload(data: PackagingMappingConfig) {
  const sortedMappings: Record<string, string> = {};
  Object.keys(data.mappings || {})
    .sort((a, b) => a.localeCompare(b))
    .forEach((key) => {
      sortedMappings[key] = data.mappings[key];
    });
  return JSON.stringify({
    supplierName: data.supplierName || '',
    mappings: sortedMappings
  });
}

function makeRow(key = '', value = ''): MappingRow {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    key,
    value
  };
}

function resetWithPayload(data: PackagingMappingConfig) {
  supplierName.value = data.supplierName || '';
  rows.value = Object.entries(data.mappings || {}).map(([key, value]) => makeRow(key, value));
  if (rows.value.length === 0) {
    rows.value = [makeRow()];
  }
  baselineSnapshot.value = serializePayload(payload.value);
}

async function load() {
  isLoading.value = true;
  loadError.value = null;
  serverIssues.value = [];
  try {
    const res = await api.get<PackagingMappingConfig>('/config/packaging');
    resetWithPayload(res);
  } catch (e: any) {
    console.error(e);
    loadError.value = e?.message || '加载失败';
    toast({
      title: '加载失败',
      description: '无法读取包装映射配置'
    });
  } finally {
    isLoading.value = false;
  }
}

async function save() {
  if (isSaving.value) return;
  isSaving.value = true;
  serverIssues.value = [];
  try {
    const res = await api.put<{ ok: boolean; data?: PackagingMappingConfig; errors?: MappingValidationIssue[] }>(
      '/config/packaging',
      payload.value
    );
    if (!res.ok) {
      serverIssues.value = res.errors || [];
      return;
    }
    if (res.data) {
      resetWithPayload(res.data);
    } else {
      baselineSnapshot.value = serializePayload(payload.value);
    }
    await configLoader.refreshPackagingMapping();
    toast({
      title: '保存成功',
      description: '包装映射已更新',
      variant: 'success'
    });
  } catch (e: any) {
    console.error(e);
    const errors = e?.response?.data?.errors;
    if (Array.isArray(errors)) {
      serverIssues.value = errors;
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

function addRow() {
  if (searchQuery.value) searchQuery.value = '';
  rows.value.push(makeRow());
}

function removeRow(id: string) {
  rows.value = rows.value.filter((row) => row.id !== id);
  if (rows.value.length === 0) rows.value = [makeRow()];
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
  let parsed: PackagingMappingConfig;
  try {
    parsed = JSON.parse(jsonDraft.value || '{}');
  } catch (e: any) {
    jsonDraftError.value = e?.message || 'JSON 解析失败';
    return;
  }
  const adapted = adaptPackagingMapping(parsed);
  const issues = validatePackagingMapping(parsed);
  if (issues.length > 0) {
    jsonDraftIssues.value = issues;
    return;
  }
  resetWithPayload(adapted);
  isJsonDialogOpen.value = false;
  toast({
    title: '已应用 JSON',
    description: '配置已更新到页面'
  });
}

onMounted(load);
</script>

<template>
  <div class="h-full flex flex-col gap-6 p-6 md:p-8 bg-muted/20">
    <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
      <div class="flex items-center gap-3">
        <div>
          <h2 class="text-3xl font-semibold tracking-tight">包装配置</h2>
          <p class="text-muted-foreground mt-1">管理包装名称到采购条目的映射关系。</p>
        </div>
        <span
          v-if="hasUnsavedChanges"
          class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700"
        >
          未保存
        </span>
      </div>
      <div class="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
        <span>共 {{ rows.length }} 条</span>
        <span v-if="searchQuery">匹配 {{ filteredRows.length }} 条</span>
      </div>
    </div>

    <Card v-if="loadError">
      <CardContent class="p-4 text-sm text-destructive">
        {{ loadError }}
      </CardContent>
    </Card>

    <div
      :class="[
        'grid grid-cols-1 gap-6',
        showSidePanel ? 'xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : 'xl:grid-cols-1'
      ]"
    >
      <Card class="min-h-0">
        <CardHeader class="space-y-4">
          <div>
            <CardTitle>编辑映射</CardTitle>
            <CardDescription>供应商名称与包装映射项。</CardDescription>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4 items-end">
            <div class="space-y-2">
              <label class="text-sm font-medium">默认供应商</label>
              <Input v-model="supplierName" class="h-9" placeholder="例如：方亮包装" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">搜索映射</label>
              <Input v-model="searchQuery" class="h-9" placeholder="搜索包装或采购名称" />
            </div>
          </div>
        </CardHeader>

        <CardContent class="space-y-4 min-h-0">
          <div class="max-h-[520px] overflow-auto rounded-md border">
            <div class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-3 py-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div class="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                <span class="text-sm font-medium text-foreground">映射列表</span>
                <span>共 {{ rows.length }} 条</span>
                <span v-if="searchQuery">匹配 {{ filteredRows.length }} 条</span>
              </div>
              <div class="flex items-center gap-2">
                <Button variant="outline" size="sm" @click="openJsonEditor">JSON 编辑</Button>
                <Button variant="outline" size="sm" :disabled="isLoading || isSaving" @click="load">
                  刷新
                </Button>
                <Button variant="outline" size="sm" @click="addRow">新增</Button>
                <div class="flex flex-col items-end gap-1">
                  <Button size="sm" :disabled="isLoading || isSaving || clientIssues.length > 0" @click="save">保存</Button>
                  <div v-if="clientIssues.length > 0" class="text-[11px] text-muted-foreground">
                    校验未通过
                  </div>
                </div>
              </div>
            </div>

            <table class="w-full text-sm text-left">
              <thead class="text-xs text-muted-foreground bg-muted/50">
                <tr>
                  <th class="px-3 py-2 w-[46%]">包装名称</th>
                  <th class="px-3 py-2 w-[44%]">采购名称</th>
                  <th class="px-3 py-2 w-[10%]">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in filteredRows"
                  :key="row.id"
                  class="group bg-background border-b last:border-0 align-top"
                >
                  <td class="px-3 py-2">
                    <Input v-model="row.key" class="h-9" placeholder="原始包装名称" />
                    <div class="text-[11px] text-muted-foreground mt-1">
                      规范化：{{ normalizedPreview.get(row.id) || '-' }}
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <Input v-model="row.value" class="h-9" placeholder="采购条目名称" />
                  </td>
                  <td class="px-3 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      class="opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      @click="removeRow(row.id)"
                    >
                      删除
                    </Button>
                  </td>
                </tr>
                <tr v-if="filteredRows.length === 0">
                  <td colspan="3" class="px-3 py-8 text-center text-sm text-muted-foreground">
                    暂无匹配映射，请调整搜索条件或新增映射。
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div v-if="showSidePanel" class="flex flex-col gap-6 min-h-0">
        <Card>
          <CardHeader>
            <CardTitle>校验结果</CardTitle>
            <CardDescription>请修正以下问题后再保存。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div v-if="clientIssues.length > 0" class="space-y-1">
              <div class="text-sm font-medium">本地校验</div>
              <ul class="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li v-for="issue in clientIssues" :key="`client-${issue.path}-${issue.code}`">
                  {{ issue.path }}: {{ issue.message }}
                </li>
              </ul>
            </div>
            <div v-if="serverIssues.length > 0" class="space-y-1">
              <div class="text-sm font-medium">服务端校验</div>
              <ul class="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li v-for="issue in serverIssues" :key="`server-${issue.path}-${issue.code}`">
                  {{ issue.path }}: {{ issue.message }}
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <Dialog v-model:open="isJsonDialogOpen">
      <DialogContent class="max-w-4xl w-[min(100%,64rem)]">
        <DialogHeader>
          <DialogTitle>JSON 编辑</DialogTitle>
          <DialogDescription>直接编辑映射 JSON，应用前会进行校验。</DialogDescription>
        </DialogHeader>

        <div class="space-y-3">
          <CodeMirrorEditor v-model="jsonDraft" class="min-h-[420px]" lint />
          <div v-if="jsonDraftError" class="text-sm text-destructive">
            {{ jsonDraftError }}
          </div>
          <div v-if="jsonDraftIssues.length > 0" class="space-y-1">
            <div class="text-sm font-medium">校验失败</div>
            <ul class="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li v-for="issue in jsonDraftIssues" :key="`draft-${issue.path}-${issue.code}`">
                {{ issue.path }}: {{ issue.message }}
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter class="flex-row justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            @click="navigator.clipboard.writeText(jsonPreview).then(() => toast({ title: '已复制', description: 'JSON 已复制到剪贴板' }))"
          >
            复制当前 JSON
          </Button>
          <Button variant="outline" size="sm" @click="formatJsonDraft">格式化</Button>
          <Button variant="outline" size="sm" @click="resetJsonDraft">重置为当前配置</Button>
          <Button variant="outline" size="sm" @click="isJsonDialogOpen = false">取消</Button>
          <Button size="sm" @click="applyJsonDraft">校验并应用</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
