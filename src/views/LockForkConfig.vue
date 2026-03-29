<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import ConfigPageLayout from '@/features/config-editor/components/ConfigPageLayout.vue';
import ConfigTable from '@/features/config-editor/components/ConfigTable.vue';
import { useMappingConfigEditor } from '@/features/config-editor/composables/useMappingConfigEditor';
import { useEditableList } from '@/features/config-editor/composables/useEditableList';
import { mapToRows, rowsToMap } from '@/features/config-editor/utils/configMapper';
import { scrollToFirstIssueElement } from '@/features/config-editor/utils/mappingIssueUtils';
import { refreshLockForkRuntime } from '@/services/configRuntime';
import { adaptLockForkMapping, validateLockForkMapping } from '@/services/mappings';
import type {
  LockForkBaseDimensionRule,
  LockForkDimensionGroup,
  LockForkMappingConfig,
  LockForkTypeConfig
} from '@/types/mapping';
import { DEFAULT_HANGING_FEET_STANDARD, DEFAULT_HEIGHT_REFERENCE } from '@/shared/constants/business';
import { CONFIG_ENDPOINTS } from '@/shared/constants/endpoints';

// --- 类型定义 ---
type BaseDimensionRow = {
  id: string; thickness: string;
  standardUpperBase1: string; standardUpperBase2: string; standardLowerBase1: string; standardLowerBase2: string;
  hangingUpperBase1: string; hangingUpperBase2: string; hangingLowerBase1: string; hangingLowerBase2: string;
};
type LockTypeRow = { id: string; name: string; category: string; nameModifier: string; upper: string; lower: string; };
type EdgeTypeRow = { id: string; name: string; nameModifier: string; };
type SupplierRow = { id: string; key: string; value: string; };
type KeywordRow = { id: string; value: string; };

const hangingFeetStandard = ref(DEFAULT_HANGING_FEET_STANDARD);
const heightReference = ref(DEFAULT_HEIGHT_REFERENCE);
const highHeightRules = ref<LockForkMappingConfig['highHeightRules']>({});
const activeTab = ref<'base' | 'lockType' | 'edges' | 'suppliers'>('base');
const baselineSnapshot = ref('');

// --- 数据列表管理 ---
const baseDimensions = useEditableList<BaseDimensionRow>(() => ({
  id: '', thickness: '',
  standardUpperBase1: '', standardUpperBase2: '', standardLowerBase1: '', standardLowerBase2: '',
  hangingUpperBase1: '', hangingUpperBase2: '', hangingLowerBase1: '', hangingLowerBase2: ''
}));
const lockTypes = useEditableList<LockTypeRow>(() => ({ id: '', name: '', category: '', nameModifier: '', upper: '', lower: '' }));
const edgeTypes = useEditableList<EdgeTypeRow>(() => ({ id: '', name: '', nameModifier: '' }));
const suppliers = useEditableList<SupplierRow>(() => ({ id: '', key: '', value: '' }));
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
  suppliers: rowsToMap(suppliers.list.value, 'key', (row) => row.value)
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
  suppliers.reset(mapToRows(data.suppliers, 'key', (k, v) => ({ key: k, value: v } as any)));
  hangingFeetStandard.value = String(data.hangingFeet.standard);
  hangingFeetKeywords.reset(data.hangingFeet.keywords.map(v => ({ id: '', value: v } as any)));
  heightReference.value = String(data.heightReference);
  baselineSnapshot.value = JSON.stringify(payload.value);
}

const editor = useMappingConfigEditor<LockForkMappingConfig>({
  endpoint: CONFIG_ENDPOINTS.LOCK_FORK.path, 
  workflowProfileCode: CONFIG_ENDPOINTS.LOCK_FORK.profile,
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
  <ConfigPageLayout
    title="锁叉配置"
    description="维护锁叉拨片基础参数。"
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
      <Card><CardHeader><CardTitle>吊脚标准值</CardTitle></CardHeader><CardContent><Input v-model="hangingFeetStandard" :placeholder="DEFAULT_HANGING_FEET_STANDARD" /></CardContent></Card>
      <Card><CardHeader><CardTitle>高度参考值</CardTitle></CardHeader><CardContent><Input v-model="heightReference" :placeholder="DEFAULT_HEIGHT_REFERENCE" /></CardContent></Card>
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
    </div>

    <div v-show="activeTab === 'edges'">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>吊脚关键字</CardTitle></CardHeader><CardContent><ConfigTable :columns="[{key:'value',label:'关键字'}]" :rows="hangingFeetKeywords.list.value" @add="hangingFeetKeywords.add()" @remove="hangingFeetKeywords.remove"><template #cell-value="{row}"><Input v-model="row.value" /></template></ConfigTable></CardContent></Card>
        <Card><CardHeader><CardTitle>边型列表</CardTitle></CardHeader><CardContent><ConfigTable :columns="[{key:'name',label:'边型名称'},{key:'nameModifier',label:'修饰'}]" :rows="edgeTypes.list.value" @add="edgeTypes.add()" @remove="edgeTypes.remove"><template #cell-name="{row}"><Input v-model="row.name" /></template><template #cell-nameModifier="{row}"><Input v-model="row.nameModifier" /></template></ConfigTable></CardContent></Card>
      </div>
    </div>

    <div v-show="activeTab === 'suppliers'">
      <Card><CardHeader><CardTitle>供应商映射</CardTitle></CardHeader><CardContent><ConfigTable :columns="[{key:'key',label:'键名'},{key:'value',label:'供应商名称'}]" :rows="suppliers.list.value" @add="suppliers.add()" @remove="suppliers.remove"><template #cell-key="{row}"><Input v-model="row.key" /></template><template #cell-value="{row}"><Input v-model="row.value" /></template></ConfigTable></CardContent></Card>
    </div>
  </ConfigPageLayout>
</template>
