<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
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
import { refreshLockForkRuntime } from '@/services/configRuntime';
import {
  adaptLockForkMapping,
  adaptLockForkTypeRulesToRuleSet,
  LOCK_FORK_REFERENCE_DEFAULT_STRINGS,
  validateLockForkMapping,
} from '@/services/mappings';
import type {
  LockForkBaseDimensionRule,
  LockForkDimensionGroup,
  LockForkMappingConfig,
  LockForkTypeConfig
} from '@/types/mapping';
import { CONFIG_ENDPOINTS } from '@/shared/constants/endpoints';

// --- 类型定义 ---
type BaseDimensionRow = {
  id: string; thickness: string;
  standardUpperBase1: string; standardUpperBase2: string; standardLowerBase1: string; standardLowerBase2: string;
  hangingUpperBase1: string; hangingUpperBase2: string; hangingLowerBase1: string; hangingLowerBase2: string;
};
type LockTypeRow = { id: string; name: string; category: string; nameModifier: string; upper: string; lower: string; };
type EdgeTypeRow = { id: string; name: string; nameModifier: string; };
type KeywordRow = { id: string; value: string; };

const hangingFeetStandard = ref(LOCK_FORK_REFERENCE_DEFAULT_STRINGS.hangingFeetStandard);
const heightReference = ref(LOCK_FORK_REFERENCE_DEFAULT_STRINGS.heightReference);
const highHeightRules = ref<LockForkMappingConfig['highHeightRules']>({});
const activeTab = ref<'base' | 'lockType' | 'edges' | 'suppliers'>('base');
const baselineSnapshot = ref('');
const defaultSupplier = ref('');

// --- 数据列表管理 ---
const baseDimensions = useEditableList<BaseDimensionRow>(() => ({
  id: '', thickness: '',
  standardUpperBase1: '', standardUpperBase2: '', standardLowerBase1: '', standardLowerBase2: '',
  hangingUpperBase1: '', hangingUpperBase2: '', hangingLowerBase1: '', hangingLowerBase2: ''
}));
const lockTypes = useEditableList<LockTypeRow>(() => ({ id: '', name: '', category: '', nameModifier: '', upper: '', lower: '' }));
const edgeTypes = useEditableList<EdgeTypeRow>(() => ({ id: '', name: '', nameModifier: '' }));
const hangingFeetKeywords = useEditableList<KeywordRow>(() => ({ id: '', value: '' }));

// --- 辅助转换 ---
const parseNumeric = (v: string) => Number(v);
const toDimensionGroup = (row: BaseDimensionRow, kind: 'standard' | 'withHangingFeet'): LockForkDimensionGroup => {
  const isStd = kind === 'standard';
  return {
    upper: { base1: parseNumeric(isStd ? row.standardUpperBase1 : row.hangingUpperBase1), base2: parseNumeric(isStd ? row.standardUpperBase2 : row.hangingUpperBase2) },
    lower: { base1: parseNumeric(isStd ? row.standardLowerBase1 : row.hangingLowerBase1), base2: parseNumeric(isStd ? row.standardLowerBase2 : row.hangingLowerBase2) }
  };
};

const payload = computed<LockForkMappingConfig>(() => ({
  baseDimensions: rowsToMap(baseDimensions.list.value, 'thickness', (row) => ({
    standard: toDimensionGroup(row, 'standard'),
    withHangingFeet: toDimensionGroup(row, 'withHangingFeet')
  })),
  highHeightRules: highHeightRules.value,
  lockTypes: rowsToMap(lockTypes.list.value, 'name', (row) => {
    const conf: LockForkTypeConfig = {};
    if (row.category) conf.category = row.category;
    if (row.nameModifier) conf.nameModifier = row.nameModifier;
    if (row.upper) conf.upper = row.upper;
    if (row.lower) conf.lower = row.lower;
    return conf;
  }),
  edgeTypes: rowsToMap(edgeTypes.list.value, 'name', (row) => ({ nameModifier: row.nameModifier })),
  hangingFeet: { standard: parseNumeric(hangingFeetStandard.value), keywords: hangingFeetKeywords.list.value.map(k => k.value) },
  heightReference: parseNumeric(heightReference.value),
  suppliers: {
    default: defaultSupplier.value.trim(),
  }
}));

