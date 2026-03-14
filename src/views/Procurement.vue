<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useRoute, useRouter } from 'vue-router';
import { useProcurementStore } from '@/stores/useProcurementStore';
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
import { API_ERROR_CODES } from '@/shared/constants/api';
import { ORDER_STATUS_LABELS } from '@/shared/constants/order';
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
import { api } from '@/lib/api';
import { hasValidDeliveryDate } from '@/features/procurement/useProcurementPreview';
import { prepareOrderDraft } from '@/features/procurement/prepareOrderDraft';
import { buildPurchaseOrderPdfFilename } from '@/features/procurement/pdfFilename';
import { hasRemainingStockInItems } from '@/features/procurement/stockInEligibility';
import { useProcurementRouteQuery } from '@/features/procurement/composables/useProcurementRouteQuery';

const PROCUREMENT_REFRESH_SIGNAL_KEY = 'procurement-orders-refresh-signal';

const store = useProcurementStore();
const { toast } = useToastStore();
const route = useRoute();
const router = useRouter();
const stockInOrder = ref<Order | null>(null);
const stockInDialogOpen = ref(false);
const stockInSaving = ref(false);
const stockInQueue = ref<Order[]>([]);
const stockInQueueIndex = ref(0);

const {
  activeStatus,
  activeCategory,
  activeRiskFilter,
  activeCreatedDate,
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

const debouncedSearchQuery = refDebounced(searchQuery, 300);
const {
  procurementPage,
  procurementPageSize,
  syncSearchQueryFromRoute,
  syncProcurementFiltersFromRoute,
  updateProcurementRouteQuery,
  buildProcurementQuery,
} = useProcurementRouteQuery(route, router, {
  activeStatus,
  activeCategory,
  activeRiskFilter,
  activeCreatedDate,
  searchQuery,
});

async function loadProcurementOrders() {
  await store.fetchOrders(buildProcurementQuery());
}

const handleSummaryFilter = (type: 'pending' | 'today' | 'completed' | 'total') => {
  resetFilters();
  if (type === 'pending') {
    setFilterPreset({ status: 'PENDING' });
  } else if (type === 'completed') {
    setFilterPreset({ status: 'completed' });
  } else if (type === 'today') {
    const today = new Date().toISOString().split('T')[0];
    setFilterPreset({ createdDate: today });
  }
  procurementPage.value = 1;
};

const {
  isEditDialogOpen,
  isPreviewDialogOpen,
  selectedOrder,
  editDialogMode,
  previewOrder,
  canEditOrder,
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
    await loadProcurementOrders();
    toast({
      title: '状态更新成功',
      description: `订单 ${order.order_no} 已设为 ${ORDER_STATUS_LABELS[status]}`,
      variant: 'success'
    });
  } catch {
    toast({ title: '更新失败', variant: 'destructive' });
  }
};

const handleMarkArrived = async (order: Order) => {
  try {
    await store.markOrderArrived(order.id, {
      arrived_at: new Date().toISOString(),
    });
    await loadProcurementOrders();
    toast({
      title: '到货登记成功',
      description: `订单 ${order.order_no} 已设为 ${ORDER_STATUS_LABELS.arrived}`,
      variant: 'success'
    });
  } catch {
    toast({ title: '到货登记失败', variant: 'destructive' });
  }
};

const handleBulkDelete = () => {
  requestBulkDelete(selectedRows.value, clearSelection);
};

const handlePrintOrder = async (order: Order) => {
  const printableOrder = prepareOrderDraft(order);
  if (!hasValidDeliveryDate(printableOrder)) {
    const confirmed = window.confirm('当前订单未设置交货日期，是否继续打印/导出 PDF？');
    if (!confirmed) return;
  }

  try {
    const payload = {
      poNumber: printableOrder.order_no,
      category: printableOrder.category || '',
      printMode: 'signature',
      order: printableOrder,
    };
    const result = await api.post<{ snapshotId?: string }>('/print/snapshots', payload);
    const snapshotId = String(result?.snapshotId || '').trim();
    if (!snapshotId) {
      throw new Error('快照创建失败');
    }

    window.open(
      `/print-document?snapshotId=${encodeURIComponent(snapshotId)}&printMode=signature&autoPrint=1&t=${Date.now()}`,
      '_blank',
      'noopener,noreferrer'
    );
  } catch (error) {
    console.error('Open print window failed', error);
    toast({
      title: '打印失败',
      description: '无法生成打印预览',
      variant: 'destructive'
    });
  }
};

