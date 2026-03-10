<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CodeMirrorEditor from '@/components/ui/CodeMirrorEditor.vue';
import { Input } from '@/components/ui/input';
import ConfigPageLayout from '@/features/config-editor/components/ConfigPageLayout.vue';
import { useMappingConfigEditor } from '@/features/config-editor/composables/useMappingConfigEditor';
import { createRowId, scrollToFirstIssueElement } from '@/features/config-editor/utils/mappingIssueUtils';
import { refreshCylinderRuntime } from '@/services/configRuntime';
import { adaptCylinderMapping, validateCylinderMapping } from '@/services/mappings';
import type {
  CylinderMappingConfig,
  CylinderDimensionVariant,
  CylinderSpecialRule
} from '@/types/mapping';

type DimensionRow = {
  id: string;
  thickness: string;
  code: string;
  eccentricity: string;
  remark?: string;
};

type VariantRow = {
  id: string;
  name: string;
  code: string;
  eccentricity: string;
  remark?: string;
};

type DimensionGroup = {
  id: string;
  thickness: string;
  variants: VariantRow[];
};

type RuleRow = {
  id: string;
  conditionField: string;
  keyword: string;
  thickness: string;
  variants: VariantRow[];
};

type MappingRow = {
  id: string;
  name: string;
  supplier: string;
  template: string;
};

type LogoRow = {
  id: string;
  value: string;
};

type ExcludedCylinderRow = {
  id: string;
  value: string;
};

const primaryDimensions = ref<DimensionRow[]>([]);
const secondaryDimensions = ref<DimensionGroup[]>([]);
const specialRules = ref<RuleRow[]>([]);
const secondarySpecialRules = ref<RuleRow[]>([]);
const mappings = ref<MappingRow[]>([]);
const customLogos = ref<LogoRow[]>([]);
const excludedCylinders = ref<ExcludedCylinderRow[]>([]);

const searchQuery = ref('');

const payload = computed<CylinderMappingConfig>(() => {
  const dimensions: CylinderMappingConfig['dimensions'] = {};
  primaryDimensions.value.forEach((row) => {
    dimensions[row.thickness] = {
      code: row.code,
      eccentricity: row.eccentricity,
      ...(row.remark ? { remark: row.remark } : {})
    };
  });

  const secondary: CylinderMappingConfig['secondaryDimensions'] = {};
  secondaryDimensions.value.forEach((group) => {
    const variants: Record<string, CylinderDimensionVariant> = {};
    group.variants.forEach((variant) => {
      variants[variant.name] = {
        code: variant.code,
        eccentricity: variant.eccentricity,
        ...(variant.remark ? { remark: variant.remark } : {})
      };
    });
    secondary[group.thickness] = {
      code: '',
      eccentricity: '',
      variants
    };
  });

  const toRule = (rule: RuleRow): CylinderSpecialRule => ({
    conditionField: rule.conditionField,
    keyword: rule.keyword,
    thickness: rule.thickness,
    variants: rule.variants.reduce((acc, variant) => {
      acc[variant.name] = {
        code: variant.code,
        eccentricity: variant.eccentricity,
        ...(variant.remark ? { remark: variant.remark } : {})
      };
      return acc;
    }, {} as Record<string, CylinderDimensionVariant>)
  });

  const mappedRules = specialRules.value.map(toRule);
  const mappedSecondaryRules = secondarySpecialRules.value.map(toRule);

  const mappingObj: CylinderMappingConfig['mappings'] = {};
  mappings.value.forEach((row) => {
    mappingObj[row.name] = {
      supplier: row.supplier,
      template: row.template
    };
  });

  const logos = customLogos.value.map((logo) => logo.value);
  const excluded = excludedCylinders.value.map((item) => item.value);

  return {
    dimensions,
    specialRules: mappedRules,
    secondaryDimensions: secondary,
    secondarySpecialRules: mappedSecondaryRules,
    mappings: mappingObj,
    customLogos: logos,
    excludedCylinders: excluded
  };
});

