<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

defineProps<{
  relationshipHealth: {
    inactiveLinkedSupplierCount: number
    suppliersWithUnlinkedMaterialsCount: number
    inactiveLinkedSuppliers: Array<any>
  }
  actionableGroups: {
    suppliersWithUnlinkedMaterials: Array<any>
  }
}>();

const emit = defineEmits<{
  (e: 'view-linked-materials', item: any): void
  (e: 'open-edit', item: any): void
}>();
</script>

<template>
  <Card v-if="relationshipHealth.inactiveLinkedSupplierCount > 0">
    <CardContent class="p-4 text-sm text-amber-700">
      存在 inactive 但仍关联物料的供应商，请优先处理。
    </CardContent>
  </Card>

  <div
    v-if="relationshipHealth.inactiveLinkedSupplierCount > 0 || relationshipHealth.suppliersWithUnlinkedMaterialsCount > 0"
    class="grid gap-4 md:grid-cols-2"
  >
    <Card v-if="relationshipHealth.inactiveLinkedSupplierCount > 0">
      <CardHeader>
        <CardTitle>inactive 但仍有关联物料</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2 text-sm">
        <div
          v-for="item in relationshipHealth.inactiveLinkedSuppliers"
          :key="`inactive-linked-${item.normalizedName}`"
          class="rounded-md border bg-background px-3 py-2"
        >
          <div class="font-medium">{{ item.supplierName }}</div>
          <div class="text-muted-foreground">已链接物料：{{ item.linkedMaterialCount }}</div>
          <div class="mt-2 flex items-center gap-2">
            <Button size="sm" variant="outline" @click="emit('view-linked-materials', item)">
              查看关联物料
            </Button>
            <Button size="sm" variant="outline" @click="emit('open-edit', item)">
              打开编辑
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card v-if="relationshipHealth.suppliersWithUnlinkedMaterialsCount > 0">
      <CardHeader>
        <CardTitle>需补充正式链接</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2 text-sm">
        <div
          v-for="item in actionableGroups.suppliersWithUnlinkedMaterials"
          :key="`unlinked-supplier-${item.normalizedName}`"
          class="rounded-md border bg-background px-3 py-2"
        >
          <div class="font-medium">{{ item.supplierName }}</div>
          <div class="text-muted-foreground">物料数：{{ item.materialCount }} · 已链接：{{ item.linkedMaterialCount }}</div>
          <div class="mt-2">
            <Button size="sm" variant="outline" @click="emit('open-edit', item)">
              打开编辑
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
