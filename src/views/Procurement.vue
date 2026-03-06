<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useProcurementStore } from '@/stores/useProcurementStore';
import { useToastStore } from '@/stores/useToastStore';
import DataTable from '@/components/data-table/DataTable.vue';
import { createColumns } from '@/components/procurement/ProcurementColumns';
import EditOrderDialog from '@/components/procurement/EditOrderDialog.vue';
import ProcurementPreviewModal from '@/components/procurement/ProcurementPreviewModal.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  CheckCircle2,
  PackageCheck,
  Download,
  TrendingUp,
  Clock,
  CheckCircle,
  Activity,
  FileSpreadsheet,
  X
} from 'lucide-vue-next';
import type { Order } from '@/types/order';
import { prepareOrderDraft } from '@/features/procurement/prepareOrderDraft';

const store = useProcurementStore();
const { toast } = useToastStore();

const activeCategory = ref('ALL');
const searchQuery = ref('');
const selectedRows = ref<Order[]>([]);

const categories = [
  { id: 'ALL', label: '全部订单' },
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

const handleDelete = async (order: Order) => {
  if (confirm(`确定要删除订单 ${order.order_no} 吗？`)) {
    try {
      await store.deleteOrder(order.id);
      toast({ title: '订单已删除', variant: 'success' });
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  }
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

const handleBulkDelete = async () => {
  const count = selectedRows.value.length;
  if (confirm(`⚠️ 确定要批量删除选中的 ${count} 张采购单吗？`)) {
    try {
      await store.bulkDelete(selectedRows.value.map(o => o.id));
      selectedRows.value = [];
      toast({ title: '批量删除成功', description: `已移除 ${count} 张订单`, variant: 'success' });
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  }
};

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

    <div class="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-xs text-muted-foreground">待付总额</CardTitle>
          <TrendingUp class="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div class="text-lg md:text-2xl font-semibold">¥{{ summaryStats.totalAmount.toLocaleString() }}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-xs text-muted-foreground">待处理单</CardTitle>
          <Clock class="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div class="text-lg md:text-2xl font-semibold">{{ summaryStats.pendingCount }}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-xs text-muted-foreground">今日新增</CardTitle>
          <Activity class="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div class="text-lg md:text-2xl font-semibold">{{ summaryStats.todayCount }}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-xs text-muted-foreground">已结案</CardTitle>
          <CheckCircle class="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div class="text-lg md:text-2xl font-semibold">{{ summaryStats.completedCount }}</div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardContent class="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="w-full md:w-auto overflow-x-auto">
          <div class="flex w-max gap-1 rounded-md border bg-background p-1">
          <button
            v-for="cat in categoryOptions"
            :key="cat.id"
            @click="activeCategory = cat.id"
            class="px-3 py-1.5 text-sm rounded-sm whitespace-nowrap transition-colors"
            :class="activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
          >
            {{ cat.label }} ({{ cat.count }})
          </button>
          </div>
        </div>

        <div class="relative w-full md:w-80">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="搜单号、供应商、物料..."
            class="pl-10"
          />
        </div>
      </CardContent>
      <div class="px-4 pb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span class="whitespace-nowrap">当前显示 {{ visibleOrderCount }} / {{ store.sortedOrders.length }} 张订单</span>
        <Button v-if="hasActiveFilters" variant="ghost" size="sm" class="h-7 px-2" @click="resetFilters">
          清空筛选
        </Button>
      </div>
    </Card>

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

    <transition
      enter-active-class="transition duration-300 ease-out transform"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in transform"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div v-if="selectedRows.length > 0" class="fixed md:absolute bottom-3 md:bottom-6 left-3 right-3 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50">
        <div class="bg-card text-card-foreground px-3 md:px-4 py-3 rounded-lg shadow-lg flex flex-wrap items-center justify-center md:justify-start gap-2 border w-full md:w-auto">
          <div class="text-xs text-muted-foreground mr-2">已选 {{ selectedRows.length }}</div>

          <Button variant="outline" size="sm" @click="handleBulkStatusUpdate('submitted')">
            <CheckCircle2 class="w-4 h-4 mr-2" /> 提交
          </Button>
          <Button variant="outline" size="sm" @click="handleBulkStatusUpdate('completed')">
            <PackageCheck class="w-4 h-4 mr-2" /> 结案
          </Button>
          <Button variant="outline" size="sm" @click="handleExport">
            <FileSpreadsheet class="w-4 h-4 mr-2" /> 导出
          </Button>
          <Button variant="destructive" size="sm" @click="handleBulkDelete">
            <Trash2 class="w-4 h-4 mr-2" /> 删除
          </Button>
          <Button variant="ghost" size="icon" @click="selectedRows = []">
            <X class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </transition>

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
  </div>
</template>