const handleExportPdfOrder = async (order: Order) => {
  const exportableOrder = prepareOrderDraft(order);
  if (!hasValidDeliveryDate(exportableOrder)) {
    const confirmed = window.confirm('当前订单未设置交货日期，是否继续打印/导出 PDF？');
    if (!confirmed) return;
  }

  try {
    await api.downloadPDF('/pdf/generate', {
      poNumber: exportableOrder.order_no,
      category: exportableOrder.category || '',
      printMode: 'signature',
      order: exportableOrder,
    }, buildPurchaseOrderPdfFilename(exportableOrder));

    toast({
      title: '导出成功',
      description: `已导出 ${buildPurchaseOrderPdfFilename(exportableOrder)}`,
      variant: 'success'
    });
  } catch (error) {
    console.error('Export PDF failed', error);
    toast({
      title: '导出失败',
      description: '请稍后重试',
      variant: 'destructive'
    });
  }
};

const handleExport = async () => {
  try {
    const dataToExport = selectedRows.value.length > 0 ? selectedRows.value : filteredOrders.value;
    const rows = selectedRows.value.length > 0
      ? dataToExport
      : await store.fetchAllOrders(buildProcurementQuery());
    store.exportToCSV(rows);
    toast({
      title: '导出成功',
      description: `已准备好 ${rows.length} 条数据的下载`,
      variant: 'success'
    });
  } catch {
    toast({
      title: '导出失败',
      description: '无法获取完整的采购订单结果，请稍后重试',
      variant: 'destructive'
    });
  }
};

const handleViewReceipts = async (order: Order) => {
  await router.push({
    name: 'inventory',
    query: {
      orderNo: order.order_no,
    }
  });
};

const openStockInDialog = (order: Order) => {
  if (!hasRemainingStockInItems(order)) {
    toast({
      title: '当前订单没有可继续入库的明细',
      description: `订单 ${order.order_no} 的明细已全部完成入库`,
      variant: 'destructive'
    });
    return;
  }
  stockInOrder.value = order;
  stockInDialogOpen.value = true;
};

const openStockInQueue = (orders: Order[]) => {
  const queue = orders.filter((order) => hasRemainingStockInItems(order));
  if (queue.length === 0) {
    toast({
      title: '当前订单没有可继续入库的明细',
      description: '所选订单均已无剩余待入库明细',
      variant: 'destructive'
    });
    return;
  }
  stockInQueue.value = queue;
  stockInQueueIndex.value = 0;
  stockInOrder.value = queue[0];
  stockInDialogOpen.value = true;
};

function resetStockInFlow() {
  stockInDialogOpen.value = false;
  stockInOrder.value = null;
  stockInQueue.value = [];
  stockInQueueIndex.value = 0;
}

function handleStockInDialogOpenChange(open: boolean) {
  if (open) {
    stockInDialogOpen.value = true;
    return;
  }

  if (stockInSaving.value) return;

  const remaining = stockInQueue.value.length > 0
    ? Math.max(stockInQueue.value.length - stockInQueueIndex.value, 0)
    : 0;
  if (remaining > 0) {
    toast({
      title: '批量入库已中止',
      description: `仍有 ${remaining} 张订单未处理`,
      variant: 'destructive'
    });
  }
  resetStockInFlow();
}

