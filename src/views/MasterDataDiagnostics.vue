<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ResponsiveLayoutPage from '@/components/shared/ResponsiveLayoutPage.vue';
import MasterDataDiagnosticsSummaryCards from '@/features/master-data/components/MasterDataDiagnosticsSummaryCards.vue';
import { useMasterDataDiagnostics } from '@/features/master-data/composables/useMasterDataDiagnostics';
import { 
  RefreshCcw, 
  Inbox, 
  Package, 
  Building2, 
  Hammer, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Wand2
} from 'lucide-vue-next';
import { cn } from '@/lib/utils';
import type { MaterialMasterItem } from '@/services/materialMasterProfileApi';
import type { SupplierMasterEntry } from '@/services/mappingConfigApi';

const router = useRouter();
const route = useRoute();
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

// Tab State
const activeTab = ref(String(route.query.tab || 'inbox'));

const selectedAutoFixIds = ref<number[]>([]);
const manualTaskIndex = ref(0);

const visibleAutoFixCandidates = computed(() => materialIssues.value.autoFixCandidates);

const manualRepairTasks = computed(() => {
  const materialTasks = materialIssues.value.manualReviewCandidates.map((item) => {
    const supplierMasterId = item.supplierMaster?.id ?? null;
    return {
      key: `material-${item.id}`,
      id: item.id,
      label: `${item.code} · ${item.name}`,
      description: item.supplierMaster?.status === 'inactive'
        ? '关联供应商已禁用'
        : '未找到可匹配供应商',
      open: () => openMaterial(item, 'diagnostics'),
      openRelated: supplierMasterId
        ? () => openSupplier({ id: supplierMasterId } as SupplierMasterEntry, 'diagnostics')
        : null,
      relatedLabel: supplierMasterId ? '查看关联供应商' : null,
    };
  });

  const inactiveSupplierTasks = supplierIssues.value.inactiveLinkedSuppliers.map((item) => ({
    key: `supplier-inactive-${item.normalizedName}`,
    id: Number(item.id || 0),
    label: `${item.supplierName}`,
    description: '已禁用但仍有关联物料',
    open: () => openSupplier(item, 'materials'),
    openRelated: null,
    relatedLabel: null,
  }));

  return [...materialTasks, ...inactiveSupplierTasks];
});

const currentManualTask = computed(() => manualRepairTasks.value[manualTaskIndex.value] || null);

// Watchers
watch(activeTab, (tab) => {
  router.replace({ query: { ...route.query, tab } });
});

onMounted(() => {
  void load();
});

// Navigation Functions
function openMaterial(item: { id: number }, tab = 'diagnostics') {
  void router.push({ name: 'material-master', query: { materialId: String(item.id), tab } });
}

function openSupplier(item: SupplierMasterEntry, tab = 'diagnostics') {
  if (!item.id) return;
  void router.push({ name: 'config-suppliers', query: { supplierId: String(item.id), tab } });
}

function jumpToSuggestedSupplier(item: MaterialMasterItem & { suggestedSupplierMaster?: { id?: number | null } | null }) {
  const supplierId = Number(item.suggestedSupplierMaster?.id || 0);
  if (!supplierId) return;
  void router.push({ name: 'config-suppliers', query: { supplierId: String(supplierId), tab: 'materials' } });
}

function toggleAutoFixSelection(materialId: number) {
  selectedAutoFixIds.value = selectedAutoFixIds.value.includes(materialId)
    ? selectedAutoFixIds.value.filter((id) => id !== materialId)
    : [...selectedAutoFixIds.value, materialId];
}

async function runBatchAutoRelink() {
  const selectedItems = visibleAutoFixCandidates.value.filter((item) => selectedAutoFixIds.value.includes(item.id));
  await autoRelinkMaterials(selectedItems);
  selectedAutoFixIds.value = [];
}

function moveManualTask(offset: number) {
  const nextIndex = manualTaskIndex.value + offset;
  manualTaskIndex.value = Math.min(Math.max(nextIndex, 0), manualRepairTasks.value.length - 1);
}

function openLifecycleIssue(profileCode: string) {
  const name = profileCode === 'material_master' ? 'material-master' : 'config-suppliers';
  void router.push({ name, query: { tab: 'audit' } });
}
</script>

