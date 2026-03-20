<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useRoute, useRouter } from 'vue-router';
import { useProcurementStore } from '@/stores/useProcurementStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useToastStore } from '@/stores/useToastStore';
import DataTable from '@/components/data-table/DataTable.vue';
import { createColumns } from '@/components/procurement/ProcurementColumns';
import ProcurementSummaryCards from '@/components/procurement/ProcurementSummaryCards.vue';
import ProcurementFilterBar from '@/components/procurement/ProcurementFilterBar.vue';
import ProcurementBulkActionBar from '@/components/procurement/ProcurementBulkActionBar.vue';
import EditOrderDialog from '@/components/procurement/EditOrderDialog.vue';
import ProcurementPreviewModal from '@/components/procurement/ProcurementPreviewModal.vue';
import ProcurementStockInDialog from '@/components/procurement/ProcurementStockInDialog.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, RefreshCcw, Download } from 'lucide-vue-next';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import type { Order } from '@/types/order';
import { useProcurementDialogs } from '@/features/procurement/useProcurementDialogs';
import { useProcurementPageState } from '@/features/procurement/useProcurementPageState';
import { useProcurementRouteQuery } from '@/features/procurement/composables/useProcurementRouteQuery';
import { useOrderActions } from '@/features/procurement/composables/useOrderActions';
import { useStockInQueue } from '@/features/procurement/composables/useStockInQueue';
import { useProcurementBulkActions } from '@/features/procurement/composables/useProcurementBulkActions';
import { SIGNALS } from '@/shared/constants/storage';

const PROCUREMENT_REFRESH_SIGNAL_KEY = SIGNALS.PROCUREMENT_REFRESH;

const store = useProcurementStore();
const inventoryStore = useInventoryStore();
const { toast } = useToastStore();
const route = useRoute();
const router = useRouter();

const {
  activeStatus, activeCategory, activeRiskFilter, activeCreatedDate,
  searchQuery, selectedRows, summaryStats, statusOptions, categoryOptions, riskOptions,
  filteredOrders, visibleOrderCount, tableEmptyText, hasActiveFilters,
  resetFilters, setFilterPreset, onSelectionChange, clearSelection,
} = useProcurementPageState(store);

const actions = useOrderActions({
  toast,
  onRefresh: () => store.fetchOrders(buildProcurementQuery()),
  onClearSelection: clearSelection
});

const debouncedSearchQuery = refDebounced(searchQuery, 300);
const {
  procurementPage, procurementPageSize, syncSearchQueryFromRoute,
  syncProcurementFiltersFromRoute, updateProcurementRouteQuery, buildProcurementQuery,
} = useProcurementRouteQuery(route, router, {
  activeStatus, activeCategory, activeRiskFilter, activeCreatedDate, searchQuery,
});

async function loadProcurementOrders() {
  await store.fetchOrders(buildProcurementQuery());
}

const handleSummaryFilter = (type: 'pending' | 'today' | 'completed' | 'total') => {
  resetFilters();
  if (type === 'pending') setFilterPreset({ status: 'PENDING' });
  else if (type === 'completed') setFilterPreset({ status: 'completed' });
  else if (type === 'today') setFilterPreset({ createdDate: new Date().toISOString().split('T')[0] });
  procurementPage.value = 1;
};

const {
  isEditDialogOpen, isPreviewDialogOpen, selectedOrder, editDialogMode,
  previewOrder, canEditOrder, confirmState, openEdit, openPreview,
  openManualEntry, syncDraftForPreview, previewDraft, editFromPreview,
  requestDelete, requestBulkDelete,
} = useProcurementDialogs({ store, toast });

const {
  stockInOrder, stockInDialogOpen, stockInSaving, stockInQueue,
  stockInQueueIndex, stockInQueueCompletedCount,
  openStockInDialog, openStockInQueue, handleStockInDialogOpenChange, handleStockInOrder,
} = useStockInQueue({ store, toast, loadOrders: loadProcurementOrders, clearSelection });

const {
  canBulkSubmit, canBulkProcess, canBulkArrive, canBulkStockIn, canBulkRestoreDraft,
  handleBulkDelete, handleBulkStatusUpdate, handleBulkArrive,
} = useProcurementBulkActions({ store, toast, selectedRows, loadOrders: loadProcurementOrders, clearSelection, requestBulkDelete });

const handleExport = async () => {
  try {
    const dataToExport = selectedRows.value.length > 0 ? selectedRows.value : filteredOrders.value;
    const rows = selectedRows.value.length > 0 ? dataToExport : await store.fetchAllOrders(buildProcurementQuery());
    store.exportToCSV(rows);
    toast({ title: '导出成功', description: `已准备好 ${rows.length} 条数据的下载`, variant: 'success' });
  } catch {
    toast({ title: '导出失败', description: '无法获取完整的结果', variant: 'destructive' });
  }
};

const handleViewReceipts = async (order: Order) => {
  await router.push({ name: 'inventory', query: { orderNo: order.order_no } });
};

const columns = createColumns({
  onEdit: openEdit,
  onDelete: requestDelete,
  onPreview: openPreview,
  onPrint: (o) => actions.performPrint(o),
  onExportPdf: (o) => actions.performExportPdf(o),
  onViewReceipts: handleViewReceipts,
  onMarkArrived: (o) => actions.markArrived(o),
  onStockIn: openStockInDialog,
  onStatusUpdate: (o, s) => actions.updateStatus(o, s)
});

