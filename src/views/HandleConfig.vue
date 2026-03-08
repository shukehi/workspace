<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import ConfigPageLayout from '@/features/config-editor/components/ConfigPageLayout.vue';
import { useMappingConfigEditor } from '@/features/config-editor/composables/useMappingConfigEditor';
import { createRowId, scrollToFirstIssueElement } from '@/features/config-editor/utils/mappingIssueUtils';
import { configLoader } from '@/services/configLoader';
import { adaptHandleMapping, validateHandleMapping } from '@/services/mappings';
import type { HandleMappingConfig } from '@/types/mapping';

type KeywordRow = {
  id: string;
  value: string;
};

type MappingRow = {
  id: string;
  model: string;
  supplier: string;
  vendorName: string;
};

const defaultSupplier = ref('');
const unmatchedSupplier = ref('');
const manualReviewLabel = ref('');
const singleKeywords = ref<KeywordRow[]>([]);
const doubleKeywords = ref<KeywordRow[]>([]);
const exportCustomerKeywords = ref<KeywordRow[]>([]);
const defaultActivityForExport = ref<'single' | 'double'>('double');
const thicknessPacks = ref<Record<string, string>>({
  '5': '',
  '7': '',
  '9': '',
  '10': ''
});
const mappings = ref<MappingRow[]>([]);
const searchQuery = ref('');
const baselineSnapshot = ref('');

function makeKeywordRow(value = ''): KeywordRow {
  return { id: createRowId(), value };
}

function makeMappingRow(model = '', supplier = '', vendorName = ''): MappingRow {
  return {
    id: createRowId(),
    model,
    supplier,
    vendorName
  };
}

const payload = computed<HandleMappingConfig>(() => {
  const mappingObj: HandleMappingConfig['mappings'] = {};
  mappings.value.forEach((row) => {
    mappingObj[row.model] = {
      supplier: row.supplier,
      vendorName: row.vendorName
    };
  });

  return {
    defaultSupplier: defaultSupplier.value,
    unmatchedSupplier: unmatchedSupplier.value,
    manualReviewLabel: manualReviewLabel.value,
    singleKeywords: singleKeywords.value.map((item) => item.value),
    doubleKeywords: doubleKeywords.value.map((item) => item.value),
    exportCustomerKeywords: exportCustomerKeywords.value.map((item) => item.value),
    defaultActivityForExport: defaultActivityForExport.value,
    thicknessAccessoryPacks: { ...thicknessPacks.value },
    mappings: mappingObj
  };
});

const clientIssues = computed(() => {
  const issues = [...validateHandleMapping(payload.value)];
  const seen = new Set<string>();

  mappings.value.forEach((row, index) => {
    const key = row.model.trim();
    if (!key) {
      issues.push({ path: `rows[${index}].model`, code: 'required', message: '型号不能为空' });
      return;
    }
    if (seen.has(key)) {
      issues.push({ path: `rows[${index}].model`, code: 'duplicate', message: '型号重复' });
      return;
    }
    seen.add(key);
  });

  return issues;
});

const activeTab = ref<'basic' | 'keywords' | 'mappings'>('basic');

const hasBasicIssues = computed(() => {
  return [...clientIssues.value, ...editor.serverIssues.value].some(issue => 
    ['defaultSupplier', 'unmatchedSupplier', 'manualReviewLabel', 'defaultActivityForExport'].includes(issue.path) ||
    issue.path.startsWith('thicknessAccessoryPacks[')
  );
});

const hasKeywordsIssues = computed(() => {
  return [...clientIssues.value, ...editor.serverIssues.value].some(issue => 
    issue.path.startsWith('singleKeywords[') ||
    issue.path.startsWith('doubleKeywords[') ||
    issue.path.startsWith('exportCustomerKeywords[')
  );
});

const hasMappingsIssues = computed(() => {
  return [...clientIssues.value, ...editor.serverIssues.value].some(issue => 
    issue.path.startsWith('rows[') || 
    issue.path.startsWith('mappings[')
  );
});

const filteredRows = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  if (!keyword) return mappings.value;

  return mappings.value.filter((row) => (
    row.model.toLowerCase().includes(keyword)
    || row.supplier.toLowerCase().includes(keyword)
    || row.vendorName.toLowerCase().includes(keyword)
  ));
});

const hasUnsavedChanges = computed(() => JSON.stringify(payload.value) !== baselineSnapshot.value);

const showIssuesPanel = computed(() => clientIssues.value.length > 0 || editor.serverIssues.value.length > 0);

