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
import { refreshHandleRuntime } from '@/services/configRuntime';
import { adaptHandleMapping, validateHandleMapping } from '@/services/mappings';
import type { HandleMappingConfig } from '@/types/mapping';
import { HANDLE_EXPORT_CUSTOMER_KEYWORD, HANDLE_PLACEHOLDER_KEYWORD } from '@/shared/constants/business';
import { CONFIG_ENDPOINTS } from '@/shared/constants/endpoints';

type KeywordRow = { id: string; value: string };
type MappingRow = {
  id: string;
  model: string;
  supplier: string;
  vendorName: string;
  materialCode: string;
};

const defaultSupplier = ref('');
const unmatchedSupplier = ref('');
const manualReviewLabel = ref('');
const fallbackModelSources = ref<Array<'remark' | 'xsbz'>>(['remark', 'xsbz']);
const defaultActivityForExport = ref<'single' | 'double'>('double');
const thicknessPacks = ref<Record<string, string>>({ '5': '', '7': '', '9': '', '10': '' });
const searchQuery = ref('');
const baselineSnapshot = ref('');

// 使用通用的 useEditableList 管理行数组
const singleKeywords = useEditableList<KeywordRow>(() => ({ id: '', value: '' }));
const doubleKeywords = useEditableList<KeywordRow>(() => ({ id: '', value: '' }));
const exportCustomerKeywords = useEditableList<KeywordRow>(() => ({ id: '', value: HANDLE_EXPORT_CUSTOMER_KEYWORD }));
const placeholderKeywords = useEditableList<KeywordRow>(() => ({ id: '', value: HANDLE_PLACEHOLDER_KEYWORD }));
const mappings = useEditableList<MappingRow>(() => ({
  id: '',
  model: '',
  supplier: '',
  vendorName: '',
  materialCode: ''
}));

const payload = computed<HandleMappingConfig>(() => ({
  defaultSupplier: defaultSupplier.value,
  unmatchedSupplier: unmatchedSupplier.value,
  manualReviewLabel: manualReviewLabel.value,
  singleKeywords: singleKeywords.list.value.map((k) => k.value),
  doubleKeywords: doubleKeywords.list.value.map((k) => k.value),
  exportCustomerKeywords: exportCustomerKeywords.list.value.map((k) => k.value),
  placeholderKeywords: placeholderKeywords.list.value.map((k) => k.value),
  fallbackModelSources: [...fallbackModelSources.value],
  defaultActivityForExport: defaultActivityForExport.value,
  thicknessAccessoryPacks: { ...thicknessPacks.value },
  mappings: rowsToMap(mappings.list.value, 'model', (row) => ({
    supplier: row.supplier,
    vendorName: row.vendorName,
    ...(row.materialCode.trim() ? { materialCode: row.materialCode } : {})
  }))
}));

const clientIssues = computed(() => {
  const issues = [...validateHandleMapping(payload.value)];
  mappings.list.value.forEach((row, index) => {
    if (!row.model.trim()) {
      issues.push({ path: `rows[${index}].model`, code: 'required', message: '型号不能为空' });
    } else if (!mappings.isUnique('model', row.model, row.id)) {
      issues.push({ path: `rows[${index}].model`, code: 'duplicate', message: '型号重复' });
    }
  });
  return issues;
});

const activeTab = ref<'basic' | 'keywords' | 'mappings'>('basic');

const hasBasicIssues = computed(() => 
  [...clientIssues.value, ...editor.serverIssues.value].some(issue => 
    ['defaultSupplier', 'unmatchedSupplier', 'manualReviewLabel', 'defaultActivityForExport'].includes(issue.path) ||
    issue.path.startsWith('thicknessAccessoryPacks[')
  )
);

const hasKeywordsIssues = computed(() => 
  [...clientIssues.value, ...editor.serverIssues.value].some(issue => 
    issue.path.startsWith('singleKeywords[') ||
    issue.path.startsWith('doubleKeywords[') ||
    issue.path.startsWith('exportCustomerKeywords[') ||
    issue.path.startsWith('placeholderKeywords[') ||
    issue.path.startsWith('fallbackModelSources[')
  )
);

const hasMappingsIssues = computed(() => 
  [...clientIssues.value, ...editor.serverIssues.value].some(issue => 
    issue.path.startsWith('rows[') || issue.path.startsWith('mappings[')
  )
);

const filteredRows = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  if (!keyword) return mappings.list.value;
  return mappings.list.value.filter((row) => (
    row.model.toLowerCase().includes(keyword) ||
    row.supplier.toLowerCase().includes(keyword) ||
    row.vendorName.toLowerCase().includes(keyword) ||
    row.materialCode.toLowerCase().includes(keyword)
  ));
});

