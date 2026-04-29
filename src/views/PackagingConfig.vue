<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import ProfileEditorHost from '@/features/config-editor/components/ProfileEditorHost.vue';
import ConfigTable from '@/features/config-editor/components/ConfigTable.vue';
import { useProfileEditor } from '@/features/config-editor/composables/useProfileEditor';
import { useEditableList } from '@/features/config-editor/composables/useEditableList';
import { mapToRows, rowsToMap } from '@/features/config-editor/utils/configMapper';
import { scrollToFirstIssueElement } from '@/features/config-editor/utils/mappingIssueUtils';
import {
  getPackagingFilteredRows,
  getPackagingRowsForValidation,
  isMeaningfulPackagingRow,
  shouldReuseEmptyPackagingDraft,
} from '@/features/config-editor/utils/packagingEditorState';
import { refreshPackagingRuntime } from '@/services/configRuntime';
import { adaptPackagingMapping, normalizePackagingMappingKey, validatePackagingMapping } from '@/services/mappings';
import type { PackagingMappingConfig } from '@/types/mapping';
import { DEFAULT_PACKAGING_SUPPLIER } from '@/shared/constants/business';
import { CONFIG_ENDPOINTS } from '@/shared/constants/endpoints';

type MappingRow = { id: string; key: string; value: string; };

const supplierName = ref(DEFAULT_PACKAGING_SUPPLIER);
const useSystemDefaultSupplier = ref(true);
const searchQuery = ref('');
const baselineSnapshot = ref('');
const showDraftRows = ref(false);

const mappings = useEditableList<MappingRow>(() => ({ id: '', key: '', value: '' }));

const payload = computed<PackagingMappingConfig>(() => {
  const mappingPayload = rowsToMap(mappings.list.value, 'key', (row) => row.value);
  return {
    supplierName: useSystemDefaultSupplier.value ? DEFAULT_PACKAGING_SUPPLIER : supplierName.value.trim(),
    mappings: mappingPayload,
  };
});

const clientIssues = computed(() => {
  const issues = [...validatePackagingMapping(payload.value)];
  const normalizedSeen = new Map<string, string>();
  getPackagingRowsForValidation(mappings.list.value, showDraftRows.value).forEach((row, index) => {
    if (!row.key.trim()) {
      issues.push({ path: `rows[${index}].key`, code: 'required', message: '包装映射 key 不能为空' });
    } else if (!mappings.isUnique('key', row.key, row.id)) {
      issues.push({ path: `rows[${index}].key`, code: 'duplicate-key', message: '包装映射 key 重复' });
    }
    const normalized = normalizePackagingMappingKey(row.key);
    if (normalizedSeen.has(normalized) && normalizedSeen.get(normalized) !== row.key.trim()) {
      issues.push({ path: `rows[${index}].key`, code: 'normalized-conflict', message: '存在规范化后冲突' });
    } else {
      normalizedSeen.set(normalized, row.key.trim());
    }
  });
  return issues;
});

const totalMappings = computed(() => Object.keys(payload.value.mappings).length);
const normalizedConflictCount = computed(() => clientIssues.value.filter((issue) => issue.code === 'normalized-conflict').length);
const meaningfulRows = computed(() => mappings.list.value.filter(isMeaningfulPackagingRow));
const filteredCount = computed(() => filteredRows.value.length);
const hasMeaningfulRows = computed(() => meaningfulRows.value.length > 0);

const filteredRows = computed(() => {
  return getPackagingFilteredRows(mappings.list.value, showDraftRows.value, searchQuery.value);
});

function serializeDraft(data: PackagingMappingConfig) {
  const sorted: PackagingMappingConfig = {
    supplierName: data.supplierName.trim() || DEFAULT_PACKAGING_SUPPLIER,
    mappings: {},
  };
  Object.keys(data.mappings).sort().forEach((key) => {
    sorted.mappings[key] = data.mappings[key];
  });
  return JSON.stringify(sorted);
}

const hasUnsavedChanges = computed(() => {
  return serializeDraft(payload.value) !== baselineSnapshot.value;
});

function useSystemDefaultMode() {
  supplierName.value = DEFAULT_PACKAGING_SUPPLIER;
  useSystemDefaultSupplier.value = true;
}

function useCustomSupplierMode() {
  useSystemDefaultSupplier.value = false;
}

function resetWithPayload(data: PackagingMappingConfig) {
  supplierName.value = data.supplierName || DEFAULT_PACKAGING_SUPPLIER;
  useSystemDefaultSupplier.value = !data.supplierName || data.supplierName === DEFAULT_PACKAGING_SUPPLIER;
  mappings.reset(mapToRows(data.mappings, 'key', (k, v) => ({ key: k, value: v } as any)));
  showDraftRows.value = false;
  baselineSnapshot.value = serializeDraft(data);
}