const handleStockInOrder = async (payload?: {
  stocked_in_at?: string;
  operator?: string;
  remark?: string;
  items?: { order_item_id: number; item_key: string; quantity: number }[];
}) => {
  if (!stockInOrder.value) return;
  const currentOrder = stockInOrder.value;
  stockInSaving.value = true;
  try {
    const updated = await store.stockInOrder(currentOrder.id, payload || {
      stocked_in_at: new Date().toISOString(),
    });
    const isCompleted = updated.status === 'completed';
    const queueActive = stockInQueue.value.length > 1;
    const hasNext = queueActive && stockInQueueIndex.value < stockInQueue.value.length - 1;

    if (hasNext) {
      await loadProcurementOrders();
      stockInQueueIndex.value += 1;
      stockInOrder.value = stockInQueue.value[stockInQueueIndex.value];
      toast({
        title: isCompleted ? '入库完成，进入下一单' : '部分入库成功，进入下一单',
        description: `已完成 ${stockInQueueIndex.value} / ${stockInQueue.value.length}，当前订单 ${updated.order_no}`,
        variant: 'success'
      });
      return;
    }

    const finishedCount = queueActive ? stockInQueue.value.length : 1;
    const completedCount = queueActive
      ? stockInQueue.value.filter((order) => order.id !== updated.id && !hasRemainingStockInItems(order)).length + (isCompleted ? 1 : 0)
      : (isCompleted ? 1 : 0);
    const pendingCount = Math.max(finishedCount - completedCount, 0);
    if (queueActive) {
      clearSelection();
    }
    await loadProcurementOrders();
    toast({
      title: queueActive
        ? (pendingCount > 0 ? '批量入库流程已完成' : '批量入库已完成')
        : (isCompleted ? '入库完成' : '部分入库成功'),
      description: queueActive
        ? (pendingCount > 0
          ? `${completedCount} 张已完成入库，${pendingCount} 张仍有明细待入库`
          : `${finishedCount} 张订单已完成入库`)
        : (isCompleted
          ? `订单 ${updated.order_no} 已设为 ${ORDER_STATUS_LABELS.completed}`
          : `订单 ${updated.order_no} 仍有明细待入库`),
      variant: 'success'
    });
    resetStockInFlow();
  } catch (error: any) {
    const errorCode = String(error?.response?.data?.error || '');
    if (errorCode === API_ERROR_CODES.materialNotFound) {
      toast({
        title: '入库失败',
        description: `存在未匹配库存物料：${error?.response?.data?.materialId || '-'}`,
        variant: 'destructive'
      });
      return;
    }
    if (errorCode === API_ERROR_CODES.orderItemsRequired) {
      toast({
        title: '入库失败',
        description: '请至少填写一条本次入库明细',
        variant: 'destructive'
      });
      return;
    }
    if (errorCode === API_ERROR_CODES.receivedQuantityExceeded) {
      toast({
        title: '入库失败',
        description: '本次入库数量超过剩余待入库数量',
        variant: 'destructive'
      });
      return;
    }
    toast({ title: '入库失败', variant: 'destructive' });
  } finally {
    stockInSaving.value = false;
  }
};

const canBulkSubmit = computed(() => (
  selectedRows.value.length > 0
  && selectedRows.value.every((order) => order.status === 'draft')
));

const canBulkProcess = computed(() => (
  selectedRows.value.length > 0
  && selectedRows.value.every((order) => order.status === 'submitted')
));

const canBulkArrive = computed(() => (
  selectedRows.value.length > 0
  && selectedRows.value.every((order) => order.status === 'processing')
));

const canBulkStockIn = computed(() => (
  selectedRows.value.length > 0
  && selectedRows.value.every((order) => order.status === 'arrived' && hasRemainingStockInItems(order))
));

const canBulkRestoreDraft = computed(() => (
  selectedRows.value.length > 0
  && selectedRows.value.every((order) => order.status === 'cancelled')
));

function isBulkStatusTransitionAllowed(status: Order['status']) {
  if (status === 'submitted') return canBulkSubmit.value;
  if (status === 'processing') return canBulkProcess.value;
  if (status === 'draft') return canBulkRestoreDraft.value;
  return false;
}

const handleBulkStatusUpdate = async (status: Order['status']) => {
  const count = selectedRows.value.length;
  if (!isBulkStatusTransitionAllowed(status)) {
    toast({
      title: '状态流转不允许',
      description: `当前所选订单不能批量设为${ORDER_STATUS_LABELS[status]}`,
      variant: 'destructive',
    });
    return;
  }

  try {
    await store.bulkUpdateStatus(selectedRows.value.map(o => o.id), status);
    await loadProcurementOrders();
    clearSelection();
    toast({ title: '批量更新成功', description: `${count} 张订单已设为 ${ORDER_STATUS_LABELS[status]}`, variant: 'success' });
  } catch {
    toast({ title: '操作失败', variant: 'destructive' });
  }
};

const handleBulkArrive = async () => {
  const orders = [...selectedRows.value];
  const count = orders.length;
  if (!canBulkArrive.value) {
    toast({
      title: '状态流转不允许',
      description: '当前所选订单不能批量登记到货',
      variant: 'destructive',
    });
    return;
  }

  try {
    const results = await Promise.allSettled(
      orders.map((order) => store.markOrderArrived(order.id, { arrived_at: new Date().toISOString() }))
    );
    const successCount = results.filter((result) => result.status === 'fulfilled').length;
    const failedCount = results.length - successCount;

    if (failedCount === 0) {
      await loadProcurementOrders();
      clearSelection();
      toast({ title: '批量到货登记成功', description: `${count} 张订单已设为 ${ORDER_STATUS_LABELS.arrived}`, variant: 'success' });
      return;
    }

    await loadProcurementOrders();
    clearSelection();
    toast({
      title: '批量到货部分完成',
      description: `${successCount} 张成功，${failedCount} 张失败，请刷新后重试失败订单`,
      variant: 'destructive',
    });
  } catch {
    toast({ title: '操作失败', variant: 'destructive' });
  }
};

