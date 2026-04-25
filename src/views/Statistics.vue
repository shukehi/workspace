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
    arrived: '已到货',
    completed: '已入库',
    cancelled: '已取消'
  };
  return labels[status] || status;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    draft: 'bg-slate-400',
    submitted: 'bg-blue-500',
    processing: 'bg-amber-500',
    arrived: 'bg-cyan-500',
    completed: 'bg-emerald-500',
    cancelled: 'bg-rose-500'
  };
  return colors[status] || 'bg-slate-400';
};
</script>

<template>
  <div class="workspace-page">
    <div class="workspace-header">
      <div>
        <div class="workspace-kicker">Reports</div>
        <h2 class="workspace-title">数据概览</h2>
        <p class="workspace-subtitle">全局采购运营状态、支出分布及库存健康监控。</p>
      </div>
      <Button variant="outline" size="sm" @click="refreshAll" :disabled="orderStore.loading || inventoryStore.loading">
        <RefreshCcw class="w-4 h-4 mr-2" :class="{ 'animate-spin': orderStore.loading || inventoryStore.loading }" />
        同步全站数据
      </Button>
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-xs text-muted-foreground">采购总额</CardTitle>
          <TrendingUp class="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div class="text-3xl font-semibold">¥{{ stats.totalSpent.toLocaleString() }}</div>
          <p class="text-xs text-muted-foreground mt-1 flex items-center">
            <Activity class="w-3 h-3 mr-1" /> 已执行采购金额
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-xs text-muted-foreground">待处理单数</CardTitle>
          <ShoppingCart class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-3xl font-semibold">{{ stats.pendingOrdersCount }}</div>
          <p class="text-xs text-muted-foreground mt-1 flex items-center">
            <Clock class="w-3 h-3 mr-1" /> 等待后续入库处理
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-xs text-muted-foreground">库存健康度</CardTitle>
          <ShieldCheck class="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div class="text-3xl font-semibold">{{ stats.inventoryHealth }}%</div>
          <div class="w-full bg-muted h-1.5 mt-2 rounded-full overflow-hidden">
            <div class="h-full bg-emerald-500" :style="{ width: `${stats.inventoryHealth}%` }"></div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="grid flex-1 gap-4 overflow-hidden md:grid-cols-2 lg:grid-cols-7">
      <Card class="lg:col-span-4 flex flex-col">
        <CardHeader>
          <CardTitle class="text-sm font-semibold flex items-center gap-2">
            <BarChart3 class="w-4 h-4 text-muted-foreground" /> 订单状态分布
          </CardTitle>
        </CardHeader>
        <CardContent class="flex-1 flex flex-col justify-center space-y-6 px-8">
          <div v-for="item in stats.statusStats" :key="item.status" class="space-y-2">
            <div class="flex justify-between text-xs">
              <span class="text-muted-foreground">{{ getStatusLabel(item.status) }}</span>
              <span class="font-medium">{{ item.count }}</span>
            </div>
            <div class="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                class="h-full transition-all duration-700 ease-out"
                :class="getStatusColor(item.status)"
                :style="{ width: `${(item.count / orderStore.purchaseOrders.length || 0) * 100}%` }"
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div class="flex h-full flex-col gap-4 overflow-auto pr-1 lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle class="text-sm font-semibold flex items-center gap-2">
              <PieChart class="w-4 h-4 text-muted-foreground" /> 品类支出占比
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div v-for="cat in stats.categoryStats" :key="cat.name" class="flex items-center gap-4">
              <div class="w-2 h-2 rounded-full bg-foreground"></div>
              <div class="flex-1 text-xs text-muted-foreground">{{ cat.name }}</div>
              <div class="text-xs font-medium">¥{{ cat.amount.toLocaleString() }}</div>
            </div>
          </CardContent>
        </Card>

        <Card class="flex-1">
          <CardHeader>
            <CardTitle class="text-sm font-semibold flex items-center gap-2">
              <Activity class="w-4 h-4 text-muted-foreground" /> 采购排行 (TOP 5)
            </CardTitle>
          </CardHeader>
          <CardContent class="p-0">
            <div
              v-for="(item, index) in stats.topMaterials"
              :key="item.model"
              class="px-6 py-3 border-b last:border-0 hover:bg-muted/40 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-xs text-muted-foreground">#0{{ index + 1 }}</span>
                  <span class="text-sm font-medium">{{ item.model }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-emerald-600">{{ item.qty }}</span>
                  <span class="text-xs text-muted-foreground">Units</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
