<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SupplierMasterEntry } from '@/services/mappingConfigApi';
import { Edit2 } from 'lucide-vue-next';

defineProps<{
  items: SupplierMasterEntry[]
  selectedSupplierId?: number | null
  loading?: boolean
}>();

const emit = defineEmits<{
  (e: 'select', item: SupplierMasterEntry): void
  (e: 'edit', item: SupplierMasterEntry): void
  (e: 'view-linked-materials', item: SupplierMasterEntry): void
  (e: 'archive', item: SupplierMasterEntry): void
}>();
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>供应商列表（{{ items.length }}）</CardTitle>
    </CardHeader>
    <CardContent class="overflow-auto">
      <div v-if="loading" class="text-sm text-muted-foreground">加载中...</div>
      <div v-else-if="items.length === 0" class="text-sm text-muted-foreground">暂无供应商主数据</div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left border-b">
            <th class="py-2 pr-4">供应商</th>
            <th class="py-2 pr-4">来源</th>
            <th class="py-2 pr-4">物料数</th>
            <th class="py-2 pr-4">已链接物料</th>
            <th class="py-2 pr-4">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.normalizedName"
            class="border-b align-top cursor-pointer"
            :class="Number(item.id || 0) && Number(item.id || 0) === selectedSupplierId ? 'bg-primary/5' : ''"
            @click="emit('select', item)"
          >
            <td class="py-2 pr-4 font-medium">{{ item.supplierName }}</td>
            <td class="py-2 pr-4 text-muted-foreground">{{ item.sources.join('，') }}</td>
            <td class="py-2 pr-4">{{ item.materialCount }}</td>
            <td class="py-2 pr-4">
              <div>{{ item.linkedMaterialCount }}</div>
              <div v-if="item.linkedMaterialCodes?.length" class="text-xs text-muted-foreground mt-1">
                {{ item.linkedMaterialCodes.join('，') }}
              </div>
              <div v-if="item.hasLinkedMaterialsWhileInactive" class="mt-1 text-xs text-amber-700">
                inactive 但仍有关联物料
              </div>
            </td>
            <td class="py-2 pr-4">
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click.stop="emit('edit', item)">
                  <Edit2 class="h-4 w-4" />
                </Button>
                <Button v-if="item.id" variant="outline" size="sm" @click.stop="emit('view-linked-materials', item)">
                  查看关联物料
                </Button>
                <Button v-if="item.id && item.status !== 'inactive'" variant="outline" size="sm" @click.stop="emit('archive', item)">
                  归档
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </CardContent>
  </Card>
</template>