// --- 校验与 Issues ---
const clientIssues = computed(() => {
  const issues = [...validateLockForkMapping(payload.value)];
  // 基础必填/重复性增强检查 (逻辑对标原代码)
  baseDimensions.list.value.forEach((r, i) => { 
    if (!r.thickness.trim()) issues.push({ path: `baseDimensions[${i}].thickness`, code: 'required', message: '门厚不能为空' });
    else if (!baseDimensions.isUnique('thickness', r.thickness, r.id)) issues.push({ path: `baseDimensions[${i}].thickness`, code: 'duplicate', message: '门厚重复' });
  });
  return issues;
});

const hasBaseIssues = computed(() => [...clientIssues.value, ...editor.serverIssues.value].some(i => i.path.startsWith('baseDimensions[')));
const hasLockTypeIssues = computed(() => [...clientIssues.value, ...editor.serverIssues.value].some(i => i.path.startsWith('lockTypes[')));
const hasEdgesIssues = computed(() => [...clientIssues.value, ...editor.serverIssues.value].some(i => i.path.startsWith('edgeTypes[') || i.path.startsWith('hangingFeet.')));
const hasSuppliersIssues = computed(() => [...clientIssues.value, ...editor.serverIssues.value].some(i => i.path.startsWith('suppliers[')));
const hasUnsavedChanges = computed(() => JSON.stringify(payload.value) !== baselineSnapshot.value);
const hasDefaultSupplier = computed(() => Boolean(defaultSupplier.value.trim()));
const lockTypeRuleSet = computed(() => adaptLockForkTypeRulesToRuleSet(payload.value));
const lockTypeExplain = useRuleExplainPreview(
  () => lockTypeRuleSet.value,
  {
    sj: 'F02-A副锁',
    fssj: '',
  },
);
const lockForkTypeExplainFields: RuleExplainFieldDefinition[] = [
  { field: 'sj', label: '主锁文本 (sj)', placeholder: '输入主锁字段文本' },
  { field: 'fssj', label: '副锁文本 (fssj)', placeholder: '输入副锁字段文本' },
];

// --- 重置与编辑器 ---
function resetWithPayload(raw: LockForkMappingConfig) {
  const data = adaptLockForkMapping(raw);
  highHeightRules.value = data.highHeightRules;
  baseDimensions.reset(mapToRows(data.baseDimensions, 'thickness', (t, r) => ({
    thickness: t,
    standardUpperBase1: String(r.standard?.upper.base1 ?? ''), standardUpperBase2: String(r.standard?.upper.base2 ?? ''),
    standardLowerBase1: String(r.standard?.lower.base1 ?? ''), standardLowerBase2: String(r.standard?.lower.base2 ?? ''),
    hangingUpperBase1: String(r.withHangingFeet?.upper.base1 ?? ''), hangingUpperBase2: String(r.withHangingFeet?.upper.base2 ?? ''),
    hangingLowerBase1: String(r.withHangingFeet?.lower.base1 ?? ''), hangingLowerBase2: String(r.withHangingFeet?.lower.base2 ?? '')
  } as any)));
  lockTypes.reset(mapToRows(data.lockTypes, 'name', (n, v) => ({ name: n, category: v.category || '', nameModifier: v.nameModifier || '', upper: v.upper || '', lower: v.lower || '' } as any)));
  edgeTypes.reset(mapToRows(data.edgeTypes, 'name', (n, v) => ({ name: n, nameModifier: v.nameModifier || '' } as any)));
  defaultSupplier.value = data.suppliers.default || '';
  hangingFeetStandard.value = String(data.hangingFeet.standard);
  hangingFeetKeywords.reset(data.hangingFeet.keywords.map(v => ({ id: '', value: v } as any)));
  heightReference.value = String(data.heightReference);
  baselineSnapshot.value = JSON.stringify(payload.value);
}

