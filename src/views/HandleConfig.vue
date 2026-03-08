<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import MappingJsonDialog from '@/features/config-editor/components/MappingJsonDialog.vue';
import { useMappingConfigEditor } from '@/features/config-editor/composables/useMappingConfigEditor';
import { createRowId } from '@/features/config-editor/utils/mappingIssueUtils';
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
  vendorNameSingle: string;
  vendorNameDouble: string;
};

const defaultSupplier = ref('');
const unmatchedSupplier = ref('');
const manualReviewLabel = ref('');
const singleKeywords = ref<KeywordRow[]>([]);
const doubleKeywords = ref<KeywordRow[]>([]);
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

function makeMappingRow(model = '', supplier = '', vendorNameSingle = '', vendorNameDouble = ''): MappingRow {
  return {
    id: createRowId(),
    model,
    supplier,
    vendorNameSingle,
    vendorNameDouble
  };
}

const payload = computed<HandleMappingConfig>(() => {
  const mappingObj: HandleMappingConfig['mappings'] = {};
  mappings.value.forEach((row) => {
    mappingObj[row.model] = {
      supplier: row.supplier,
      vendorNameSingle: row.vendorNameSingle,
      vendorNameDouble: row.vendorNameDouble
    };
  });

  return {
    defaultSupplier: defaultSupplier.value,
    unmatchedSupplier: unmatchedSupplier.value,
    manualReviewLabel: manualReviewLabel.value,
    singleKeywords: singleKeywords.value.map((item) => item.value),
    doubleKeywords: doubleKeywords.value.map((item) => item.value),
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

const filteredRows = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  if (!keyword) return mappings.value;

  return mappings.value.filter((row) => (
    row.model.toLowerCase().includes(keyword)
    || row.supplier.toLowerCase().includes(keyword)
    || row.vendorNameSingle.toLowerCase().includes(keyword)
    || row.vendorNameDouble.toLowerCase().includes(keyword)
  ));
});

const hasUnsavedChanges = computed(() => JSON.stringify(payload.value) !== baselineSnapshot.value);

function resetWithPayload(data: HandleMappingConfig) {
  defaultSupplier.value = data.defaultSupplier || '';
  unmatchedSupplier.value = data.unmatchedSupplier || '';
  manualReviewLabel.value = data.manualReviewLabel || '';

  singleKeywords.value = (data.singleKeywords || []).map((item) => makeKeywordRow(item));
  if (singleKeywords.value.length === 0) singleKeywords.value = [makeKeywordRow('')];

  doubleKeywords.value = (data.doubleKeywords || []).map((item) => makeKeywordRow(item));
  if (doubleKeywords.value.length === 0) doubleKeywords.value = [makeKeywordRow('')];

  thicknessPacks.value = {
    '5': data.thicknessAccessoryPacks?.['5'] || '',
    '7': data.thicknessAccessoryPacks?.['7'] || '',
    '9': data.thicknessAccessoryPacks?.['9'] || '',
    '10': data.thicknessAccessoryPacks?.['10'] || ''
  };

  mappings.value = Object.entries(data.mappings || {}).map(([model, conf]) => makeMappingRow(
    model,
    conf.supplier,
    conf.vendorNameSingle,
    conf.vendorNameDouble
  ));
  if (mappings.value.length === 0) mappings.value = [makeMappingRow()];

  baselineSnapshot.value = JSON.stringify(payload.value);
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
});

function addSingleKeyword() {
  singleKeywords.value.push(makeKeywordRow(''));
}

function addDoubleKeyword() {
  doubleKeywords.value.push(makeKeywordRow(''));
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
  <div class="h-full flex flex-col gap-6 p-6 md:p-8 bg-muted/20">
    <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
      <div class="flex items-center gap-3">
        <div>
          <h2 class="text-3xl font-semibold tracking-tight">拉手配置</h2>
          <p class="text-muted-foreground mt-1">维护拉手单双活映射、门厚配件包与人工处理策略。</p>
        </div>
        <span
          v-if="hasUnsavedChanges"
          class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700"
        >
          未保存
        </span>
      </div>
    </div>

    <Card v-if="editor.loadError.value">
      <CardContent class="p-4 text-sm text-destructive">
        {{ editor.loadError.value }}
      </CardContent>
    </Card>

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
        <CardTitle>单双活关键词</CardTitle>
        <CardDescription>从 xsbz/ls/remark 中识别单活或双活（双活优先）。</CardDescription>
      </CardHeader>
      <CardContent class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium">单活关键词</label>
            <Button variant="outline" size="sm" @click="addSingleKeyword">新增</Button>
          </div>
          <div v-for="row in singleKeywords" :key="row.id" class="flex items-center gap-2">
            <Input v-model="row.value" placeholder="例如：单活" />
            <Button variant="ghost" size="sm" @click="singleKeywords = removeKeyword(singleKeywords, row.id)">删除</Button>
          </div>
        </div>
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium">双活关键词</label>
            <Button variant="outline" size="sm" @click="addDoubleKeyword">新增</Button>
          </div>
          <div v-for="row in doubleKeywords" :key="row.id" class="flex items-center gap-2">
            <Input v-model="row.value" placeholder="例如：双活" />
            <Button variant="ghost" size="sm" @click="doubleKeywords = removeKeyword(doubleKeywords, row.id)">删除</Button>
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
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" @click="editor.openJsonEditor">JSON 编辑</Button>
            <Button variant="outline" size="sm" :disabled="editor.isLoading.value || editor.isSaving.value" @click="editor.load">刷新</Button>
            <Button variant="outline" size="sm" @click="addMappingRow">新增</Button>
            <Button size="sm" :disabled="editor.isLoading.value || editor.isSaving.value || clientIssues.length > 0" @click="editor.save">保存</Button>
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
                <th class="px-3 py-2 w-[22%]">供应商名称(单活)</th>
                <th class="px-3 py-2 w-[23%]">供应商名称(双活)</th>
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
                  <Input v-model="row.vendorNameSingle" placeholder="单活采购名称" />
                </td>
                <td class="px-3 py-2">
                  <Input v-model="row.vendorNameDouble" placeholder="双活采购名称" />
                </td>
                <td class="px-3 py-2">
                  <Button variant="ghost" size="sm" @click="removeMappingRow(row.id)">删除</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="clientIssues.length > 0" class="mt-3 text-xs text-destructive space-y-1">
          <div v-for="(issue, index) in clientIssues" :key="`${issue.path}-${issue.code}-${index}`">
            {{ issue.path }}: {{ issue.message }}
          </div>
        </div>
        <div v-if="editor.serverIssues.value.length > 0" class="mt-3 text-xs text-destructive space-y-1">
          <div v-for="(issue, index) in editor.serverIssues.value" :key="`${issue.path}-${issue.code}-${index}`">
            {{ issue.path }}: {{ issue.message }}
          </div>
        </div>
      </CardContent>
    </Card>

    <MappingJsonDialog
      v-model:open="editor.isJsonDialogOpen.value"
      v-model:draft="editor.jsonDraft.value"
      title="拉手配置 JSON"
      :description="'直接编辑拉手配置 JSON，应用前会进行校验。'"
      :error="editor.jsonDraftError.value"
      :issues="editor.jsonDraftIssues.value"
      @reset="editor.resetJsonDraft"
      @format="editor.formatJsonDraft"
      @apply="editor.applyJsonDraft"
    />
  </div>
</template>
