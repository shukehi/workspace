<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useProcurementStore } from '@/stores/useProcurementStore';
import { useToastStore } from '@/stores/useToastStore';
import DataTable from '@/components/data-table/DataTable.vue';
import { createColumns } from '@/components/procurement/ProcurementColumns';
import ProcurementSummaryCards from '@/components/procurement/ProcurementSummaryCards.vue';
import ProcurementFilterBar from '@/components/procurement/ProcurementFilterBar.vue';
import ProcurementBulkActionBar from '@/components/procurement/ProcurementBulkActionBar.vue';
import EditOrderDialog from '@/components/procurement/EditOrderDialog.vue';
import ProcurementPreviewModal from '@/components/procurement/ProcurementPreviewModal.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Plus,
  RefreshCcw,
  Trash2,
  Download,
  AlertTriangle
} from 'lucide-vue-next';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import type { Order } from '@/types/order';
import { useProcurementDialogs } from '@/features/procurement/useProcurementDialogs';
import { useProcurementPageState } from '@/features/procurement/useProcurementPageState';

const store = useProcurementStore();
const { toast } = useToastStore();

const statusLabels: Record<Order['status'], string> = {
  draft: '草稿',
  submitted: '已提交',
  processing: '处理中',
  completed: '已完成',
  cancelled: '已取消'
};

const {
  activeStatus,
  activeCategory,
  activeRiskFilter,
  searchQuery,
  selectedRows,
  summaryStats,
  statusOptions,
  categoryOptions,
  riskOptions,
  filteredOrders,
  visibleOrderCount,
  tableEmptyText,
  hasActiveFilters,
  resetFilters,
  setFilterPreset,
  onSelectionChange,
  clearSelection,
} = useProcurementPageState(store);

const handleSummaryFilter = (type: 'pending' | 'today' | 'completed' | 'total') => {
  resetFilters();
  if (type === 'pending') {
    // Note: We don't have a single status for 'pending', so we might just reset to ALL
    // or we could add a special filter for 'pending'.
    // For now, let's keep it simple and just show how it would work.
    // In a real scenario, we might set activeStatus to something if it was a single status.
  } else if (type === 'completed') {
    setFilterPreset({ status: 'completed' });
  } else if (type === 'today') {
    const today = new Date().toISOString().split('T')[0];
    setFilterPreset({ search: today }); // Rough way to filter by today if search includes date
  }
};

const {
  isEditDialogOpen,
  isPreviewDialogOpen,
  selectedOrder,
  editDialogMode,
  previewOrder,
  confirmState,
  openEdit,
  openPreview,
  openManualEntry,
  syncDraftForPreview,
  previewDraft,
  editFromPreview,
  requestDelete,
  requestBulkDelete,
} = useProcurementDialogs({
  store,
  toast,
});

const handleStatusUpdate = async (order: Order, status: Order['status']) => {
  try {
    await store.updateOrder(order.id, { status });
    toast({
      title: '状态更新成功',
      description: `订单 ${order.order_no} 已设为 ${statusLabels[status]}`,
      variant: 'success'
    });
  } catch {
    toast({ title: '更新失败', variant: 'destructive' });
  }
};

const handleBulkDelete = () => {
  requestBulkDelete(selectedRows.value, clearSelection);
};

const handleExport = () => {
  const dataToExport = selectedRows.value.length > 0 ? selectedRows.value : filteredOrders.value;
  store.exportToCSV(dataToExport);
  toast({
    title: '导出成功',
    description: `已准备好 ${dataToExport.length} 条数据的下载`,
    variant: 'success'
  });
};

const canBulkSubmit = computed(() => (
  selectedRows.value.length > 0
  && selectedRows.value.every((order) => order.status === 'draft')
));

const canBulkComplete = computed(() => (
  selectedRows.value.length > 0
  && selectedRows.value.every((order) => order.status === 'submitted' || order.status === 'processing')
));

const canBulkRestoreDraft = computed(() => (
  selectedRows.value.length > 0
  && selectedRows.value.every((order) => order.status === 'cancelled')
));

function isBulkStatusTransitionAllowed(status: Order['status']) {
  if (status === 'submitted') return canBulkSubmit.value;
  if (status === 'completed') return canBulkComplete.value;
  if (status === 'draft') return canBulkRestoreDraft.value;
  return false;
}

const handleBulkStatusUpdate = async (status: Order['status']) => {
  const count = selectedRows.value.length;
  if (!isBulkStatusTransitionAllowed(status)) {
    toast({
      title: '状态流转不允许',
      description: `当前所选订单不能批量设为${statusLabels[status]}`,
      variant: 'destructive',
    });
    return;
  }

  try {
    await store.bulkUpdateStatus(selectedRows.value.map(o => o.id), status);
    clearSelection();
    toast({ title: '批量更新成功', description: `${count} 张订单已设为 ${statusLabels[status]}`, variant: 'success' });
  } catch {
    toast({ title: '操作失败', variant: 'destructive' });
  }
};

const columns = createColumns({
  onEdit: openEdit,
  onDelete: requestDelete,
  onPreview: openPreview,
  onStatusUpdate: handleStatusUpdate
});

onMounted(() => {
  store.fetchOrders();
});
</script>

<template>
  <div class="h-full flex flex-col p-4 md:p-6 gap-4 bg-muted/20 relative overflow-hidden">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">采购管理</h2>
        <p class="text-muted-foreground mt-0.5 text-[11px] uppercase tracking-wider font-medium opacity-70">Procurement Operations Hub</p>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <Button variant="outline" size="sm" class="h-8 text-xs px-3" @click="store.fetchOrders()" :disabled="store.loading">
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
      :total-order-count="store.sortedOrders.length"
      :has-active-filters="hasActiveFilters"
      @reset="resetFilters"
    />

    <Card class="flex-1 min-h-0">
      <CardContent class="p-2 sm:p-4 h-full overflow-hidden">
        <p class="px-2 pb-2 text-[11px] text-muted-foreground md:hidden">表格可左右滑动查看更多列</p>
        <DataTable
          :columns="columns"
          :data="filteredOrders"
          :loading="store.loading"
          :enable-selection="true"
          :toolbar="false"
          :empty-text="tableEmptyText"
          :table-min-width="900"
          density="compact"
          @selection-change="onSelectionChange"
        />
      </CardContent>
    </Card>

    <ProcurementBulkActionBar
      :selected-count="selectedRows.length"
      :can-submit="canBulkSubmit"
      :can-complete="canBulkComplete"
      :can-restore-draft="canBulkRestoreDraft"
      @status="handleBulkStatusUpdate"
      @export="handleExport"
      @delete="handleBulkDelete"
      @clear="clearSelection"
    />

    <EditOrderDialog
      v-model:open="isEditDialogOpen"
      :order="selectedOrder"
      :mode="editDialogMode"
      @saved="store.fetchOrders()"
      @draft-change="syncDraftForPreview"
      @preview="previewDraft"
    />
    <ProcurementPreviewModal
      v-model:open="isPreviewDialogOpen"
      :order="previewOrder"
      @edit="editFromPreview"
    />

    <ConfirmDialog
      v-model:open="confirmState.show"
      :title="confirmState.title"
      :variant="confirmState.variant"
      :confirm-text="confirmState.confirmText"
      @confirm="confirmState.onConfirm"
    >
      <div v-html="confirmState.message"></div>
    </ConfirmDialog>
  </div>
</template>
