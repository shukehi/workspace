<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plus, LayoutGrid, Info, Activity, History } from 'lucide-vue-next';
import ResponsiveLayoutPage from '@/components/shared/ResponsiveLayoutPage.vue';
import MaterialDetailPanel from '@/features/master-data/components/MaterialDetailPanel.vue';
import MaterialDiagnosticsPanel from '@/features/master-data/components/MaterialDiagnosticsPanel.vue';
import MaterialEditDialog from '@/features/master-data/components/MaterialEditDialog.vue';
import MasterDataLifecyclePanel from '@/features/master-data/components/MasterDataLifecyclePanel.vue';
import MaterialListPanel from '@/features/master-data/components/MaterialListPanel.vue';
import MaterialSummaryCards from '@/features/master-data/components/MaterialSummaryCards.vue';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  type MaterialRecord,
  useMaterialManagementPageState,
} from '@/features/materials/composables/useMaterialManagementPageState';

const route = useRoute();
const router = useRouter();

const MATERIAL_DETAIL_TABS = ['basic', 'relationship', 'diagnostics', 'audit'] as const;
type MaterialDetailTab = typeof MATERIAL_DETAIL_TABS[number];

function normalizeMaterialTab(value: unknown): MaterialDetailTab {
  return typeof value === 'string' && MATERIAL_DETAIL_TABS.includes(value as MaterialDetailTab)
    ? (value as MaterialDetailTab)
    : 'basic';
}

const {
  materials,
  loading,
  searchQuery,
  profileDetail,
  referenceCheck,
  auditLogs,
  revisions,
  publishing,
  rollingBackRevision,
  supplierMasterOptions,
  relationshipHealth,
  actionableRelationshipGroups,
  isEditDialogOpen,
  editingMaterial,
  dialogTitle,
  fetchMaterials,
  openCreateDialog,
  openEditDialog,
  saveMaterial,
  autoRelinkMaterial,
  publishDraft,
  rollbackRevision,
} = useMaterialManagementPageState();

const selectedMaterialId = ref<number | null>(null);
const activeDetailTab = ref<MaterialDetailTab>(normalizeMaterialTab(route.query.tab));
const mainTab = ref('workbench');

const selectedMaterial = computed(() => (
  materials.value.find((item) => item.id === selectedMaterialId.value)
  ?? materials.value[0]
  ?? null
));

function syncRouteSelection(materialId: number | null, tab = activeDetailTab.value) {
  const nextQuery = {
    ...route.query,
    materialId: materialId ? String(materialId) : undefined,
    tab,
  };
  void router.replace({
    name: 'material-master',
    query: nextQuery,
  });
}

watch(() => route.query.tab, (nextTab) => {
  activeDetailTab.value = normalizeMaterialTab(nextTab);
}, { immediate: true });

watch([materials, () => route.query.materialId], ([nextMaterials, queryMaterialId]) => {
  if (!nextMaterials.length) {
    selectedMaterialId.value = null;
    return;
  }

  const requestedId = Number(queryMaterialId || 0);
  if (requestedId && nextMaterials.some((item) => item.id === requestedId)) {
    selectedMaterialId.value = requestedId;
    return;
  }

  if (!selectedMaterialId.value || !nextMaterials.some((item) => item.id === selectedMaterialId.value)) {
    selectedMaterialId.value = nextMaterials[0].id;
  }
}, { immediate: true });

watch(selectedMaterialId, (nextId) => {
  if (nextId && Number(route.query.materialId || 0) !== nextId) {
    syncRouteSelection(nextId);
  }
});

function handleMaterialSelect(material: MaterialRecord) {
  selectedMaterialId.value = material.id;
  syncRouteSelection(material.id);
}

function handleDetailTabChange(nextTab: string) {
  activeDetailTab.value = normalizeMaterialTab(nextTab);
  syncRouteSelection(selectedMaterialId.value, activeDetailTab.value);
}

function jumpToSupplierDetail(supplierMasterId: number) {
  void router.push({
    name: 'config-suppliers',
    query: {
      supplierId: String(supplierMasterId),
      tab: 'materials',
    },
  });
}
</script>