<template>
  <ResponsiveLayoutPage
    title="数据治理工作台"
    subtitle="Master Data Integrity Workbench"
  >
    <template #actions>
      <Button variant="outline" size="sm" class="h-8" @click="load" :disabled="loading">
        <RefreshCcw class="w-3.5 h-3.5 mr-2" :class="{ 'animate-spin': loading }" />
        同步诊断
      </Button>
    </template>

    <template #summary>
      <MasterDataDiagnosticsSummaryCards :summary="summary" />
    </template>

    <Tabs v-model="activeTab" class="w-full flex-1 flex flex-col min-h-0">
      <div class="flex items-center justify-between border-b pb-px bg-background/50 sticky top-0 z-10">
        <TabsList class="h-12 w-full justify-start rounded-none bg-transparent p-0 gap-6">
          <TabsTrigger value="inbox" class="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-2 gap-2">
            <Inbox class="w-4 h-4" />
            待办优先
            <Badge v-if="manualRepairTasks.length + lifecycleIssues.items.length > 0" variant="secondary" class="ml-1 px-1.5 h-4 text-[10px]">
              {{ manualRepairTasks.length + lifecycleIssues.items.length }}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="materials" class="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-2 gap-2">
            <Package class="w-4 h-4" />
            物料异常
          </TabsTrigger>
          <TabsTrigger value="suppliers" class="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-2 gap-2">
            <Building2 class="w-4 h-4" />
            供应商异常
          </TabsTrigger>
        </TabsList>
      </div>

      <!-- Tab: Inbox (High Priority) -->
      <TabsContent value="inbox" class="flex-1 min-h-0 mt-6 space-y-6 data-[state=active]:flex flex-col">
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <!-- Manual Task Hero -->
          <Card v-if="currentManualTask" class="lg:col-span-2 border-primary/20 bg-primary/5 shadow-md">
            <CardContent class="p-6">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                  <Hammer class="w-4 h-4" />
                  当前修复建议
                </div>
                <div class="text-xs text-muted-foreground font-mono">
                  TASK {{ manualTaskIndex + 1 }} OF {{ manualRepairTasks.length }}
                </div>
              </div>
              <h3 class="text-2xl font-bold mb-2">{{ currentManualTask.label }}</h3>
              <p class="text-muted-foreground mb-6">{{ currentManualTask.description }}</p>
              
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Button size="sm" class="h-9 px-6 font-bold" @click="currentManualTask.open()">
                    立即处理
                  </Button>
                  <Button v-if="currentManualTask.openRelated" variant="outline" size="sm" class="h-9 px-4" @click="currentManualTask.openRelated()">
                    {{ currentManualTask.relatedLabel }}
                  </Button>
                </div>
                <div class="flex items-center gap-1 bg-background rounded-md border p-1 shadow-sm">
                  <Button variant="ghost" size="icon-sm" :disabled="manualTaskIndex === 0" @click="moveManualTask(-1)">
                    <ArrowLeft class="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" :disabled="manualTaskIndex >= manualRepairTasks.length - 1" @click="moveManualTask(1)">
                    <ArrowRight class="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Lifecycle Quick List -->
          <Card v-if="lifecycleIssues.items.length > 0" class="border-amber-200 bg-amber-50/20">
            <CardContent class="p-4 space-y-4">
              <div class="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-widest">
                <AlertTriangle class="w-4 h-4" />
                待发布 Lifecycle
              </div>
              <div class="space-y-2">
                <div v-for="issue in lifecycleIssues.items" :key="issue.key" class="p-3 rounded-lg border bg-background flex items-center justify-between group">
                  <div class="min-w-0">
                    <div class="text-xs font-bold truncate">{{ issue.title }}</div>
                    <div class="text-[10px] text-muted-foreground mt-0.5">Draft #{{ issue.draftRevision }}</div>
                  </div>
                  <Button variant="ghost" size="icon-sm" class="opacity-0 group-hover:opacity-100 transition-opacity" @click="openLifecycleIssue(issue.profileCode)">
                    <ExternalLink class="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div v-if="manualRepairTasks.length === 0 && lifecycleIssues.items.length === 0" class="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 border-2 border-dashed rounded-xl bg-muted/5">
          <CheckCircle2 class="w-12 h-12 mb-4 text-emerald-500/50" />
          <p class="font-medium text-lg text-foreground">暂无优先处理项</p>
          <p class="text-sm">主数据基础层目前非常健康，请查看其他页签的详细诊断。</p>
        </div>
      </TabsContent>

      <!-- Tab: Materials -->
      <TabsContent value="materials" class="flex-1 min-h-0 mt-6 data-[state=active]:flex flex-col gap-6">
        <div class="grid gap-6 xl:grid-cols-[1fr_360px] items-start">
          <!-- Main List -->
          <div class="space-y-4">
            <Card class="shadow-sm">
              <div class="p-4 border-b bg-muted/10">
                <h4 class="text-sm font-bold flex items-center gap-2">
                  所有异常物料 ({{ materialIssues.manualReviewCandidates.length + materialIssues.autoFixCandidates.length }})
                </h4>
              </div>
              <div class="divide-y max-h-[700px] overflow-auto custom-scrollbar">
                <div v-for="item in [...materialIssues.manualReviewCandidates, ...materialIssues.autoFixCandidates]" :key="item.id" class="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{{ item.code }}</span>
                      <span class="text-sm font-bold truncate">{{ item.name }}</span>
                    </div>
                    <div class="flex items-center gap-3 text-xs">
                      <span :class="item.supplierMaster?.id ? 'text-muted-foreground' : 'text-rose-600 font-medium'">
                        {{ item.supplierMaster?.id ? `已链：${item.supplierMaster.supplier_name}` : '未建立链接' }}
                      </span>
                      <span v-if="'suggestedSupplierMaster' in item && item.suggestedSupplierMaster" class="flex items-center gap-1 text-emerald-600 font-medium">
                        <Wand2 class="w-3 h-3" />
                        推荐：{{ (item as any).suggestedSupplierMaster.supplierName }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 ml-4">
                    <Button variant="ghost" size="sm" class="h-8" @click="openMaterial(item)">诊断</Button>
                    <Button v-if="'suggestedSupplierMaster' in item && item.suggestedSupplierMaster" variant="outline" size="sm" class="h-8 text-xs border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" @click="autoRelinkMaterial(item)">一键重连</Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <!-- Batch Control Console (Sticky) -->
          <Card class="border-primary/20 shadow-lg sticky top-6">
            <CardContent class="p-6 space-y-6">
              <div class="space-y-1">
                <h5 class="text-sm font-bold">批量自动重连</h5>
                <p class="text-[11px] text-muted-foreground leading-relaxed">系统已识别 {{ visibleAutoFixCandidates.length }} 个物料存在 100% 匹配的供应商记录，可执行批量修复。</p>
              </div>

              <div class="space-y-2">
                <Button size="sm" class="w-full h-10 font-bold" :disabled="batchRelinking || selectedAutoFixIds.length === 0" @click="runBatchAutoRelink">
                  执行批量修复 ({{ selectedAutoFixIds.length }})
                </Button>
                <div class="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" class="h-8 text-xs" @click="selectedAutoFixIds = visibleAutoFixCandidates.map(i => i.id)">全选所有</Button>
                  <Button variant="outline" size="sm" class="h-8 text-xs" @click="selectedAutoFixIds = []">清空</Button>
                </div>
              </div>

              <div class="max-h-[300px] overflow-auto border rounded-md divide-y custom-scrollbar">
                <label v-for="item in visibleAutoFixCandidates" :key="item.id" class="flex items-center gap-3 p-2.5 hover:bg-muted/20 cursor-pointer">
                  <input type="checkbox" :checked="selectedAutoFixIds.includes(item.id)" @change="toggleAutoFixSelection(item.id)" class="rounded border-muted-foreground/30">
                  <div class="min-w-0">
                    <div class="text-[11px] font-bold truncate">{{ item.name }}</div>
                    <div class="text-[9px] text-muted-foreground truncate">{{ item.supplier }} → {{ item.suggestedSupplierMaster?.supplierName }}</div>
                  </div>
                </label>
              </div>

              <div v-if="lastBatchRelinkResult" class="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-[10px]">
                <div class="text-emerald-700 font-bold mb-1">最近执行结果：</div>
                <div class="flex justify-between text-emerald-600">
                  <span>成功：{{ lastBatchRelinkResult.succeeded }}</span>
                  <span>失败：{{ lastBatchRelinkResult.failed }}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <!-- Tab: Suppliers -->
      <TabsContent value="suppliers" class="flex-1 min-h-0 mt-6 data-[state=active]:flex flex-col gap-6">
        <div class="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent class="p-0 divide-y">
              <div class="p-4 bg-rose-50/30">
                <h5 class="text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertTriangle class="w-4 h-4" />
                  已禁用供应商仍有关联
                </h5>
              </div>
              <div v-for="item in supplierIssues.inactiveLinkedSuppliers" :key="item.normalizedName" class="p-4 flex items-center justify-between">
                <div>
                  <div class="text-sm font-bold">{{ item.supplierName }}</div>
                  <div class="text-xs text-muted-foreground mt-1">关联物料：{{ item.linkedMaterialCount }}</div>
                </div>
                <Button variant="outline" size="sm" @click="openSupplier(item, 'materials')">处理</Button>
              </div>
              <div v-if="supplierIssues.inactiveLinkedSuppliers.length === 0" class="p-8 text-center text-sm text-muted-foreground italic">
                无此类异常记录
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent class="p-0 divide-y">
              <div class="p-4 bg-muted/20">
                <h5 class="text-xs font-bold flex items-center gap-2">
                  <Building2 class="w-4 h-4" />
                  需补充正式映射链接
                </h5>
              </div>
              <div v-for="item in supplierIssues.suppliersWithUnlinkedMaterials" :key="item.normalizedName" class="p-4 flex items-center justify-between">
                <div>
                  <div class="text-sm font-bold">{{ item.supplierName }}</div>
                  <div class="text-xs text-muted-foreground mt-1">待补：{{ item.materialCount }} · 已链：{{ item.linkedMaterialCount }}</div>
                </div>
                <Button variant="outline" size="sm" @click="openSupplier(item, 'diagnostics')">映射</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  </ResponsiveLayoutPage>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.15);
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.3);
}
</style>
