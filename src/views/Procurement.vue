<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
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

const store = useProcurementStore();
const { toast } = useToastStore();

const activeCategory = ref('ALL');
const searchQuery = ref('');
const selectedRows = ref<Order[]>([]);

const categories = [
  { id: 'ALL', label: '全部订单' },
  { id: '颜色', label: '颜色配方' },
  { id: '锁芯', label: '锁芯' },
  { id: '锁叉', label: '锁叉' },
  { id: '包装', label: '包装材料' },
  { id: '配件', label: '其他配件' }
];

const statusLabels: Record<Order['status'], string> = {
  draft: '草稿',
  submitted: '已提交',
  processing: '处理中',
  completed: '已完成',
  cancelled: '已取消'
};

const summaryStats = computed(() => {
  const totalAmount = store.purchaseOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const pendingCount = store.purchaseOrders.filter(o => ['draft', 'submitted', 'processing'].includes(o.status)).length;
  const completedCount = store.purchaseOrders.filter(o => o.status === 'completed').length;
  const today = new Date().toISOString().split('T')[0];
  const todayCount = store.purchaseOrders.filter(o => o.created_at.startsWith(today)).length;

  return { totalAmount, pendingCount, completedCount, todayCount };
});

const categoryOptions = computed(() => {
  return categories.map((category) => {
    const count = category.id === 'ALL'
      ? store.sortedOrders.length
      : store.sortedOrders.filter((order) => order.category === category.id).length;

    return {
      ...category,
      count
    };
  });
});

const tableEmptyText = computed(() => {
  if (store.loading) return '加载中...';
  if (searchQuery.value.trim()) return '没有匹配到订单';
  return '暂无采购订单数据';
});

const hasActiveFilters = computed(() => {
  return activeCategory.value !== 'ALL' || searchQuery.value.trim().length > 0;
});

const filteredOrders = computed(() => {
  let list = store.sortedOrders;
  if (activeCategory.value !== 'ALL') {
    list = list.filter(o => o.category === activeCategory.value);
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    list = list.filter(o =>
      o.order_no.toLowerCase().includes(query) ||
      o.supplier.toLowerCase().includes(query) ||
      o.items.some(item => (item.name + item.model).toLowerCase().includes(query))
    );
  }
  return list;
});

const visibleOrderCount = computed(() => filteredOrders.value.length);

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
  requestBulkDelete(selectedRows.value, () => {
    selectedRows.value = [];
  });
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

const onSelectionChange = (rows: any[]) => {
  selectedRows.value = rows;
};

// Bulk delete logic moved to confirmState handler above


const handleBulkStatusUpdate = async (status: Order['status']) => {
  const count = selectedRows.value.length;
  try {
    await store.bulkUpdateStatus(selectedRows.value.map(o => o.id), status);
    selectedRows.value = [];
    toast({ title: '批量更新成功', description: `${count} 张订单已设为 ${statusLabels[status]}`, variant: 'success' });
  } catch {
    toast({ title: '操作失败', variant: 'destructive' });
  }
};

const resetFilters = () => {
  activeCategory.value = 'ALL';
  searchQuery.value = '';
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
  <div class="h-full flex flex-col p-4 md:p-8 gap-6 bg-muted/20 relative overflow-hidden">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div>
        <h2 class="text-3xl font-semibold tracking-tight">采购管理</h2>
        <p class="text-muted-foreground mt-1 text-sm">Procurement hub</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" @click="store.fetchOrders()" :disabled="store.loading">
          <RefreshCcw class="w-4 h-4 mr-2" :class="{ 'animate-spin': store.loading }" />
          刷新
        </Button>
        <Button variant="outline" size="sm" @click="handleExport">
          <Download class="w-4 h-4 mr-2" />
          导出数据
        </Button>
        <Button size="sm" variant="secondary" @click="openManualEntry">
          <Plus class="w-4 h-4 mr-2" />
          手动录入
        </Button>
      </div>
    </div>

    <ProcurementSummaryCards
      :total-amount="summaryStats.totalAmount"
      :pending-count="summaryStats.pendingCount"
      :today-count="summaryStats.todayCount"
      :completed-count="summaryStats.completedCount"
    />

    <ProcurementFilterBar
      v-model:active-category="activeCategory"
      v-model:search-query="searchQuery"
      :category-options="categoryOptions"
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
      @status="handleBulkStatusUpdate"
      @export="handleExport"
      @delete="handleBulkDelete"
      @clear="selectedRows = []"
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
