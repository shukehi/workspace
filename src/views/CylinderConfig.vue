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
import { refreshCylinderRuntime } from '@/services/configRuntime';
import { adaptCylinderMapping, validateCylinderMapping } from '@/services/mappings';
import type {
  CylinderAccessoryPackRule,
  CylinderMappingConfig,
  CylinderDimensionVariant,
  CylinderSpecialRule
} from '@/types/mapping';
import { CONFIG_ENDPOINTS } from '@/shared/constants/endpoints';

// --- 类型定义 ---
type DimensionRow = { id: string; thickness: string; code: string; eccentricity: string; remark?: string };
type VariantRow = { id: string; name: string; code: string; eccentricity: string; remark?: string };
type DimensionGroup = { id: string; thickness: string; variants: VariantRow[] };
type RuleRow = { id: string; conditionField: string; keyword: string; thickness: string; variants: VariantRow[] };
type AccessoryRuleRow = {
  id: string;
  conditionField: string;
  keyword: string;
  supplier: string;
  itemName: string;
  unit: string;
  remark: string;
  thicknessAccessoryPacks: Record<'5' | '7' | '9' | '10', string>;
  thicknessMaterialCodes: Record<'5' | '7' | '9' | '10', string>;
};
type MappingRow = { id: string; name: string; supplier: string; template: string };
type LogoRow = { id: string; value: string };
type ExcludedCylinderRow = { id: string; value: string };

const searchQuery = ref('');
const activeTab = ref<'base' | 'rules' | 'mappings'>('base');
const baselineSnapshot = ref('');

// --- 数据列表管理 ---
const primaryDimensions = useEditableList<DimensionRow>(() => ({ id: '', thickness: '', code: '', eccentricity: '' }));
const secondaryDimensions = useEditableList<DimensionGroup>(() => ({ id: '', thickness: '', variants: [{ id: 'v1', name: '', code: '', eccentricity: '' }] }));
const specialRules = useEditableList<RuleRow>(() => ({ id: '', conditionField: '', keyword: '', thickness: '', variants: [{ id: 'v1', name: '', code: '', eccentricity: '' }] }));
const secondarySpecialRules = useEditableList<RuleRow>(() => ({ id: '', conditionField: '', keyword: '', thickness: '', variants: [{ id: 'v1', name: '', code: '', eccentricity: '' }] }));
const secondaryAccessoryPackRules = useEditableList<AccessoryRuleRow>(() => ({
  id: '',
  conditionField: 'fshz',
  keyword: '',
  supplier: '',
  itemName: '',
  unit: '个',
  remark: '',
  thicknessAccessoryPacks: { '5': '', '7': '', '9': '', '10': '' },
  thicknessMaterialCodes: { '5': '', '7': '', '9': '', '10': '' }
}));
const mappings = useEditableList<MappingRow>(() => ({ id: '', name: '', supplier: '', template: '' }));
const customLogos = useEditableList<LogoRow>(() => ({ id: '', value: '' }));
const excludedCylinders = useEditableList<ExcludedCylinderRow>(() => ({ id: '', value: '' }));

// --- Payload 转换 ---
const toVariantMap = (variants: VariantRow[]) => rowsToMap(variants, 'name', (v) => ({
  code: v.code,
  eccentricity: v.eccentricity,
  ...(v.remark ? { remark: v.remark } : {})
}));

