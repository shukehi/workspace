<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useIntersectionObserver } from '@vueuse/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formulaApi } from '@/services/formulaApi';
import type {
  FormulaBOMItem,
  FormulaDetail,
  FormulaRevisionMeta,
  FormulaSummary
} from '@/types/formula';
import { useToastStore } from '@/stores/useToastStore';

const { toast } = useToastStore();

const loading = ref(false);
const loadingMore = ref(false);
const saving = ref(false);
const publishing = ref(false);
const list = ref<FormulaSummary[]>([]);
const total = ref(0);
const selectedKey = ref('');
const detail = ref<FormulaDetail | null>(null);
const draftRevision = ref<FormulaRevisionMeta | null>(null);
const publishedRevision = ref<FormulaRevisionMeta | null>(null);
const revisions = ref<FormulaRevisionMeta[]>([]);

const keyword = ref('');
const statusFilter = ref('');
const categoryFilter = ref('');
const page = ref(1);
const pageSize = ref(20);
const hasMore = computed(() => list.value.length < total.value);
const listContainerRef = ref<HTMLDivElement | null>(null);
const loadMoreTriggerRef = ref<HTMLDivElement | null>(null);

const newFormulaKey = ref('');
const newDisplayName = ref('');
const newCategory = ref('Default');
const changeNote = ref('');

const bomDraft = ref<FormulaBOMItem[]>([]);
const validationErrors = ref<Record<string, string>>({});
const isDirty = ref(false);

const categories = computed(() => {
  const set = new Set<string>();
  list.value.forEach((item) => set.add(item.category));
  if (detail.value?.category) set.add(detail.value.category);
  return ['All', ...Array.from(set)];
});

const filteredCategory = computed(() => categoryFilter.value === 'All' ? '' : categoryFilter.value);

function markDirty() {
  isDirty.value = true;
}

function normalizeBomRow(row?: Partial<FormulaBOMItem>): FormulaBOMItem {
  return {
    materialId: String(row?.materialId || '').trim(),
    position: String(row?.position || '').trim(),
    usage: {
      single: Number(row?.usage?.single ?? 0),
      double: Number(row?.usage?.double ?? 0),
      paired: Number(row?.usage?.paired ?? 0),
    }
  };
}

function resetDraftWithDetail() {
  bomDraft.value = (detail.value?.bom || []).map((item) => normalizeBomRow(item));
  validationErrors.value = {};
  isDirty.value = false;
}

function localValidate(): boolean {
  const errors: Record<string, string> = {};
  if (!detail.value?.formulaKey) errors.formulaKey = '配方编码不能为空';
  if (!detail.value?.displayName) errors.displayName = '配方名称不能为空';
  if (!detail.value?.category) errors.category = '分类不能为空';
  if (bomDraft.value.length === 0) errors.bom = 'BOM 不能为空';

  const seen = new Set<string>();
  bomDraft.value.forEach((row, idx) => {
    if (!row.materialId) errors[`bom.${idx}.materialId`] = '物料ID不能为空';
    if (!row.position) errors[`bom.${idx}.position`] = '位置不能为空';
    ['single', 'double', 'paired'].forEach((k) => {
      const val = Number((row.usage as any)[k]);
      if (Number.isNaN(val) || val < 0) errors[`bom.${idx}.usage.${k}`] = '用量必须为非负数';
    });
    const dup = `${row.materialId}::${row.position}`;
    if (seen.has(dup)) errors[`bom.${idx}.dup`] = '存在重复物料+位置';
    seen.add(dup);
  });

  validationErrors.value = errors;
  return Object.keys(errors).length === 0;
}

