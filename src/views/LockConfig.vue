<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import ProfileEditorHost from '@/features/config-editor/components/ProfileEditorHost.vue';
import ConfigTable from '@/features/config-editor/components/ConfigTable.vue';
import RuleExplainPlayground from '@/features/config-editor/components/RuleExplainPlayground.vue';
import { useProfileEditor } from '@/features/config-editor/composables/useProfileEditor';
import { useEditableList } from '@/features/config-editor/composables/useEditableList';
import {
  useRuleExplainPreview,
  type RuleExplainFieldDefinition,
} from '@/features/config-editor/composables/useRuleExplainPreview';
import { mapToRows, rowsToMap } from '@/features/config-editor/utils/configMapper';
import { scrollToFirstIssueElement } from '@/features/config-editor/utils/mappingIssueUtils';
import {
  getLockFilteredRows,
  getLockRowsForValidation,
  isMeaningfulLockRow,
  shouldReuseEmptyLockDraft,
} from '@/features/config-editor/utils/lockEditorState';
import { refreshLockRuntime } from '@/services/configRuntime';
import {
  adaptLockMapping,
  adaptLockMappingsToRuleSet,
  applyLockRulePreviewFallbacks,
  normalizeLockMappingKey,
  validateLockMapping,
} from '@/services/mappings';
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
const showRulePlayground = ref(false);
const useSystemDefaultStrategy = ref(true);
const showDraftRows = ref(false);

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
  getLockRowsForValidation(mappings.list.value, showDraftRows.value).forEach((row, index) => {
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

const totalMappings = computed(() => Object.keys(payload.value.mappings).length);
const normalizedConflictCount = computed(() => clientIssues.value.filter((issue) => issue.code === 'duplicate').length);
const meaningfulRows = computed(() => mappings.list.value.filter(isMeaningfulLockRow));
const hasMeaningfulRows = computed(() => meaningfulRows.value.length > 0);
const filteredCount = computed(() => filteredRows.value.length);

const filteredRows = computed(() => {
  return getLockFilteredRows(mappings.list.value, showDraftRows.value, searchQuery.value);
});

const hasUnsavedChanges = computed(() => JSON.stringify(payload.value) !== baselineSnapshot.value);

const primaryRuleSet = computed(() =>
  adaptLockMappingsToRuleSet(payload.value, 'primary', normalizeLockMappingKey),
);
const secondaryRuleSet = computed(() =>
  adaptLockMappingsToRuleSet(payload.value, 'secondary', normalizeLockMappingKey),
);
const primaryExplain = useRuleExplainPreview(
  () => primaryRuleSet.value,
  {
    model: 'F02-A副锁',
    meta: { normalizedModel: normalizeLockMappingKey('F02-A副锁') },
  },
  {
    transformResult(result, snapshot) {
      return {
        ...result,
        output: applyLockRulePreviewFallbacks(
          payload.value,
          'primary',
          String(snapshot.model || ''),
          result.output,
        ),
      };
    },
  },
);
const secondaryExplain = useRuleExplainPreview(
  () => secondaryRuleSet.value,
  {
    model: 'F02-A副锁',
    meta: { normalizedModel: normalizeLockMappingKey('F02-A副锁') },
  },
  {
    transformResult(result, snapshot) {
      return {
        ...result,
        output: applyLockRulePreviewFallbacks(
          payload.value,
          'secondary',
          String(snapshot.model || ''),
          result.output,
        ),
      };
    },
  },
);
const lockExplainFields: RuleExplainFieldDefinition[] = [
  {
    field: 'model',
    label: '锁具文本',
    placeholder: '输入 ERP 锁具文本',
    setValue(preview, value) {
      const rawValue = String(value ?? '');
      preview.setField('model', rawValue);
      preview.setField('meta.normalizedModel', normalizeLockMappingKey(rawValue));
    },
  },
];

function resetWithPayload(data: LockMappingConfig) {
  defaultUnit.value = data.defaultUnit || DEFAULT_LOCK_UNIT;
  primaryLabel.value = data.primaryLabel || DEFAULT_LOCK_PRIMARY_LABEL;
  secondaryLabel.value = data.secondaryLabel || DEFAULT_LOCK_SECONDARY_LABEL;
  useSystemDefaultStrategy.value = (
    defaultUnit.value === DEFAULT_LOCK_UNIT
    && primaryLabel.value === DEFAULT_LOCK_PRIMARY_LABEL
    && secondaryLabel.value === DEFAULT_LOCK_SECONDARY_LABEL
  );
  mappings.reset(mapToRows(data.mappings, 'model', (model, conf) => ({
    model, supplier: conf.supplier, vendorName: conf.vendorName,
    primarySpec: conf.primarySpec || '', secondarySpec: conf.secondarySpec || '', remark: conf.remark || ''
  } as any)));
  showDraftRows.value = false;
  baselineSnapshot.value = JSON.stringify(payload.value);
}

function useSystemDefaults() {
  defaultUnit.value = DEFAULT_LOCK_UNIT;
  primaryLabel.value = DEFAULT_LOCK_PRIMARY_LABEL;
  secondaryLabel.value = DEFAULT_LOCK_SECONDARY_LABEL;
  useSystemDefaultStrategy.value = true;
}

function useCustomDefaults() {
  useSystemDefaultStrategy.value = false;
}

function addMappingRow() {
  searchQuery.value = '';
  if (shouldReuseEmptyLockDraft(mappings.list.value)) {
    showDraftRows.value = true;
    return;
  }
  showDraftRows.value = true;
  mappings.add();
}

function removeMappingRow(id: string) {
  mappings.remove(id);
  if (!mappings.list.value.some(isMeaningfulLockRow)) {
    showDraftRows.value = false;
  }
}

const editor = useProfileEditor<LockMappingConfig>({
  endpoint: CONFIG_ENDPOINTS.LOCK.path, 
  workflowProfileCode: CONFIG_ENDPOINTS.LOCK.profile,
  workflowBasePath: CONFIG_ENDPOINTS.LOCK.basePath,
  loadErrorDescription: '无法读取锁具映射配置', saveSuccessDescription: '锁具映射已更新',
  getPayload: () => payload.value, getClientIssues: () => clientIssues.value,
  validatePayload: validateLockMapping, adaptPayload: (v) => adaptLockMapping(v),
  resetWithPayload, refreshRuntime: refreshLockRuntime,
  scrollToFirstIssue: () => scrollToFirstIssueElement('[data-issue-item="true"]', '[data-issue-anchor="true"]')
});

onMounted(editor.load);
</script>

<template>
  <ProfileEditorHost
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

    <div class="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-xs text-muted-foreground">已维护映射</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold">{{ totalMappings }}</div>
          <div class="text-xs text-muted-foreground mt-1">当前随 profile 保存的锁具例外映射项</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-xs text-muted-foreground">规范化冲突</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold">{{ normalizedConflictCount }}</div>
          <div class="text-xs text-muted-foreground mt-1">建议先消除重复型号，再继续扩充例外映射</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-xs text-muted-foreground">当前筛选结果</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold">{{ filteredCount }}</div>
          <div class="text-xs text-muted-foreground mt-1">用于快速定位已有型号例外项</div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>基础策略</CardTitle>
        <CardDescription>默认情况下直接使用系统标准单位与主副锁标签；只有需要覆盖时才展开自定义策略，但保存结构保持不变。</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="useSystemDefaultStrategy" class="flex flex-col gap-3 rounded-md border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
          <div class="space-y-1">
            <div class="text-sm font-medium">当前使用系统标准基础策略</div>
            <div class="text-sm text-muted-foreground">默认单位：{{ DEFAULT_LOCK_UNIT }} · 主锁标签：{{ DEFAULT_LOCK_PRIMARY_LABEL }} · 副锁标签：{{ DEFAULT_LOCK_SECONDARY_LABEL }}</div>
          </div>
          <Button variant="outline" size="sm" @click="useCustomDefaults">改为自定义基础策略</Button>
        </div>
        <div v-else class="space-y-4">
          <div class="grid gap-4 xl:grid-cols-3">
            <label class="grid gap-2 text-sm"><span class="font-medium">默认单位</span><Input v-model="defaultUnit" /></label>
            <label class="grid gap-2 text-sm"><span class="font-medium">主锁标签</span><Input v-model="primaryLabel" /></label>
            <label class="grid gap-2 text-sm"><span class="font-medium">副锁标签</span><Input v-model="secondaryLabel" /></label>
          </div>
          <div class="flex justify-end">
            <Button variant="outline" size="sm" @click="useSystemDefaults">恢复系统默认</Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <div class="rounded-lg border border-dashed bg-background/80 px-4 py-3 text-sm text-muted-foreground">
      型号按 normalize 规则匹配，忽略空格并统一括号。未命中型号时，供应商会标记为“待人工处理”。
    </div>

    <Card class="flex-1">
      <CardHeader class="flex-row items-center justify-between gap-4">
        <div class="space-y-1">
          <CardTitle>型号映射</CardTitle>
          <CardDescription>这里应只保留标准规则未覆盖、且确实需要人工指定供应商或规格的锁具例外项。</CardDescription>
        </div>
        <Input v-model="searchQuery" class="w-full max-w-xs" placeholder="搜索型号..." />
      </CardHeader>
      <CardContent>
        <div v-if="!hasMeaningfulRows && !showDraftRows" class="rounded-md border border-dashed bg-muted/10 px-6 py-8 text-center">
          <div class="text-sm font-medium">当前没有需要人工维护的锁具例外项</div>
          <div class="mt-2 text-sm text-muted-foreground">当系统 normalize 与规则试跑无法覆盖某个锁具型号时，再新增一条例外映射。</div>
          <div class="mt-4">
            <Button variant="outline" size="sm" @click="addMappingRow">新增例外映射</Button>
          </div>
        </div>
        <ConfigTable
          v-else
          :columns="[
            {key:'model',label:'ERP 型号'},{key:'supplier',label:'供应商'},{key:'vendorName',label:'采购名称'},
            {key:'primarySpec',label:'主锁规格'},{key:'secondarySpec',label:'副锁规格'},{key:'remark',label:'备注'}
          ]"
          :rows="filteredRows"
          scroll-mode="page"
          @add="addMappingRow" @remove="removeMappingRow"
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
          <CardTitle>规则试跑</CardTitle>
          <p class="text-sm text-muted-foreground">用于快速验证主锁和副锁文本如何命中当前规则集。</p>
        </div>
        <Button variant="ghost" size="sm" class="shrink-0" @click="showRulePlayground = !showRulePlayground">
          {{ showRulePlayground ? '收起' : '展开' }}
        </Button>
      </CardHeader>
      <CardContent v-if="showRulePlayground" class="grid gap-4 lg:grid-cols-2">
        <RuleExplainPlayground
          title="主锁规则试跑"
          description="按 normalize 后的锁具文本命中主锁映射。"
          :preview="primaryExplain"
          :fields="lockExplainFields"
          empty-trace-label="当前没有可解释的主锁规则。"
        />
        <RuleExplainPlayground
          title="副锁规则试跑"
          description="按 normalize 后的锁具文本命中副锁映射。"
          :preview="secondaryExplain"
          :fields="lockExplainFields"
          empty-trace-label="当前没有可解释的副锁规则。"
        />
      </CardContent>
      <CardContent v-else class="pt-0">
        <div class="rounded-lg border border-dashed bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
          默认收起，避免挤占首屏。需要时展开后可直接试跑主锁/副锁规则。
        </div>
      </CardContent>
    </Card>
  </ProfileEditorHost>
</template>
