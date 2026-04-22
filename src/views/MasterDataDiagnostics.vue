<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ConfigCenterShell from '@/features/config-editor/components/ConfigCenterShell.vue';
import MasterDataDiagnosticsSummaryCards from '@/features/master-data/components/MasterDataDiagnosticsSummaryCards.vue';
import { useMasterDataDiagnostics } from '@/features/master-data/composables/useMasterDataDiagnostics';
import type { MaterialMasterItem } from '@/services/materialMasterProfileApi';
import type { SupplierMasterEntry } from '@/services/mappingConfigApi';

const router = useRouter();
const {
  loading,
  loadError,
  relinkingMaterialIds,
  batchRelinking,
  lastBatchRelinkResult,
  lifecycleIssues,
  materialIssues,
  supplierIssues,
  summary,
  load,
  autoRelinkMaterial,
  autoRelinkMaterials,
} = useMasterDataDiagnostics();

const selectedAutoFixIds = ref<number[]>([]);
const manualTaskIndex = ref(0);

const visibleAutoFixCandidates = computed(() => materialIssues.value.autoFixCandidates.slice(0, 8));

const manualRepairTasks = computed(() => {
  const materialTasks = materialIssues.value.manualReviewCandidates.slice(0, 8).map((item) => {
    const supplierMasterId = item.supplierMaster?.id ?? null;
    return {
      key: `material-${item.id}`,
      id: item.id,
      label: `${item.code} · ${item.name}`,
      description: item.supplierMaster?.status === 'inactive'
        ? '当前链接的 Supplier Master 已 inactive'
        : '未找到可自动匹配的 Supplier Master',
      open: () => openMaterial(item, 'diagnostics'),
      openRelated: supplierMasterId
        ? () => openSupplier({ id: supplierMasterId } as SupplierMasterEntry, 'diagnostics')
        : null,
      relatedLabel: supplierMasterId ? '查看关联供应商' : null,
    };
  });

  const inactiveSupplierTasks = supplierIssues.value.inactiveLinkedSuppliers.slice(0, 8).map((item) => ({
    key: `supplier-inactive-${item.normalizedName}`,
    id: Number(item.id || 0),
    label: `${item.supplierName}`,
    description: 'inactive 但仍有关联物料',
    open: () => openSupplier(item, 'materials'),
    openRelated: null,
    relatedLabel: null,
  }));

  const supplierUnlinkedTasks = supplierIssues.value.suppliersWithUnlinkedMaterials.slice(0, 8).map((item) => ({
    key: `supplier-unlinked-${item.normalizedName}`,
    id: Number(item.id || 0),
    label: `${item.supplierName}`,
    description: `待补充正式链接：${item.materialCount} 个物料`,
    open: () => openSupplier(item, 'diagnostics'),
    openRelated: null,
    relatedLabel: null,
  }));

  return [...materialTasks, ...inactiveSupplierTasks, ...supplierUnlinkedTasks];
});

const currentManualTask = computed(() => manualRepairTasks.value[manualTaskIndex.value] || null);

watch(visibleAutoFixCandidates, (candidates) => {
  const candidateIds = new Set(candidates.map((item) => item.id));
  selectedAutoFixIds.value = selectedAutoFixIds.value.filter((id) => candidateIds.has(id));
}, { immediate: true });

watch(manualRepairTasks, (tasks) => {
  if (!tasks.length) {
    manualTaskIndex.value = 0;
    return;
  }
  if (manualTaskIndex.value >= tasks.length) {
    manualTaskIndex.value = tasks.length - 1;
  }
}, { immediate: true });

onMounted(() => {
  void load();
});

function openMaterial(item: { id: number }, tab: 'basic' | 'relationship' | 'diagnostics' | 'audit' = 'diagnostics') {
  void router.push({
    name: 'material-master',
    query: {
      materialId: String(item.id),
      tab,
    },
  });
}

function openSupplier(item: SupplierMasterEntry, tab: 'basic' | 'materials' | 'diagnostics' | 'audit' = 'diagnostics') {
  if (!item.id) return;
  void router.push({
    name: 'config-suppliers',
    query: {
      supplierId: String(item.id),
      tab,
    },
  });
}

function jumpToSuggestedSupplier(item: MaterialMasterItem & { suggestedSupplierMaster?: { id?: number | null } | null }) {
  const supplierId = Number(item.suggestedSupplierMaster?.id || 0);
  if (!supplierId) return;
  void router.push({
    name: 'config-suppliers',
    query: {
      supplierId: String(supplierId),
      tab: 'materials',
    },
  });
}