<template>
  <ResponsiveLayoutPage
    title="物料主数据管理"
    subtitle="Centralized Material Catalog & Sourcing"
  >
    <template #actions>
      <div v-if="referenceCheck?.hasIssues" class="hidden md:flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-[10px] text-amber-700 font-bold uppercase tracking-wider">
        <Activity class="w-3 h-3" />
        检测到引用异常
      </div>
      <Button variant="outline" size="sm" class="h-8 text-xs" @click="fetchMaterials" :disabled="loading">
        <RefreshCcw class="w-3.5 h-3.5 mr-1.5" :class="{ 'animate-spin': loading }" />
        刷新
      </Button>
      <Button size="sm" class="h-8 text-xs gap-1.5" @click="openCreateDialog">
        <Plus class="w-3.5 h-3.5" />
        新增物料
      </Button>
    </template>

    <template #filters>
      <div class="flex flex-col md:flex-row items-center gap-3">
        <div class="relative flex-1 w-full max-w-md">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input 
            v-model="searchQuery" 
            placeholder="搜索编码、名称、型号..." 
            class="pl-8 h-9 text-xs bg-background/50" 
            @keyup.enter="fetchMaterials" 
          />
        </div>
        <div v-if="profileDetail" class="hidden lg:flex items-center gap-4 px-4 py-1.5 rounded-lg border bg-muted/20 text-[10px] font-mono text-muted-foreground">
          <span>Profile: {{ profileDetail.profile.code }}</span>
          <span class="w-px h-3 bg-border" />
          <span>Workflow: {{ profileDetail.profile.workflowKind }}</span>
          <span class="w-px h-3 bg-border" />
          <span>Total: {{ profileDetail.collection.total }}</span>
        </div>
      </div>
    </template>

    <Tabs v-model="mainTab" class="w-full flex-1 flex flex-col min-h-0">
      <TabsList class="w-fit h-9 p-1 bg-muted/50 mb-4">
        <TabsTrigger value="workbench" class="text-xs gap-1.5">
          <LayoutGrid class="w-3.5 h-3.5" />
          数据工作台
        </TabsTrigger>
        <TabsTrigger value="governance" class="text-xs gap-1.5">
          <Activity class="w-3.5 h-3.5" />
          治理与 Lifecycle
        </TabsTrigger>
        <TabsTrigger value="diagnostics" class="text-xs gap-1.5">
          <Info class="w-3.5 h-3.5" />
          深度诊断
        </TabsTrigger>
      </TabsList>

      <TabsContent value="workbench" class="flex-1 min-h-0 data-[state=active]:flex flex-col gap-8 mt-0 overflow-auto custom-scrollbar pr-2">
        <!-- Top Section: Material Detail (Primary Focus) -->
        <div class="flex flex-col min-h-0">
          <div class="flex items-center gap-2 mb-3">
            <LayoutGrid class="w-4 h-4 text-primary" />
            <h3 class="text-sm font-bold uppercase tracking-widest">物料详情工作台</h3>
          </div>
          <MaterialDetailPanel
            :material="selectedMaterial"
            :active-tab="activeDetailTab"
            :audit-logs="auditLogs"
            :supplier-master-options="supplierMasterOptions"
            class="shadow-md border-primary/10"
            @open-edit="openEditDialog"
            @auto-relink="autoRelinkMaterial"
            @jump-to-supplier="jumpToSupplierDetail"
            @update:active-tab="handleDetailTabChange"
          />
        </div>

        <!-- Bottom Section: Material List (Selector) -->
        <div class="flex flex-col min-h-[400px] border rounded-xl bg-background shadow-sm overflow-hidden mb-6">
          <div class="p-3 border-b bg-muted/10 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold uppercase tracking-widest text-muted-foreground">物料名录库</span>
              <Badge variant="secondary" class="text-[10px] h-4">{{ materials.length }} Items</Badge>
            </div>
            <div class="text-[10px] text-muted-foreground italic">点击下方条目以更新上方详情</div>
          </div>
          <div class="flex-1 overflow-auto custom-scrollbar bg-muted/5">
            <MaterialListPanel
              :materials="materials"
              :selected-material-id="selectedMaterialId"
              :loading="loading"
              class="!border-0 !shadow-none"
              @select="handleMaterialSelect"
              @edit="openEditDialog"
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="governance" class="flex-1 min-h-0 space-y-6 mt-0 data-[state=active]:block overflow-auto custom-scrollbar pr-2">
        <div class="grid gap-6 xl:grid-cols-2 items-start">
          <Card class="shadow-sm">
            <CardContent class="p-6">
              <div class="flex items-center gap-2 mb-6">
                <Activity class="w-5 h-5 text-primary" />
                <h3 class="text-lg font-bold">健康摘要</h3>
              </div>
              <MaterialSummaryCards :health="relationshipHealth" class="!shadow-none !border-0 !p-0" />
            </CardContent>
          </Card>

          <Card class="shadow-sm">
            <CardContent class="p-6">
              <div class="flex items-center gap-2 mb-6">
                <History class="w-5 h-5 text-primary" />
                <h3 class="text-lg font-bold">版本与 Lifecycle</h3>
              </div>
              <MasterDataLifecyclePanel
                title="物料主数据 Lifecycle"
                :latest-revision="profileDetail?.latestRevision || null"
                :draft-revision="profileDetail?.draftRevision || null"
                :published-revision="profileDetail?.publishedRevision || null"
                :revisions="revisions"
                :publishing="publishing"
                :rolling-back-revision="rollingBackRevision"
                class="!shadow-none !border-0 !p-0"
                @publish="publishDraft()"
                @rollback="rollbackRevision"
              />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="diagnostics" class="flex-1 min-h-0 mt-0 data-[state=active]:block overflow-auto custom-scrollbar pr-2">
        <MaterialDiagnosticsPanel
          :reference-check="referenceCheck"
          :relationship-health="relationshipHealth"
          :actionable-groups="actionableRelationshipGroups"
          @auto-relink="autoRelinkMaterial"
          @open-edit="openEditDialog"
        />
      </TabsContent>
    </Tabs>

    <MaterialEditDialog
      :open="isEditDialogOpen"
      :model-value="editingMaterial"
      :title="dialogTitle"
      :supplier-master-options="supplierMasterOptions"
      @update:open="isEditDialogOpen = $event"
      @update:model-value="editingMaterial = $event"
      @save="saveMaterial"
    />
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