const clientIssues = computed(() => {
  const issues = [...validateCylinderMapping(payload.value)];

  const thicknessSeen = new Set<string>();
  primaryDimensions.value.forEach((row, index) => {
    const thickness = row.thickness.trim();
    if (!thickness) {
      issues.push({ path: `dimensions[${index}].thickness`, code: 'required', message: 'thickness 不能为空' });
      return;
    }
    if (thicknessSeen.has(thickness)) {
      issues.push({ path: `dimensions[${index}].thickness`, code: 'duplicate', message: 'thickness 重复' });
    } else {
      thicknessSeen.add(thickness);
    }
  });

  const secondaryThicknessSeen = new Set<string>();
  secondaryDimensions.value.forEach((group, index) => {
    const thickness = group.thickness.trim();
    if (!thickness) {
      issues.push({ path: `secondaryDimensions[${index}].thickness`, code: 'required', message: 'thickness 不能为空' });
      return;
    }
    if (secondaryThicknessSeen.has(thickness)) {
      issues.push({ path: `secondaryDimensions[${index}].thickness`, code: 'duplicate', message: 'thickness 重复' });
    } else {
      secondaryThicknessSeen.add(thickness);
    }

    const variantSeen = new Set<string>();
    group.variants.forEach((variant, vIndex) => {
      const name = variant.name.trim();
      if (!name) {
        issues.push({
          path: `secondaryDimensions[${index}].variants[${vIndex}].name`,
          code: 'required',
          message: 'variant name 不能为空'
        });
        return;
      }
      if (variantSeen.has(name)) {
        issues.push({
          path: `secondaryDimensions[${index}].variants[${vIndex}].name`,
          code: 'duplicate',
          message: 'variant name 重复'
        });
      } else {
        variantSeen.add(name);
      }
    });
  });

  const mappingSeen = new Set<string>();
  mappings.value.forEach((row, index) => {
    const name = row.name.trim();
    if (!name) {
      issues.push({ path: `mappings[${index}].name`, code: 'required', message: 'mapping 名称不能为空' });
      return;
    }
    if (mappingSeen.has(name)) {
      issues.push({ path: `mappings[${index}].name`, code: 'duplicate', message: 'mapping 名称重复' });
    } else {
      mappingSeen.add(name);
    }
  });

  const checkRuleVariants = (rules: RuleRow[], prefix: string) => {
    rules.forEach((rule, index) => {
      const variantSeen = new Set<string>();
      rule.variants.forEach((variant, vIndex) => {
        const name = variant.name.trim();
        if (!name) {
          issues.push({
            path: `${prefix}[${index}].variants[${vIndex}].name`,
            code: 'required',
            message: 'variant name 不能为空'
          });
          return;
        }
        if (variantSeen.has(name)) {
          issues.push({
            path: `${prefix}[${index}].variants[${vIndex}].name`,
            code: 'duplicate',
            message: 'variant name 重复'
          });
        } else {
          variantSeen.add(name);
        }
      });
    });
  };

  checkRuleVariants(specialRules.value, 'specialRules');
  checkRuleVariants(secondarySpecialRules.value, 'secondarySpecialRules');

  customLogos.value.forEach((logo, index) => {
    if (!logo.value.trim()) {
      issues.push({ path: `customLogos[${index}]`, code: 'required', message: 'LOGO 不能为空' });
    }
  });

  const excludedSeen = new Set<string>();
  excludedCylinders.value.forEach((item, index) => {
    const value = item.value.trim();
    if (!value) {
      issues.push({ path: `excludedCylinders[${index}]`, code: 'required', message: '排除锁芯不能为空' });
      return;
    }
    if (excludedSeen.has(value)) {
      issues.push({ path: `excludedCylinders[${index}]`, code: 'duplicate', message: '排除锁芯重复' });
      return;
    }
    excludedSeen.add(value);
  });

  return issues;
});

const mappingFiltered = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  if (!keyword) return mappings.value;
  return mappings.value.filter((row) => {
    return row.name.toLowerCase().includes(keyword)
      || row.supplier.toLowerCase().includes(keyword)
      || row.template.toLowerCase().includes(keyword);
  });
});

const showIssuesPanel = computed(() => clientIssues.value.length > 0 || editor.serverIssues.value.length > 0);

const activeTab = ref<'base' | 'rules' | 'mappings'>('base');

const hasBaseIssues = computed(() => {
  return [...clientIssues.value, ...editor.serverIssues.value].some(issue => 
    issue.path.startsWith('dimensions[') ||
    issue.path.startsWith('secondaryDimensions[')
  );
});

