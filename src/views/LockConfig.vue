<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import ConfigPageLayout from '@/features/config-editor/components/ConfigPageLayout.vue';
import { useMappingConfigEditor } from '@/features/config-editor/composables/useMappingConfigEditor';
import { createRowId, scrollToFirstIssueElement } from '@/features/config-editor/utils/mappingIssueUtils';
import { refreshLockRuntime } from '@/services/configRuntime';
import { adaptLockMapping, normalizeLockMappingKey, validateLockMapping } from '@/services/mappings';
import type { LockMappingConfig } from '@/types/mapping';

type MappingRow = {
  id: string;
  model: string;
  supplier: string;
  vendorName: string;
  primarySpec: string;
  secondarySpec: string;
  remark: string;
};

const defaultUnit = ref('套');
const primaryLabel = ref('主锁');
const secondaryLabel = ref('副锁');
const mappings = ref<MappingRow[]>([]);
const searchQuery = ref('');
const baselineSnapshot = ref('');
const previewPrimaryInput = ref('');
const previewSecondaryInput = ref('');

function makeMappingRow(
  model = '',
  supplier = '',
  vendorName = '',
  primarySpec = '',
  secondarySpec = '',
  remark = ''
): MappingRow {
  return {
    id: createRowId(),
    model,
    supplier,
    vendorName,
    primarySpec,
    secondarySpec,
    remark
  };
}

const payload = computed<LockMappingConfig>(() => {
  const mappingObj: LockMappingConfig['mappings'] = {};
  mappings.value.forEach((row) => {
    mappingObj[row.model] = {
      supplier: row.supplier,
      vendorName: row.vendorName,
      ...(row.primarySpec ? { primarySpec: row.primarySpec } : {}),
      ...(row.secondarySpec ? { secondarySpec: row.secondarySpec } : {}),
      ...(row.remark ? { remark: row.remark } : {})
    };
  });

  return {
    defaultUnit: defaultUnit.value,
    primaryLabel: primaryLabel.value,
    secondaryLabel: secondaryLabel.value,
    mappings: mappingObj
  };
});

const clientIssues = computed(() => {
  const issues = [...validateLockMapping(payload.value)];
  const normalizedSeen = new Set<string>();

  mappings.value.forEach((row, index) => {
    const key = row.model.trim();
    if (!key) {
      issues.push({ path: `rows[${index}].model`, code: 'required', message: '型号不能为空' });
      return;
    }

    const normalized = normalizeLockMappingKey(key);
    if (normalizedSeen.has(normalized)) {
      issues.push({ path: `rows[${index}].model`, code: 'duplicate', message: '型号 normalize 后重复' });
      return;
    }
    normalizedSeen.add(normalized);
  });

  return issues;
});

const filteredRows = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  if (!keyword) return mappings.value;
  return mappings.value.filter((row) => (
    row.model.toLowerCase().includes(keyword)
    || row.supplier.toLowerCase().includes(keyword)
    || row.vendorName.toLowerCase().includes(keyword)
    || row.primarySpec.toLowerCase().includes(keyword)
    || row.secondarySpec.toLowerCase().includes(keyword)
  ));
});

const hasUnsavedChanges = computed(() => JSON.stringify(payload.value) !== baselineSnapshot.value);

const normalizedMappingRows = computed(() => {
  return mappings.value.reduce<Record<string, MappingRow>>((acc, row) => {
    const normalized = normalizeLockMappingKey(row.model);
    if (normalized && !acc[normalized]) {
      acc[normalized] = row;
    }
    return acc;
  }, {});
});