async function loadList(options: { append?: boolean } = {}) {
  const append = !!options.append;
  if (append) {
    loadingMore.value = true;
  } else {
    loading.value = true;
  }
  try {
    const result = await formulaApi.list({
      keyword: keyword.value || undefined,
      status: statusFilter.value || undefined,
      category: filteredCategory.value || undefined,
      page: page.value,
      pageSize: pageSize.value
    });
    const incoming = result.items || [];
    total.value = Number(result.total || 0);
    if (append) {
      const seen = new Set(list.value.map((item) => item.formulaKey));
      const merged = incoming.filter((item) => !seen.has(item.formulaKey));
      list.value = [...list.value, ...merged];
    } else {
      list.value = incoming;
    }
    if (!selectedKey.value && list.value.length > 0) {
      await loadDetail(list.value[0].formulaKey, true);
    }
    await ensureListScrollable();
  } catch (error) {
    console.error(error);
    toast({ title: '加载配方列表失败', variant: 'destructive' });
  } finally {
    if (append) {
      loadingMore.value = false;
    } else {
      loading.value = false;
    }
  }
}

async function ensureListScrollable() {
  await nextTick();
  const el = listContainerRef.value;
  if (!el || loading.value || loadingMore.value) return;
  if (hasMore.value && el.scrollHeight <= el.clientHeight + 8) {
    await loadNextPage();
  }
}

async function loadNextPage() {
  if (loading.value || loadingMore.value || !hasMore.value) return;
  page.value += 1;
  await loadList({ append: true });
}

function onListScroll(e: Event) {
  const target = e.target as HTMLDivElement;
  const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
  if (remaining < 80) {
    loadNextPage();
  }
}

async function loadDetail(formulaKey: string, silent = false) {
  if (!silent && isDirty.value) {
    const confirmed = window.confirm('当前有未保存改动，确定切换配方吗？');
    if (!confirmed) return;
  }
  try {
    const data = await formulaApi.detail(formulaKey);
    selectedKey.value = formulaKey;
    detail.value = data.formula;
    draftRevision.value = data.draftRevision;
    publishedRevision.value = data.publishedRevision;
    resetDraftWithDetail();
    await loadRevisions(formulaKey);
  } catch (error) {
    console.error(error);
    toast({ title: '加载配方详情失败', variant: 'destructive' });
  }
}

async function loadRevisions(formulaKey: string) {
  try {
    const data = await formulaApi.revisions(formulaKey);
    revisions.value = data.items || [];
  } catch {
    revisions.value = [];
  }
}

function addBomRow() {
  bomDraft.value.push(normalizeBomRow());
  markDirty();
}

function removeBomRow(index: number) {
  bomDraft.value.splice(index, 1);
  markDirty();
}

async function createFormula() {
  if (!newFormulaKey.value.trim() || !newDisplayName.value.trim()) {
    toast({ title: '请填写配方编码和名称', variant: 'destructive' });
    return;
  }
  try {
    const payload = {
      formulaKey: newFormulaKey.value.trim(),
      displayName: newDisplayName.value.trim(),
      category: newCategory.value.trim() || 'Default',
      bom: [normalizeBomRow()],
      changeNote: '创建配方'
    };
    await formulaApi.create(payload);
    toast({ title: '配方已创建', variant: 'success' });
    newFormulaKey.value = '';
    newDisplayName.value = '';
    newCategory.value = 'Default';
    page.value = 1;
    await loadList();
    await loadDetail(payload.formulaKey, true);
  } catch (error: any) {
    console.error(error);
    toast({
      title: '创建失败',
      description: error?.response?.data?.errors?.[0]?.message || '请检查输入',
      variant: 'destructive'
    });
  }
}

