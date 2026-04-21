<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { MaterialRecord } from '@/features/materials/composables/useMaterialManagementPageState';
import { Edit2 } from 'lucide-vue-next';

defineProps<{
  materials: MaterialRecord[]
  selectedMaterialId?: number | null
  loading?: boolean
}>();

const emit = defineEmits<{
  (e: 'select', item: MaterialRecord): void
  (e: 'edit', item: MaterialRecord): void
}>();
</script>

<template>
  <Card class="flex-1 min-h-0">
    <CardContent class="p-0 h-full overflow-auto">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-muted-foreground bg-muted/50 sticky top-0">
          <tr>
            <th class="px-6 py-3">编码</th>
            <th class="px-6 py-3">名称</th>
            <th class="px-6 py-3">型号</th>
            <th class="px-6 py-3">分类</th>
            <th class="px-6 py-3">供应商</th>
            <th class="px-6 py-3">供应商主数据</th>
            <th class="px-6 py-3">单价</th>
            <th class="px-6 py-3">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="mat in materials"
            :key="mat.id"
            class="border-b transition-colors cursor-pointer"
            :class="mat.id === selectedMaterialId ? 'bg-primary/5' : 'bg-background hover:bg-muted/40'"
            @click="emit('select', mat)"
          >
            <td class="px-6 py-4 font-medium">{{ mat.code }}</td>
            <td class="px-6 py-4 text-muted-foreground">{{ mat.name }}</td>
            <td class="px-6 py-4 text-muted-foreground">{{ mat.model }}</td>
            <td class="px-6 py-4 text-muted-foreground">{{ mat.category }}</td>
            <td class="px-6 py-4 text-muted-foreground">{{ mat.supplier }}</td>
            <td class="px-6 py-4">
              <span
                class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium border"
                :class="mat.supplier_master_id ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'"
              >
                {{ mat.supplier_master_id ? `已关联 #${mat.supplier_master_id}` : '未关联' }}
              </span>
              <div v-if="mat.supplierMaster" class="mt-1 text-xs text-muted-foreground">
                {{ mat.supplierMaster.supplier_name }} · {{ mat.supplierMaster.status }}
              </div>
            </td>
            <td class="px-6 py-4 text-emerald-600 font-semibold">¥{{ mat.price }}</td>
            <td class="px-6 py-4">
              <Button variant="ghost" size="sm" @click.stop="emit('edit', mat)">
                <Edit2 class="h-4 w-4" />
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="materials.length === 0 && !loading" class="p-8 text-center text-muted-foreground">
        暂无数据
      </div>
    </CardContent>
  </Card>
</template>
