<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-vue-next';
import ConfigCenterShell from '@/features/config-editor/components/ConfigCenterShell.vue';
import MasterDataLifecyclePanel from '@/features/master-data/components/MasterDataLifecyclePanel.vue';
import SupplierDetailPanel from '@/features/master-data/components/SupplierDetailPanel.vue';
import SupplierDiagnosticsPanel from '@/features/master-data/components/SupplierDiagnosticsPanel.vue';
import SupplierEditDialog from '@/features/master-data/components/SupplierEditDialog.vue';
import SupplierListPanel from '@/features/master-data/components/SupplierListPanel.vue';
import SupplierSummaryCards from '@/features/master-data/components/SupplierSummaryCards.vue';
import { useSupplierMaster } from '@/features/master-data/composables/useSupplierMaster';
import type { SupplierMasterEntry } from '@/services/mappingConfigApi';

const route = useRoute();
const router = useRouter();

const SUPPLIER_DETAIL_TABS = ['basic', 'materials', 'diagnostics', 'audit'] as const;
type SupplierDetailTab = typeof SUPPLIER_DETAIL_TABS[number];

function normalizeSupplierTab(value: unknown): SupplierDetailTab {
  return typeof value === 'string' && SUPPLIER_DETAIL_TABS.includes(value as SupplierDetailTab)
    ? (value as SupplierDetailTab)
    : 'basic';
}

const {
  loading,
  saving,
  loadError,
  searchQuery,
  filteredItems,
  relationshipHealth,
  actionableRelationshipGroups,
  auditTrendSummary,
  profileDetail,
  auditLogs,
  revisions,
  publishing,
  rollingBackRevision,
  linkedMaterials,
  selectedSupplier,
  linkedMaterialsLoading,
  isEditDialogOpen,
  editingItem,
  dialogTitle,
  load,
  openCreateDialog,
  openEditDialog,
  saveItem,
  archiveItem,
  loadLinkedMaterials,
  publishDraft,
  rollbackRevision,
} = useSupplierMaster();

const activeDetailTab = ref<SupplierDetailTab>(normalizeSupplierTab(route.query.tab));

onMounted(() => {
  load();
});

const selectedSupplierId = computed(() => Number(selectedSupplier.value?.id || 0) || null);

function syncRouteSelection(supplierId: number | null, tab = activeDetailTab.value) {
  void router.replace({
    name: 'config-suppliers',
    query: {
      ...route.query,
      supplierId: supplierId ? String(supplierId) : undefined,
      tab,
    },
  });
}

watch(() => route.query.tab, (nextTab) => {
  activeDetailTab.value = normalizeSupplierTab(nextTab);
}, { immediate: true });

watch(filteredItems, (items) => {
  if (!items.length) {
    return;
  }

  const requestedId = Number(route.query.supplierId || 0);
  if (requestedId) {
    const requestedItem = items.find((item) => Number(item.id || 0) === requestedId);
    if (requestedItem?.id && Number(selectedSupplier.value?.id || 0) !== requestedId) {
      void loadLinkedMaterials(Number(requestedItem.id), requestedItem);
      return;
    }
  }

  const currentSelectedId = Number(selectedSupplier.value?.id || 0);
  if (currentSelectedId && items.some((item) => Number(item.id || 0) === currentSelectedId)) {
    return;
  }

  const firstPersisted = items.find((item) => item.id);
  if (firstPersisted?.id) {
    void loadLinkedMaterials(Number(firstPersisted.id), firstPersisted);
  }
}, { immediate: true });

watch(selectedSupplierId, (nextId) => {
  if (nextId && Number(route.query.supplierId || 0) !== nextId) {
    syncRouteSelection(nextId);
  }
});

function handleSupplierSelect(item: SupplierMasterEntry) {
  if (item.id) {
    void loadLinkedMaterials(Number(item.id), item);
    syncRouteSelection(Number(item.id));
  }
}

function handleDetailTabChange(nextTab: string) {
  activeDetailTab.value = normalizeSupplierTab(nextTab);
  syncRouteSelection(selectedSupplierId.value, activeDetailTab.value);
}

function jumpToMaterialDetail(item: { id: number }) {
  void router.push({
    name: 'material-master',
    query: {
      materialId: String(item.id),
      tab: 'relationship',
    },
  });
}
</script>

<template>
  <ConfigCenterShell
    title="供应商主数据"
    description="维护系统供应商主数据与物料关联视图。"
  >
    <template #header-right>
      <Button @click="openCreateDialog">
        <Plus class="mr-2 h-4 w-4" /> 新增供应商
      </Button>
    </template>

    <Card v-if="profileDetail">
      <CardContent class="p-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div>profile: {{ profileDetail.profile.code }}</div>
        <div>workflow: {{ profileDetail.profile.workflowKind }}</div>
        <div>total: {{ profileDetail.collection.total }}</div>
      </CardContent>
    </Card>

    <SupplierSummaryCards :health="relationshipHealth" />



    <MasterDataLifecyclePanel
      title="供应商主数据 Lifecycle"
      :latest-revision="profileDetail?.latestRevision || null"
      :draft-revision="profileDetail?.draftRevision || null"
      :published-revision="profileDetail?.publishedRevision || null"
      :revisions="revisions"
      :publishing="publishing"
      :rolling-back-revision="rollingBackRevision"
      @publish="publishDraft()"
      @rollback="rollbackRevision"
    />

    <SupplierDiagnosticsPanel
      :relationship-health="relationshipHealth"
      :actionable-groups="actionableRelationshipGroups"
      @view-linked-materials="handleSupplierSelect"
      @open-edit="openEditDialog"
    />

    <Card>
      <CardContent class="p-4 flex items-center gap-3">
        <Input v-model="searchQuery" placeholder="搜索供应商或来源..." class="flex-1 min-w-0" />
      </CardContent>
    </Card>

    <Card v-if="loadError">
      <CardContent class="p-4 text-sm text-destructive">{{ loadError }}</CardContent>
    </Card>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,1fr)] items-start">
      <SupplierListPanel
        :items="filteredItems"
        :selected-supplier-id="selectedSupplierId"
        :loading="loading"
        @select="handleSupplierSelect"
        @edit="openEditDialog"
        @view-linked-materials="handleSupplierSelect"
        @archive="archiveItem"
      />

      <SupplierDetailPanel
        :supplier="selectedSupplier"
        :active-tab="activeDetailTab"
        :linked-materials="linkedMaterials"
        :linked-materials-loading="linkedMaterialsLoading"
        :audit-logs="auditLogs"
        :audit-trend-summary="auditTrendSummary"
        @open-edit="openEditDialog"
        @view-linked-materials="handleSupplierSelect"
        @jump-to-material="jumpToMaterialDetail"
        @update:active-tab="handleDetailTabChange"
      />
    </div>

    <SupplierEditDialog
      :open="isEditDialogOpen"
      :model-value="editingItem"
      :title="dialogTitle"
      :saving="saving"
      @update:open="isEditDialogOpen = $event"
      @update:model-value="editingItem = $event"
      @save="saveItem"
    />
  </ConfigCenterShell>
</template>
