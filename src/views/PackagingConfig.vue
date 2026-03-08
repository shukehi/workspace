<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import ConfigPageLayout from '@/features/config-editor/components/ConfigPageLayout.vue';
import { useMappingConfigEditor } from '@/features/config-editor/composables/useMappingConfigEditor';
import { createRowId, decodeIssuePathKey } from '@/features/config-editor/utils/mappingIssueUtils';
import { configLoader } from '@/services/configLoader';
import { adaptPackagingMapping, normalizePackagingMappingKey, validatePackagingMapping } from '@/services/mappings';
import type { PackagingMappingConfig } from '@/types/mapping';
import { useToastStore } from '@/stores/useToastStore';

type MappingRow = {
  id: string;
  key: string;
  value: string;
};

const { toast } = useToastStore();

const supplierName = ref('');
const rows = ref<MappingRow[]>([]);
const searchQuery = ref('');
const baselineSnapshot = ref('');

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
    const value = row.value.trim();
    if (!key) {
      issues.push({
        path: `rows[${index}].key`,
        code: 'required',
        message: '包装映射 key 不能为空'
      });
      return;
    }
    if (!value) {
      issues.push({
        path: `rows[${index}].value`,
        code: 'required',
        message: '包装映射 value 不能为空'
      });
    }
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

const supplierIssues = computed(() => {
  return [...clientIssues.value, ...editor.serverIssues.value]
    .filter((issue) => issue.path === 'supplierName')
    .map((issue) => issue.message);
});

const rowIssueMap = computed(() => {
  const map = new Map<string, { key: string[]; value: string[] }>();
  const ensure = (rowId: string) => {
    if (!map.has(rowId)) map.set(rowId, { key: [], value: [] });
    return map.get(rowId)!;
  };

  const addIssue = (rowId: string, field: 'key' | 'value', message: string) => {
    const entry = ensure(rowId);
    entry[field].push(message);
  };

  clientIssues.value.forEach((issue) => {
    const match = issue.path.match(/^rows\[(\d+)\]\.(key|value)$/);
    if (!match) return;
    const index = Number(match[1]);
    const field = match[2] as 'key' | 'value';
    const row = rows.value[index];
    if (!row) return;
    addIssue(row.id, field, issue.message);
  });

  editor.serverIssues.value.forEach((issue) => {
    const match = issue.path.match(/^mappings\[(.+)\]$/);
    if (!match) return;
    const rawKey = decodeIssuePathKey(match[1]);
    const targets = rows.value.filter((row) => row.key.trim() === rawKey);
    if (targets.length === 0) return;
    targets.forEach((target) => addIssue(target.id, 'key', issue.message));
  });

  return map;
});

const rowHasIssue = (rowId: string) => {
  const entry = rowIssueMap.value.get(rowId);
  return Boolean(entry && (entry.key.length > 0 || entry.value.length > 0));
};

async function scrollToFirstIssue() {
  await nextTick();
  const entries = rows.value
    .map((row) => ({ row, hasIssue: rowHasIssue(row.id) }))
    .filter((item) => item.hasIssue);
  if (entries.length === 0) return;

  if (searchQuery.value) {
    const visibleWithIssue = filteredRows.value.some((row) => rowHasIssue(row.id));
    if (!visibleWithIssue) {
      toast({
        title: '无法定位错误',
        description: '请清空搜索条件后查看问题行'
      });
      return;
    }
  }

  const index = rows.value.findIndex((row) => row.id === entries[0].row.id);
  const selector = `[data-row-index="${index}"]`;
  const target = document.querySelector(selector) as HTMLElement | null;
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('ring-2', 'ring-amber-300');
    setTimeout(() => {
      target.classList.remove('ring-2', 'ring-amber-300');
    }, 1200);
  }
}

const normalizedPreview = computed(() => {
  const preview = new Map<string, string>();
  rows.value.forEach((row) => {
    preview.set(row.id, normalizePackagingMappingKey(row.key));
  });
  return preview;
});

const filteredRows = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  if (!keyword) return rows.value;
  return rows.value.filter((row) => {
    return row.key.toLowerCase().includes(keyword) || row.value.toLowerCase().includes(keyword);
  });
});

