<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CodeMirrorEditor from '@/components/ui/CodeMirrorEditor.vue';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { configLoader } from '@/services/configLoader';
import { adaptLockForkMapping, validateLockForkMapping } from '@/services/mappings';
import type {
  LockForkBaseDimensionRule,
  LockForkDimensionGroup,
  LockForkMappingConfig,
  LockForkTypeConfig,
  MappingValidationIssue
} from '@/types/mapping';
import { useToastStore } from '@/stores/useToastStore';

type BaseDimensionRow = {
  id: string;
  thickness: string;
  standardUpperBase1: string;
  standardUpperBase2: string;
  standardLowerBase1: string;
  standardLowerBase2: string;
  hangingUpperBase1: string;
  hangingUpperBase2: string;
  hangingLowerBase1: string;
  hangingLowerBase2: string;
};

type LockTypeRow = {
  id: string;
  name: string;
  category: string;
  nameModifier: string;
  upper: string;
  lower: string;
};

type EdgeTypeRow = {
  id: string;
  name: string;
  nameModifier: string;
};

type SupplierRow = {
  id: string;
  key: string;
  value: string;
};

type KeywordRow = {
  id: string;
  value: string;
};

const { toast } = useToastStore();

const isLoading = ref(false);
const isSaving = ref(false);
const loadError = ref<string | null>(null);
const serverIssues = ref<MappingValidationIssue[]>([]);

const baseDimensions = ref<BaseDimensionRow[]>([]);
const lockTypes = ref<LockTypeRow[]>([]);
const edgeTypes = ref<EdgeTypeRow[]>([]);
const suppliers = ref<SupplierRow[]>([]);
const hangingFeetStandard = ref('35');
const hangingFeetKeywords = ref<KeywordRow[]>([]);
const heightReference = ref('2050');