const hasUnsavedChanges = computed(() => JSON.stringify(payload.value) !== baselineSnapshot.value);

function resetWithPayload(data: HandleMappingConfig) {
  defaultSupplier.value = data.defaultSupplier || '';
  unmatchedSupplier.value = data.unmatchedSupplier || '';
  manualReviewLabel.value = data.manualReviewLabel || '';
  
  singleKeywords.reset(mapToRows(data.singleKeywords?.reduce((acc, v) => ({ ...acc, [v]: v }), {}), 'value', (v) => ({ value: v } as any)));
  doubleKeywords.reset(mapToRows(data.doubleKeywords?.reduce((acc, v) => ({ ...acc, [v]: v }), {}), 'value', (v) => ({ value: v } as any)));
  exportCustomerKeywords.reset(mapToRows(data.exportCustomerKeywords?.reduce((acc, v) => ({ ...acc, [v]: v }), {}), 'value', (v) => ({ value: v } as any)));
  placeholderKeywords.reset(mapToRows(data.placeholderKeywords?.reduce((acc, v) => ({ ...acc, [v]: v }), {}), 'value', (v) => ({ value: v } as any)));

  fallbackModelSources.value = Array.isArray(data.fallbackModelSources) && data.fallbackModelSources.length > 0
    ? data.fallbackModelSources.filter((item): item is 'remark' | 'xsbz' => item === 'remark' || item === 'xsbz')
    : ['remark', 'xsbz'];
  defaultActivityForExport.value = data.defaultActivityForExport === 'single' ? 'single' : 'double';

  thicknessPacks.value = {
    '5': data.thicknessAccessoryPacks?.['5'] || '',
    '7': data.thicknessAccessoryPacks?.['7'] || '',
    '9': data.thicknessAccessoryPacks?.['9'] || '',
    '10': data.thicknessAccessoryPacks?.['10'] || ''
  };

  mappings.reset(mapToRows(data.mappings, 'model', (model, conf) => ({
    model,
    supplier: conf.supplier,
    vendorName: conf.vendorName,
    materialCode: conf.materialCode || ''
  } as any)));

  baselineSnapshot.value = JSON.stringify(payload.value);
}

async function scrollToFirstIssue() {
  if (hasBasicIssues.value) activeTab.value = 'basic';
  else if (hasKeywordsIssues.value) activeTab.value = 'keywords';
  else if (hasMappingsIssues.value) activeTab.value = 'mappings';

  import('vue').then(({ nextTick }) => nextTick()).then(() => {
    scrollToFirstIssueElement('[data-issue-item="true"]', '[data-issue-anchor="true"]');
  });
}

const editor = useProfileEditor<HandleMappingConfig>({
  endpoint: CONFIG_ENDPOINTS.HANDLE.path,
  workflowProfileCode: CONFIG_ENDPOINTS.HANDLE.profile,
  workflowBasePath: CONFIG_ENDPOINTS.HANDLE.basePath,
  loadErrorDescription: '无法读取拉手映射配置',
  saveSuccessDescription: '拉手映射已更新',
  getPayload: () => payload.value,
  getClientIssues: () => clientIssues.value,
  validatePayload: validateHandleMapping,
  adaptPayload: (value) => adaptHandleMapping(value),
  resetWithPayload,
  refreshRuntime: refreshHandleRuntime,
  scrollToFirstIssue
});

onMounted(editor.load);
</script>