const hasRulesIssues = computed(() => {
  return [...clientIssues.value, ...editor.serverIssues.value].some(issue => 
    issue.path.startsWith('specialRules[') ||
    issue.path.startsWith('secondarySpecialRules[')
  );
});

const hasMappingsIssues = computed(() => {
  return [...clientIssues.value, ...editor.serverIssues.value].some(issue => 
    issue.path.startsWith('mappings[') ||
    issue.path.startsWith('customLogos[') ||
    issue.path.startsWith('excludedCylinders[')
  );
});

function makeDimensionRow(input?: Partial<DimensionRow>): DimensionRow {
  return {
    id: createRowId(),
    thickness: input?.thickness || '',
    code: input?.code || '',
    eccentricity: input?.eccentricity || '',
    remark: input?.remark
  };
}

function makeVariantRow(input?: Partial<VariantRow>): VariantRow {
  return {
    id: createRowId(),
    name: input?.name || '',
    code: input?.code || '',
    eccentricity: input?.eccentricity || '',
    remark: input?.remark
  };
}

function makeDimensionGroup(input?: Partial<DimensionGroup>): DimensionGroup {
  return {
    id: createRowId(),
    thickness: input?.thickness || '',
    variants: input?.variants?.length ? input.variants : [makeVariantRow()]
  };
}

function makeRuleRow(input?: Partial<RuleRow>): RuleRow {
  return {
    id: createRowId(),
    conditionField: input?.conditionField || '',
    keyword: input?.keyword || '',
    thickness: input?.thickness || '',
    variants: input?.variants?.length ? input.variants : [makeVariantRow()]
  };
}

function makeMappingRow(input?: Partial<MappingRow>): MappingRow {
  return {
    id: createRowId(),
    name: input?.name || '',
    supplier: input?.supplier || '',
    template: input?.template || ''
  };
}

function makeLogoRow(input?: Partial<LogoRow>): LogoRow {
  return {
    id: createRowId(),
    value: input?.value || ''
  };
}

function makeExcludedCylinderRow(input?: Partial<ExcludedCylinderRow>): ExcludedCylinderRow {
  return {
    id: createRowId(),
    value: input?.value || ''
  };
}

function resetWithPayload(data: CylinderMappingConfig) {
  const adapted = adaptCylinderMapping(data);
  primaryDimensions.value = Object.entries(adapted.dimensions).map(([thickness, rule]) =>
    makeDimensionRow({ thickness, code: rule.code, eccentricity: rule.eccentricity, remark: rule.remark })
  );
  if (primaryDimensions.value.length === 0) primaryDimensions.value = [makeDimensionRow()];

  secondaryDimensions.value = Object.entries(adapted.secondaryDimensions).map(([thickness, rule]) =>
    makeDimensionGroup({
      thickness,
      variants: Object.entries(rule.variants || {}).map(([name, variant]) =>
        makeVariantRow({ name, code: variant.code, eccentricity: variant.eccentricity, remark: variant.remark })
      )
    })
  );
  if (secondaryDimensions.value.length === 0) secondaryDimensions.value = [makeDimensionGroup()];

  specialRules.value = adapted.specialRules.map((rule) =>
    makeRuleRow({
      conditionField: rule.conditionField,
      keyword: rule.keyword,
      thickness: rule.thickness,
      variants: Object.entries(rule.variants || {}).map(([name, variant]) =>
        makeVariantRow({ name, code: variant.code, eccentricity: variant.eccentricity, remark: variant.remark })
      )
    })
  );
  if (specialRules.value.length === 0) specialRules.value = [makeRuleRow()];

  secondarySpecialRules.value = adapted.secondarySpecialRules.map((rule) =>
    makeRuleRow({
      conditionField: rule.conditionField,
      keyword: rule.keyword,
      thickness: rule.thickness,
      variants: Object.entries(rule.variants || {}).map(([name, variant]) =>
        makeVariantRow({ name, code: variant.code, eccentricity: variant.eccentricity, remark: variant.remark })
      )
    })
  );
  if (secondarySpecialRules.value.length === 0) secondarySpecialRules.value = [makeRuleRow()];

  mappings.value = Object.entries(adapted.mappings).map(([name, mapping]) =>
    makeMappingRow({ name, supplier: mapping.supplier, template: mapping.template })
  );
  if (mappings.value.length === 0) mappings.value = [makeMappingRow()];

  customLogos.value = adapted.customLogos.map((value) => makeLogoRow({ value }));
  if (customLogos.value.length === 0) customLogos.value = [makeLogoRow()];

  excludedCylinders.value = adapted.excludedCylinders.map((value) => makeExcludedCylinderRow({ value }));
}