const payload = computed<CylinderMappingConfig>(() => ({
  dimensions: rowsToMap(primaryDimensions.list.value, 'thickness', (r) => ({
    code: r.code,
    eccentricity: r.eccentricity,
    ...(r.remark ? { remark: r.remark } : {})
  })),
  secondaryDimensions: rowsToMap(secondaryDimensions.list.value, 'thickness', (g) => ({
    code: '',
    eccentricity: '',
    variants: toVariantMap(g.variants)
  })),
  specialRules: specialRules.list.value.map((r) => ({
    conditionField: r.conditionField,
    keyword: r.keyword,
    thickness: r.thickness,
    variants: toVariantMap(r.variants)
  })),
  secondarySpecialRules: secondarySpecialRules.list.value.map((r) => ({
    conditionField: r.conditionField,
    keyword: r.keyword,
    thickness: r.thickness,
    variants: toVariantMap(r.variants)
  })),
  secondaryAccessoryPackRules: secondaryAccessoryPackRules.list.value.map((r) => ({
    conditionField: r.conditionField,
    keyword: r.keyword,
    supplier: r.supplier,
    thicknessAccessoryPacks: Object.fromEntries(
      Object.entries(r.thicknessAccessoryPacks).filter(([, value]) => value.trim())
    ),
    thicknessMaterialCodes: Object.fromEntries(
      Object.entries(r.thicknessMaterialCodes).filter(([, value]) => value.trim())
    ),
    ...(r.itemName ? { itemName: r.itemName } : {}),
    ...(r.unit ? { unit: r.unit } : {}),
    ...(r.remark ? { remark: r.remark } : {})
  })),
  mappings: rowsToMap(mappings.list.value, 'name', (m) => ({ supplier: m.supplier, template: m.template })),
  customLogos: customLogos.list.value.map((l) => l.value),
  excludedCylinders: excludedCylinders.list.value.map((e) => e.value)
}));

// --- 校验逻辑 ---
const clientIssues = computed(() => {
  const issues = [...validateCylinderMapping(payload.value)];
  // 基础重复性检查
  primaryDimensions.list.value.forEach((r, i) => { if (!r.thickness.trim()) issues.push({ path: `dimensions[${i}].thickness`, code: 'required', message: '门厚不能为空' }); else if (!primaryDimensions.isUnique('thickness', r.thickness, r.id)) issues.push({ path: `dimensions[${i}].thickness`, code: 'duplicate', message: '门厚重复' }); });
  secondaryDimensions.list.value.forEach((g, i) => { if (!g.thickness.trim()) issues.push({ path: `secondaryDimensions[${i}].thickness`, code: 'required', message: '门厚不能为空' }); else if (!secondaryDimensions.isUnique('thickness', g.thickness, g.id)) issues.push({ path: `secondaryDimensions[${i}].thickness`, code: 'duplicate', message: '门厚重复' }); });
  mappings.list.value.forEach((m, i) => { if (!m.name.trim()) issues.push({ path: `mappings[${i}].name`, code: 'required', message: '型号不能为空' }); else if (!mappings.isUnique('name', m.name, m.id)) issues.push({ path: `mappings[${i}].name`, code: 'duplicate', message: '型号重复' }); });
  return issues;
});

const hasBaseIssues = computed(() => [...clientIssues.value, ...editor.serverIssues.value].some(i => i.path.startsWith('dimensions[') || i.path.startsWith('secondaryDimensions[')));
const hasRulesIssues = computed(() => [...clientIssues.value, ...editor.serverIssues.value].some(i => i.path.startsWith('specialRules[') || i.path.startsWith('secondarySpecialRules[') || i.path.startsWith('secondaryAccessoryPackRules[')));
const hasMappingsIssues = computed(() => [...clientIssues.value, ...editor.serverIssues.value].some(i => i.path.startsWith('mappings[') || i.path.startsWith('customLogos[') || i.path.startsWith('excludedCylinders[')));

const mappingFiltered = computed(() => {
  const kw = searchQuery.value.trim().toLowerCase();
  if (!kw) return mappings.list.value;
  return mappings.list.value.filter(m => m.name.toLowerCase().includes(kw) || m.supplier.toLowerCase().includes(kw) || m.template.toLowerCase().includes(kw));
});
const hasUnsavedChanges = computed(() => JSON.stringify(payload.value) !== baselineSnapshot.value);

