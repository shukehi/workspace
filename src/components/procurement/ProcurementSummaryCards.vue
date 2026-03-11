<script setup lang="ts">
import { TrendingUp, Clock, Activity, CheckCircle } from 'lucide-vue-next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

defineProps<{
  totalAmount: number;
  pendingCount: number;
  todayCount: number;
  completedCount: number;
}>();

const emit = defineEmits<{
  (e: 'filter', type: 'pending' | 'today' | 'completed' | 'total'): void;
}>();
</script>

<template>
  <div class="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
    <Card 
      class="cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] transition-colors"
      @click="emit('filter', 'total')"
    >
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-1 pt-2.5 px-3">
        <CardTitle class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">待付总额</CardTitle>
        <TrendingUp class="h-3.5 w-3.5 text-emerald-500" />
      </CardHeader>
      <CardContent class="pb-2.5 pt-0 px-3">
        <div class="text-xl font-bold tracking-tight">¥{{ totalAmount.toLocaleString() }}</div>
        <p class="text-[10px] text-muted-foreground mt-0.5 opacity-70">点击查看详情</p>
      </CardContent>
    </Card>

    <Card 
      class="cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/[0.02] transition-colors"
      @click="emit('filter', 'pending')"
    >
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-1 pt-2.5 px-3">
        <CardTitle class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">待处理单</CardTitle>
        <Clock class="h-3.5 w-3.5 text-amber-500" />
      </CardHeader>
      <CardContent class="pb-2.5 pt-0 px-3">
        <div class="text-xl font-bold tracking-tight">{{ pendingCount }}</div>
        <p class="text-[10px] text-amber-600/70 mt-0.5">待付、提交、处理中</p>
      </CardContent>
    </Card>

    <Card 
      class="cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/[0.02] transition-colors"
      @click="emit('filter', 'today')"
    >
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-1 pt-2.5 px-3">
        <CardTitle class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">今日新增</CardTitle>
        <Activity class="h-3.5 w-3.5 text-blue-500" />
      </CardHeader>
      <CardContent class="pb-2.5 pt-0 px-3">
        <div class="text-xl font-bold tracking-tight">{{ todayCount }}</div>
        <p class="text-[10px] text-muted-foreground mt-0.5 opacity-70">今日新建单据</p>
      </CardContent>
    </Card>

    <Card 
      class="cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] transition-colors"
      @click="emit('filter', 'completed')"
    >
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-1 pt-2.5 px-3">
        <CardTitle class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">已结案</CardTitle>
        <CheckCircle class="h-3.5 w-3.5 text-emerald-500" />
      </CardHeader>
      <CardContent class="pb-2.5 pt-0 px-3">
        <div class="text-xl font-bold tracking-tight">{{ completedCount }}</div>
        <p class="text-[10px] text-muted-foreground mt-0.5 opacity-70">已完成订单统计</p>
      </CardContent>
    </Card>
  </div>
</template>