async function scrollToFirstIssue() {
  if (hasBaseIssues.value) activeTab.value = 'base';
  else if (hasRulesIssues.value) activeTab.value = 'rules';
  else if (hasMappingsIssues.value) activeTab.value = 'mappings';

  import('vue').then(({ nextTick }) => nextTick()).then(() => {
    scrollToFirstIssueElement('[data-issue-item="true"]', '[data-issue-anchor="true"]');
  });
}

const editor = useMappingConfigEditor<CylinderMappingConfig>({
  endpoint: '/config/cylinder',
  workflowProfileCode: 'cylinder',
  loadErrorDescription: '无法读取锁芯映射配置',
  saveSuccessDescription: '锁芯映射已更新',
  getPayload: () => payload.value,
  getClientIssues: () => clientIssues.value,
  validatePayload: validateCylinderMapping,
  adaptPayload: (value) => adaptCylinderMapping(value),
  resetWithPayload,
  refreshRuntime: refreshCylinderRuntime,
  scrollToFirstIssue
});

onMounted(editor.load);
</script>

<template>
  <ConfigPageLayout
    title="锁芯配置"
    description="维护锁芯规格、规则与供应商映射。"
    :editor="editor"
    :clientIssues="clientIssues"
    json-dialog-description="直接编辑锁芯配置 JSON，应用前会进行校验。"
  >
        <!-- Tabs Navigation -->
        <div class="flex items-center gap-1 border-b overflow-x-auto pb-px">
          <button
            @click="activeTab = 'base'"
            class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative whitespace-nowrap"
            :class="activeTab === 'base' ? 'bg-background border-t border-l border-r text-foreground' : 'text-muted-foreground hover:bg-muted'"
          >
            基础与副锁尺寸
            <span v-if="hasBaseIssues" class="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive"></span>
          </button>
          <button
            @click="activeTab = 'rules'"
            class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative whitespace-nowrap"
            :class="activeTab === 'rules' ? 'bg-background border-t border-l border-r text-foreground' : 'text-muted-foreground hover:bg-muted'"
          >
            特殊规则
            <span v-if="hasRulesIssues" class="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive"></span>
          </button>
          <button
            @click="activeTab = 'mappings'"
            class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative whitespace-nowrap"
            :class="activeTab === 'mappings' ? 'bg-background border-t border-l border-r text-foreground' : 'text-muted-foreground hover:bg-muted'"
          >
            映射与排除列表
            <span v-if="hasMappingsIssues" class="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive"></span>
          </button>
        </div>

        <div v-show="activeTab === 'base'" class="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>基础尺寸</CardTitle>
            <CardDescription>门厚对应的主锁芯规格。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex items-center justify-between mb-2">
              <div class="text-sm font-medium">尺寸列表</div>
            </div>
            <div class="overflow-auto max-h-[400px] rounded-md border">
              <table class="w-full text-sm text-left border-separate border-spacing-0">
                <thead class="sticky top-0 z-20 bg-muted text-xs text-muted-foreground shadow-sm">
                  <tr>
                    <th class="px-3 py-2 w-[12%] border-b">门厚</th>
                    <th class="px-3 py-2 w-[18%] border-b">代码</th>
                    <th class="px-3 py-2 w-[30%] border-b">偏心</th>
                    <th class="px-3 py-2 w-[30%] border-b">备注</th>
                    <th class="px-3 py-2 w-[10%] border-b">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in primaryDimensions" :key="row.id" class="bg-background border-b last:border-0">
                    <td class="px-3 py-2">
                      <Input v-model="row.thickness" class="h-9" placeholder="7" />
                    </td>
                    <td class="px-3 py-2">
                      <Input v-model="row.code" class="h-9" placeholder="90AB" />
                    </td>
                    <td class="px-3 py-2">
                      <Input v-model="row.eccentricity" class="h-9" placeholder="34.5*55.5/中心孔偏心" />
                    </td>
                    <td class="px-3 py-2">
                      <Input v-model="row.remark" class="h-9" placeholder="可选" />
                    </td>
                    <td class="px-3 py-2">
                      <Button variant="ghost" size="sm" @click="primaryDimensions = primaryDimensions.filter((item) => item.id !== row.id)">
                        删除
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <Button variant="outline" size="sm" class="w-full mt-3 border-dashed" @click="primaryDimensions.push(makeDimensionRow())">
              + 新增基础尺寸
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>副锁尺寸</CardTitle>
            <CardDescription>门厚对应的副锁芯规格（支持内外开变体）。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex items-center justify-between mb-2">
              <div class="text-sm font-medium">副锁尺寸组</div>
            </div>
            <div class="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              <div v-for="group in secondaryDimensions" :key="group.id" class="rounded-md border p-3 space-y-3 bg-background">
                <div class="flex flex-col md:flex-row md:items-center gap-2">
                  <div class="flex-1">
                    <label class="text-xs text-muted-foreground">门厚</label>
                    <Input v-model="group.thickness" class="h-9" placeholder="7" />
                  </div>
                  <div class="flex items-center gap-2">
                    <Button variant="ghost" size="sm" @click="secondaryDimensions = secondaryDimensions.filter((item) => item.id !== group.id)">
                      删除整组
                    </Button>
                  </div>
                </div>
                <div class="overflow-auto rounded-md border">
                  <table class="w-full text-sm text-left">
                    <thead class="text-xs text-muted-foreground bg-muted/50">
                      <tr>
                        <th class="px-3 py-2 w-[18%]">变体名</th>
                        <th class="px-3 py-2 w-[18%]">代码</th>
                        <th class="px-3 py-2 w-[30%]">偏心</th>
                        <th class="px-3 py-2 w-[24%]">备注</th>
                        <th class="px-3 py-2 w-[10%]">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="variant in group.variants" :key="variant.id" class="bg-background border-b last:border-0">
                        <td class="px-3 py-2">
                          <Input v-model="variant.name" class="h-9" placeholder="内开" />
                        </td>
                        <td class="px-3 py-2">
                          <Input v-model="variant.code" class="h-9" placeholder="90" />
                        </td>
                        <td class="px-3 py-2">
                          <Input v-model="variant.eccentricity" class="h-9" placeholder="30*60/中心孔偏心" />
                        </td>
                        <td class="px-3 py-2">
                          <Input v-model="variant.remark" class="h-9" placeholder="可选" />
                        </td>
                        <td class="px-3 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            @click="group.variants = group.variants.filter((item) => item.id !== variant.id)"
                          >
                            删除
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <Button variant="outline" size="sm" class="w-full border-dashed" @click="group.variants.push(makeVariantRow())">
                  + 新增变体
                </Button>
              </div>
            </div>
            <Button variant="outline" size="sm" class="w-full border-dashed" @click="secondaryDimensions.push(makeDimensionGroup())">
              + 新增副锁尺寸组
            </Button>
          </CardContent>
        </Card>
        </div>

        <div v-show="activeTab === 'mappings'" class="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>型号映射</CardTitle>
            <CardDescription>锁芯型号 -> 供应商与模板。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <Input v-model="searchQuery" class="h-9 max-w-sm" placeholder="搜索型号、供应商、模板..." />
              <Button variant="outline" size="sm" @click="mappings.push(makeMappingRow())">新增</Button>
            </div>
            <div class="overflow-auto rounded-md border max-h-[420px]">
              <table class="w-full text-sm text-left border-separate border-spacing-0">
                <thead class="text-xs text-muted-foreground">
                  <tr>
                    <th class="sticky top-0 z-20 bg-muted px-3 py-2 w-[30%] border-b">型号</th>
                    <th class="sticky top-0 z-20 bg-muted px-3 py-2 w-[20%] border-b">供应商</th>
                    <th class="sticky top-0 z-20 bg-muted px-3 py-2 w-[40%] border-b">模板</th>
                    <th class="sticky top-0 z-20 bg-muted px-3 py-2 w-[10%] border-b">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in mappingFiltered" :key="row.id" class="bg-background border-b last:border-0 align-top">
                    <td class="px-3 py-2">
                      <Input v-model="row.name" class="h-9" placeholder="锁芯型号" />
                    </td>
                    <td class="px-3 py-2">
                      <Input v-model="row.supplier" class="h-9" placeholder="供应商" />
                    </td>
                    <td class="px-3 py-2">
                      <Input v-model="row.template" class="h-9" placeholder="{code}锁芯模板" />
                    </td>
                    <td class="px-3 py-2">
                      <Button variant="ghost" size="sm" @click="mappings = mappings.filter((item) => item.id !== row.id)">
                        删除
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <Button variant="outline" size="sm" class="w-full mt-3 border-dashed" @click="mappings.push(makeMappingRow())">
              + 新增型号映射
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>自定义 LOGO</CardTitle>
            <CardDescription>用于模板的特殊标记。</CardDescription>
          </CardHeader>
          <CardContent class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-3">
              <div class="flex items-center justify-between mb-1">
                <div class="text-sm font-medium">LOGO 列表</div>
              </div>
              <div class="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                <div v-for="logo in customLogos" :key="logo.id" class="flex items-center gap-2">
                  <Input v-model="logo.value" class="h-9" placeholder="LOGO 文本" />
                  <Button variant="ghost" size="sm" @click="customLogos = customLogos.filter((item) => item.id !== logo.id)">
                    删除
                  </Button>
                </div>
              </div>
              <Button variant="outline" size="sm" class="w-full border-dashed" @click="customLogos.push(makeLogoRow())">
                + 新增自定义 LOGO
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>排除锁芯</CardTitle>
            <CardDescription>命中清单的锁芯不会生成采购订单。</CardDescription>
          </CardHeader>
          <CardContent class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-3">
              <div class="flex items-center justify-between mb-1">
                <div class="text-sm font-medium">排除清单</div>
              </div>
              <div class="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                <div v-for="item in excludedCylinders" :key="item.id" class="flex items-center gap-2">
                  <Input v-model="item.value" class="h-9" placeholder="例如：指纹锁配套锁芯" />
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="excludedCylinders = excludedCylinders.filter((row) => row.id !== item.id)"
                  >
                    删除
                  </Button>
                </div>
              </div>
              <Button variant="outline" size="sm" class="w-full border-dashed" @click="excludedCylinders.push(makeExcludedCylinderRow())">
                + 新增排除锁芯
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>

        <div v-show="activeTab === 'rules'" class="flex flex-col gap-6">

        <Card>
          <CardHeader>
            <CardTitle>特殊规则</CardTitle>
            <CardDescription>主锁芯特殊条件（如护罩、型号条件）。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex items-center justify-between mb-2">
              <div class="text-sm font-medium">规则列表</div>
            </div>
            <div class="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            <div v-for="rule in specialRules" :key="rule.id" class="rounded-md border p-3 space-y-3 bg-background">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label class="text-xs text-muted-foreground">条件字段</label>
                  <Input v-model="rule.conditionField" class="h-9" placeholder="sxhz" />
                </div>
                <div>
                  <label class="text-xs text-muted-foreground">关键字</label>
                  <Input v-model="rule.keyword" class="h-9" placeholder="16-7-5+ZS17" />
                </div>
                <div>
                  <label class="text-xs text-muted-foreground">门厚</label>
                  <Input v-model="rule.thickness" class="h-9" placeholder="7" />
                </div>
              </div>
              <div class="flex items-center justify-between">
                <div class="text-xs text-muted-foreground">变体列表</div>
                <div class="flex items-center gap-2">
                  <Button variant="outline" size="sm" @click="rule.variants.push(makeVariantRow())">新增变体</Button>
                  <Button variant="ghost" size="sm" @click="specialRules = specialRules.filter((item) => item.id !== rule.id)">
                    删除规则
                  </Button>
                </div>
              </div>
              <div class="overflow-auto rounded-md border">
                <table class="w-full text-sm text-left">
                  <thead class="text-xs text-muted-foreground bg-muted/50">
                    <tr>
                      <th class="px-3 py-2 w-[18%]">变体名</th>
                      <th class="px-3 py-2 w-[18%]">代码</th>
                      <th class="px-3 py-2 w-[30%]">偏心</th>
                      <th class="px-3 py-2 w-[24%]">备注</th>
                      <th class="px-3 py-2 w-[10%]">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="variant in rule.variants" :key="variant.id" class="bg-background border-b last:border-0">
                      <td class="px-3 py-2">
                        <Input v-model="variant.name" class="h-9" placeholder="内开" />
                      </td>
                      <td class="px-3 py-2">
                        <Input v-model="variant.code" class="h-9" placeholder="84AB" />
                      </td>
                      <td class="px-3 py-2">
                        <Input v-model="variant.eccentricity" class="h-9" placeholder="28*56/中心孔偏心" />
                      </td>
                      <td class="px-3 py-2">
                        <Input v-model="variant.remark" class="h-9" placeholder="可选" />
                      </td>
                      <td class="px-3 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          @click="rule.variants = rule.variants.filter((item) => item.id !== variant.id)"
                        >
                          删除
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <Button variant="outline" size="sm" class="w-full border-dashed" @click="rule.variants.push(makeVariantRow())">
                + 新增变体
              </Button>
            </div>
            </div>
            <Button variant="outline" size="sm" class="w-full border-dashed" @click="specialRules.push(makeRuleRow())">
              + 新增特殊规则
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>副锁特殊规则</CardTitle>
            <CardDescription>副锁芯特殊条件。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex items-center justify-between mb-2">
              <div class="text-sm font-medium">规则列表</div>
            </div>
            <div class="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            <div v-for="rule in secondarySpecialRules" :key="rule.id" class="rounded-md border p-3 space-y-3 bg-background">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label class="text-xs text-muted-foreground">条件字段</label>
                  <Input v-model="rule.conditionField" class="h-9" placeholder="fshz" />
                </div>
                <div>
                  <label class="text-xs text-muted-foreground">关键字</label>
                  <Input v-model="rule.keyword" class="h-9" placeholder="哑黑护罩" />
                </div>
                <div>
                  <label class="text-xs text-muted-foreground">门厚</label>
                  <Input v-model="rule.thickness" class="h-9" placeholder="9" />
                </div>
              </div>
              <div class="flex items-center justify-between">
                <div class="text-xs text-muted-foreground">变体列表</div>
                <div class="flex items-center gap-2">
                  <Button variant="outline" size="sm" @click="rule.variants.push(makeVariantRow())">新增变体</Button>
                  <Button variant="ghost" size="sm" @click="secondarySpecialRules = secondarySpecialRules.filter((item) => item.id !== rule.id)">
                    删除规则
                  </Button>
                </div>
              </div>
              <div class="overflow-auto rounded-md border">
                <table class="w-full text-sm text-left">
                  <thead class="text-xs text-muted-foreground bg-muted/50">
                    <tr>
                      <th class="px-3 py-2 w-[18%]">变体名</th>
                      <th class="px-3 py-2 w-[18%]">代码</th>
                      <th class="px-3 py-2 w-[30%]">偏心</th>
                      <th class="px-3 py-2 w-[24%]">备注</th>
                      <th class="px-3 py-2 w-[10%]">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="variant in rule.variants" :key="variant.id" class="bg-background border-b last:border-0">
                      <td class="px-3 py-2">
                        <Input v-model="variant.name" class="h-9" placeholder="内开" />
                      </td>
                      <td class="px-3 py-2">
                        <Input v-model="variant.code" class="h-9" placeholder="105" />
                      </td>
                      <td class="px-3 py-2">
                        <Input v-model="variant.eccentricity" class="h-9" placeholder="37*68/中心孔偏心" />
                      </td>
                      <td class="px-3 py-2">
                        <Input v-model="variant.remark" class="h-9" placeholder="可选" />
                      </td>
                      <td class="px-3 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          @click="rule.variants = rule.variants.filter((item) => item.id !== variant.id)"
                        >
                          删除
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <Button variant="outline" size="sm" class="w-full border-dashed" @click="rule.variants.push(makeVariantRow())">
                + 新增变体
              </Button>
            </div>
            </div>
            <Button variant="outline" size="sm" class="w-full border-dashed" @click="secondarySpecialRules.push(makeRuleRow())">
              + 新增副锁特殊规则
            </Button>
          </CardContent>
        </Card>
        </div>
  </ConfigPageLayout>
</template>