const isJsonDialogOpen = ref(false);
const jsonDraft = ref('');
const jsonDraftError = ref<string | null>(null);
const jsonDraftIssues = ref<MappingValidationIssue[]>([]);

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseNumeric(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDimensionGroup(row: BaseDimensionRow, kind: 'standard' | 'withHangingFeet'): LockForkDimensionGroup {
  if (kind === 'standard') {
    return {
      upper: {
        base1: parseNumeric(row.standardUpperBase1),
        base2: parseNumeric(row.standardUpperBase2)
      },
      lower: {
        base1: parseNumeric(row.standardLowerBase1),
        base2: parseNumeric(row.standardLowerBase2)
      }
    };
  }
  return {
    upper: {
      base1: parseNumeric(row.hangingUpperBase1),
      base2: parseNumeric(row.hangingUpperBase2)
    },
    lower: {
      base1: parseNumeric(row.hangingLowerBase1),
      base2: parseNumeric(row.hangingLowerBase2)
    }
  };
}

const payload = computed<LockForkMappingConfig>(() => {
  const baseMap: LockForkMappingConfig['baseDimensions'] = {};
  baseDimensions.value.forEach((row) => {
    const item: LockForkBaseDimensionRule = {
      standard: toDimensionGroup(row, 'standard'),
      withHangingFeet: toDimensionGroup(row, 'withHangingFeet')
    };
    baseMap[row.thickness] = item;
  });

  const lockTypeMap: LockForkMappingConfig['lockTypes'] = {};
  lockTypes.value.forEach((row) => {
    const config: LockForkTypeConfig = {};
    if (row.category) config.category = row.category;
    if (row.nameModifier) config.nameModifier = row.nameModifier;
    if (row.upper) config.upper = row.upper;
    if (row.lower) config.lower = row.lower;
    lockTypeMap[row.name] = config;
  });

  const edgeTypeMap: LockForkMappingConfig['edgeTypes'] = {};
  edgeTypes.value.forEach((row) => {
    edgeTypeMap[row.name] = { nameModifier: row.nameModifier };
  });

  const supplierMap: LockForkMappingConfig['suppliers'] = {};
  suppliers.value.forEach((row) => {
    supplierMap[row.key] = row.value;
  });

  return {
    baseDimensions: baseMap,
    lockTypes: lockTypeMap,
    edgeTypes: edgeTypeMap,
    hangingFeet: {
      standard: parseNumeric(hangingFeetStandard.value, 35),
      keywords: hangingFeetKeywords.value.map((k) => k.value)
    },
    heightReference: parseNumeric(heightReference.value, 2050),
    suppliers: supplierMap
  };
});

const clientIssues = computed(() => {
  const issues = [...validateLockForkMapping(payload.value)];

  const thicknessSeen = new Set<string>();
  baseDimensions.value.forEach((row, index) => {
    const key = row.thickness.trim();
    if (!key) {
      issues.push({ path: `baseDimensions[${index}].thickness`, code: 'required', message: '门厚不能为空' });
      return;
    }
    if (thicknessSeen.has(key)) {
      issues.push({ path: `baseDimensions[${index}].thickness`, code: 'duplicate', message: '门厚重复' });
    } else {
      thicknessSeen.add(key);
    }
  });

  const lockTypeSeen = new Set<string>();
  lockTypes.value.forEach((row, index) => {
    const key = row.name.trim();
    if (!key) {
      issues.push({ path: `lockTypes[${index}].name`, code: 'required', message: '锁具类型名称不能为空' });
      return;
    }
    if (lockTypeSeen.has(key)) {
      issues.push({ path: `lockTypes[${index}].name`, code: 'duplicate', message: '锁具类型名称重复' });
    } else {
      lockTypeSeen.add(key);
    }
  });

  const edgeTypeSeen = new Set<string>();
  edgeTypes.value.forEach((row, index) => {
    const key = row.name.trim();
    if (!key) {
      issues.push({ path: `edgeTypes[${index}].name`, code: 'required', message: '边型名称不能为空' });
      return;
    }
    if (edgeTypeSeen.has(key)) {
      issues.push({ path: `edgeTypes[${index}].name`, code: 'duplicate', message: '边型名称重复' });
    } else {
      edgeTypeSeen.add(key);
    }
  });

  const supplierSeen = new Set<string>();
  suppliers.value.forEach((row, index) => {
    const key = row.key.trim();
    if (!key) {
      issues.push({ path: `suppliers[${index}].key`, code: 'required', message: '供应商 key 不能为空' });
      return;
    }
    if (supplierSeen.has(key)) {
      issues.push({ path: `suppliers[${index}].key`, code: 'duplicate', message: '供应商 key 重复' });
    } else {
      supplierSeen.add(key);
    }
  });

  hangingFeetKeywords.value.forEach((keyword, index) => {
    if (!keyword.value.trim()) {
      issues.push({ path: `hangingFeet.keywords[${index}]`, code: 'required', message: '吊脚关键字不能为空' });
    }
  });

  return issues;
});

const allIssues = computed(() => [...clientIssues.value, ...serverIssues.value]);

function decodePathKey(raw: string) {
  const text = String(raw || '').trim();
  if (!text) return '';
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    try {
      return String(JSON.parse(text));
    } catch {
      return text.slice(1, -1);
    }
  }
  return text;
}

const baseDimensionIssueMap = computed(() => {
  const map = new Map<string, string[]>();
  const add = (rowId: string, msg: string) => {
    const list = map.get(rowId) || [];
    list.push(msg);
    map.set(rowId, list);
  };

  allIssues.value.forEach((issue) => {
    let row = null as BaseDimensionRow | null;
    const clientMatch = issue.path.match(/^baseDimensions\[(\d+)\]\.thickness$/);
    if (clientMatch) {
      row = baseDimensions.value[Number(clientMatch[1])] || null;
    } else {
      const serverMatch = issue.path.match(/^baseDimensions\[(.+?)\](?:\.|$)/);
      if (serverMatch) {
        const thickness = decodePathKey(serverMatch[1]);
        row = baseDimensions.value.find((item) => item.thickness.trim() === thickness) || null;
      }
    }
    if (row) add(row.id, issue.message);
  });
  return map;
});

const lockTypeIssueMap = computed(() => {
  const map = new Map<string, string[]>();
  const add = (rowId: string, msg: string) => {
    const list = map.get(rowId) || [];
    list.push(msg);
    map.set(rowId, list);
  };

  allIssues.value.forEach((issue) => {
    let row = null as LockTypeRow | null;
    const clientMatch = issue.path.match(/^lockTypes\[(\d+)\]\.name$/);
    if (clientMatch) {
      row = lockTypes.value[Number(clientMatch[1])] || null;
    } else {
      const serverMatch = issue.path.match(/^lockTypes\[(.+?)\](?:\.|$)/);
      if (serverMatch) {
        const name = decodePathKey(serverMatch[1]);
        row = lockTypes.value.find((item) => item.name.trim() === name) || null;
      }
    }
    if (row) add(row.id, issue.message);
  });
  return map;
});

