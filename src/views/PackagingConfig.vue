<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import ConfigPageLayout from '@/features/config-editor/components/ConfigPageLayout.vue';
import ConfigTable from '@/features/config-editor/components/ConfigTable.vue';
import { useMappingConfigEditor } from '@/features/config-editor/composables/useMappingConfigEditor';
import { useEditableList } from '@/features/config-editor/composables/useEditableList';
import { mapToRows, rowsToMap } from '@/features/config-editor/utils/configMapper';
import { scrollToFirstIssueElement } from '@/features/config-editor/utils/mappingIssueUtils';
import { refreshPackagingRuntime } from '@/services/configRuntime';
import { adaptPackagingMapping, normalizePackagingMappingKey, validatePackagingMapping } from '@/services/mappings';
import type { PackagingMappingConfig } from '@/types/mapping';
import { DEFAULT_PACKAGING_SUPPLIER } from '@/shared/constants/business';
import { CONFIG_ENDPOINTS } from '@/shared/constants/endpoints';

type MappingRow = { id: string; key: string; value: string; };

const supplierName = ref(DEFAULT_PACKAGING_SUPPLIER);
const searchQuery = ref('');
const baselineSnapshot = ref('');

const mappings = useEditableList<MappingRow>(() => ({ id: '', key: '', value: '' }));

const payload = computed<PackagingMappingConfig>(() => ({
  supplierName: supplierName.value,
  mappings: rowsToMap(mappings.list.value, 'key', (row) => row.value)
}));

const clientIssues = computed(() => {
  const issues = [...validatePackagingMapping(payload.value)];
  const normalizedSeen = new Map<string, string>();
  mappings.list.value.forEach((row, index) => {
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

const filteredRows = computed(() => {
  const kw = searchQuery.value.trim().toLowerCase();
  if (!kw) return mappings.list.value;
  return mappings.list.value.filter(r => r.key.toLowerCase().includes(kw) || r.value.toLowerCase().includes(kw));
});

const hasUnsavedChanges = computed(() => {
  const data = payload.value;
  const sorted: any = { supplierName: data.supplierName, mappings: {} };
  Object.keys(data.mappings).sort().forEach(k => sorted.mappings[k] = data.mappings[k]);
  return JSON.stringify(sorted) !== baselineSnapshot.value;
});

function resetWithPayload(data: PackagingMappingConfig) {
  supplierName.value = data.supplierName || DEFAULT_PACKAGING_SUPPLIER;
  mappings.reset(mapToRows(data.mappings, 'key', (k, v) => ({ key: k, value: v } as any)));
  const sorted: any = { supplierName: data.supplierName, mappings: {} };
  Object.keys(data.mappings || {}).sort().forEach(k => sorted.mappings[k] = data.mappings?.[k]);
  baselineSnapshot.value = JSON.stringify(sorted);
}

const editor = useMappingConfigEditor<PackagingMappingConfig>({
  endpoint: CONFIG_ENDPOINTS.PACKAGING.path,
  workflowProfileCode: CONFIG_ENDPOINTS.PACKAGING.profile,
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
  <ConfigPageLayout title="包装配置" description="管理包装名称映射。" :editor="editor" :clientIssues="clientIssues">
    <template #header-extra>
      <span v-if="hasUnsavedChanges" class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">未保存</span>
    </template>

    <Card>
      <CardHeader><CardTitle>基础配置</CardTitle></CardHeader>
      <CardContent class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2"><label class="text-sm font-medium">默认供应商</label><Input v-model="supplierName" :placeholder="`例如：${DEFAULT_PACKAGING_SUPPLIER}`" /></div>
        <div class="space-y-2"><label class="text-sm font-medium">搜索映射</label><Input v-model="searchQuery" placeholder="搜索内容..." /></div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>映射列表</CardTitle></CardHeader>
      <CardContent>
        <ConfigTable 
          :columns="[{key:'key',label:'包装名称',width:'46%'},{key:'value',label:'采购名称',width:'44%'}]" 
          :rows="filteredRows" 
          max-height="520px"
          @add="mappings.add()" 
          @remove="mappings.remove"
        >
          <template #cell-key="{row}">
            <Input v-model="row.key" />
            <div class="text-[10px] text-muted-foreground mt-1">规范化：{{ normalizePackagingMappingKey(row.key) }}</div>
          </template>
          <template #cell-value="{row}"><Input v-model="row.value" /></template>
        </ConfigTable>
      </CardContent>
    </Card>
  </ConfigPageLayout>
</template>