const hasUnsavedChanges = computed(() => {
  return serializePayload(editor.payload.value) !== baselineSnapshot.value;
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
    id: createRowId(),
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
  baselineSnapshot.value = serializePayload(editor.payload.value);
}

const editor = useMappingConfigEditor<PackagingMappingConfig>({
  endpoint: '/config/packaging',
  loadErrorDescription: '无法读取包装映射配置',
  saveSuccessDescription: '包装映射已更新',
  getPayload: () => payload.value,
  getClientIssues: () => clientIssues.value,
  validatePayload: validatePackagingMapping,
  adaptPayload: (value) => adaptPackagingMapping(value),
  resetWithPayload,
  refreshRuntime: () => configLoader.refreshPackagingMapping(),
  scrollToFirstIssue
});

function addRow() {
  if (searchQuery.value) searchQuery.value = '';
  rows.value.push(makeRow());
}

function removeRow(id: string) {
  rows.value = rows.value.filter((row) => row.id !== id);
  if (rows.value.length === 0) rows.value = [makeRow()];
}

onMounted(editor.load);
</script>

<template>
  <ConfigPageLayout
    title="包装配置"
    description="管理包装名称到采购条目的映射关系。"
    :editor="editor"
    :clientIssues="clientIssues"
    :showJsonCopyButton="true"
  >
    <template #header-extra>
      <span
        v-if="hasUnsavedChanges"
        class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700"
      >
        未保存
      </span>
    </template>

    <template #header-right>
      <div class="hidden lg:flex items-center gap-2 text-xs text-muted-foreground mt-2 lg:mt-0">
        <span>共 {{ rows.length }} 条</span>
        <span v-if="searchQuery">匹配 {{ filteredRows.length }} 条</span>
      </div>
    </template>

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
              <div v-if="supplierIssues.length > 0" class="text-[11px] text-destructive">
                {{ supplierIssues[0] }}
              </div>
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">搜索映射</label>
              <Input v-model="searchQuery" class="h-9" placeholder="搜索包装或采购名称" />
            </div>
          </div>
        </CardHeader>

        <CardContent class="space-y-4 min-h-0">
          <div class="flex items-center justify-between mb-1">
            <div class="text-sm font-medium">映射列表</div>
            <div class="text-xs text-muted-foreground flex items-center gap-2">
              <span>共 {{ rows.length }} 条</span>
              <span v-if="searchQuery">匹配 {{ filteredRows.length }} 条</span>
            </div>
          </div>
          <div class="max-h-[520px] overflow-auto rounded-md border">
            <table class="w-full text-sm text-left border-separate border-spacing-0">
              <thead class="sticky top-0 z-20 text-xs text-muted-foreground bg-muted shadow-sm">
                <tr>
                  <th class="px-3 py-2 w-[46%] border-b">包装名称</th>
                  <th class="px-3 py-2 w-[44%] border-b">采购名称</th>
                  <th class="px-3 py-2 w-[10%] border-b">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in filteredRows"
                  :key="row.id"
                  :data-row-index="rows.findIndex((item) => item.id === row.id)"
                  class="group bg-background border-b last:border-0 align-top transition-colors"
                  :class="rowHasIssue(row.id) ? 'bg-amber-50/60' : ''"
                >
                  <td class="px-3 py-2">
                    <Input v-model="row.key" class="h-9" placeholder="原始包装名称" />
                    <div class="text-[11px] text-muted-foreground mt-1">
                      规范化：{{ normalizedPreview.get(row.id) || '-' }}
                    </div>
                    <div
                      v-if="rowIssueMap.get(row.id)?.key.length"
                      class="text-[11px] text-destructive mt-1 space-y-0.5"
                    >
                      <div v-for="msg in rowIssueMap.get(row.id)?.key" :key="msg">{{ msg }}</div>
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <Input v-model="row.value" class="h-9" placeholder="采购条目名称" />
                    <div
                      v-if="rowIssueMap.get(row.id)?.value.length"
                      class="text-[11px] text-destructive mt-1 space-y-0.5"
                    >
                      <div v-for="msg in rowIssueMap.get(row.id)?.value" :key="msg">{{ msg }}</div>
                    </div>
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
          <Button variant="outline" size="sm" class="w-full mt-3 border-dashed" @click="addRow">
            + 新增包装映射
          </Button>
        </CardContent>
      </Card>
  </ConfigPageLayout>
</template>