const edgeTypeIssueMap = computed(() => {
  const map = new Map<string, string[]>();
  const add = (rowId: string, msg: string) => {
    const list = map.get(rowId) || [];
    list.push(msg);
    map.set(rowId, list);
  };

  allIssues.value.forEach((issue) => {
    let row = null as EdgeTypeRow | null;
    const clientMatch = issue.path.match(/^edgeTypes\[(\d+)\]\.name$/);
    if (clientMatch) {
      row = edgeTypes.value[Number(clientMatch[1])] || null;
    } else {
      const serverMatch = issue.path.match(/^edgeTypes\[(.+?)\](?:\.|$)/);
      if (serverMatch) {
        const name = decodePathKey(serverMatch[1]);
        row = edgeTypes.value.find((item) => item.name.trim() === name) || null;
      }
    }
    if (row) add(row.id, issue.message);
  });
  return map;
});

const supplierIssueMap = computed(() => {
  const map = new Map<string, string[]>();
  const add = (rowId: string, msg: string) => {
    const list = map.get(rowId) || [];
    list.push(msg);
    map.set(rowId, list);
  };

  allIssues.value.forEach((issue) => {
    let row = null as SupplierRow | null;
    const clientMatch = issue.path.match(/^suppliers\[(\d+)\]\.key$/);
    if (clientMatch) {
      row = suppliers.value[Number(clientMatch[1])] || null;
    } else {
      const serverMatch = issue.path.match(/^suppliers\[(.+?)\](?:\.|$)/);
      if (serverMatch) {
        const key = decodePathKey(serverMatch[1]);
        row = suppliers.value.find((item) => item.key.trim() === key) || null;
      }
    }
    if (row) add(row.id, issue.message);
  });
  return map;
});

const hangingFeetStandardIssues = computed(() => {
  return allIssues.value.filter((issue) => issue.path === 'hangingFeet.standard').map((issue) => issue.message);
});

const heightReferenceIssues = computed(() => {
  return allIssues.value.filter((issue) => issue.path === 'heightReference').map((issue) => issue.message);
});

const hangingFeetKeywordIssueMap = computed(() => {
  const map = new Map<string, string[]>();
  const add = (rowId: string, msg: string) => {
    const list = map.get(rowId) || [];
    list.push(msg);
    map.set(rowId, list);
  };
  allIssues.value.forEach((issue) => {
    const match = issue.path.match(/^hangingFeet\.keywords\[(\d+)\]$/);
    if (!match) return;
    const row = hangingFeetKeywords.value[Number(match[1])];
    if (!row) return;
    add(row.id, issue.message);
  });
  return map;
});

const showIssuesPanel = computed(() => clientIssues.value.length > 0 || serverIssues.value.length > 0);
const jsonPreview = computed(() => JSON.stringify(payload.value, null, 2));

function makeBaseDimensionRow(input?: Partial<BaseDimensionRow>): BaseDimensionRow {
  return {
    id: makeId(),
    thickness: input?.thickness || '',
    standardUpperBase1: input?.standardUpperBase1 || '',
    standardUpperBase2: input?.standardUpperBase2 || '',
    standardLowerBase1: input?.standardLowerBase1 || '',
    standardLowerBase2: input?.standardLowerBase2 || '',
    hangingUpperBase1: input?.hangingUpperBase1 || '',
    hangingUpperBase2: input?.hangingUpperBase2 || '',
    hangingLowerBase1: input?.hangingLowerBase1 || '',
    hangingLowerBase2: input?.hangingLowerBase2 || ''
  };
}

function makeLockTypeRow(input?: Partial<LockTypeRow>): LockTypeRow {
  return {
    id: makeId(),
    name: input?.name || '',
    category: input?.category || '',
    nameModifier: input?.nameModifier || '',
    upper: input?.upper || '',
    lower: input?.lower || ''
  };
}

function makeEdgeTypeRow(input?: Partial<EdgeTypeRow>): EdgeTypeRow {
  return {
    id: makeId(),
    name: input?.name || '',
    nameModifier: input?.nameModifier || ''
  };
}

function makeSupplierRow(input?: Partial<SupplierRow>): SupplierRow {
  return {
    id: makeId(),
    key: input?.key || '',
    value: input?.value || ''
  };
}