function resetWithPayload(data: HandleMappingConfig) {
  defaultSupplier.value = data.defaultSupplier || '';
  unmatchedSupplier.value = data.unmatchedSupplier || '';
  manualReviewLabel.value = data.manualReviewLabel || '';

  singleKeywords.value = (data.singleKeywords || []).map((item) => makeKeywordRow(item));
  if (singleKeywords.value.length === 0) singleKeywords.value = [makeKeywordRow('')];

  doubleKeywords.value = (data.doubleKeywords || []).map((item) => makeKeywordRow(item));
  if (doubleKeywords.value.length === 0) doubleKeywords.value = [makeKeywordRow('')];
  exportCustomerKeywords.value = (data.exportCustomerKeywords || []).map((item) => makeKeywordRow(item));
  if (exportCustomerKeywords.value.length === 0) exportCustomerKeywords.value = [makeKeywordRow('三部')];
  defaultActivityForExport.value = data.defaultActivityForExport === 'single' ? 'single' : 'double';

  thicknessPacks.value = {
    '5': data.thicknessAccessoryPacks?.['5'] || '',
    '7': data.thicknessAccessoryPacks?.['7'] || '',
    '9': data.thicknessAccessoryPacks?.['9'] || '',
    '10': data.thicknessAccessoryPacks?.['10'] || ''
  };

  mappings.value = Object.entries(data.mappings || {}).map(([model, conf]) => makeMappingRow(
    model,
    conf.supplier,
    conf.vendorName
  ));
  if (mappings.value.length === 0) mappings.value = [makeMappingRow()];

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

const editor = useMappingConfigEditor<HandleMappingConfig>({
  endpoint: '/config/handle',
  loadErrorDescription: '无法读取拉手映射配置',
  saveSuccessDescription: '拉手映射已更新',
  getPayload: () => payload.value,
  getClientIssues: () => clientIssues.value,
  validatePayload: validateHandleMapping,
  adaptPayload: (value) => adaptHandleMapping(value),
  resetWithPayload,
  refreshRuntime: () => configLoader.refreshHandleMapping(),
  scrollToFirstIssue
});

function addSingleKeyword() {
  singleKeywords.value.push(makeKeywordRow(''));
}

function addDoubleKeyword() {
  doubleKeywords.value.push(makeKeywordRow(''));
}

function addExportCustomerKeyword() {
  exportCustomerKeywords.value.push(makeKeywordRow(''));
}

function removeKeyword(list: KeywordRow[], id: string) {
  const next = list.filter((item) => item.id !== id);
  if (next.length === 0) next.push(makeKeywordRow(''));
  return next;
}

function addMappingRow() {
  if (searchQuery.value) searchQuery.value = '';
  mappings.value.push(makeMappingRow());
}

function removeMappingRow(id: string) {
  mappings.value = mappings.value.filter((row) => row.id !== id);
  if (mappings.value.length === 0) mappings.value.push(makeMappingRow());
}

onMounted(editor.load);
</script>

<template>
  <ConfigPageLayout
    title="拉手配置"
    description="维护拉手单双活映射、门厚配件包与人工处理策略。"
    :editor="editor"
    :clientIssues="clientIssues"
  >
    <template #header-extra>
      <span
        v-if="hasUnsavedChanges"
        class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700"
      >
        未保存
      </span>
    </template>

    <!-- Tabs Navigation -->
    <div class="flex items-center gap-1 border-b overflow-x-auto pb-px">
      <button
        @click="activeTab = 'basic'"
        class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative whitespace-nowrap"
        :class="activeTab === 'basic' ? 'bg-background border-t border-l border-r text-foreground' : 'text-muted-foreground hover:bg-muted'"
      >
        基础策略
        <span v-if="hasBasicIssues" class="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive"></span>
      </button>
      <button
        @click="activeTab = 'keywords'"
        class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative whitespace-nowrap"
        :class="activeTab === 'keywords' ? 'bg-background border-t border-l border-r text-foreground' : 'text-muted-foreground hover:bg-muted'"
      >
        识别规则
        <span v-if="hasKeywordsIssues" class="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive"></span>
      </button>
      <button
        @click="activeTab = 'mappings'"
        class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative whitespace-nowrap"
        :class="activeTab === 'mappings' ? 'bg-background border-t border-l border-r text-foreground' : 'text-muted-foreground hover:bg-muted'"
      >
        型号映射
        <span v-if="hasMappingsIssues" class="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive"></span>
      </button>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-6">
      <div class="flex flex-col gap-6 xl:col-span-2">
        <div v-show="activeTab === 'basic'" class="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>基础策略</CardTitle>
              <CardDescription>配置默认供应商、未匹配供应商和人工处理标签。</CardDescription>
            </CardHeader>
            <CardContent class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="space-y-1">
                <label class="text-sm font-medium">默认供应商</label>
                <Input v-model="defaultSupplier" placeholder="例如：拉手供应商" />
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium">未匹配供应商</label>
                <Input v-model="unmatchedSupplier" placeholder="例如：待人工处理" />
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium">人工处理标签</label>
                <Input v-model="manualReviewLabel" placeholder="例如：未匹配拉手(待人工处理)" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>外贸默认规则</CardTitle>
              <CardDescription>当未识别到单活/双活时，若客户名称命中关键词则使用默认活动类型。</CardDescription>
            </CardHeader>
            <CardContent class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-3">
                <div class="flex items-center justify-between mb-1">
                  <label class="text-sm font-medium">外贸客户关键词</label>
                </div>
                <div class="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  <div v-for="row in exportCustomerKeywords" :key="row.id" class="flex items-center gap-2">
                    <Input v-model="row.value" placeholder="例如：三部" />
                    <Button variant="ghost" size="sm" @click="exportCustomerKeywords = removeKeyword(exportCustomerKeywords, row.id)">删除</Button>
                  </div>
                </div>
                <Button variant="outline" size="sm" class="w-full border-dashed" @click="addExportCustomerKeyword">
                  + 新增关键字
                </Button>
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium">外贸默认活动类型</label>
                <select
                  v-model="defaultActivityForExport"
                  class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="double">双活</option>
                  <option value="single">单活</option>
                </select>
                <div class="text-xs text-muted-foreground">
                  仅在订单文本未识别到单活/双活时生效。
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>门厚配件包</CardTitle>
              <CardDescription>`mshd` 仅允许 5/7/9/10，其他值将进入人工处理项。</CardDescription>
            </CardHeader>
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
            <CardHeader>
              <CardTitle>单双活关键词</CardTitle>
              <CardDescription>从 xsbz/ls/remark 中识别单活或双活（双活优先）。</CardDescription>
            </CardHeader>
            <CardContent class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-3">
                <div class="flex items-center justify-between mb-1">
                  <label class="text-sm font-medium">单活关键词</label>
                </div>
                <div class="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  <div v-for="row in singleKeywords" :key="row.id" class="flex items-center gap-2">
                    <Input v-model="row.value" placeholder="例如：单活" />
                    <Button variant="ghost" size="sm" @click="singleKeywords = removeKeyword(singleKeywords, row.id)">删除</Button>
                  </div>
                </div>
                <Button variant="outline" size="sm" class="w-full border-dashed" @click="addSingleKeyword">
                  + 新增单活关键字
                </Button>
              </div>
              <div class="space-y-3">
                <div class="flex items-center justify-between mb-1">
                  <label class="text-sm font-medium">双活关键词</label>
                </div>
                <div class="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  <div v-for="row in doubleKeywords" :key="row.id" class="flex items-center gap-2">
                    <Input v-model="row.value" placeholder="例如：双活" />
                    <Button variant="ghost" size="sm" @click="doubleKeywords = removeKeyword(doubleKeywords, row.id)">删除</Button>
                  </div>
                </div>
                <Button variant="outline" size="sm" class="w-full border-dashed" @click="addDoubleKeyword">
                  + 新增双活关键字
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div v-show="activeTab === 'mappings'" class="flex flex-col gap-6">
          <Card class="min-h-0">
            <CardHeader class="space-y-3">
              <div>
                <CardTitle>型号映射</CardTitle>
                <CardDescription>内部拉手名称映射到供应商名称（单活/双活）。</CardDescription>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
                <div class="space-y-1">
                  <label class="text-sm font-medium">搜索</label>
                  <Input v-model="searchQuery" placeholder="搜索型号、供应商或名称" />
                </div>
              </div>
            </CardHeader>
            <CardContent class="min-h-0">
              <div class="max-h-[520px] overflow-auto rounded-md border">
                <table class="w-full text-sm text-left">
                  <thead class="text-xs text-muted-foreground bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th class="px-3 py-2 w-[25%]">内部型号</th>
                      <th class="px-3 py-2 w-[20%]">供应商</th>
                      <th class="px-3 py-2 w-[35%]">供应商名称</th>
                      <th class="px-3 py-2 w-[10%]">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in filteredRows" :key="row.id" class="bg-background border-b last:border-0 align-top">
                      <td class="px-3 py-2">
                        <Input v-model="row.model" placeholder="例如：DJ-6847双活不分左右" />
                      </td>
                      <td class="px-3 py-2">
                        <Input v-model="row.supplier" placeholder="供应商" />
                      </td>
                      <td class="px-3 py-2">
                        <Input v-model="row.vendorName" placeholder="供应商采购名称" />
                      </td>
                      <td class="px-3 py-2">
                        <Button variant="ghost" size="sm" @click="removeMappingRow(row.id)">删除</Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <Button variant="outline" size="sm" class="w-full mt-3 border-dashed" @click="addMappingRow">
                + 新增型号映射
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      </div>
  </ConfigPageLayout>
</template>
