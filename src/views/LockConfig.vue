<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import ConfigPageLayout from '@/features/config-editor/components/ConfigPageLayout.vue';
import ConfigTable from '@/features/config-editor/components/ConfigTable.vue';
import { useMappingConfigEditor } from '@/features/config-editor/composables/useMappingConfigEditor';
import { useEditableList } from '@/features/config-editor/composables/useEditableList';
import { mapToRows, rowsToMap } from '@/features/config-editor/utils/configMapper';
import { scrollToFirstIssueElement } from '@/features/config-editor/utils/mappingIssueUtils';
import { refreshLockRuntime } from '@/services/configRuntime';
import { adaptLockMapping, normalizeLockMappingKey, validateLockMapping } from '@/services/mappings';
import type { LockMappingConfig } from '@/types/mapping';
import { DEFAULT_LOCK_UNIT, DEFAULT_LOCK_PRIMARY_LABEL, DEFAULT_LOCK_SECONDARY_LABEL } from '@/shared/constants/business';
import { CONFIG_ENDPOINTS } from '@/shared/constants/endpoints';

type MappingRow = {
  id: string;
  model: string;
  supplier: string;
  vendorName: string;
  primarySpec: string;
  secondarySpec: string;
  remark: string;
};

const defaultUnit = ref(DEFAULT_LOCK_UNIT);
const primaryLabel = ref(DEFAULT_LOCK_PRIMARY_LABEL);
const secondaryLabel = ref(DEFAULT_LOCK_SECONDARY_LABEL);
const searchQuery = ref('');
const baselineSnapshot = ref('');
const previewPrimaryInput = ref('');
const previewSecondaryInput = ref('');
const showMatchTester = ref(false);

const mappings = useEditableList<MappingRow>(() => ({
  id: '', model: '', supplier: '', vendorName: '', primarySpec: '', secondarySpec: '', remark: ''
}));

const payload = computed<LockMappingConfig>(() => ({
  defaultUnit: defaultUnit.value,
  primaryLabel: primaryLabel.value,
  secondaryLabel: secondaryLabel.value,
  mappings: rowsToMap(mappings.list.value, 'model', (row) => ({
    supplier: row.supplier,
    vendorName: row.vendorName,
    ...(row.primarySpec ? { primarySpec: row.primarySpec } : {}),
    ...(row.secondarySpec ? { secondarySpec: row.secondarySpec } : {}),
    ...(row.remark ? { remark: row.remark } : {})
  }))
}));

const clientIssues = computed(() => {
  const issues = [...validateLockMapping(payload.value)];
  const normalizedSeen = new Set<string>();
  mappings.list.value.forEach((row, index) => {
    if (!row.model.trim()) {
      issues.push({ path: `rows[${index}].model`, code: 'required', message: '型号不能为空' });
    } else {
      const normalized = normalizeLockMappingKey(row.model);
      if (normalizedSeen.has(normalized)) {
        issues.push({ path: `rows[${index}].model`, code: 'duplicate', message: '型号 normalize 后重复' });
      } else {
        normalizedSeen.add(normalized);
      }
    }
  });
  return issues;
});

const filteredRows = computed(() => {
  const kw = searchQuery.value.trim().toLowerCase();
  if (!kw) return mappings.list.value;
  return mappings.list.value.filter(r => (
    r.model.toLowerCase().includes(kw) || r.supplier.toLowerCase().includes(kw) ||
    r.vendorName.toLowerCase().includes(kw) || r.primarySpec.toLowerCase().includes(kw) ||
    r.secondarySpec.toLowerCase().includes(kw)
  ));
});

const hasUnsavedChanges = computed(() => JSON.stringify(payload.value) !== baselineSnapshot.value);

const normalizedMappingRows = computed(() => {
  const map: Record<string, MappingRow> = {};
  mappings.list.value.forEach(row => {
    const n = normalizeLockMappingKey(row.model);
    if (n && !map[n]) map[n] = row;
  });
  return map;
});

function resolvePreviewMatch(rawModel: string, mode: 'primary' | 'secondary') {
  const n = normalizeLockMappingKey(rawModel);
  if (!n) return null;
  const matched = normalizedMappingRows.value[n];
  if (!matched) return { matched: false as const, normalized: n, supplier: '待人工处理', vendorName: rawModel.trim(), spec: mode === 'primary' ? (primaryLabel.value || DEFAULT_LOCK_PRIMARY_LABEL) : (secondaryLabel.value || DEFAULT_LOCK_SECONDARY_LABEL), remark: '' };
  return { matched: true as const, normalized: n, supplier: matched.supplier || '待人工处理', vendorName: matched.vendorName || rawModel.trim(), spec: mode === 'primary' ? (matched.primarySpec || primaryLabel.value || DEFAULT_LOCK_PRIMARY_LABEL) : (matched.secondarySpec || secondaryLabel.value || DEFAULT_LOCK_SECONDARY_LABEL), remark: matched.remark || '' };
}

const previewPrimaryMatch = computed(() => resolvePreviewMatch(previewPrimaryInput.value, 'primary'));
const previewSecondaryMatch = computed(() => resolvePreviewMatch(previewSecondaryInput.value, 'secondary'));

function resetWithPayload(data: LockMappingConfig) {
  defaultUnit.value = data.defaultUnit || DEFAULT_LOCK_UNIT;
  primaryLabel.value = data.primaryLabel || DEFAULT_LOCK_PRIMARY_LABEL;
  secondaryLabel.value = data.secondaryLabel || DEFAULT_LOCK_SECONDARY_LABEL;
  mappings.reset(mapToRows(data.mappings, 'model', (model, conf) => ({
    model, supplier: conf.supplier, vendorName: conf.vendorName,
    primarySpec: conf.primarySpec || '', secondarySpec: conf.secondarySpec || '', remark: conf.remark || ''
  } as any)));
  baselineSnapshot.value = JSON.stringify(payload.value);
}

