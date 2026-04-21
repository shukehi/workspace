<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

defineProps<{
  selectedSupplier: { supplierName: string } | null
  linkedMaterials: Array<{
    id: number
    code: string
    name: string
    category: string
    supplier: string
    supplierMasterId: number | null
    updatedAt: string | null
  }>
  loading?: boolean
}>();

const emit = defineEmits<{
  (e: 'jump-to-material', item: { id: number; code: string; name: string }): void
}>();
</script>

<template>
  <Card v-if="selectedSupplier">
    <CardHeader>
      <CardTitle>关联物料明细 · {{ selectedSupplier.supplierName }}</CardTitle>
    </CardHeader>
    <CardContent class="space-y-2 text-sm">
      <div v-if="loading" class="text-muted-foreground">加载关联物料中...</div>
      <div v-else-if="linkedMaterials.length === 0" class="text-muted-foreground">
        当前 supplier master 暂无已关联物料
      </div>
      <div
        v-for="material in linkedMaterials.slice(0, 10)"
        :key="material.id"
        class="rounded-md border bg-background px-3 py-2"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="font-medium">{{ material.code }} · {{ material.name }}</div>
            <div class="text-muted-foreground">
              {{ material.category || '未分类' }} · {{ material.supplier || '未填写供应商' }}
            </div>
          </div>
          <Button size="sm" variant="outline" @click="emit('jump-to-material', material)">
            查看物料详情
          </Button>
        </div>
      </div>
      <div v-if="linkedMaterials.length > 10" class="text-muted-foreground">
        仅展示最近 10 条，请使用物料管理页查看完整列表。
      </div>
    </CardContent>
  </Card>
</template>
