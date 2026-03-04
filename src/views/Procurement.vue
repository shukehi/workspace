<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
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
    ArrowRight,
    Download,
    TrendingUp,
    Clock,
    CheckCircle,
    Activity,
    FileSpreadsheet
} from 'lucide-vue-next';
import type { Order } from '@/types/order';

const store = useProcurementStore();
const { toast } = useToastStore();

// --- Filter States ---
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

// --- Stats Logic ---
const summaryStats = computed(() => {
    const totalAmount = store.purchaseOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const pendingCount = store.purchaseOrders.filter(o => ['draft', 'submitted', 'processing'].includes(o.status)).length;
    const completedCount = store.purchaseOrders.filter(o => o.status === 'completed').length;
    
    // Today's orders
    const today = new Date().toISOString().split('T')[0];
    const todayCount = store.purchaseOrders.filter(o => o.created_at.startsWith(today)).length;

    return { totalAmount, pendingCount, completedCount, todayCount };
});

// --- Computed Filtered Data ---
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
            o.items.some(item => (item.name + item.model).toLowerCase().includes(query)) // Deep search in items
        );
    }
    return list;
});

// --- Dialog States ---
const isEditDialogOpen = ref(false);
const isPreviewDialogOpen = ref(false);
const selectedOrder = ref<Order | null>(null);

// --- Actions ---
const handleEdit = (order: Order) => {
    selectedOrder.value = order;
    isEditDialogOpen.value = true;
};

const handleStatusUpdate = async (order: Order, status: Order['status']) => {
    try {
        await store.updateOrder(order.id, { status });
        toast({
            title: '状态更新成功',
            description: `订单 ${order.order_no} 已设为 ${status}`,
            variant: 'success'
        });
    } catch (e) {
        toast({ title: '更新失败', variant: 'destructive' });
    }
};

const handleDelete = async (order: Order) => {
    if (confirm(`确定要删除订单 ${order.order_no} 吗？`)) {
        try {
            await store.deleteOrder(order.id);
            toast({ title: '订单已删除', variant: 'success' });
        } catch (e) {
            toast({ title: '删除失败', variant: 'destructive' });
        }
    }
};

const handlePreview = (order: Order) => {
    selectedOrder.value = order;
    isPreviewDialogOpen.value = true;
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

// --- Bulk Actions ---
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
        } catch (e) {
            toast({ title: '操作失败', variant: 'destructive' });
        }
    }
};

const handleBulkStatusUpdate = async (status: Order['status']) => {
    const count = selectedRows.value.length;
    try {
        await store.bulkUpdateStatus(selectedRows.value.map(o => o.id), status);
        selectedRows.value = [];
        toast({ title: '批量更新成功', description: `${count} 张订单已设为 ${status}`, variant: 'success' });
    } catch (e) {
        toast({ title: '操作失败', variant: 'destructive' });
    }
};