onMounted(() => {
  syncProcurementFiltersFromRoute();
  syncSearchQueryFromRoute();
  loadProcurementOrders().catch(() => undefined);
  inventoryStore.fetchInventoryLocations().catch(() => undefined);
  window.addEventListener('storage', handleProcurementRefreshSignal);
});

watch(() => [route.query.orderNo, route.query.status, route.query.category, route.query.risk, route.query.createdDate, route.query.search, route.query.page, route.query.pageSize], () => {
  syncProcurementFiltersFromRoute(); syncSearchQueryFromRoute();
  loadProcurementOrders().catch(() => undefined);
});

watch([activeStatus, activeCategory, activeRiskFilter, activeCreatedDate, debouncedSearchQuery], () => {
  procurementPage.value = 1; updateProcurementRouteQuery();
});

watch([procurementPage, procurementPageSize], () => updateProcurementRouteQuery());

onBeforeUnmount(() => window.removeEventListener('storage', handleProcurementRefreshSignal));

function handleProcurementRefreshSignal(e: StorageEvent) {
  if (e.key === PROCUREMENT_REFRESH_SIGNAL_KEY && e.newValue) loadProcurementOrders().catch(() => undefined);
}
</script>

<template>
  <div class="h-full flex flex-col p-4 md:p-6 gap-4 bg-muted/20 relative overflow-hidden">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">采购管理</h2>
        <p class="text-muted-foreground mt-0.5 text-[11px] uppercase tracking-wider font-medium opacity-70">Procurement Operations Hub</p>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <Button variant="outline" size="sm" class="h-8 text-xs px-3" @click="loadProcurementOrders()" :disabled="store.loading">
          <RefreshCcw class="w-3.5 h-3.5 mr-1.5" :class="{ 'animate-spin': store.loading }" />
          刷新
        </Button>
        <Button variant="outline" size="sm" class="h-8 text-xs px-3" @click="handleExport">
          <Download class="w-3.5 h-3.5 mr-1.5" />
          导出
        </Button>
        <Button size="sm" variant="secondary" class="h-8 text-xs px-3" @click="openManualEntry">
          <Plus class="w-3.5 h-3.5 mr-1.5" />
          录入
        </Button>
      </div>
    </div>

    <ProcurementSummaryCards
      :total-amount="summaryStats.totalAmount"
      :pending-count="summaryStats.pendingCount"
      :today-count="summaryStats.todayCount"
      :completed-count="summaryStats.completedCount"
      @filter="handleSummaryFilter"
    />

    <ProcurementFilterBar
      v-model:active-status="activeStatus"
      v-model:active-category="activeCategory"
      v-model:active-risk-filter="activeRiskFilter"
      v-model:search-query="searchQuery"
      :status-options="statusOptions"
      :category-options="categoryOptions"
      :risk-options="riskOptions"
      :visible-order-count="visibleOrderCount"
      :total-order-count="store.ordersTotal || store.sortedOrders.length"
      :has-active-filters="hasActiveFilters"
      @reset="resetFilters"
    />

    <p v-if="route.query.orderNo" class="text-xs text-cyan-700 bg-cyan-50 border border-cyan-200 rounded px-3 py-2">
      当前按订单号 <span class="font-semibold">{{ route.query.orderNo }}</span> 定位采购单
    </p>

    <Card class="flex-1 min-h-0">
      <CardContent class="p-2 sm:p-4 h-full overflow-hidden">
        <DataTable
          :columns="columns" :data="filteredOrders" :loading="store.loading" :enable-selection="true"
          :toolbar="false" :empty-text="tableEmptyText" :table-min-width="1240"
          :manual-pagination="store.serverPaginationEnabled" :page="store.ordersPage" :page-size="store.ordersPageSize" :total="store.ordersTotal"
          :page-size-options="[20, 50, 100]"
          density="compact"
          @page-change="procurementPage = $event" @page-size-change="procurementPageSize = $event" @selection-change="onSelectionChange"
        />
      </CardContent>
    </Card>

    <ProcurementBulkActionBar
      :selected-count="selectedRows.length"
      :can-submit="canBulkSubmit" :can-process="canBulkProcess" :can-arrive="canBulkArrive" :can-stock-in="canBulkStockIn" :can-restore-draft="canBulkRestoreDraft"
      @status="handleBulkStatusUpdate" @arrive="handleBulkArrive" @stock-in="openStockInQueue(selectedRows)" @export="handleExport" @delete="handleBulkDelete" @clear="clearSelection"
    />

    <EditOrderDialog v-model:open="isEditDialogOpen" :order="selectedOrder" :mode="editDialogMode" @saved="loadProcurementOrders()" @draft-change="syncDraftForPreview" @preview="previewDraft" />
    <ProcurementPreviewModal v-model:open="isPreviewDialogOpen" :order="previewOrder" :can-edit="canEditOrder(previewOrder)" @edit="editFromPreview" />
    <ProcurementStockInDialog
      :open="stockInDialogOpen"
      :order="stockInOrder"
      :saving="stockInSaving"
      :queue-index="stockInQueueIndex + 1"
      :queue-total="stockInQueue.length || 1"
      :warehouses="inventoryStore.warehouses"
      :locations="inventoryStore.activeLocations"
      :locations-loading="inventoryStore.locationsLoading"
      @update:open="handleStockInDialogOpenChange"
      @submit="handleStockInOrder"
    />
    <ConfirmDialog v-model:open="confirmState.show" :title="confirmState.title" :variant="confirmState.variant" :confirm-text="confirmState.confirmText" @confirm="confirmState.onConfirm">
      <div v-html="confirmState.message"></div>
    </ConfirmDialog>
  </div>
</template>
