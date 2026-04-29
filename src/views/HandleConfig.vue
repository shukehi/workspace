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
import {
  getHandleFilteredRows,
  getHandleRowsForValidation,
  isMeaningfulHandleRow,
  shouldReuseEmptyHandleDraft,
} from '@/features/config-editor/utils/handleEditorState';
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

const HANDLE_DEFAULTS = adaptHandleMapping({});

const defaultSupplier = ref(HANDLE_DEFAULTS.defaultSupplier);
const unmatchedSupplier = ref(HANDLE_DEFAULTS.unmatchedSupplier);
const manualReviewLabel = ref(HANDLE_DEFAULTS.manualReviewLabel);
const fallbackModelSources = ref<Array<'remark' | 'xsbz'>>(['remark', 'xsbz']);
const defaultActivityForExport = ref<'single' | 'double'>('double');
const thicknessPacks = ref<Record<string, string>>({ '5': '', '7': '', '9': '', '10': '' });
const searchQuery = ref('');
const baselineSnapshot = ref('');
const useSystemDefaultStrategy = ref(true);
const showDraftRows = ref(false);

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
  getHandleRowsForValidation(mappings.list.value, showDraftRows.value).forEach((row, index) => {
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

const totalMappings = computed(() => Object.keys(payload.value.mappings).length);
const meaningfulRows = computed(() => mappings.list.value.filter(isMeaningfulHandleRow));
const hasMeaningfulRows = computed(() => meaningfulRows.value.length > 0);
const filteredCount = computed(() => filteredRows.value.length);

const filteredRows = computed(() => {
  return getHandleFilteredRows(mappings.list.value, showDraftRows.value, searchQuery.value);
});

const hasUnsavedChanges = computed(() => JSON.stringify(payload.value) !== baselineSnapshot.value);

function resetWithPayload(data: HandleMappingConfig) {
  defaultSupplier.value = data.defaultSupplier || '';
  unmatchedSupplier.value = data.unmatchedSupplier || '';
  manualReviewLabel.value = data.manualReviewLabel || '';
  useSystemDefaultStrategy.value = (
    defaultSupplier.value === HANDLE_DEFAULTS.defaultSupplier
    && unmatchedSupplier.value === HANDLE_DEFAULTS.unmatchedSupplier
    && manualReviewLabel.value === HANDLE_DEFAULTS.manualReviewLabel
  );
  
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
  showDraftRows.value = false;

  baselineSnapshot.value = JSON.stringify(payload.value);
}

function useSystemDefaults() {
  defaultSupplier.value = HANDLE_DEFAULTS.defaultSupplier;
  unmatchedSupplier.value = HANDLE_DEFAULTS.unmatchedSupplier;
  manualReviewLabel.value = HANDLE_DEFAULTS.manualReviewLabel;
  useSystemDefaultStrategy.value = true;
}

function useCustomDefaults() {
  useSystemDefaultStrategy.value = false;
}

function addMappingRow() {
  searchQuery.value = '';
  if (shouldReuseEmptyHandleDraft(mappings.list.value)) {
    showDraftRows.value = true;
    return;
  }
  showDraftRows.value = true;
  mappings.add();
}

function removeMappingRow(id: string) {
  mappings.remove(id);
  if (!mappings.list.value.some(isMeaningfulHandleRow)) {
    showDraftRows.value = false;
  }
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
    description="规则例外维护：仅维护拉手单双活映射、门厚配件包与人工处理策略中的人工例外。"
    :editor="editor"
    :clientIssues="clientIssues"
    workflow-meta-variant="inline"
    actions-position="header"
  >

    <Card class="border-dashed bg-muted/20" data-operator-guide="true">
      <CardHeader class="pb-3">
        <CardTitle class="text-sm">首屏维护顺序</CardTitle>
        <CardDescription>先确认默认策略与规则试跑，再只把无法自动覆盖的内容写入例外行。</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-3 text-sm md:grid-cols-3">
        <div class="rounded-md border bg-background px-3 py-2">
          <div class="font-medium">默认策略</div>
          <div class="mt-1 text-xs text-muted-foreground">优先复用系统默认与标准规则。</div>
        </div>
        <div class="rounded-md border bg-background px-3 py-2">
          <div class="font-medium">规则试跑</div>
          <div class="mt-1 text-xs text-muted-foreground">有试跑入口时先验证自动命中结果。</div>
        </div>
        <div class="rounded-md border bg-background px-3 py-2">
          <div class="font-medium">例外行</div>
          <div class="mt-1 text-xs text-muted-foreground">仅维护标准规则无法覆盖的人工例外。</div>
        </div>
      </CardContent>
    </Card>
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
          <div class="text-xs text-muted-foreground mt-1">当前随 profile 保存的拉手例外映射项</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-xs text-muted-foreground">默认策略模式</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold">{{ useSystemDefaultStrategy ? '系统默认' : '自定义' }}</div>
          <div class="text-xs text-muted-foreground mt-1">控制默认供应商、未匹配供应商与人工处理标签的首屏展示</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-xs text-muted-foreground">当前筛选结果</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold">{{ filteredCount }}</div>
          <div class="text-xs text-muted-foreground mt-1">用于快速定位已有拉手例外项</div>
        </CardContent>
      </Card>
    </div>

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
        <CardHeader>
          <CardTitle>基础策略</CardTitle>
          <CardDescription>默认情况下直接使用系统标准基础策略；只有需要覆盖时才展示自定义入口，但保存结构保持不变。</CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="useSystemDefaultStrategy" class="flex flex-col gap-3 rounded-md border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
            <div class="space-y-1">
              <div class="text-sm font-medium">当前使用系统标准基础策略</div>
              <div class="text-sm text-muted-foreground">默认供应商：{{ HANDLE_DEFAULTS.defaultSupplier }} · 未匹配供应商：{{ HANDLE_DEFAULTS.unmatchedSupplier }} · 人工处理标签：{{ HANDLE_DEFAULTS.manualReviewLabel }}</div>
            </div>
            <Button variant="outline" size="sm" @click="useCustomDefaults">改为自定义基础策略</Button>
          </div>
          <div v-else class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="space-y-1"><label class="text-sm font-medium">默认供应商</label><Input v-model="defaultSupplier" placeholder="例如：拉手供应商" /></div>
              <div class="space-y-1"><label class="text-sm font-medium">未匹配供应商</label><Input v-model="unmatchedSupplier" placeholder="例如：待人工处理" /></div>
              <div class="space-y-1"><label class="text-sm font-medium">人工处理标签</label><Input v-model="manualReviewLabel" placeholder="例如：未匹配拉手(待人工处理)" /></div>
            </div>
            <div class="flex justify-end">
              <Button variant="outline" size="sm" @click="useSystemDefaults">恢复系统默认</Button>
            </div>
          </div>
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
            <CardDescription>这里应只保留标准识别规则未覆盖、且确实需要人工指定供应商名称的拉手例外项。</CardDescription>
          </div>
          <Input v-model="searchQuery" class="w-full max-w-sm" placeholder="搜索型号、供应商或名称" />
        </CardHeader>
        <CardContent class="min-h-0">
          <div v-if="!hasMeaningfulRows && !showDraftRows" class="rounded-md border border-dashed bg-muted/10 px-6 py-8 text-center">
            <div class="text-sm font-medium">当前没有需要人工维护的拉手例外项</div>
            <div class="mt-2 text-sm text-muted-foreground">当系统识别规则无法覆盖某个拉手型号时，再新增一条例外映射。</div>
            <div class="mt-4">
              <Button variant="outline" size="sm" @click="addMappingRow">新增例外映射</Button>
            </div>
          </div>
          <ConfigTable
            v-else
            :columns="[
              {key:'model',label:'内部型号',width:'20%'},
              {key:'supplier',label:'供应商',width:'18%'},
              {key:'vendorName',label:'供应商名称',width:'24%'},
              {key:'materialCode',label:'物料编码',width:'28%'}
            ]"
            :rows="filteredRows"
            scroll-mode="page"
            @add="addMappingRow"
            @remove="removeMappingRow"
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