async function saveDraft() {
  if (!detail.value || !draftRevision.value) return;
  if (!localValidate()) {
    toast({ title: '本地校验未通过，请修复错误后再保存', variant: 'destructive' });
    return;
  }
  saving.value = true;
  try {
    const result = await formulaApi.updateDraft(detail.value.formulaKey, {
      revision: draftRevision.value.revision,
      bom: bomDraft.value.map((r) => normalizeBomRow(r)),
      changeNote: changeNote.value || '更新草稿'
    });
    draftRevision.value = result.revision;
    detail.value.bom = bomDraft.value.map((r) => normalizeBomRow(r));
    isDirty.value = false;
    changeNote.value = '';
    page.value = 1;
    await loadList();
    await loadRevisions(detail.value.formulaKey);
    toast({ title: '草稿已保存', variant: 'success' });
  } catch (error: any) {
    const message = error?.response?.data?.errors?.[0]?.message || '保存失败';
    toast({ title: '保存失败', description: message, variant: 'destructive' });
  } finally {
    saving.value = false;
  }
}

async function publishFormula() {
  if (!detail.value || !draftRevision.value) return;
  if (!window.confirm('发布后将影响物料计算，确认发布？')) return;

  publishing.value = true;
  try {
    const result = await formulaApi.publish(detail.value.formulaKey, {
      fromRevision: draftRevision.value.revision,
      changeNote: changeNote.value || '发布版本'
    });
    publishedRevision.value = result.revision;
    changeNote.value = '';
    isDirty.value = false;
    await loadDetail(detail.value.formulaKey, true);
    page.value = 1;
    await loadList();
    toast({ title: '发布成功', variant: 'success' });
  } catch (error: any) {
    const message = error?.response?.data?.errors?.[0]?.message || '发布失败';
    toast({ title: '发布失败', description: message, variant: 'destructive' });
  } finally {
    publishing.value = false;
  }
}

async function archiveFormula() {
  if (!detail.value) return;
  const reason = window.prompt('请输入归档原因（可选）：') || '';
  try {
    await formulaApi.archive(detail.value.formulaKey, { reason });
    toast({ title: '已归档', variant: 'success' });
    page.value = 1;
    await loadList();
    await loadDetail(detail.value.formulaKey, true);
  } catch {
    toast({ title: '归档失败', variant: 'destructive' });
  }
}

async function rollbackFormula(revision: number) {
  if (!detail.value) return;
  if (!window.confirm(`确认回滚到 revision ${revision}？`)) return;
  const reason = window.prompt('请输入回滚原因（可选）：') || '';
  try {
    await formulaApi.rollback(detail.value.formulaKey, { targetRevision: revision, reason });
    toast({ title: '回滚成功', variant: 'success' });
    await loadDetail(detail.value.formulaKey, true);
    page.value = 1;
    await loadList();
  } catch {
    toast({ title: '回滚失败', variant: 'destructive' });
  }
}

watch([keyword, statusFilter, categoryFilter], () => {
  page.value = 1;
  total.value = 0;
  loadList({ append: false });
});

watch(isDirty, () => {
  window.onbeforeunload = isDirty.value ? () => '当前有未保存改动' : null;
});

onMounted(() => {
  useIntersectionObserver(
    loadMoreTriggerRef,
    ([entry]) => {
      if (entry?.isIntersecting) {
        loadNextPage();
      }
    },
    {
      root: listContainerRef,
      rootMargin: '120px 0px 120px 0px',
    }
  );
  loadList();
});
</script>