function makeKeywordRow(input?: Partial<KeywordRow>): KeywordRow {
  return {
    id: makeId(),
    value: input?.value || ''
  };
}

function resetWithPayload(raw: LockForkMappingConfig) {
  const data = adaptLockForkMapping(raw);
  baseDimensions.value = Object.entries(data.baseDimensions).map(([thickness, rule]) => makeBaseDimensionRow({
    thickness,
    standardUpperBase1: String(rule.standard?.upper.base1 ?? ''),
    standardUpperBase2: String(rule.standard?.upper.base2 ?? ''),
    standardLowerBase1: String(rule.standard?.lower.base1 ?? ''),
    standardLowerBase2: String(rule.standard?.lower.base2 ?? ''),
    hangingUpperBase1: String(rule.withHangingFeet?.upper.base1 ?? ''),
    hangingUpperBase2: String(rule.withHangingFeet?.upper.base2 ?? ''),
    hangingLowerBase1: String(rule.withHangingFeet?.lower.base1 ?? ''),
    hangingLowerBase2: String(rule.withHangingFeet?.lower.base2 ?? '')
  }));
  if (baseDimensions.value.length === 0) baseDimensions.value = [makeBaseDimensionRow()];

  lockTypes.value = Object.entries(data.lockTypes).map(([name, value]) => makeLockTypeRow({
    name,
    category: value.category,
    nameModifier: value.nameModifier,
    upper: value.upper,
    lower: value.lower
  }));
  if (lockTypes.value.length === 0) lockTypes.value = [makeLockTypeRow()];

  edgeTypes.value = Object.entries(data.edgeTypes).map(([name, value]) => makeEdgeTypeRow({
    name,
    nameModifier: value.nameModifier
  }));
  if (edgeTypes.value.length === 0) edgeTypes.value = [makeEdgeTypeRow()];

  suppliers.value = Object.entries(data.suppliers).map(([key, value]) => makeSupplierRow({ key, value }));
  if (suppliers.value.length === 0) suppliers.value = [makeSupplierRow({ key: 'default' })];

  hangingFeetStandard.value = String(data.hangingFeet.standard);
  hangingFeetKeywords.value = data.hangingFeet.keywords.map((value) => makeKeywordRow({ value }));
  if (hangingFeetKeywords.value.length === 0) hangingFeetKeywords.value = [makeKeywordRow()];
  heightReference.value = String(data.heightReference);
}

async function load() {
  isLoading.value = true;
  loadError.value = null;
  serverIssues.value = [];
  try {
    const res = await api.get<LockForkMappingConfig>('/config/lock-fork');
    resetWithPayload(res);
  } catch (e: any) {
    console.error(e);
    loadError.value = e?.message || '加载失败';
    toast({
      title: '加载失败',
      description: '无法读取锁叉映射配置'
    });
  } finally {
    isLoading.value = false;
  }
}