// --- 重置逻辑 ---
function resetWithPayload(data: CylinderMappingConfig) {
  const adapted = adaptCylinderMapping(data);
  primaryDimensions.reset(mapToRows(adapted.dimensions, 'thickness', (t, r) => ({ thickness: t, code: r.code, eccentricity: r.eccentricity, remark: r.remark } as any)));
  secondaryDimensions.reset(mapToRows(adapted.secondaryDimensions, 'thickness', (t, r) => ({
    thickness: t,
    variants: mapToRows(r.variants, 'name', (n, v) => ({ name: n, code: v.code, eccentricity: v.eccentricity, remark: v.remark } as any))
  } as any)));
  
  const ruleToRow = (r: CylinderSpecialRule) => ({
    conditionField: r.conditionField,
    keyword: r.keyword,
    thickness: r.thickness,
    variants: mapToRows(r.variants, 'name', (n, v) => ({ name: n, code: v.code, eccentricity: v.eccentricity, remark: v.remark } as any))
  });
  const accessoryRuleToRow = (r: CylinderAccessoryPackRule) => ({
    conditionField: r.conditionField,
    keyword: r.keyword,
    supplier: r.supplier,
    itemName: r.itemName || '',
    unit: r.unit || '个',
    remark: r.remark || '',
    thicknessAccessoryPacks: {
      '5': r.thicknessAccessoryPacks?.['5'] || '',
      '7': r.thicknessAccessoryPacks?.['7'] || '',
      '9': r.thicknessAccessoryPacks?.['9'] || '',
      '10': r.thicknessAccessoryPacks?.['10'] || '',
    },
    thicknessMaterialCodes: {
      '5': r.thicknessMaterialCodes?.['5'] || '',
      '7': r.thicknessMaterialCodes?.['7'] || '',
      '9': r.thicknessMaterialCodes?.['9'] || '',
      '10': r.thicknessMaterialCodes?.['10'] || '',
    }
  });
  specialRules.reset(adapted.specialRules.map(r => ({ id: '', ...ruleToRow(r) } as any)));
  secondarySpecialRules.reset(adapted.secondarySpecialRules.map(r => ({ id: '', ...ruleToRow(r) } as any)));
  secondaryAccessoryPackRules.reset(adapted.secondaryAccessoryPackRules.map(r => ({ id: '', ...accessoryRuleToRow(r) } as any)));
  
  mappings.reset(mapToRows(adapted.mappings, 'name', (n, m) => ({ name: n, supplier: m.supplier, template: m.template } as any)));
  customLogos.reset(adapted.customLogos.map(v => ({ id: '', value: v } as any)));
  excludedCylinders.reset(adapted.excludedCylinders.map(v => ({ id: '', value: v } as any)));
  baselineSnapshot.value = JSON.stringify(payload.value);
}

const editor = useMappingConfigEditor<CylinderMappingConfig>({
  endpoint: CONFIG_ENDPOINTS.CYLINDER.path,
  workflowProfileCode: CONFIG_ENDPOINTS.CYLINDER.profile,
  loadErrorDescription: '无法读取锁芯映射配置',
  saveSuccessDescription: '锁芯映射已更新',
  getPayload: () => payload.value,
  getClientIssues: () => clientIssues.value,
  validatePayload: validateCylinderMapping,
  adaptPayload: (value) => adaptCylinderMapping(value),
  resetWithPayload,
  refreshRuntime: refreshCylinderRuntime,
  scrollToFirstIssue: () => {
    if (hasBaseIssues.value) activeTab.value = 'base';
    else if (hasRulesIssues.value) activeTab.value = 'rules';
    else if (hasMappingsIssues.value) activeTab.value = 'mappings';
    import('vue').then(({ nextTick }) => nextTick()).then(() => scrollToFirstIssueElement('[data-issue-item="true"]', '[data-issue-anchor="true"]'));
  }
});

onMounted(editor.load);
</script>