<template>
  <div class="h-full p-6 md:p-8 bg-muted/20 flex flex-col gap-4 overflow-hidden">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">配方管理</h1>
        <p class="text-sm text-muted-foreground mt-1">草稿编辑、发布、生效与版本回滚</p>
      </div>
    </div>

    <Card>
      <CardContent class="p-4 grid grid-cols-1 lg:grid-cols-12 gap-3">
        <Input v-model="keyword" placeholder="搜索配方编码/名称" class="lg:col-span-4" />
        <select v-model="statusFilter" class="h-9 rounded-md border bg-background px-3 text-sm lg:col-span-2">
          <option value="">全部状态</option>
          <option value="draft">draft</option>
          <option value="published">published</option>
          <option value="archived">archived</option>
        </select>
        <select v-model="categoryFilter" class="h-9 rounded-md border bg-background px-3 text-sm lg:col-span-2">
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat === 'All' ? '全部分类' : cat }}</option>
        </select>
        <Input v-model="newFormulaKey" placeholder="新配方编码" class="lg:col-span-2" />
        <Input v-model="newDisplayName" placeholder="新配方名称" class="lg:col-span-2" />
        <Input v-model="newCategory" placeholder="分类(默认 Default)" class="lg:col-span-2" />
        <div class="lg:col-span-10"></div>
        <Button class="lg:col-span-2" @click="createFormula">+ 新增配方</Button>
      </CardContent>
    </Card>

    <div class="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-4 overflow-hidden">
      <Card class="xl:col-span-3 min-h-0 overflow-hidden flex flex-col">
        <CardHeader class="pb-3 border-b">
          <CardTitle class="text-base">配方列表 ({{ list.length }}/{{ total }})</CardTitle>
        </CardHeader>
        <CardContent class="p-0 overflow-hidden">
          <div
            ref="listContainerRef"
            class="formula-list-viewport overflow-auto overscroll-contain"
            @scroll.passive="onListScroll"
            @mouseenter="ensureListScrollable"
          >
            <div v-if="loading" class="p-4 text-sm text-muted-foreground">加载中...</div>
            <button
              v-for="item in list"
              :key="item.formulaKey"
              class="formula-list-row w-full text-left px-4 border-b hover:bg-muted/40"
              :class="item.formulaKey === selectedKey ? 'bg-muted' : ''"
              @click="loadDetail(item.formulaKey)"
            >
              <div class="font-medium">{{ item.formulaKey }} - {{ item.displayName }}</div>
              <div class="text-xs text-muted-foreground mt-1">{{ item.category }} · {{ item.status }} · rev {{ item.activeRevision ?? '-' }}</div>
            </button>
            <div ref="loadMoreTriggerRef" class="h-1 w-full"></div>
            <div v-if="loadingMore" class="p-3 text-center text-xs text-muted-foreground">加载更多...</div>
            <div v-else-if="!hasMore && list.length > 0" class="p-3 text-center text-xs text-muted-foreground">已加载全部配方</div>
            <div v-if="!loading && list.length === 0" class="p-4 text-sm text-muted-foreground">暂无配方</div>
          </div>
        </CardContent>
      </Card>

      <Card class="xl:col-span-6 min-h-0 h-full overflow-hidden flex flex-col">
        <CardHeader class="pb-3 border-b">
          <CardTitle class="text-base">配方编辑</CardTitle>
        </CardHeader>
        <CardContent class="p-4 space-y-4 overflow-auto flex-1 min-h-0">
          <div v-if="!detail" class="text-sm text-muted-foreground">请选择左侧配方</div>
          <template v-else>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div class="text-xs text-muted-foreground mb-1">配方编码</div>
                <Input :model-value="detail.formulaKey" disabled />
                <p v-if="validationErrors.formulaKey" class="text-xs text-rose-600 mt-1">{{ validationErrors.formulaKey }}</p>
              </div>
              <div>
                <div class="text-xs text-muted-foreground mb-1">配方名称</div>
                <Input :model-value="detail.displayName" disabled />
                <p v-if="validationErrors.displayName" class="text-xs text-rose-600 mt-1">{{ validationErrors.displayName }}</p>
              </div>
              <div>
                <div class="text-xs text-muted-foreground mb-1">分类</div>
                <Input :model-value="detail.category" disabled />
                <p v-if="validationErrors.category" class="text-xs text-rose-600 mt-1">{{ validationErrors.category }}</p>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <div class="text-sm font-medium">BOM 明细</div>
              <Button size="sm" variant="outline" @click="addBomRow">+ 新增行</Button>
            </div>
            <p v-if="validationErrors.bom" class="text-xs text-rose-600">{{ validationErrors.bom }}</p>

            <div class="rounded-md border overflow-auto">
              <table class="w-full text-sm">
                <thead class="bg-muted/40">
                  <tr>
                    <th class="p-2 text-left">Material ID</th>
                    <th class="p-2 text-left">Position</th>
                    <th class="p-2 text-right">Single</th>
                    <th class="p-2 text-right">Double</th>
                    <th class="p-2 text-right">Paired</th>
                    <th class="p-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in bomDraft" :key="`${idx}-${row.materialId}-${row.position}`" class="border-t">
                    <td class="p-2">
                      <Input v-model="row.materialId" @update:model-value="markDirty" />
                      <p v-if="validationErrors[`bom.${idx}.materialId`]" class="text-xs text-rose-600 mt-1">
                        {{ validationErrors[`bom.${idx}.materialId`] }}
                      </p>
                    </td>
                    <td class="p-2">
                      <Input v-model="row.position" @update:model-value="markDirty" />
                      <p v-if="validationErrors[`bom.${idx}.position`]" class="text-xs text-rose-600 mt-1">
                        {{ validationErrors[`bom.${idx}.position`] }}
                      </p>
                    </td>
                    <td class="p-2">
                      <Input v-model="row.usage.single" type="number" min="0" @update:model-value="markDirty" />
                    </td>
                    <td class="p-2">
                      <Input v-model="row.usage.double" type="number" min="0" @update:model-value="markDirty" />
                    </td>
                    <td class="p-2">
                      <Input v-model="row.usage.paired" type="number" min="0" @update:model-value="markDirty" />
                    </td>
                    <td class="p-2 text-right">
                      <Button size="sm" variant="ghost" @click="removeBomRow(idx)">删除</Button>
                      <p v-if="validationErrors[`bom.${idx}.dup`]" class="text-xs text-rose-600 mt-1">
                        {{ validationErrors[`bom.${idx}.dup`] }}
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <div class="text-xs text-muted-foreground mb-1">变更说明</div>
              <Textarea v-model="changeNote" placeholder="本次变更说明（发布/回滚建议填写）" />
            </div>

            <div class="flex flex-wrap gap-2">
              <Button :disabled="saving || !draftRevision" @click="saveDraft">
                {{ saving ? '保存中...' : '保存草稿' }}
              </Button>
              <Button :disabled="publishing || !draftRevision" variant="outline" @click="publishFormula">
                {{ publishing ? '发布中...' : '发布' }}
              </Button>
              <Button variant="outline" :disabled="!detail" @click="archiveFormula">归档</Button>
            </div>
          </template>
        </CardContent>
      </Card>

      <Card class="xl:col-span-3 min-h-0 h-full overflow-hidden flex flex-col">
        <CardHeader class="pb-3 border-b">
          <CardTitle class="text-base">版本历史</CardTitle>
        </CardHeader>
        <CardContent class="p-4 overflow-auto flex-1 min-h-0">
          <div class="text-xs text-muted-foreground mb-3">
            Draft: {{ draftRevision?.revision ?? '-' }} | Published: {{ publishedRevision?.revision ?? '-' }}
          </div>
          <div v-for="rev in revisions" :key="rev.id" class="border rounded-md p-3 mb-2 text-sm">
            <div class="font-medium">r{{ rev.revision }} · {{ rev.state }}</div>
            <div class="text-xs text-muted-foreground mt-1">{{ rev.createdBy }} · {{ new Date(rev.createdAt).toLocaleString() }}</div>
            <div class="text-xs mt-1">{{ rev.changeNote || '-' }}</div>
            <Button
              size="sm"
              variant="ghost"
              class="mt-2 px-0 h-7"
              :disabled="rev.state === 'archived'"
              @click="rollbackFormula(rev.revision)"
            >
              回滚到此版本
            </Button>
          </div>
          <div v-if="revisions.length === 0" class="text-sm text-muted-foreground">暂无历史版本</div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.formula-list-viewport {
  /* Fixed viewport: always 9 visible rows */
  height: calc(9 * 3.5rem);
}

.formula-list-row {
  min-height: 3.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
</style>
