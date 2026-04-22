<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        <div class="flex flex-col gap-2 md:flex-row md:items-center">
          <Input v-model="searchQuery" placeholder="搜索供应商或来源..." class="w-full max-w-sm" />
        </div>
      </CardContent>
    </Card>

    <section class="space-y-3">
      <div>
        <h3 class="text-lg font-semibold">工作台</h3>
        <p class="text-sm text-muted-foreground">优先在供应商列表与详情之间完成定位、关联查看与修复。</p>
      </div>
      <div v-if="loadError" class="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {{ loadError }}
      </div>
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
    </section>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] items-start">
      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold">治理概览</h3>
          <p class="text-sm text-muted-foreground">快速判断供应商主数据的整体状态与关联压力。</p>
        </div>
        <SupplierSummaryCards :health="relationshipHealth" />
      </div>

      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold">Lifecycle</h3>
          <p class="text-sm text-muted-foreground">确认供应商主数据的 draft / published 关系，再执行发布或回滚。</p>
        </div>
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
      </div>
    </section>

    <section class="space-y-3">
      <div>
        <h3 class="text-lg font-semibold">诊断与修复建议</h3>
        <p class="text-sm text-muted-foreground">把关系健康与需补链对象放在工作台之后，避免和主操作区抢视觉重心。</p>
      </div>
      <SupplierDiagnosticsPanel
        :relationship-health="relationshipHealth"
        :actionable-groups="actionableRelationshipGroups"
        @view-linked-materials="handleSupplierSelect"
        @open-edit="openEditDialog"
      />
    </section>

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
