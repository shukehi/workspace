<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ConfigCenterShell from '@/features/config-editor/components/ConfigCenterShell.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Plus } from 'lucide-vue-next';
import MaterialDetailPanel from '@/features/master-data/components/MaterialDetailPanel.vue';
import MaterialDiagnosticsPanel from '@/features/master-data/components/MaterialDiagnosticsPanel.vue';
import MaterialEditDialog from '@/features/master-data/components/MaterialEditDialog.vue';
import MasterDataLifecyclePanel from '@/features/master-data/components/MasterDataLifecyclePanel.vue';
import MaterialListPanel from '@/features/master-data/components/MaterialListPanel.vue';
import MaterialSummaryCards from '@/features/master-data/components/MaterialSummaryCards.vue';
import {
  type MaterialRecord,
  useMaterialManagementPageState,
} from '@/features/materials/composables/useMaterialManagementPageState';

const route = useRoute();
const router = useRouter();

const MATERIAL_DETAIL_TABS = ['basic', 'relationship', 'mappings', 'diagnostics', 'audit'] as const;
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
  materialMappings,
  materialMappingsMaterialId,
  materialMappingsLoading,
  materialMappingError,
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
  fetchMaterialMappings,
  createSupplierMapping,
  updateSupplierMapping,
  createCodeMapping,
  updateCodeMapping,
  createUomConversion,
  updateUomConversion,
  publishDraft,
  rollbackRevision,
} = useMaterialManagementPageState();

const selectedMaterialId = ref<number | null>(null);
const activeDetailTab = ref<MaterialDetailTab>(normalizeMaterialTab(route.query.tab));

const selectedMaterial = computed(() => (
  materials.value.find((item) => item.id === selectedMaterialId.value)
  ?? materials.value[0]
  ?? null
));

const selectedMaterialMappings = computed(() => (
  selectedMaterial.value && materialMappingsMaterialId.value === selectedMaterial.value.id
    ? materialMappings.value
    : null
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

watch(selectedMaterialId, (nextId) => {
  void fetchMaterialMappings(nextId);
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
  <ConfigCenterShell
    title="物料管理"
    description="维护系统基础物料信息、价格与供应商。"
  >
    <template #header-right>
      <Button @click="openCreateDialog">
        <Plus class="mr-2 h-4 w-4" /> 新增物料
      </Button>
    </template>

    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-base">页面上下文</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div v-if="profileDetail" class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div>profile: {{ profileDetail.profile.code }}</div>
          <div>workflow: {{ profileDetail.profile.workflowKind }}</div>
          <div>total: {{ profileDetail.collection.total }}</div>
        </div>
        <div v-if="referenceCheck" class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div>supplierRefs: {{ referenceCheck.supplierRefs.length }}</div>
          <div>materialRefs: {{ referenceCheck.materialCodeRefs.length }}</div>
          <div v-if="referenceCheck.hasIssues" class="text-amber-700">存在主数据引用问题</div>
        </div>
        <div class="flex flex-col gap-2 md:flex-row md:items-center">
          <div class="relative w-full max-w-sm">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input v-model="searchQuery" placeholder="搜索物料编码、名称..." class="pl-8" @keyup.enter="fetchMaterials" />
          </div>
          <Button variant="outline" @click="fetchMaterials">搜索</Button>
        </div>
      </CardContent>
    </Card>

    <section class="space-y-3">
      <div>
        <h3 class="text-lg font-semibold">工作台</h3>
        <p class="text-sm text-muted-foreground">优先在列表与详情之间完成定位、修复与检查。</p>
      </div>
      <div class="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.95fr)] items-start">
        <MaterialListPanel
          :materials="materials"
          :selected-material-id="selectedMaterialId"
          :loading="loading"
          @select="handleMaterialSelect"
          @edit="openEditDialog"
        />

        <MaterialDetailPanel
          :material="selectedMaterial"
          :active-tab="activeDetailTab"
          :audit-logs="auditLogs"
          :supplier-master-options="supplierMasterOptions"
          :mappings="selectedMaterialMappings"
          :mappings-loading="materialMappingsLoading"
          :mapping-error="materialMappingError"
          @open-edit="openEditDialog"
          @auto-relink="autoRelinkMaterial"
          @jump-to-supplier="jumpToSupplierDetail"
          @update:active-tab="handleDetailTabChange"
          @refresh-mappings="fetchMaterialMappings"
          @create-supplier-mapping="createSupplierMapping"
          @update-supplier-mapping="updateSupplierMapping"
          @create-code-mapping="createCodeMapping"
          @update-code-mapping="updateCodeMapping"
          @create-uom-conversion="createUomConversion"
          @update-uom-conversion="updateUomConversion"
        />
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] items-start">
      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold">治理概览</h3>
          <p class="text-sm text-muted-foreground">用摘要快速判断当前物料主数据的治理压力与规模。</p>
        </div>
        <MaterialSummaryCards :health="relationshipHealth" />
      </div>

      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold">Lifecycle</h3>
          <p class="text-sm text-muted-foreground">在进入发布或回滚前，先确认 draft / published 版本关系。</p>
        </div>
        <MasterDataLifecyclePanel
          title="物料主数据 Lifecycle"
          :latest-revision="profileDetail?.latestRevision || null"
          :draft-revision="profileDetail?.draftRevision || null"
          :published-revision="profileDetail?.publishedRevision || null"
          :revisions="revisions"
          :publishing="publishing"
          :rolling-back-revision="rollingBackRevision"
          @publish="publishDraft()"
          @rollback="rollbackRevision"
        />
      </div>
    </section>

    <section class="space-y-3">
      <div>
        <h3 class="text-lg font-semibold">诊断与修复建议</h3>
        <p class="text-sm text-muted-foreground">当工作台已定位对象后，再利用下方诊断区聚焦处理批量异常与引用问题。</p>
      </div>
      <MaterialDiagnosticsPanel
        :reference-check="referenceCheck"
        :relationship-health="relationshipHealth"
        :actionable-groups="actionableRelationshipGroups"
        @auto-relink="autoRelinkMaterial"
        @open-edit="openEditDialog"
      />
    </section>

    <MaterialEditDialog
      :open="isEditDialogOpen"
      :model-value="editingMaterial"
      :title="dialogTitle"
      :supplier-master-options="supplierMasterOptions"
      @update:open="isEditDialogOpen = $event"
      @update:model-value="editingMaterial = $event"
      @save="saveMaterial"
    />
  </ConfigCenterShell>
</template>