<template>
  <ConfigPageLayout
    title="锁芯配置"
    description="维护锁芯规格、规则与供应商映射。"
    :editor="editor"
    :clientIssues="clientIssues"
    workflow-meta-variant="inline"
    actions-position="header"
  >
    <template #header-extra>
      <span v-if="hasUnsavedChanges" class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">未保存</span>
    </template>

    <div class="flex items-center gap-1 border-b overflow-x-auto pb-px">
      <button v-for="t in [{id:'base',label:'基础与副锁',hasIssue:hasBaseIssues},{id:'rules',label:'特殊规则',hasIssue:hasRulesIssues},{id:'mappings',label:'映射与排除',hasIssue:hasMappingsIssues}]" :key="t.id"
        @click="activeTab = t.id as any"
        class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative whitespace-nowrap"
        :class="activeTab === t.id ? 'bg-background border-t border-l border-r text-foreground' : 'text-muted-foreground hover:bg-muted'"
      >
        {{ t.label }}<span v-if="t.hasIssue" class="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive"></span>
      </button>
    </div>

    <div v-show="activeTab === 'base'" class="flex flex-col gap-6">
      <Card>
        <CardHeader><CardTitle>基础尺寸</CardTitle><CardDescription>门厚对应的主锁芯规格。</CardDescription></CardHeader>
        <CardContent>
          <ConfigTable :columns="[{key:'thickness',label:'门厚',width:'12%'},{key:'code',label:'代码',width:'18%'},{key:'eccentricity',label:'偏心',width:'30%'},{key:'remark',label:'备注',width:'30%'}]" :rows="primaryDimensions.list.value" @add="primaryDimensions.add()" @remove="primaryDimensions.remove">
            <template #cell-thickness="{row}"><Input v-model="row.thickness" placeholder="7" /></template>
            <template #cell-code="{row}"><Input v-model="row.code" placeholder="90AB" /></template>
            <template #cell-eccentricity="{row}"><Input v-model="row.eccentricity" /></template>
            <template #cell-remark="{row}"><Input v-model="row.remark" /></template>
          </ConfigTable>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>副锁尺寸</CardTitle><CardDescription>门厚对应的副锁芯规格。</CardDescription></CardHeader>
        <CardContent class="space-y-4">
          <div v-for="g in secondaryDimensions.list.value" :key="g.id" class="rounded-md border p-3 bg-background space-y-3">
            <div class="flex items-center gap-2">
              <div class="flex-1"><label class="text-xs text-muted-foreground">门厚</label><Input v-model="g.thickness" class="h-9" placeholder="7" /></div>
              <Button variant="ghost" size="sm" @click="secondaryDimensions.remove(g.id)">删除整组</Button>
            </div>
            <ConfigTable :columns="[{key:'name',label:'变体名',width:'18%'},{key:'code',label:'代码',width:'18%'},{key:'eccentricity',label:'偏心',width:'30%'},{key:'remark',label:'备注',width:'24%'}]" :rows="g.variants" @add="g.variants.push({id:'',name:'',code:'',eccentricity:''})" @remove="(vid) => g.variants = g.variants.filter(v => v.id !== vid)">
              <template #cell-name="{row}"><Input v-model="row.name" placeholder="内开" /></template>
              <template #cell-code="{row}"><Input v-model="row.code" /></template>
              <template #cell-eccentricity="{row}"><Input v-model="row.eccentricity" /></template>
              <template #cell-remark="{row}"><Input v-model="row.remark" /></template>
            </ConfigTable>
          </div>
          <Button variant="outline" size="sm" class="w-full border-dashed" @click="secondaryDimensions.add()">+ 新增副锁尺寸组</Button>
        </CardContent>
      </Card>
    </div>

    <div v-show="activeTab === 'rules'" class="flex flex-col gap-6">
      <Card v-for="(list, title) in {specialRules: '特殊规则', secondarySpecialRules: '副锁特殊规则'}" :key="title">
        <CardHeader><CardTitle>{{ title }}</CardTitle></CardHeader>
        <CardContent class="space-y-4">
          <div v-for="r in (title === 'specialRules' ? specialRules : secondarySpecialRules).list.value" :key="r.id" class="rounded-md border p-3 bg-background space-y-3">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><label class="text-xs text-muted-foreground">条件字段</label><Input v-model="r.conditionField" placeholder="sxhz" /></div>
              <div><label class="text-xs text-muted-foreground">关键字</label><Input v-model="r.keyword" placeholder="ZS17" /></div>
              <div><label class="text-xs text-muted-foreground">门厚</label><Input v-model="r.thickness" placeholder="7" /></div>
            </div>
            <ConfigTable :columns="[{key:'name',label:'变体名',width:'18%'},{key:'code',label:'代码',width:'18%'},{key:'eccentricity',label:'偏心',width:'30%'},{key:'remark',label:'备注',width:'24%'}]" :rows="r.variants" @add="r.variants.push({id:'',name:'',code:'',eccentricity:''})" @remove="(vid) => r.variants = r.variants.filter(v => v.id !== vid)">
              <template #cell-name="{row}"><Input v-model="row.name" /></template>
              <template #cell-code="{row}"><Input v-model="row.code" /></template>
              <template #cell-eccentricity="{row}"><Input v-model="row.eccentricity" /></template>
              <template #cell-remark="{row}"><Input v-model="row.remark" /></template>
            </ConfigTable>
            <Button variant="ghost" size="sm" class="w-full text-muted-foreground" @click="(title === 'specialRules' ? specialRules : secondarySpecialRules).remove(r.id)">删除此规则</Button>
          </div>
          <Button variant="outline" size="sm" class="w-full border-dashed" @click="(title === 'specialRules' ? specialRules : secondarySpecialRules).add()">+ 新增{{ title }}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>副锁护罩配件包</CardTitle>
          <CardDescription>`fshz` 命中关键字后，按门厚输出到“五金/配件”采购单。</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div v-for="r in secondaryAccessoryPackRules.list.value" :key="r.id" class="rounded-md border p-3 bg-background space-y-3">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><label class="text-xs text-muted-foreground">条件字段</label><Input v-model="r.conditionField" placeholder="fshz" /></div>
              <div><label class="text-xs text-muted-foreground">关键字</label><Input v-model="r.keyword" placeholder="一号铝小面板" /></div>
              <div><label class="text-xs text-muted-foreground">供应商</label><Input v-model="r.supplier" placeholder="供应商名称" /></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><label class="text-xs text-muted-foreground">采购名称</label><Input v-model="r.itemName" placeholder="默认使用关键字" /></div>
              <div><label class="text-xs text-muted-foreground">单位</label><Input v-model="r.unit" placeholder="个" /></div>
              <div><label class="text-xs text-muted-foreground">备注</label><Input v-model="r.remark" placeholder="可选备注" /></div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div v-for="thickness in ['5', '7', '9', '10']" :key="thickness">
                <label class="text-xs text-muted-foreground">{{ thickness }} 公分配件包</label>
                <Input v-model="r.thicknessAccessoryPacks[thickness as '5' | '7' | '9' | '10']" :placeholder="`${thickness}公分配件包`" />
              </div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div v-for="thickness in ['5', '7', '9', '10']" :key="`${thickness}-code`">
                <label class="text-xs text-muted-foreground">{{ thickness }} 公分物料编码</label>
                <Input v-model="r.thicknessMaterialCodes[thickness as '5' | '7' | '9' | '10']" :placeholder="`ACC-${thickness}`" />
              </div>
            </div>
            <Button variant="ghost" size="sm" class="w-full text-muted-foreground" @click="secondaryAccessoryPackRules.remove(r.id)">删除此规则</Button>
          </div>
          <Button variant="outline" size="sm" class="w-full border-dashed" @click="secondaryAccessoryPackRules.add()">+ 新增副锁护罩配件包规则</Button>
        </CardContent>
      </Card>
    </div>

    <div v-show="activeTab === 'mappings'" class="flex flex-col gap-6">
      <Card>
        <CardHeader class="flex-row items-center justify-between gap-4">
          <CardTitle>型号映射</CardTitle>
          <Input v-model="searchQuery" class="h-9 w-full max-w-sm" placeholder="搜索型号、供应商..." />
        </CardHeader>
        <CardContent>
          <ConfigTable :columns="[{key:'name',label:'型号',width:'30%'},{key:'supplier',label:'供应商',width:'20%'},{key:'template',label:'模板',width:'40%'}]" :rows="mappingFiltered" scroll-mode="page" @add="mappings.add()" @remove="mappings.remove">
            <template #cell-name="{row}"><Input v-model="row.name" /></template>
            <template #cell-supplier="{row}"><Input v-model="row.supplier" /></template>
            <template #cell-template="{row}"><Input v-model="row.template" /></template>
          </ConfigTable>
        </CardContent>
      </Card>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>自定义 LOGO</CardTitle></CardHeader><CardContent><ConfigTable :columns="[{key:'value',label:'LOGO 文本'}]" :rows="customLogos.list.value" @add="customLogos.add()" @remove="customLogos.remove"><template #cell-value="{row}"><Input v-model="row.value" /></template></ConfigTable></CardContent></Card>
        <Card><CardHeader><CardTitle>排除锁芯</CardTitle></CardHeader><CardContent><ConfigTable :columns="[{key:'value',label:'锁芯名称'}]" :rows="excludedCylinders.list.value" @add="excludedCylinders.add()" @remove="excludedCylinders.remove"><template #cell-value="{row}"><Input v-model="row.value" /></template></ConfigTable></CardContent></Card>
      </div>
    </div>
  </ConfigPageLayout>
</template>
