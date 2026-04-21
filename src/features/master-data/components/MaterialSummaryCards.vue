<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card';

defineProps<{
  health: {
    totalMaterials: number
    linkedMaterialCount: number
    unlinkedMaterialCount: number
    inactiveSupplierLinkedMaterialCount: number
  }
}>();
</script>

<template>
  <div class="grid gap-4 md:grid-cols-3">
    <Card>
      <CardContent class="p-4 space-y-1">
        <div class="text-sm text-muted-foreground">物料总数</div>
        <div class="text-2xl font-semibold">{{ health.totalMaterials }}</div>
        <div class="text-xs text-muted-foreground">当前列表中的主数据物料条目</div>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="p-4 space-y-1">
        <div class="text-sm text-muted-foreground">已正式链接</div>
        <div class="text-2xl font-semibold text-emerald-700">{{ health.linkedMaterialCount }}</div>
        <div class="text-xs text-muted-foreground">已关联 Supplier Master 的物料数</div>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="p-4 space-y-1">
        <div class="text-sm text-muted-foreground">关系异常数</div>
        <div class="text-2xl font-semibold text-amber-700">
          {{ health.unlinkedMaterialCount + health.inactiveSupplierLinkedMaterialCount }}
        </div>
        <div class="text-xs text-muted-foreground">未关联 / 链接到 inactive Supplier Master</div>
      </CardContent>
    </Card>
  </div>
</template>