async function scrollToFirstIssue() {
  await nextTick();
  const target = document.querySelector('[data-issue-item="true"]') as HTMLElement | null;
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('ring-2', 'ring-amber-300');
    setTimeout(() => target.classList.remove('ring-2', 'ring-amber-300'), 1200);
    return;
  }
  const fallback = document.querySelector('[data-issue-anchor="true"]') as HTMLElement | null;
  if (fallback) fallback.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    const res = await api.put<{ ok: boolean; data?: LockForkMappingConfig; errors?: MappingValidationIssue[] }>(
      '/config/lock-fork',
      payload.value
    );
    if (!res.ok) {
      serverIssues.value = res.errors || [];
      await scrollToFirstIssue();
      return;
    }
    if (res.data) resetWithPayload(res.data);
    await configLoader.refreshLockForkMapping();
    toast({
      title: '保存成功',
      description: '锁叉映射已更新',
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
  let parsed: LockForkMappingConfig;
  try {
    parsed = JSON.parse(jsonDraft.value || '{}');
  } catch (e: any) {
    jsonDraftError.value = e?.message || 'JSON 解析失败';
    return;
  }
  const issues = validateLockForkMapping(parsed);
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
        <h2 class="text-3xl font-semibold tracking-tight">锁叉配置</h2>
        <p class="text-muted-foreground mt-1">维护锁叉尺寸、类型、吊脚规则与供应商映射。</p>
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
            <CardDescription>按门厚维护常规尺寸与吊脚尺寸的上下头参数。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium">门厚尺寸</div>
              <Button variant="outline" size="sm" @click="baseDimensions.push(makeBaseDimensionRow())">新增</Button>
            </div>
            <div class="space-y-4">
              <div
                v-for="row in baseDimensions"
                :key="row.id"
                class="rounded-md border p-3 bg-background space-y-3"
                :class="baseDimensionIssueMap.get(row.id)?.length ? 'bg-amber-50/60 border-amber-300' : ''"
                :data-issue-item="baseDimensionIssueMap.get(row.id)?.length ? 'true' : null"
              >
                <div class="flex items-center justify-between">
                  <div class="w-32">
                    <label class="text-xs text-muted-foreground">门厚</label>
                    <Input v-model="row.thickness" class="h-9" placeholder="7" />
                  </div>
                  <Button variant="ghost" size="sm" @click="baseDimensions = baseDimensions.filter((item) => item.id !== row.id)">
                    删除
                  </Button>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div class="rounded-md border p-2">
                    <div class="text-xs font-medium mb-2">常规尺寸</div>
                    <div class="grid grid-cols-2 gap-2">
                      <Input v-model="row.standardUpperBase1" class="h-8" placeholder="上头 base1" />
                      <Input v-model="row.standardUpperBase2" class="h-8" placeholder="上头 base2" />
                      <Input v-model="row.standardLowerBase1" class="h-8" placeholder="下头 base1" />
                      <Input v-model="row.standardLowerBase2" class="h-8" placeholder="下头 base2" />
                    </div>
                  </div>
                  <div class="rounded-md border p-2">
                    <div class="text-xs font-medium mb-2">吊脚尺寸</div>
                    <div class="grid grid-cols-2 gap-2">
                      <Input v-model="row.hangingUpperBase1" class="h-8" placeholder="上头 base1" />
                      <Input v-model="row.hangingUpperBase2" class="h-8" placeholder="上头 base2" />
                      <Input v-model="row.hangingLowerBase1" class="h-8" placeholder="下头 base1" />
                      <Input v-model="row.hangingLowerBase2" class="h-8" placeholder="下头 base2" />
                    </div>
                  </div>
                </div>
                <div v-if="baseDimensionIssueMap.get(row.id)?.length" class="text-[11px] text-destructive">
                  {{ baseDimensionIssueMap.get(row.id)?.[0] }}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>锁具类型</CardTitle>
            <CardDescription>如 P66、dual-head、上下头名称等。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium">类型列表</div>
              <Button variant="outline" size="sm" @click="lockTypes.push(makeLockTypeRow())">新增</Button>
            </div>
            <div class="overflow-auto rounded-md border">
              <table class="w-full text-sm text-left">
                <thead class="text-xs text-muted-foreground bg-muted/50 sticky top-0">
                  <tr>
                    <th class="px-3 py-2">名称</th>
                    <th class="px-3 py-2">类型分类</th>
                    <th class="px-3 py-2">名称修饰</th>
                    <th class="px-3 py-2">上头样式</th>
                    <th class="px-3 py-2">下头样式</th>
                    <th class="px-3 py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in lockTypes"
                    :key="row.id"
                    class="bg-background border-b last:border-0"
                    :class="lockTypeIssueMap.get(row.id)?.length ? 'bg-amber-50/60' : ''"
                    :data-issue-item="lockTypeIssueMap.get(row.id)?.length ? 'true' : null"
                  >
                    <td class="px-3 py-2"><Input v-model="row.name" class="h-9" placeholder="F02-A副锁" /></td>
                    <td class="px-3 py-2"><Input v-model="row.category" class="h-9" placeholder="dual-head" /></td>
                    <td class="px-3 py-2"><Input v-model="row.nameModifier" class="h-9" placeholder="P66" /></td>
                    <td class="px-3 py-2"><Input v-model="row.upper" class="h-9" placeholder="直杆" /></td>
                    <td class="px-3 py-2"><Input v-model="row.lower" class="h-9" placeholder="弯杆" /></td>
                    <td class="px-3 py-2">
                      <Button variant="ghost" size="sm" @click="lockTypes = lockTypes.filter((item) => item.id !== row.id)">删除</Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>边型与参数</CardTitle>
            <CardDescription>边型修饰、吊脚和高度参考值。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="text-xs text-muted-foreground">吊脚标准值</label>
                <Input
                  v-model="hangingFeetStandard"
                  class="h-9"
                  :class="hangingFeetStandardIssues.length ? 'border-destructive' : ''"
                  :data-issue-item="hangingFeetStandardIssues.length ? 'true' : null"
                  placeholder="35"
                />
                <div v-if="hangingFeetStandardIssues.length" class="text-[11px] text-destructive mt-1">
                  {{ hangingFeetStandardIssues[0] }}
                </div>
              </div>
              <div>
                <label class="text-xs text-muted-foreground">高度参考值</label>
                <Input
                  v-model="heightReference"
                  class="h-9"
                  :class="heightReferenceIssues.length ? 'border-destructive' : ''"
                  :data-issue-item="heightReferenceIssues.length ? 'true' : null"
                  placeholder="2050"
                />
                <div v-if="heightReferenceIssues.length" class="text-[11px] text-destructive mt-1">
                  {{ heightReferenceIssues[0] }}
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-sm font-medium">吊脚关键字</div>
                <Button variant="outline" size="sm" @click="hangingFeetKeywords.push(makeKeywordRow())">新增</Button>
              </div>
              <div
                v-for="item in hangingFeetKeywords"
                :key="item.id"
                class="flex items-center gap-2"
                :data-issue-item="hangingFeetKeywordIssueMap.get(item.id)?.length ? 'true' : null"
              >
                <Input
                  v-model="item.value"
                  class="h-9"
                  :class="hangingFeetKeywordIssueMap.get(item.id)?.length ? 'border-destructive' : ''"
                  placeholder="吊脚 / diaojiao"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  @click="hangingFeetKeywords = hangingFeetKeywords.filter((row) => row.id !== item.id)"
                >
                  删除
                </Button>
                <div v-if="hangingFeetKeywordIssueMap.get(item.id)?.length" class="text-[11px] text-destructive">
                  {{ hangingFeetKeywordIssueMap.get(item.id)?.[0] }}
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-sm font-medium">边型列表</div>
                <Button variant="outline" size="sm" @click="edgeTypes.push(makeEdgeTypeRow())">新增</Button>
              </div>
              <div class="overflow-auto rounded-md border">
                <table class="w-full text-sm text-left">
                  <thead class="text-xs text-muted-foreground bg-muted/50">
                    <tr>
                      <th class="px-3 py-2">边型名称</th>
                      <th class="px-3 py-2">名称修饰</th>
                      <th class="px-3 py-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in edgeTypes"
                      :key="row.id"
                      class="bg-background border-b last:border-0"
                      :class="edgeTypeIssueMap.get(row.id)?.length ? 'bg-amber-50/60' : ''"
                      :data-issue-item="edgeTypeIssueMap.get(row.id)?.length ? 'true' : null"
                    >
                      <td class="px-3 py-2"><Input v-model="row.name" class="h-9" placeholder="T型" /></td>
                      <td class="px-3 py-2"><Input v-model="row.nameModifier" class="h-9" placeholder="T型" /></td>
                      <td class="px-3 py-2">
                        <Button variant="ghost" size="sm" @click="edgeTypes = edgeTypes.filter((item) => item.id !== row.id)">删除</Button>
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
            <CardTitle>供应商映射</CardTitle>
            <CardDescription>如 default -> 应志友。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium">供应商</div>
              <Button variant="outline" size="sm" @click="suppliers.push(makeSupplierRow())">新增</Button>
            </div>
            <div class="overflow-auto rounded-md border">
              <table class="w-full text-sm text-left">
                <thead class="text-xs text-muted-foreground bg-muted/50">
                  <tr>
                    <th class="px-3 py-2">键名</th>
                    <th class="px-3 py-2">值</th>
                    <th class="px-3 py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in suppliers"
                    :key="row.id"
                    class="bg-background border-b last:border-0"
                    :class="supplierIssueMap.get(row.id)?.length ? 'bg-amber-50/60' : ''"
                    :data-issue-item="supplierIssueMap.get(row.id)?.length ? 'true' : null"
                  >
                    <td class="px-3 py-2"><Input v-model="row.key" class="h-9" placeholder="default" /></td>
                    <td class="px-3 py-2"><Input v-model="row.value" class="h-9" placeholder="应志友" /></td>
                    <td class="px-3 py-2">
                      <Button variant="ghost" size="sm" @click="suppliers = suppliers.filter((item) => item.id !== row.id)">删除</Button>
                    </td>
                  </tr>
                </tbody>
              </table>
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
          <DialogDescription>直接编辑锁叉配置 JSON，应用前会进行校验。</DialogDescription>
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
