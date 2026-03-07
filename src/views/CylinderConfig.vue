<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CodeMirrorEditor from '@/components/ui/CodeMirrorEditor.vue';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { configLoader } from '@/services/configLoader';
import { adaptCylinderMapping, validateCylinderMapping } from '@/services/mappings';
import type {
  CylinderMappingConfig,
  CylinderDimensionVariant,
  CylinderSpecialRule,
  MappingValidationIssue
} from '@/types/mapping';
import { useToastStore } from '@/stores/useToastStore';

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

const { toast } = useToastStore();

const isLoading = ref(false);
const isSaving = ref(false);
const loadError = ref<string | null>(null);
const serverIssues = ref<MappingValidationIssue[]>([]);

const primaryDimensions = ref<DimensionRow[]>([]);
const secondaryDimensions = ref<DimensionGroup[]>([]);
const specialRules = ref<RuleRow[]>([]);
const secondarySpecialRules = ref<RuleRow[]>([]);
const mappings = ref<MappingRow[]>([]);
const customLogos = ref<LogoRow[]>([]);

const searchQuery = ref('');
const isJsonDialogOpen = ref(false);
const jsonDraft = ref('');
const jsonDraftError = ref<string | null>(null);
const jsonDraftIssues = ref<MappingValidationIssue[]>([]);

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

  return {
    dimensions,
    specialRules: mappedRules,
    secondaryDimensions: secondary,
    secondarySpecialRules: mappedSecondaryRules,
    mappings: mappingObj,
    customLogos: logos
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

const showIssuesPanel = computed(() => clientIssues.value.length > 0 || serverIssues.value.length > 0);
const jsonPreview = computed(() => JSON.stringify(payload.value, null, 2));

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeDimensionRow(input?: Partial<DimensionRow>): DimensionRow {
  return {
    id: makeId(),
    thickness: input?.thickness || '',
    code: input?.code || '',
    eccentricity: input?.eccentricity || '',
    remark: input?.remark
  };
}

function makeVariantRow(input?: Partial<VariantRow>): VariantRow {
  return {
    id: makeId(),
    name: input?.name || '',
    code: input?.code || '',
    eccentricity: input?.eccentricity || '',
    remark: input?.remark
  };
}

function makeDimensionGroup(input?: Partial<DimensionGroup>): DimensionGroup {
  return {
    id: makeId(),
    thickness: input?.thickness || '',
    variants: input?.variants?.length ? input.variants : [makeVariantRow()]
  };
}

function makeRuleRow(input?: Partial<RuleRow>): RuleRow {
  return {
    id: makeId(),
    conditionField: input?.conditionField || '',
    keyword: input?.keyword || '',
    thickness: input?.thickness || '',
    variants: input?.variants?.length ? input.variants : [makeVariantRow()]
  };
}

function makeMappingRow(input?: Partial<MappingRow>): MappingRow {
  return {
    id: makeId(),
    name: input?.name || '',
    supplier: input?.supplier || '',
    template: input?.template || ''
  };
}

function makeLogoRow(input?: Partial<LogoRow>): LogoRow {
  return {
    id: makeId(),
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
}

async function load() {
  isLoading.value = true;
  loadError.value = null;
  serverIssues.value = [];
  try {
    const res = await api.get<CylinderMappingConfig>('/config/cylinder');
    resetWithPayload(res);
  } catch (e: any) {
    console.error(e);
    loadError.value = e?.message || '加载失败';
    toast({
      title: '加载失败',
      description: '无法读取锁芯映射配置'
    });
  } finally {
    isLoading.value = false;
  }
}

async function scrollToFirstIssue() {
  await nextTick();
  const target = document.querySelector('[data-issue-anchor="true"]') as HTMLElement | null;
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('ring-2', 'ring-amber-300');
    setTimeout(() => target.classList.remove('ring-2', 'ring-amber-300'), 1200);
  }
}

async function save() {
  if (isSaving.value) return;
  if (clientIssues.value.length > 0) {
    await scrollToFirstIssue();
    return;
  }
  isSaving.value = true;
  serverIssues.value = [];
  try {
    const res = await api.put<{ ok: boolean; data?: CylinderMappingConfig; errors?: MappingValidationIssue[] }>(
      '/config/cylinder',
      payload.value
    );
    if (!res.ok) {
      serverIssues.value = res.errors || [];
      await scrollToFirstIssue();
      return;
    }
    if (res.data) {
      resetWithPayload(res.data);
    }
    await configLoader.refreshCylinderMapping();
    toast({
      title: '保存成功',
      description: '锁芯映射已更新',
      variant: 'success'
    });
  } catch (e: any) {
    console.error(e);
    const errors = e?.response?.data?.errors;
    if (Array.isArray(errors)) {
      serverIssues.value = errors;
      await scrollToFirstIssue();
    } else {
      toast({
        title: '保存失败',
        description: '请检查配置后重试',
        variant: 'destructive'
      });
    }
  } finally {
    isSaving.value = false;
  }
}

function openJsonEditor() {
  jsonDraft.value = jsonPreview.value;
  jsonDraftError.value = null;
  jsonDraftIssues.value = [];
  isJsonDialogOpen.value = true;
}

function formatJsonDraft() {
  jsonDraftError.value = null;
  jsonDraftIssues.value = [];
  try {
    const parsed = JSON.parse(jsonDraft.value || '{}');
    jsonDraft.value = JSON.stringify(parsed, null, 2);
  } catch (e: any) {
    jsonDraftError.value = e?.message || 'JSON 解析失败';
  }
}

function resetJsonDraft() {
  jsonDraft.value = jsonPreview.value;
  jsonDraftError.value = null;
  jsonDraftIssues.value = [];
}

function applyJsonDraft() {
  jsonDraftError.value = null;
  jsonDraftIssues.value = [];
  let parsed: CylinderMappingConfig;
  try {
    parsed = JSON.parse(jsonDraft.value || '{}');
  } catch (e: any) {
    jsonDraftError.value = e?.message || 'JSON 解析失败';
    return;
  }
  const issues = validateCylinderMapping(parsed);
  if (issues.length > 0) {
    jsonDraftIssues.value = issues;
    return;
  }
  resetWithPayload(parsed);
  isJsonDialogOpen.value = false;
  toast({
    title: '已应用 JSON',
    description: '配置已更新到页面'
  });
}

onMounted(load);
</script>

<template>
  <div class="h-full flex flex-col gap-6 p-6 md:p-8 bg-muted/20">
    <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
      <div>
        <h2 class="text-3xl font-semibold tracking-tight">锁芯配置</h2>
        <p class="text-muted-foreground mt-1">维护锁芯规格、规则与供应商映射。</p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" :disabled="isLoading || isSaving" @click="load">刷新</Button>
        <Button :disabled="isLoading || isSaving || clientIssues.length > 0" @click="save">保存</Button>
        <Button variant="outline" @click="openJsonEditor">JSON 编辑</Button>
      </div>
    </div>

    <Card v-if="loadError">
      <CardContent class="p-4 text-sm text-destructive">
        {{ loadError }}
      </CardContent>
    </Card>

    <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
      <div class="flex flex-col gap-6 min-h-0">
        <Card>
          <CardHeader>
            <CardTitle>基础尺寸</CardTitle>
            <CardDescription>门厚对应的主锁芯规格。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium">尺寸列表</div>
              <Button variant="outline" size="sm" @click="primaryDimensions.push(makeDimensionRow())">新增</Button>
            </div>
            <div class="overflow-auto rounded-md border">
              <table class="w-full text-sm text-left">
                <thead class="text-xs text-muted-foreground bg-muted/50 sticky top-0">
                  <tr>
                    <th class="px-3 py-2 w-[12%]">门厚</th>
                    <th class="px-3 py-2 w-[18%]">代码</th>
                    <th class="px-3 py-2 w-[30%]">偏心</th>
                    <th class="px-3 py-2 w-[30%]">备注</th>
                    <th class="px-3 py-2 w-[10%]">操作</th>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>副锁尺寸</CardTitle>
            <CardDescription>门厚对应的副锁芯规格（支持内外开变体）。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium">副锁尺寸组</div>
              <Button variant="outline" size="sm" @click="secondaryDimensions.push(makeDimensionGroup())">新增</Button>
            </div>
            <div v-for="group in secondaryDimensions" :key="group.id" class="rounded-md border p-3 space-y-3 bg-background">
              <div class="flex flex-col md:flex-row md:items-center gap-2">
                <div class="flex-1">
                  <label class="text-xs text-muted-foreground">门厚</label>
                  <Input v-model="group.thickness" class="h-9" placeholder="7" />
                </div>
                <div class="flex items-center gap-2">
                  <Button variant="outline" size="sm" @click="group.variants.push(makeVariantRow())">新增变体</Button>
                  <Button variant="ghost" size="sm" @click="secondaryDimensions = secondaryDimensions.filter((item) => item.id !== group.id)">
                    删除组
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
            </div>
          </CardContent>
        </Card>

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
              <table class="w-full text-sm text-left">
                <thead class="text-xs text-muted-foreground bg-muted/50 sticky top-0">
                  <tr>
                    <th class="px-3 py-2 w-[30%]">型号</th>
                    <th class="px-3 py-2 w-[20%]">供应商</th>
                    <th class="px-3 py-2 w-[40%]">模板</th>
                    <th class="px-3 py-2 w-[10%]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in mappingFiltered" :key="row.id" class="bg-background border-b last:border-0">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>特殊规则</CardTitle>
            <CardDescription>主锁芯特殊条件（如护罩、型号条件）。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium">规则列表</div>
              <Button variant="outline" size="sm" @click="specialRules.push(makeRuleRow())">新增</Button>
            </div>
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>副锁特殊规则</CardTitle>
            <CardDescription>副锁芯特殊条件。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium">规则列表</div>
              <Button variant="outline" size="sm" @click="secondarySpecialRules.push(makeRuleRow())">新增</Button>
            </div>
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>自定义 LOGO</CardTitle>
            <CardDescription>用于模板的特殊标记。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium">LOGO 列表</div>
              <Button variant="outline" size="sm" @click="customLogos.push(makeLogoRow())">新增</Button>
            </div>
            <div class="space-y-2">
              <div v-for="logo in customLogos" :key="logo.id" class="flex items-center gap-2">
                <Input v-model="logo.value" class="h-9" placeholder="LOGO 文本" />
                <Button variant="ghost" size="sm" @click="customLogos = customLogos.filter((item) => item.id !== logo.id)">
                  删除
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="flex flex-col gap-6 min-h-0">
        <Card>
          <CardHeader>
            <CardTitle>JSON 预览</CardTitle>
            <CardDescription>保存前的结构化预览。</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeMirrorEditor :model-value="jsonPreview" readOnly class="min-h-[320px]" />
          </CardContent>
        </Card>

        <Card v-if="showIssuesPanel" data-issue-anchor="true">
          <CardHeader>
            <CardTitle>校验结果</CardTitle>
            <CardDescription>请修正以下问题后再保存。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div v-if="clientIssues.length > 0" class="space-y-1">
              <div class="text-sm font-medium">本地校验</div>
              <ul class="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li v-for="issue in clientIssues" :key="`client-${issue.path}-${issue.code}`">
                  {{ issue.path }}: {{ issue.message }}
                </li>
              </ul>
            </div>
            <div v-if="serverIssues.length > 0" class="space-y-1">
              <div class="text-sm font-medium">服务端校验</div>
              <ul class="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li v-for="issue in serverIssues" :key="`server-${issue.path}-${issue.code}`">
                  {{ issue.path }}: {{ issue.message }}
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <Dialog v-model:open="isJsonDialogOpen">
      <DialogContent class="max-w-3xl w-[min(100%,52rem)] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>JSON 编辑</DialogTitle>
          <DialogDescription>直接编辑锁芯配置 JSON，应用前会进行校验。</DialogDescription>
        </DialogHeader>

        <div class="space-y-3 min-h-0 overflow-auto">
          <CodeMirrorEditor v-model="jsonDraft" class="h-[42vh] min-h-[220px]" lint />
          <div v-if="jsonDraftError" class="text-sm text-destructive">
            {{ jsonDraftError }}
          </div>
          <div v-if="jsonDraftIssues.length > 0" class="space-y-1">
            <div class="text-sm font-medium">校验失败</div>
            <ul class="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li v-for="issue in jsonDraftIssues" :key="`draft-${issue.path}-${issue.code}`">
                {{ issue.path }}: {{ issue.message }}
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter class="flex-row justify-end gap-2">
          <Button variant="outline" size="sm" @click="formatJsonDraft">格式化</Button>
          <Button variant="outline" size="sm" @click="resetJsonDraft">重置为当前配置</Button>
          <Button variant="outline" size="sm" @click="isJsonDialogOpen = false">取消</Button>
          <Button size="sm" @click="applyJsonDraft">校验并应用</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