// --- Columns ---
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
    <div class="h-full flex flex-col p-8 pt-6 space-y-6 bg-slate-50/50 relative overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-3xl font-semibold text-slate-900 tracking-tight">采购管理</h2>
                <p class="text-slate-500 mt-1 italic font-mono text-sm uppercase tracking-wide">Procurement Hub v2.0</p>
            </div>
            <div class="flex items-center gap-2">
                <Button variant="outline" size="sm" @click="store.fetchOrders()" :disabled="store.loading">
                    <RefreshCcw class="w-4 h-4 mr-2" :class="{ 'animate-spin': store.loading }" />
                    刷新
                </Button>
                <Button variant="outline" size="sm" @click="handleExport">
                    <Download class="w-4 h-4 mr-2" />
                    导出数据
                </Button>
                <Button size="sm" class="bg-slate-900 text-white shadow-md hover:bg-slate-800 transition-all">
                    <Plus class="w-4 h-4 mr-2" />
                    手动录入
                </Button>
            </div>
        </div>

        <!-- Metric Cards -->
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card class="bg-white border-slate-200">
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">待付总额</CardTitle>
                    <TrendingUp class="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div class="text-2xl font-bold text-slate-900 font-mono">¥{{ summaryStats.totalAmount.toLocaleString() }}</div>
                </CardContent>
            </Card>
            
            <Card class="bg-white border-slate-200">
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">待处理单</CardTitle>
                    <Clock class="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                    <div class="text-2xl font-bold text-slate-900 font-mono">{{ summaryStats.pendingCount }}</div>
                </CardContent>
            </Card>

            <Card class="bg-white border-slate-200 border-l-4 border-l-slate-900">
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">今日新增</CardTitle>
                    <Activity class="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div class="text-2xl font-bold text-slate-900 font-mono">{{ summaryStats.todayCount }}</div>
                </CardContent>
            </Card>

            <Card class="bg-white border-slate-200">
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">已结案</CardTitle>
                    <CheckCircle class="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div class="text-2xl font-bold text-slate-900 font-mono">{{ summaryStats.completedCount }}</div>
                </CardContent>
            </Card>
        </div>

        <!-- Filter Bar -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex space-x-1 bg-white p-1 rounded-lg border border-slate-200 w-fit shadow-sm">
                <button 
                    v-for="cat in categories" 
                    :key="cat.id"
                    @click="activeCategory = cat.id"
                    class="px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide"
                    :class="activeCategory === cat.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'"
                >
                    {{ cat.label }}
                </button>
            </div>

            <div class="relative w-full md:w-80 group">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <Input 
                    v-model="searchQuery" 
                    placeholder="搜单号、供应商、物料..." 
                    class="pl-10 h-10 border-slate-200 focus:border-slate-900 focus:ring-0 rounded-lg shadow-sm font-mono text-sm"
                />
            </div>
        </div>

        <!-- Main Content -->
        <div class="flex-1 overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col">
            <DataTable 
                :columns="columns" 
                :data="filteredOrders" 
                :enable-selection="true"
                @selection-change="onSelectionChange"
            />
        </div>

        <!-- Bulk Action Floating Bar -->
        <transition 
            enter-active-class="transition duration-300 ease-out transform"
            enter-from-class="translate-y-full opacity-0"
            enter-to-class="translate-y-0 opacity-100"
            leave-active-class="transition duration-200 ease-in transform"
            leave-from-class="translate-y-0 opacity-100"
            leave-to-class="translate-y-full opacity-0"
        >
            <div v-if="selectedRows.length > 0" class="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
                <div class="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-slate-800 backdrop-blur-md">
                    <div class="flex items-center gap-3 pr-6 border-r border-slate-700">
                        <div class="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-sm">
                            {{ selectedRows.length }}
                        </div>
                        <span class="text-xs font-bold uppercase tracking-widest text-slate-400">Selected</span>
                    </div>

                    <div class="flex items-center gap-2">
                        <Button variant="ghost" size="sm" class="text-white hover:bg-emerald-600 h-9 px-4 rounded-full" @click="handleBulkStatusUpdate('submitted')">
                            <CheckCircle2 class="w-4 h-4 mr-2" /> 提交
                        </Button>
                        <Button variant="ghost" size="sm" class="text-white hover:bg-blue-600 h-9 px-4 rounded-full" @click="handleBulkStatusUpdate('completed')">
                            <PackageCheck class="w-4 h-4 mr-2" /> 结案
                        </Button>
                        <Button variant="ghost" size="sm" class="text-white hover:bg-slate-700 h-9 px-4 rounded-full" @click="handleExport">
                            <FileSpreadsheet class="w-4 h-4 mr-2" /> 导出
                        </Button>
                        <Button variant="ghost" size="sm" class="text-rose-400 hover:bg-rose-600 hover:text-white h-9 px-4 rounded-full" @click="handleBulkDelete">
                            <Trash2 class="w-4 h-4 mr-2" /> 删除
                        </Button>
                    </div>

                    <Button variant="ghost" size="icon" class="text-slate-500 hover:text-white ml-2" @click="selectedRows = []">
                        <ArrowRight class="w-4 h-4 rotate-90" />
                    </Button>
                </div>
            </div>
        </transition>

        <!-- Dialogs -->
        <EditOrderDialog v-model:open="isEditDialogOpen" :order="selectedOrder" @saved="store.fetchOrders()" />
        <ProcurementPreviewModal v-model:open="isPreviewDialogOpen" :order="selectedOrder" />
    </div>
</template>