function resolvePreviewMatch(rawModel: string, mode: 'primary' | 'secondary') {
  const normalized = normalizeLockMappingKey(rawModel);
  if (!normalized) {
    return null;
  }

  const matched = normalizedMappingRows.value[normalized];
  if (!matched) {
    return {
      matched: false as const,
      normalized,
      supplier: '待人工处理',
      vendorName: rawModel.trim(),
      spec: mode === 'primary'
        ? (primaryLabel.value || '主锁')
        : (secondaryLabel.value || '副锁'),
      remark: '',
    };
  }

  return {
    matched: true as const,
    normalized,
    supplier: matched.supplier || '待人工处理',
    vendorName: matched.vendorName || rawModel.trim(),
    spec: mode === 'primary'
      ? (matched.primarySpec || primaryLabel.value || '主锁')
      : (matched.secondarySpec || secondaryLabel.value || '副锁'),
    remark: matched.remark || '',
  };
}

const previewPrimaryMatch = computed(() => resolvePreviewMatch(previewPrimaryInput.value, 'primary'));
const previewSecondaryMatch = computed(() => resolvePreviewMatch(previewSecondaryInput.value, 'secondary'));

function resetWithPayload(data: LockMappingConfig) {
  defaultUnit.value = data.defaultUnit || '套';
  primaryLabel.value = data.primaryLabel || '主锁';
  secondaryLabel.value = data.secondaryLabel || '副锁';
  mappings.value = Object.entries(data.mappings || {}).map(([model, conf]) => makeMappingRow(
    model,
    conf.supplier,
    conf.vendorName,
    conf.primarySpec || '',
    conf.secondarySpec || '',
    conf.remark || ''
  ));
  if (mappings.value.length === 0) mappings.value = [makeMappingRow()];
  baselineSnapshot.value = JSON.stringify(payload.value);
}

async function scrollToFirstIssue() {
  await import('vue').then(({ nextTick }) => nextTick());
  scrollToFirstIssueElement('[data-issue-item="true"]', '[data-issue-anchor="true"]');
}