<template>
  <ProfileEditorHost
    title="拉手配置"
    description="维护拉手单双活映射、门厚配件包与人工处理策略。"
    :editor="editor"
    :clientIssues="clientIssues"
    workflow-meta-variant="inline"
    actions-position="header"
  >
    <template #header-extra>
      <span v-if="hasUnsavedChanges" class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">未保存</span>
    </template>

    <div class="flex items-center gap-1 border-b overflow-x-auto pb-px">
      <button v-for="tab in [{id:'basic',label:'基础策略',hasIssue:hasBasicIssues},{id:'keywords',label:'识别规则',hasIssue:hasKeywordsIssues},{id:'mappings',label:'型号映射',hasIssue:hasMappingsIssues}]" :key="tab.id"
        @click="activeTab = tab.id as any"
        class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative whitespace-nowrap"
        :class="activeTab === tab.id ? 'bg-background border-t border-l border-r text-foreground' : 'text-muted-foreground hover:bg-muted'"
      >
        {{ tab.label }}
        <span v-if="tab.hasIssue" class="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive"></span>
      </button>
    </div>

    <div v-show="activeTab === 'basic'" class="flex flex-col gap-6">
      <Card>
        <CardHeader><CardTitle>基础策略</CardTitle><CardDescription>配置默认供应商、未匹配供应商和人工处理标签。</CardDescription></CardHeader>
        <CardContent class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="space-y-1"><label class="text-sm font-medium">默认供应商</label><Input v-model="defaultSupplier" placeholder="例如：拉手供应商" /></div>
          <div class="space-y-1"><label class="text-sm font-medium">未匹配供应商</label><Input v-model="unmatchedSupplier" placeholder="例如：待人工处理" /></div>
          <div class="space-y-1"><label class="text-sm font-medium">人工处理标签</label><Input v-model="manualReviewLabel" placeholder="例如：未匹配拉手(待人工处理)" /></div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>外贸默认规则</CardTitle><CardDescription>当未识别到单活/双活时，使用默认规则。</CardDescription></CardHeader>
        <CardContent class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ConfigTable title="外贸客户关键词" :columns="[{key:'value',label:'关键词'}]" :rows="exportCustomerKeywords.list.value" @add="exportCustomerKeywords.add()" @remove="exportCustomerKeywords.remove">
            <template #cell-value="{ row }"><Input v-model="row.value" :placeholder="`例如：${HANDLE_EXPORT_CUSTOMER_KEYWORD}`" /></template>
          </ConfigTable>
          <div class="space-y-2">
            <label class="text-sm font-medium">外贸默认活动类型</label>
            <select v-model="defaultActivityForExport" class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="double">双活</option><option value="single">单活</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>门厚配件包</CardTitle><CardDescription>`mshd` 仅允许 5/7/9/10，其他值将进入人工处理项。</CardDescription></CardHeader>
        <CardContent class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="space-y-1" v-for="thickness in ['5', '7', '9', '10']" :key="thickness">
            <label class="text-sm font-medium">{{ thickness }}cm</label>
            <Input v-model="thicknessPacks[thickness]" :placeholder="`${thickness}公分配件包`" />
          </div>
        </CardContent>
      </Card>
    </div>

    <div v-show="activeTab === 'keywords'" class="flex flex-col gap-6">
      <Card>
        <CardHeader><CardTitle>单双活关键词</CardTitle><CardDescription>从 xsbz/ls/remark 中识别单活或双活（双活优先）。</CardDescription></CardHeader>
        <CardContent class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ConfigTable title="单活关键词" :columns="[{key:'value',label:'关键词'}]" :rows="singleKeywords.list.value" @add="singleKeywords.add()" @remove="singleKeywords.remove">
            <template #cell-value="{ row }"><Input v-model="row.value" placeholder="例如：单活" /></template>
          </ConfigTable>
          <ConfigTable title="双活关键词" :columns="[{key:'value',label:'关键词'}]" :rows="doubleKeywords.list.value" @add="doubleKeywords.add()" @remove="doubleKeywords.remove">
            <template #cell-value="{ row }"><Input v-model="row.value" placeholder="例如：双活" /></template>
          </ConfigTable>
        </CardContent>
      </Card>
    </div>

    <div v-show="activeTab === 'mappings'" class="flex flex-col gap-6">
      <Card class="min-h-0">
        <CardHeader class="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>型号映射</CardTitle>
            <CardDescription>内部拉手名称映射到供应商名称。</CardDescription>
          </div>
          <Input v-model="searchQuery" class="w-full max-w-sm" placeholder="搜索型号、供应商或名称" />
        </CardHeader>
        <CardContent class="min-h-0">
          <ConfigTable 
            :columns="[
              {key:'model',label:'内部型号',width:'20%'},
              {key:'supplier',label:'供应商',width:'18%'},
              {key:'vendorName',label:'供应商名称',width:'24%'},
              {key:'materialCode',label:'物料编码',width:'28%'}
            ]" 
            :rows="filteredRows" 
            scroll-mode="page"
            @add="mappings.add()" 
            @remove="mappings.remove"
          >
            <template #cell-model="{ row }"><Input v-model="row.model" placeholder="Dj-6847双活" /></template>
            <template #cell-supplier="{ row }"><Input v-model="row.supplier" /></template>
            <template #cell-vendorName="{ row }"><Input v-model="row.vendorName" /></template>
            <template #cell-materialCode="{ row }"><Input v-model="row.materialCode" /></template>
          </ConfigTable>
        </CardContent>
      </Card>
    </div>
  </ProfileEditorHost>
</template>
