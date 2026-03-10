<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
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
import { prepareOrderDraft } from '@/features/procurement/prepareOrderDraft';

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

const isEditDialogOpen = ref(false);
const isPreviewDialogOpen = ref(false);
const selectedOrder = ref<Order | null>(null);
const draftOrderForPreview = ref<Order | null>(null);
const editDialogMode = ref<'edit' | 'create'>('edit');

const handleEdit = (order: Order) => {
  editDialogMode.value = 'edit';
  const draft = prepareOrderDraft(order);
  selectedOrder.value = draft;
  draftOrderForPreview.value = draft;
  isEditDialogOpen.value = true;
};

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

const confirmState = ref({
  show: false,
  title: '',
  message: '',
  variant: 'danger' as 'danger' | 'warning' | 'info' | 'question',
  confirmText: '确定',
  onConfirm: () => {}
});

const handleDelete = (order: Order) => {
  confirmState.value = {
    show: true,
    title: '删除确认',
    message: `您确定要永久删除订单 <span class="font-bold text-foreground">${order.order_no}</span> 吗？此操作将无法还原数据。`,
    variant: 'danger',
    confirmText: '确认删除',
    onConfirm: async () => {
      try {
        await store.deleteOrder(order.id);
        toast({ title: '订单已删除', variant: 'success' });
      } catch {
        toast({ title: '删除失败', variant: 'destructive' });
      } finally {
        confirmState.value.show = false;
      }
    }
  };
};

const handleBulkDelete = () => {
  const count = selectedRows.value.length;
  confirmState.value = {
    show: true,
    title: '批量删除订单',
    message: `您即将永久删除选中的 ${count} 张采购单。确定要继续吗？`,
    variant: 'danger',
    confirmText: '批量删除',
    onConfirm: async () => {
      try {
        await store.bulkDelete(selectedRows.value.map(o => o.id));
        selectedRows.value = [];
        toast({ title: '批量删除成功', description: `已移除 ${count} 张订单`, variant: 'success' });
      } catch {
        toast({ title: '操作失败', variant: 'destructive' });
      } finally {
        confirmState.value.show = false;
      }
    }
  };
};

const handlePreview = (order: Order) => {
  const draft = prepareOrderDraft(order);
  selectedOrder.value = draft;
  draftOrderForPreview.value = draft;
  isPreviewDialogOpen.value = true;
};

const handleDraftChange = (draft: Order) => {
  if (!selectedOrder.value || selectedOrder.value.id !== draft.id) return;
  draftOrderForPreview.value = draft;
};

const handleEditPreview = (draft: Order) => {
  const normalizedDraft = prepareOrderDraft(draft);
  selectedOrder.value = normalizedDraft;
  draftOrderForPreview.value = normalizedDraft;
  isPreviewDialogOpen.value = true;
};

const handlePreviewEdit = (order: Order) => {
  editDialogMode.value = 'edit';
  const draft = prepareOrderDraft(order);
  isPreviewDialogOpen.value = false;
  selectedOrder.value = draft;
  draftOrderForPreview.value = draft;
  isEditDialogOpen.value = true;
};

const previewOrder = computed(() => {
  if (!selectedOrder.value) return null;
  if (draftOrderForPreview.value && draftOrderForPreview.value.id === selectedOrder.value.id) {
    return draftOrderForPreview.value;
  }
  return selectedOrder.value;
});

watch(isEditDialogOpen, (open) => {
  if (!open) {
    draftOrderForPreview.value = null;
  }
});

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

const handleManualEntry = () => {
  editDialogMode.value = 'create';
  selectedOrder.value = null;
  draftOrderForPreview.value = null;
  isEditDialogOpen.value = true;
};

const resetFilters = () => {
  activeCategory.value = 'ALL';
  searchQuery.value = '';
};

const columns = createColumns({
  onEdit: handleEdit,
  onDelete: handleDelete,
  onPreview: handlePreview,
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
        <Button size="sm" variant="secondary" @click="handleManualEntry">
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
      @draft-change="handleDraftChange"
      @preview="handleEditPreview"
    />
    <ProcurementPreviewModal
      v-model:open="isPreviewDialogOpen"
      :order="previewOrder"
      @edit="handlePreviewEdit"
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