const editor = useMappingConfigEditor<LockMappingConfig>({
  endpoint: '/config/lock',
  workflowProfileCode: 'lock',
  loadErrorDescription: '无法读取锁具映射配置',
  saveSuccessDescription: '锁具映射已更新',
  getPayload: () => payload.value,
  getClientIssues: () => clientIssues.value,
  validatePayload: validateLockMapping,
  adaptPayload: (value) => adaptLockMapping(value),
  resetWithPayload,
  refreshRuntime: refreshLockRuntime,
  scrollToFirstIssue
});

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
    title="锁具配置"
    description="维护锁具主副锁标签以及 ERP 型号到采购供应商/外协名称的映射。"
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

    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>基础策略</CardTitle>
          <CardDescription>控制锁具单位与主副锁标签。</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2 text-sm">
            <span class="font-medium">默认单位</span>
            <Input v-model="defaultUnit" data-issue-anchor="true" />
          </label>
          <label class="grid gap-2 text-sm">
            <span class="font-medium">主锁标签</span>
            <Input v-model="primaryLabel" />
          </label>
          <label class="grid gap-2 text-sm">
            <span class="font-medium">副锁标签</span>
            <Input v-model="secondaryLabel" />
          </label>
        </CardContent>
      </Card>

    <Card>
      <CardHeader>
        <CardTitle>维护说明</CardTitle>
          <CardDescription>型号会按 normalize 规则匹配，忽略空格并统一括号格式。</CardDescription>
        </CardHeader>
        <CardContent class="space-y-2 text-sm text-muted-foreground">
          <p>ERP 原文 `SD-9030（6607大锁）` 与 `SD-9030 ( 6607大锁 )` 会命中同一条配置。</p>
          <p>如果主锁和副锁规格不同，可分别填写“主锁规格”和“副锁规格”。</p>
          <p>未命中型号时，供应商会固定标记为“待人工处理”。</p>
          <p>留空时会回退到基础策略中的主锁/副锁标签。</p>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>测试匹配</CardTitle>
        <CardDescription>输入 ERP 里的主锁/副锁文本，实时查看会命中哪条锁具规则。</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-3">
          <label class="grid gap-2 text-sm">
            <span class="font-medium">主锁文本（`sj`）</span>
            <Input v-model="previewPrimaryInput" placeholder="如：SD-9030 ( 6607大锁 )" />
          </label>
          <div class="rounded-lg border bg-muted/20 p-3 text-sm">
            <div class="font-medium">{{ previewPrimaryMatch?.matched ? '已命中规则' : '未命中，使用默认策略' }}</div>
            <div class="mt-2 text-muted-foreground">Normalize 键：{{ previewPrimaryMatch?.normalized || '-' }}</div>
            <div class="text-muted-foreground">供应商：{{ previewPrimaryMatch?.supplier || '-' }}</div>
            <div class="text-muted-foreground">采购名称：{{ previewPrimaryMatch?.vendorName || '-' }}</div>
            <div class="text-muted-foreground">规格：{{ previewPrimaryMatch?.spec || '-' }}</div>
            <div class="text-muted-foreground">备注补充：{{ previewPrimaryMatch?.remark || '-' }}</div>
          </div>
        </div>

        <div class="space-y-3">
          <label class="grid gap-2 text-sm">
            <span class="font-medium">副锁文本（`fssj`）</span>
            <Input v-model="previewSecondaryInput" placeholder="如：F02-A副锁" />
          </label>
          <div class="rounded-lg border bg-muted/20 p-3 text-sm">
            <div class="font-medium">{{ previewSecondaryMatch?.matched ? '已命中规则' : '未命中，使用默认策略' }}</div>
            <div class="mt-2 text-muted-foreground">Normalize 键：{{ previewSecondaryMatch?.normalized || '-' }}</div>
            <div class="text-muted-foreground">供应商：{{ previewSecondaryMatch?.supplier || '-' }}</div>
            <div class="text-muted-foreground">采购名称：{{ previewSecondaryMatch?.vendorName || '-' }}</div>
            <div class="text-muted-foreground">规格：{{ previewSecondaryMatch?.spec || '-' }}</div>
            <div class="text-muted-foreground">备注补充：{{ previewSecondaryMatch?.remark || '-' }}</div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>型号映射</CardTitle>
          <CardDescription>维护 ERP 锁具型号到采购信息的映射表。</CardDescription>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <Input v-model="searchQuery" class="sm:w-64" placeholder="搜索型号 / 供应商 / 外协名称" />
          <Button type="button" @click="addMappingRow">新增映射</Button>
        </div>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="overflow-auto rounded-lg border">
          <table class="min-w-full text-sm">
            <thead class="bg-muted/50 text-muted-foreground">
              <tr>
                <th class="px-3 py-2 text-left font-medium">ERP 型号</th>
                <th class="px-3 py-2 text-left font-medium">供应商</th>
                <th class="px-3 py-2 text-left font-medium">采购名称</th>
                <th class="px-3 py-2 text-left font-medium">主锁规格</th>
                <th class="px-3 py-2 text-left font-medium">副锁规格</th>
                <th class="px-3 py-2 text-left font-medium">备注补充</th>
                <th class="px-3 py-2 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filteredRows" :key="row.id" class="border-t">
                <td class="px-3 py-2 align-top">
                  <Input v-model="row.model" data-issue-item="true" placeholder="如：SD-9030（6607大锁）" />
                </td>
                <td class="px-3 py-2 align-top">
                  <Input v-model="row.supplier" placeholder="如：汇成" />
                </td>
                <td class="px-3 py-2 align-top">
                  <Input v-model="row.vendorName" placeholder="如：6607大锁" />
                </td>
                <td class="px-3 py-2 align-top">
                  <Input v-model="row.primarySpec" placeholder="如：主锁体" />
                </td>
                <td class="px-3 py-2 align-top">
                  <Input v-model="row.secondarySpec" placeholder="如：副锁体" />
                </td>
                <td class="px-3 py-2 align-top">
                  <Input v-model="row.remark" placeholder="可选补充备注" />
                </td>
                <td class="px-3 py-2 text-right align-top">
                  <Button type="button" variant="ghost" size="sm" @click="removeMappingRow(row.id)">删除</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </ConfigPageLayout>
</template>