function toggleAutoFixSelection(materialId: number) {
  selectedAutoFixIds.value = selectedAutoFixIds.value.includes(materialId)
    ? selectedAutoFixIds.value.filter((id) => id !== materialId)
    : [...selectedAutoFixIds.value, materialId];
}

function selectAllVisibleAutoFix() {
  selectedAutoFixIds.value = visibleAutoFixCandidates.value.map((item) => item.id);
}

function clearAutoFixSelection() {
  selectedAutoFixIds.value = [];
}

async function runBatchAutoRelink() {
  const selectedItems = visibleAutoFixCandidates.value.filter((item) => selectedAutoFixIds.value.includes(item.id));
  await autoRelinkMaterials(selectedItems);
  clearAutoFixSelection();
}

function moveManualTask(offset: number) {
  if (!manualRepairTasks.value.length) return;
  const nextIndex = manualTaskIndex.value + offset;
  manualTaskIndex.value = Math.min(Math.max(nextIndex, 0), manualRepairTasks.value.length - 1);
}

function openCurrentManualTask() {
  currentManualTask.value?.open();
}

function openCurrentRelatedTask() {
  currentManualTask.value?.openRelated?.();
}

function openLifecycleIssue(profileCode: 'material_master' | 'supplier_master') {
  if (profileCode === 'material_master') {
    void router.push({ name: 'material-master', query: { tab: 'audit' } });
    return;
  }
  void router.push({ name: 'config-suppliers', query: { tab: 'audit' } });
}
</script>

