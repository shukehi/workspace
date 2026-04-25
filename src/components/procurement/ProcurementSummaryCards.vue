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

const cards = [
  { key: 'total', label: '待付总额', helper: '点击查看详情', icon: TrendingUp },
  { key: 'pending', label: '待处理单', helper: '草稿、已提交、采购中、待入库', icon: Clock },
  { key: 'today', label: '今日新增', helper: '今日新建单据', icon: Activity },
  { key: 'completed', label: '已入库', helper: '已入库订单统计', icon: CheckCircle },
] as const;
</script>

<template>
  <div class="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
    <Card
      v-for="card in cards"
      :key="card.key"
      class="cursor-pointer overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-sm"
      @click="emit('filter', card.key)"
    >
      <CardHeader class="flex flex-row items-center justify-between gap-3 p-3 pb-1.5">
        <CardTitle class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{{ card.label }}</CardTitle>
        <div class="flex size-8 items-center justify-center rounded-xl bg-muted text-foreground/70">
          <component :is="card.icon" class="size-3.5" />
        </div>
      </CardHeader>
      <CardContent class="px-3 pb-3 pt-0">
        <div class="text-xl font-semibold tracking-tight">
          <template v-if="card.key === 'total'">¥{{ totalAmount.toLocaleString() }}</template>
          <template v-else-if="card.key === 'pending'">{{ pendingCount }}</template>
          <template v-else-if="card.key === 'today'">{{ todayCount }}</template>
          <template v-else>{{ completedCount }}</template>
        </div>
        <p class="mt-1 truncate text-[10px] text-muted-foreground">{{ card.helper }}</p>
      </CardContent>
    </Card>
  </div>
</template>
