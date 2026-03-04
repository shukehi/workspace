<script setup lang="ts">
import { onMounted } from 'vue';
import { useStatisticsStore } from '@/stores/useStatisticsStore';
import { useProcurementStore } from '@/stores/useProcurementStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    TrendingUp, 
    ShoppingCart, 
    ShieldCheck, 
    BarChart3, 
    PieChart, 
    Clock, 
    ArrowRight,
    RefreshCcw,
    Activity
} from 'lucide-vue-next';

const stats = useStatisticsStore();
const orderStore = useProcurementStore();
const inventoryStore = useInventoryStore();

const refreshAll = async () => {
    await Promise.all([
        orderStore.fetchOrders(),
        inventoryStore.fetchInventory()
    ]);
};

onMounted(() => {
    refreshAll();
});

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        draft: '草稿',
        submitted: '已提交',
        processing: '处理中',
        completed: '已完成',
        cancelled: '已取消'
    };
    return labels[status] || status;
};

const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
        draft: 'bg-slate-400',
        submitted: 'bg-blue-500',
        processing: 'bg-amber-500',
        completed: 'bg-emerald-500',
        cancelled: 'bg-rose-500'
    };
    return colors[status] || 'bg-slate-400';
};
</script>

<template>
    <div class="h-full flex flex-col p-8 pt-6 space-y-6 bg-slate-50/50">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-3xl font-semibold text-slate-900 tracking-tight">数据概览</h2>
                <p class="text-slate-500 mt-1">全局采购运营状态、支出分布及库存健康监控。</p>
            </div>
            <Button variant="outline" size="sm" @click="refreshAll" :disabled="orderStore.loading || inventoryStore.loading">
                <RefreshCcw class="w-4 h-4 mr-2" :class="{ 'animate-spin': orderStore.loading || inventoryStore.loading }" />
                同步全站数据
            </Button>
        </div>

        <!-- Metric Grid -->
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card class="bg-slate-900 text-white border-none shadow-xl shadow-slate-200">
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-[10px] font-black uppercase tracking-widest text-slate-400">采购总额</CardTitle>
                    <TrendingUp class="h-4 w-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                    <div class="text-3xl font-bold font-mono">¥{{ stats.totalSpent.toLocaleString() }}</div>
                    <p class="text-[10px] text-slate-500 mt-1 flex items-center">
                        <Activity class="w-3 h-3 mr-1" /> 已执行采购金额
                    </p>
                </CardContent>
            </Card>

            <Card class="bg-white border-slate-200">
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-slate-500">待处理单数</CardTitle>
                    <ShoppingCart class="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                    <div class="text-3xl font-bold text-slate-900 font-mono">{{ stats.pendingOrdersCount }}</div>
                    <p class="text-[10px] text-slate-400 mt-1 flex items-center italic">
                        <Clock class="w-3 h-3 mr-1" /> 等待后续入库处理
                    </p>
                </CardContent>
            </Card>

            <Card class="bg-white border-slate-200">
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-slate-500">库存健康度</CardTitle>
                    <ShieldCheck class="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div class="text-3xl font-bold text-slate-900 font-mono">{{ stats.inventoryHealth }}%</div>
                    <div class="w-full bg-slate-100 h-1 mt-2 rounded-full overflow-hidden">
                        <div class="h-full bg-emerald-500" :style="{ width: `${stats.inventoryHealth}%` }"></div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Charts Grid -->
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-7 flex-1 overflow-hidden">
            <!-- Order Status Funnel -->
            <Card class="lg:col-span-4 bg-white border-slate-200 flex flex-col">
                <CardHeader>
                    <CardTitle class="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                        <BarChart3 class="w-4 h-4 text-slate-400" /> 订单状态分布
                    </CardTitle>
                </CardHeader>
                <CardContent class="flex-1 flex flex-col justify-center space-y-6 px-8">
                    <div v-for="item in stats.statusStats" :key="item.status" class="space-y-2">
                        <div class="flex justify-between text-xs font-bold uppercase tracking-wide">
                            <span class="text-slate-600">{{ getStatusLabel(item.status) }}</span>
                            <span class="font-mono text-slate-900">{{ item.count }}</span>
                        </div>
                        <div class="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                            <div 
                                class="h-full transition-all duration-700 ease-out"
                                :class="getStatusColor(item.status)"
                                :style="{ width: `${(item.count / orderStore.purchaseOrders.length || 0) * 100}%` }"
                            ></div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Category Spend & Top Items -->
            <div class="lg:col-span-3 flex flex-col gap-6 h-full overflow-auto pr-1">
                <Card class="bg-white border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle class="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                            <PieChart class="w-4 h-4 text-slate-400" /> 品类支出占比
                        </CardTitle>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div v-for="cat in stats.categoryStats" :key="cat.name" class="flex items-center gap-4">
                            <div class="w-2 h-2 rounded-full bg-slate-900"></div>
                            <div class="flex-1 text-xs font-medium text-slate-600">{{ cat.name }}</div>
                            <div class="text-xs font-bold font-mono text-slate-900">¥{{ cat.amount.toLocaleString() }}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card class="bg-white border-slate-200 shadow-sm flex-1">
                    <CardHeader>
                        <CardTitle class="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                            <Activity class="w-4 h-4 text-slate-400" /> 采购排行 (TOP 5)
                        </CardTitle>
                    </CardHeader>
                    <CardContent class="p-0">
                        <div v-for="(item, index) in stats.topMaterials" :key="item.model" class="px-6 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-default">
                             <div class="flex items-center justify-between">
                                 <div class="flex items-center gap-3">
                                     <span class="text-[10px] font-mono text-slate-400">#0{{ index + 1 }}</span>
                                     <span class="text-xs font-bold text-slate-900 font-mono">{{ item.model }}</span>
                                 </div>
                                 <div class="flex items-center gap-2">
                                     <span class="text-xs font-bold text-emerald-600 font-mono">{{ item.qty }}</span>
                                     <span class="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Units</span>
                                 </div>
                             </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Ensure containers behave correctly */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
