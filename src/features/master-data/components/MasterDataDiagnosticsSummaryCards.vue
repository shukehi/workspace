<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card';

defineProps<{
  summary: {
    totalIssueCount: number
    materialIssueCount: number
    supplierIssueCount: number
    autoFixCount: number
    manualReviewCount: number
  }
}>();
</script>

<template>
  <div class="grid gap-4 md:grid-cols-4">
    <Card>
      <CardContent class="p-4 space-y-1">
        <div class="text-sm text-muted-foreground">总异常数</div>
        <div class="text-2xl font-semibold">{{ summary.totalIssueCount }}</div>
        <div class="text-xs text-muted-foreground">Material / Supplier 当前待处理异常</div>
      </CardContent>
    </Card>
    <Card>
      <CardContent class="p-4 space-y-1">
        <div class="text-sm text-muted-foreground">物料异常</div>
        <div class="text-2xl font-semibold text-amber-700">{{ summary.materialIssueCount }}</div>
        <div class="text-xs text-muted-foreground">未关联 / inactive-linked</div>
      </CardContent>
    </Card>
    <Card>
      <CardContent class="p-4 space-y-1">
        <div class="text-sm text-muted-foreground">可自动修复</div>
        <div class="text-2xl font-semibold text-emerald-700">{{ summary.autoFixCount }}</div>
        <div class="text-xs text-muted-foreground">可直接自动重连的物料</div>
      </CardContent>
    </Card>
    <Card>
      <CardContent class="p-4 space-y-1">
        <div class="text-sm text-muted-foreground">需人工处理</div>
        <div class="text-2xl font-semibold text-destructive">{{ summary.manualReviewCount }}</div>
        <div class="text-xs text-muted-foreground">需进入对象详情继续修复</div>
      </CardContent>
    </Card>
  </div>
</template>