const editor = useMappingConfigEditor<LockMappingConfig>({
  endpoint: CONFIG_ENDPOINTS.LOCK.path, 
  workflowProfileCode: CONFIG_ENDPOINTS.LOCK.profile,
  loadErrorDescription: '无法读取锁具映射配置', saveSuccessDescription: '锁具映射已更新',
  getPayload: () => payload.value, getClientIssues: () => clientIssues.value,
  validatePayload: validateLockMapping, adaptPayload: (v) => adaptLockMapping(v),
  resetWithPayload, refreshRuntime: refreshLockRuntime,
  scrollToFirstIssue: () => scrollToFirstIssueElement('[data-issue-item="true"]', '[data-issue-anchor="true"]')
});

onMounted(editor.load);
</script>

<template>
  <ConfigPageLayout
    title="锁具配置"
    description="维护锁具主副锁标签及型号映射。"
    :editor="editor"
    :clientIssues="clientIssues"
    workflow-meta-variant="inline"
    actions-position="header"
  >
    <template #header-extra>
      <span v-if="hasUnsavedChanges" class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">未保存</span>
    </template>

    <Card>
      <CardHeader class="pb-3">
        <CardTitle>基础策略</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-4 xl:grid-cols-3">
        <label class="grid gap-2 text-sm"><span class="font-medium">默认单位</span><Input v-model="defaultUnit" /></label>
        <label class="grid gap-2 text-sm"><span class="font-medium">主锁标签</span><Input v-model="primaryLabel" /></label>
        <label class="grid gap-2 text-sm"><span class="font-medium">副锁标签</span><Input v-model="secondaryLabel" /></label>
      </CardContent>
    </Card>

    <div class="rounded-lg border border-dashed bg-background/80 px-4 py-3 text-sm text-muted-foreground">
      型号按 normalize 规则匹配，忽略空格并统一括号。未命中型号时，供应商会标记为“待人工处理”。
    </div>

    <Card class="flex-1">
      <CardHeader class="flex-row items-center justify-between gap-4">
        <CardTitle>型号映射</CardTitle>
        <Input v-model="searchQuery" class="w-full max-w-xs" placeholder="搜索型号..." />
      </CardHeader>
      <CardContent>
        <ConfigTable 
          :columns="[
            {key:'model',label:'ERP 型号'},{key:'supplier',label:'供应商'},{key:'vendorName',label:'采购名称'},
            {key:'primarySpec',label:'主锁规格'},{key:'secondarySpec',label:'副锁规格'},{key:'remark',label:'备注'}
          ]" 
          :rows="filteredRows"
          scroll-mode="page"
          @add="mappings.add()" @remove="mappings.remove"
        >
          <template #cell-model="{row}"><Input v-model="row.model" /></template>
          <template #cell-supplier="{row}"><Input v-model="row.supplier" /></template>
          <template #cell-vendorName="{row}"><Input v-model="row.vendorName" /></template>
          <template #cell-primarySpec="{row}"><Input v-model="row.primarySpec" /></template>
          <template #cell-secondarySpec="{row}"><Input v-model="row.secondarySpec" /></template>
          <template #cell-remark="{row}"><Input v-model="row.remark" /></template>
        </ConfigTable>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex-row items-center justify-between gap-4 pb-3">
        <div class="space-y-1">
          <CardTitle>测试匹配</CardTitle>
          <p class="text-sm text-muted-foreground">用于快速验证主锁和副锁文本能否命中当前映射。</p>
        </div>
        <Button variant="ghost" size="sm" class="shrink-0" @click="showMatchTester = !showMatchTester">
          {{ showMatchTester ? '收起' : '展开' }}
        </Button>
      </CardHeader>
      <CardContent v-if="showMatchTester" class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-3">
          <label class="grid gap-2 text-sm"><span class="font-medium">主锁文本</span><Input v-model="previewPrimaryInput" /></label>
          <div class="rounded-lg border bg-muted/20 p-3 text-sm space-y-1">
            <div class="font-medium">{{ previewPrimaryMatch?.matched ? '已命中规则' : '未命中' }}</div>
            <div class="text-muted-foreground">供应商：{{ previewPrimaryMatch?.supplier || '-' }}</div>
            <div class="text-muted-foreground">采购名称：{{ previewPrimaryMatch?.vendorName || '-' }}</div>
            <div class="text-muted-foreground">规格：{{ previewPrimaryMatch?.spec || '-' }}</div>
          </div>
        </div>
        <div class="space-y-3">
          <label class="grid gap-2 text-sm"><span class="font-medium">副锁文本</span><Input v-model="previewSecondaryInput" /></label>
          <div class="rounded-lg border bg-muted/20 p-3 text-sm space-y-1">
            <div class="font-medium">{{ previewSecondaryMatch?.matched ? '已命中规则' : '未命中' }}</div>
            <div class="text-muted-foreground">供应商：{{ previewSecondaryMatch?.supplier || '-' }}</div>
            <div class="text-muted-foreground">采购名称：{{ previewSecondaryMatch?.vendorName || '-' }}</div>
            <div class="text-muted-foreground">规格：{{ previewSecondaryMatch?.spec || '-' }}</div>
          </div>
        </div>
      </CardContent>
      <CardContent v-else class="pt-0">
        <div class="rounded-lg border border-dashed bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
          默认收起，避免挤占首屏。需要时展开后可直接验证主锁/副锁文本匹配结果。
        </div>
      </CardContent>
    </Card>
  </ConfigPageLayout>
</template>