function addMappingRow() {
  searchQuery.value = '';
  if (shouldReuseEmptyPackagingDraft(mappings.list.value)) {
    showDraftRows.value = true;
    return;
  }
  showDraftRows.value = true;
  mappings.add();
}

function removeMappingRow(id: string) {
  mappings.remove(id);
  if (!mappings.list.value.some(isMeaningfulPackagingRow)) {
    showDraftRows.value = false;
  }
}

const editor = useProfileEditor<PackagingMappingConfig>({
  endpoint: CONFIG_ENDPOINTS.PACKAGING.path,
  workflowProfileCode: CONFIG_ENDPOINTS.PACKAGING.profile,
  workflowBasePath: CONFIG_ENDPOINTS.PACKAGING.basePath,
  loadErrorDescription: '无法读取包装映射配置',
  saveSuccessDescription: '包装映射已更新',
  getPayload: () => payload.value,
  getClientIssues: () => clientIssues.value,
  validatePayload: validatePackagingMapping,
  adaptPayload: (value) => adaptPackagingMapping(value),
  resetWithPayload,
  refreshRuntime: refreshPackagingRuntime,
  scrollToFirstIssue: () => {
    scrollToFirstIssueElement('[data-issue-item="true"]', '[data-issue-anchor="true"]');
  }
});

onMounted(editor.load);
</script>

<template>
  <ProfileEditorHost
    title="包装配置"
    description="规则例外维护：优先依赖系统默认供应商与标准字典，仅维护需要人工覆盖的包装例外映射。"
    :editor="editor"
    :clientIssues="clientIssues"
    workflow-meta-variant="inline"
    actions-position="header"
  >
    <template #header-extra>
      <span v-if="hasUnsavedChanges" class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">未保存</span>
    </template>

    <div class="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-xs text-muted-foreground">已维护映射</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold">{{ totalMappings }}</div>
          <div class="text-xs text-muted-foreground mt-1">当前会随 profile 保存的包装名称覆盖项</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-xs text-muted-foreground">规范化冲突</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold">{{ normalizedConflictCount }}</div>
          <div class="text-xs text-muted-foreground mt-1">建议先清零，再继续扩充例外字典</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-xs text-muted-foreground">当前筛选结果</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold">{{ filteredCount }}</div>
          <div class="text-xs text-muted-foreground mt-1">用于快速定位已有例外项</div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>基础配置</CardTitle>
        <CardDescription>默认情况下直接使用系统标准供应商；只有需要覆盖时才展示自定义入口，但保存时仍保持现有 profile 数据结构。</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="useSystemDefaultSupplier" class="flex flex-col gap-3 rounded-md border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
          <div class="space-y-1">
            <div class="text-sm font-medium">当前使用系统默认供应商</div>
            <div class="text-sm text-muted-foreground">{{ DEFAULT_PACKAGING_SUPPLIER }}</div>
          </div>
          <Button variant="outline" size="sm" @click="useCustomSupplierMode">改为自定义供应商</Button>
        </div>
        <div v-else class="space-y-3">
          <div class="space-y-2">
            <label class="text-sm font-medium">自定义默认供应商</label>
            <Input v-model="supplierName" :placeholder="`例如：${DEFAULT_PACKAGING_SUPPLIER}`" />
          </div>
          <div class="flex justify-end">
            <Button variant="outline" size="sm" @click="useSystemDefaultMode">恢复系统默认</Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex-row items-center justify-between gap-4">
        <div class="space-y-1">
          <CardTitle>映射列表</CardTitle>
          <CardDescription>这里应只保留标准字典未覆盖、且确实需要人工指定采购名称的包装项。</CardDescription>
        </div>
        <Input v-model="searchQuery" class="w-full max-w-sm" placeholder="搜索内容..." />
      </CardHeader>
      <CardContent>
        <div v-if="!hasMeaningfulRows && !showDraftRows" class="rounded-md border border-dashed bg-muted/10 px-6 py-8 text-center">
          <div class="text-sm font-medium">当前没有需要人工维护的包装例外项</div>
          <div class="mt-2 text-sm text-muted-foreground">当系统标准字典无法覆盖某个包装名称时，再新增一条例外映射。</div>
          <div class="mt-4">
            <Button variant="outline" size="sm" @click="addMappingRow">新增例外映射</Button>
          </div>
        </div>
        <ConfigTable
          v-else
          :columns="[{key:'key',label:'包装名称',width:'46%'},{key:'value',label:'采购名称',width:'44%'}]"
          :rows="filteredRows"
          scroll-mode="page"
          @add="addMappingRow"
          @remove="removeMappingRow"
        >
          <template #cell-key="{row}">
            <Input v-model="row.key" />
            <div class="text-[10px] text-muted-foreground mt-1">规范化：{{ normalizePackagingMappingKey(row.key) }}</div>
          </template>
          <template #cell-value="{row}"><Input v-model="row.value" /></template>
        </ConfigTable>
      </CardContent>
    </Card>
  </ProfileEditorHost>
</template>