const editor = useProfileEditor<LockForkMappingConfig>({
  endpoint: CONFIG_ENDPOINTS.LOCK_FORK.path, 
  workflowProfileCode: CONFIG_ENDPOINTS.LOCK_FORK.profile,
  workflowBasePath: CONFIG_ENDPOINTS.LOCK_FORK.basePath,
  loadErrorDescription: '无法读取锁叉映射配置', saveSuccessDescription: '锁叉映射已更新',
  getPayload: () => payload.value, getClientIssues: () => clientIssues.value,
  validatePayload: validateLockForkMapping, adaptPayload: (v) => adaptLockForkMapping(v),
  resetWithPayload, refreshRuntime: refreshLockForkRuntime,
  scrollToFirstIssue: () => {
    if (hasBaseIssues.value) activeTab.value = 'base';
    else if (hasLockTypeIssues.value) activeTab.value = 'lockType';
    else if (hasEdgesIssues.value) activeTab.value = 'edges';
    else if (hasSuppliersIssues.value) activeTab.value = 'suppliers';
    nextTick(() => scrollToFirstIssueElement('[data-issue-item="true"]', '[data-issue-anchor="true"]'));
  }
});

onMounted(editor.load);
</script>

<template>
  <ProfileEditorHost
    title="锁叉配置"
    description="规则例外维护：维护锁叉配置契约、默认供应商与锁具类型规则例外。"
    :editor="editor"
    :clientIssues="clientIssues"
    workflow-meta-variant="inline"
    actions-position="header"
  >
    <template #header-extra>
      <span v-if="hasUnsavedChanges" class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">未保存</span>
    </template>

    <Card class="border-amber-300 bg-amber-50/60"><CardHeader><CardTitle>规则说明</CardTitle><CardDescription>10cm 门厚 T型 边型 内开门使用正常锁叉。</CardDescription></CardHeader></Card>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card><CardHeader><CardTitle>吊脚标准值</CardTitle></CardHeader><CardContent><Input v-model="hangingFeetStandard" :placeholder="LOCK_FORK_REFERENCE_DEFAULT_STRINGS.hangingFeetStandard" /></CardContent></Card>
      <Card><CardHeader><CardTitle>高度参考值</CardTitle></CardHeader><CardContent><Input v-model="heightReference" :placeholder="LOCK_FORK_REFERENCE_DEFAULT_STRINGS.heightReference" /></CardContent></Card>
    </div>

    <div class="flex items-center gap-1 border-b overflow-x-auto pb-px">
      <button v-for="t in [{id:'base',label:'基础尺寸',hasIssue:hasBaseIssues},{id:'lockType',label:'锁具类型',hasIssue:hasLockTypeIssues},{id:'edges',label:'边型参数',hasIssue:hasEdgesIssues},{id:'suppliers',label:'供应商',hasIssue:hasSuppliersIssues}]" :key="t.id"
        @click="activeTab = t.id as any" class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative whitespace-nowrap"
        :class="activeTab === t.id ? 'bg-background border-t border-l border-r text-foreground' : 'text-muted-foreground hover:bg-muted'"
      >
        {{ t.label }}<span v-if="t.hasIssue" class="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive"></span>
      </button>
    </div>

    <div v-show="activeTab === 'base'">
      <Card><CardHeader><CardTitle>门厚尺寸</CardTitle></CardHeader><CardContent class="space-y-4">
        <div v-for="r in baseDimensions.list.value" :key="r.id" class="rounded-md border p-3 bg-background space-y-3" data-issue-item="true">
          <div class="flex items-center gap-4"><div class="w-32"><label class="text-xs text-muted-foreground">门厚</label><Input v-model="r.thickness" /></div><Button variant="ghost" size="sm" @click="baseDimensions.remove(r.id)">删除</Button></div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div class="rounded-md border p-2"><div class="text-xs font-medium mb-2">常规尺寸</div><div class="grid grid-cols-2 gap-2"><Input v-for="f in ['standardUpperBase1','standardUpperBase2','standardLowerBase1','standardLowerBase2']" v-model="(r as any)[f]" class="h-8" :placeholder="f" /></div></div>
            <div class="rounded-md border p-2"><div class="text-xs font-medium mb-2">吊脚尺寸</div><div class="grid grid-cols-2 gap-2"><Input v-for="f in ['hangingUpperBase1','hangingUpperBase2','hangingLowerBase1','hangingLowerBase2']" v-model="(r as any)[f]" class="h-8" :placeholder="f" /></div></div>
          </div>
        </div>
        <Button variant="outline" size="sm" class="w-full border-dashed" @click="baseDimensions.add()">+ 新增门厚尺寸</Button>
      </CardContent></Card>
    </div>

    <div v-show="activeTab === 'lockType'">
      <Card><CardHeader><CardTitle>锁具类型列表</CardTitle></CardHeader><CardContent>
        <ConfigTable :columns="[{key:'name',label:'名称'},{key:'category',label:'分类'},{key:'nameModifier',label:'修饰'},{key:'upper',label:'上头'},{key:'lower',label:'下头'}]" :rows="lockTypes.list.value" @add="lockTypes.add()" @remove="lockTypes.remove">
          <template v-for="f in ['name','category','nameModifier','upper','lower']" #[`cell-${f}`]="{row}">
            <Input v-model="(row as any)[f]" />
          </template>
        </ConfigTable>
      </CardContent></Card>
      <RuleExplainPlayground
        title="锁具类型规则试跑"
        description="输入主锁或副锁字段文本，查看锁具类型规则命中结果。"
        :preview="lockTypeExplain"
        :fields="lockForkTypeExplainFields"
        empty-trace-label="当前没有可解释的锁具类型规则。"
      />
    </div>

    <div v-show="activeTab === 'edges'">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>吊脚关键字</CardTitle></CardHeader><CardContent><ConfigTable :columns="[{key:'value',label:'关键字'}]" :rows="hangingFeetKeywords.list.value" @add="hangingFeetKeywords.add()" @remove="hangingFeetKeywords.remove"><template #cell-value="{row}"><Input v-model="row.value" /></template></ConfigTable></CardContent></Card>
        <Card><CardHeader><CardTitle>边型列表</CardTitle></CardHeader><CardContent><ConfigTable :columns="[{key:'name',label:'边型名称'},{key:'nameModifier',label:'修饰'}]" :rows="edgeTypes.list.value" @add="edgeTypes.add()" @remove="edgeTypes.remove"><template #cell-name="{row}"><Input v-model="row.name" /></template><template #cell-nameModifier="{row}"><Input v-model="row.nameModifier" /></template></ConfigTable></CardContent></Card>
      </div>
    </div>

    <div v-show="activeTab === 'suppliers'">
      <div class="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader class="pb-2"><CardTitle class="text-xs text-muted-foreground">默认供应商状态</CardTitle></CardHeader>
          <CardContent><div class="text-2xl font-semibold">{{ hasDefaultSupplier ? '已配置' : '待配置' }}</div><div class="text-xs text-muted-foreground mt-1">锁叉运行时当前只消费 suppliers.default 作为统一供应商来源</div></CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2"><CardTitle class="text-xs text-muted-foreground">当前默认供应商</CardTitle></CardHeader>
          <CardContent><div class="text-2xl font-semibold">{{ defaultSupplier || '—' }}</div><div class="text-xs text-muted-foreground mt-1">未配置时无法通过前端校验并保存</div></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>默认供应商</CardTitle>
          <CardDescription>当前 lock-fork 配置契约仅消费 `suppliers.default`。这里编辑的是统一默认供应商，不是多键例外映射表。</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <div class="space-y-1">
              <label class="text-sm font-medium">键名</label>
              <Input model-value="default" readonly disabled />
            </div>
            <div class="space-y-1">
              <label class="text-sm font-medium">供应商名称</label>
              <Input v-model="defaultSupplier" placeholder="例如：应志友" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </ProfileEditorHost>
</template>
