<script setup lang="ts">
import { TrendingUp, Clock, Activity, CheckCircle } from 'lucide-vue-next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

defineProps<{
  totalAmount: number;
  pendingCount: number;
  todayCount: number;
  completedCount: number;
}>();
</script>

<template>
  <div class="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">待付总额</CardTitle>
        <TrendingUp class="h-4 w-4 text-emerald-500" />
      </CardHeader>
      <CardContent>
        <div class="text-lg md:text-2xl font-semibold">¥{{ totalAmount.toLocaleString() }}</div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">待处理单</CardTitle>
        <Clock class="h-4 w-4 text-amber-500" />
      </CardHeader>
      <CardContent>
        <div class="text-lg md:text-2xl font-semibold">{{ pendingCount }}</div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">今日新增</CardTitle>
        <Activity class="h-4 w-4 text-blue-500" />
      </CardHeader>
      <CardContent>
        <div class="text-lg md:text-2xl font-semibold">{{ todayCount }}</div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">已结案</CardTitle>
        <CheckCircle class="h-4 w-4 text-emerald-500" />
      </CardHeader>
      <CardContent>
        <div class="text-lg md:text-2xl font-semibold">{{ completedCount }}</div>
      </CardContent>
    </Card>
  </div>
</template>