<template>
  <ConfigCenterShell
    title="主数据统一诊断"
    description="聚合物料与供应商主数据异常，缩短发现问题到进入修复对象的路径。"
  >
    <template #header-right>
      <Button variant="outline" @click="load">刷新诊断</Button>
    </template>

    <MasterDataDiagnosticsSummaryCards :summary="summary" />

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] items-start">
      <section class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold">优先处理事项</h3>
          <p class="text-sm text-muted-foreground">先处理 lifecycle 待发布和人工任务流，再进入大批量异常明细。</p>
        </div>

        <Card v-if="lifecycleIssues.items.length > 0">
          <CardHeader>
            <CardTitle>Lifecycle 待处理</CardTitle>
          </CardHeader>
          <CardContent class="space-y-2 text-sm">
            <div
              v-for="issue in lifecycleIssues.items"
              :key="issue.key"
              class="rounded-md border bg-background px-3 py-2"
            >
              <div class="font-medium">{{ issue.title }}</div>
              <div class="text-muted-foreground">draft revision #{{ issue.draftRevision }} · published revision #{{ issue.publishedRevision ?? '-' }}</div>
              <div class="mt-2">
                <Button size="sm" variant="outline" @click="openLifecycleIssue(issue.profileCode)">打开 lifecycle 面板</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card v-if="currentManualTask">
          <CardHeader>
            <CardTitle>人工处理任务流</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3 text-sm">
            <div class="rounded-md border bg-background px-3 py-2">
              <div class="text-muted-foreground">当前任务 {{ manualTaskIndex + 1 }} / {{ manualRepairTasks.length }}</div>
              <div class="font-medium">{{ currentManualTask.label }}</div>
              <div class="text-muted-foreground">{{ currentManualTask.description }}</div>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" :disabled="manualTaskIndex === 0" @click="moveManualTask(-1)">上一条</Button>
              <Button size="sm" variant="outline" :disabled="manualTaskIndex >= manualRepairTasks.length - 1" @click="moveManualTask(1)">下一条</Button>
              <Button size="sm" variant="outline" @click="openCurrentManualTask">处理当前对象</Button>
              <Button v-if="currentManualTask.relatedLabel" size="sm" variant="outline" @click="openCurrentRelatedTask">
                {{ currentManualTask.relatedLabel }}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card v-if="lastBatchRelinkResult && lastBatchRelinkResult.processed > 0">
          <CardContent class="p-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div>批量自动重连完成</div>
            <div>processed: {{ lastBatchRelinkResult.processed }}</div>
            <div>succeeded: {{ lastBatchRelinkResult.succeeded }}</div>
            <div v-if="lastBatchRelinkResult.failed > 0" class="text-destructive">failed: {{ lastBatchRelinkResult.failed }}</div>
          </CardContent>
        </Card>

        <div v-if="loadError" class="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {{ loadError }}
        </div>
      </section>

      <section class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold">批量修复控制台</h3>
          <p class="text-sm text-muted-foreground">对可自动修复项集中操作，减少在长列表中来回切换。</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>可自动修复</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4 text-sm">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="text-muted-foreground">批量选择后可直接自动重连</div>
              <div class="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" @click="selectAllVisibleAutoFix">全选可见项</Button>
                <Button size="sm" variant="outline" @click="clearAutoFixSelection">清空选择</Button>
                <Button size="sm" variant="outline" :disabled="batchRelinking || selectedAutoFixIds.length === 0" @click="runBatchAutoRelink">
                  批量自动重连
                </Button>
              </div>
            </div>
            <div v-if="visibleAutoFixCandidates.length === 0" class="text-muted-foreground">暂无可自动修复的物料</div>
            <div
              v-for="item in visibleAutoFixCandidates"
              :key="`auto-fix-${item.id}`"
              class="rounded-md border bg-background px-3 py-2"
            >
              <div class="flex items-start justify-between gap-3">
                <label class="flex items-start gap-3 flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    class="mt-1"
                    :checked="selectedAutoFixIds.includes(item.id)"
                    @change="toggleAutoFixSelection(item.id)"
                  >
                  <div>
                    <div class="font-medium">{{ item.code }} · {{ item.name }}</div>
                    <div class="text-muted-foreground">{{ item.supplier }} → {{ item.suggestedSupplierMaster?.supplierName }}</div>
                  </div>
                </label>
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" :disabled="relinkingMaterialIds.includes(item.id) || batchRelinking" @click="autoRelinkMaterial(item)">
                  自动重连
                </Button>
                <Button size="sm" variant="outline" @click="openMaterial(item, 'relationship')">查看物料详情</Button>
                <Button size="sm" variant="outline" @click="jumpToSuggestedSupplier(item)">查看供应商详情</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>

    <section class="space-y-3">
      <div>
        <h3 class="text-lg font-semibold">异常明细</h3>
        <p class="text-sm text-muted-foreground">把 Material / Supplier 异常列表放在下半区，避免和优先处理控制台同时争抢视觉重心。</p>
      </div>
      <div class="grid gap-4 xl:grid-cols-2 items-start">
        <Card>
          <CardHeader>
            <CardTitle>物料异常</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4 text-sm">
            <div v-if="loading" class="text-muted-foreground">加载诊断中...</div>

            <div>
              <div class="font-medium mb-2">需人工处理</div>
              <div v-if="materialIssues.manualReviewCandidates.length === 0" class="text-muted-foreground">暂无需人工处理的物料</div>
              <div
                v-for="item in materialIssues.manualReviewCandidates.slice(0, 8)"
                :key="`manual-review-${item.id}`"
                class="rounded-md border bg-background px-3 py-2 mb-2"
              >
                <div class="font-medium">{{ item.code }} · {{ item.name }}</div>
                <div class="text-muted-foreground">
                  <template v-if="item.supplierMaster?.status === 'inactive'">
                    当前链接的 Supplier Master 已 inactive
                  </template>
                  <template v-else>
                    未找到可自动匹配的 Supplier Master
                  </template>
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" @click="openMaterial(item, 'diagnostics')">查看物料详情</Button>
                  <Button v-if="item.supplierMaster?.id" size="sm" variant="outline" @click="openSupplier({ id: item.supplierMaster.id } as SupplierMasterEntry, 'diagnostics')">
                    查看供应商详情
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>供应商异常</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4 text-sm">
            <div v-if="loading" class="text-muted-foreground">加载诊断中...</div>

            <div>
              <div class="font-medium mb-2">inactive 但仍有关联物料</div>
              <div v-if="supplierIssues.inactiveLinkedSuppliers.length === 0" class="text-muted-foreground">暂无 inactive 仍有关联物料的供应商</div>
              <div
                v-for="item in supplierIssues.inactiveLinkedSuppliers.slice(0, 8)"
                :key="`inactive-supplier-${item.normalizedName}`"
                class="rounded-md border bg-background px-3 py-2 mb-2"
              >
                <div class="font-medium">{{ item.supplierName }}</div>
                <div class="text-muted-foreground">已链接物料：{{ item.linkedMaterialCount }}</div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" @click="openSupplier(item, 'materials')">查看供应商详情</Button>
                </div>
              </div>
            </div>

            <div>
              <div class="font-medium mb-2">需补充正式链接</div>
              <div v-if="supplierIssues.suppliersWithUnlinkedMaterials.length === 0" class="text-muted-foreground">暂无待补充正式链接的供应商</div>
              <div
                v-for="item in supplierIssues.suppliersWithUnlinkedMaterials.slice(0, 8)"
                :key="`supplier-unlinked-${item.normalizedName}`"
                class="rounded-md border bg-background px-3 py-2 mb-2"
              >
                <div class="font-medium">{{ item.supplierName }}</div>
                <div class="text-muted-foreground">物料数：{{ item.materialCount }} · 已链接：{{ item.linkedMaterialCount }}</div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" @click="openSupplier(item, 'diagnostics')">查看供应商详情</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  </ConfigCenterShell>
</template>
