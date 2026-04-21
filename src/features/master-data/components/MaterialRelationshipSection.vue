<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MaterialRecord } from '@/features/materials/composables/useMaterialManagementPageState';

defineProps<{
  material: MaterialRecord | null
  supplierMasterOptions: Array<{ id: number; supplierName: string }>
}>();

const emit = defineEmits<{
  (e: 'auto-link', material: MaterialRecord): void
  (e: 'open-edit', material: MaterialRecord): void
  (e: 'jump-to-supplier', supplierMasterId: number): void
}>();
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>关系</CardTitle>
    </CardHeader>
    <CardContent v-if="material" class="space-y-3 text-sm">
      <div class="rounded-md border bg-background px-3 py-2">
        <div class="text-muted-foreground">当前 Supplier Master</div>
        <div v-if="material.supplierMaster" class="font-medium">
          {{ material.supplierMaster.supplier_name }} · {{ material.supplierMaster.status }}
        </div>
        <div v-else class="font-medium text-amber-700">未正式关联 Supplier Master</div>
      </div>

      <div class="rounded-md border bg-background px-3 py-2">
        <div class="text-muted-foreground">供应商原始文本</div>
        <div class="font-medium">{{ material.supplier || '未填写供应商' }}</div>
      </div>

      <div class="rounded-md border bg-background px-3 py-2">
        <div class="text-muted-foreground">可用主数据候选</div>
        <div class="font-medium">{{ supplierMasterOptions.length }} 个 Supplier Master 条目</div>
        <div class="mt-1 text-xs text-muted-foreground">
          如需手动指定或重连，请打开编辑弹窗；若按供应商名称可匹配，也可直接触发自动重连。
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" @click="emit('open-edit', material)">打开编辑</Button>
        <Button size="sm" variant="outline" @click="emit('auto-link', material)">自动重连</Button>
        <Button
          v-if="material.supplierMaster?.id"
          size="sm"
          variant="outline"
          @click="emit('jump-to-supplier', material.supplierMaster.id)"
        >
          查看供应商详情
        </Button>
      </div>
    </CardContent>
    <CardContent v-else class="text-sm text-muted-foreground">
      选择一条物料后，可查看 Supplier Master 关系与修复操作。
    </CardContent>
  </Card>
</template>
