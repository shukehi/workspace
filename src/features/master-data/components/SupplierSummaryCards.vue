<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card';

defineProps<{
  health: {
    totalSuppliers: number
    totalLinkedMaterials: number
    inactiveLinkedSupplierCount: number
    suppliersWithUnlinkedMaterialsCount: number
  }
}>();
</script>

<template>
  <div class="grid gap-4 md:grid-cols-3">
    <Card>
      <CardContent class="p-4 space-y-1">
        <div class="text-sm text-muted-foreground">关联健康总览</div>
        <div class="text-2xl font-semibold">{{ health.totalSuppliers }}</div>
        <div class="text-xs text-muted-foreground">已纳入供应商主数据的供应商数</div>
      </CardContent>
    </Card>
    <Card>
      <CardContent class="p-4 space-y-1">
        <div class="text-sm text-muted-foreground">关联物料总数</div>
        <div class="text-2xl font-semibold">{{ health.totalLinkedMaterials }}</div>
        <div class="text-xs text-muted-foreground">已正式链接到 Supplier Master 的物料数</div>
      </CardContent>
    </Card>
    <Card>
      <CardContent class="p-4 space-y-1">
        <div class="text-sm text-muted-foreground">异常供应商数</div>
        <div class="text-2xl font-semibold text-amber-700">
          {{ health.inactiveLinkedSupplierCount + health.suppliersWithUnlinkedMaterialsCount }}
        </div>
        <div class="text-xs text-muted-foreground">inactive 仍关联 / 有物料但尚未正式链接</div>
      </CardContent>
    </Card>
  </div>
</template>