const handleBulkStockIn = async () => {
  if (!canBulkStockIn.value) {
    toast({
      title: '当前所选订单不能批量入库',
      description: '请确认所选订单均为已到货且仍有剩余待入库明细',
      variant: 'destructive',
    });
    return;
  }
  openStockInQueue([...selectedRows.value]);
};

const columns = createColumns({
  onEdit: openEdit,
  onDelete: requestDelete,
  onPreview: openPreview,
  onPrint: handlePrintOrder,
  onExportPdf: handleExportPdfOrder,
  onViewReceipts: handleViewReceipts,
  onMarkArrived: handleMarkArrived,
  onStockIn: openStockInDialog,
  onStatusUpdate: handleStatusUpdate
});

onMounted(() => {
  syncProcurementFiltersFromRoute();
  syncSearchQueryFromRoute();
  loadProcurementOrders().catch(() => undefined);
  window.addEventListener('storage', handleProcurementRefreshSignal);
});

watch(() => [route.query.orderNo, route.query.status, route.query.category, route.query.risk, route.query.createdDate, route.query.search, route.query.page, route.query.pageSize], () => {
  syncProcurementFiltersFromRoute();
  syncSearchQueryFromRoute();
  loadProcurementOrders().catch(() => undefined);
});

watch([activeStatus, activeCategory, activeRiskFilter, activeCreatedDate, debouncedSearchQuery], () => {
  procurementPage.value = 1;
  updateProcurementRouteQuery();
});

watch(procurementPage, () => {
  updateProcurementRouteQuery();
});

watch(procurementPageSize, () => {
  procurementPage.value = 1;
  updateProcurementRouteQuery();
});

onBeforeUnmount(() => {
  window.removeEventListener('storage', handleProcurementRefreshSignal);
});

function handleProcurementRefreshSignal(event: StorageEvent) {
  if (event.key !== PROCUREMENT_REFRESH_SIGNAL_KEY || !event.newValue) return;
  loadProcurementOrders().catch(() => undefined);
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
        <p class="px-2 pb-2 text-[11px] text-muted-foreground md:hidden">表格可左右滑动查看更多列</p>
        <DataTable
          :columns="columns"
          :data="filteredOrders"
          :loading="store.loading"
          :enable-selection="true"
          :toolbar="false"
          :empty-text="tableEmptyText"
          :table-min-width="1240"
          :manual-pagination="store.serverPaginationEnabled"
          :page="store.ordersPage"
          :page-size="store.ordersPageSize"
          :total="store.ordersTotal"
          :page-size-options="[20, 50, 100]"
          density="compact"
          @page-change="procurementPage = $event"
          @page-size-change="procurementPageSize = $event"
          @selection-change="onSelectionChange"
        />
      </CardContent>
    </Card>

    <ProcurementBulkActionBar
      :selected-count="selectedRows.length"
      :can-submit="canBulkSubmit"
      :can-process="canBulkProcess"
      :can-arrive="canBulkArrive"
      :can-stock-in="canBulkStockIn"
      :can-restore-draft="canBulkRestoreDraft"
      @status="handleBulkStatusUpdate"
      @arrive="handleBulkArrive"
      @stock-in="handleBulkStockIn"
      @export="handleExport"
      @delete="handleBulkDelete"
      @clear="clearSelection"
    />

    <EditOrderDialog
      v-model:open="isEditDialogOpen"
      :order="selectedOrder"
      :mode="editDialogMode"
      @saved="loadProcurementOrders()"
      @draft-change="syncDraftForPreview"
      @preview="previewDraft"
    />
    <ProcurementPreviewModal
      v-model:open="isPreviewDialogOpen"
      :order="previewOrder"
      :can-edit="canEditOrder(previewOrder)"
      @edit="editFromPreview"
    />
    <ProcurementStockInDialog
      :open="stockInDialogOpen"
      :order="stockInOrder"
      :saving="stockInSaving"
      :queue-index="stockInQueueIndex + 1"
      :queue-total="stockInQueue.length || 1"
      @update:open="handleStockInDialogOpenChange"
      @submit="handleStockInOrder"
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
