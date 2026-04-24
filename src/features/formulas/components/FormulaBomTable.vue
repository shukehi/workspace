<script setup lang="ts">
import { computed } from 'vue';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { FormulaBOMItem } from '@/types/formula';
import type { BomMaterialCategory, FormulaValidationErrors } from '@/features/formulas/types';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-vue-next';

const props = defineProps<{
  bomDraft: FormulaBOMItem[];
  publishedBom?: FormulaBOMItem[];
  validationErrors: FormulaValidationErrors;
  materialCategories: readonly BomMaterialCategory[];
}>();

const emit = defineEmits<{
  (e: 'dirty'): void;
  (e: 'add-row'): void;
  (e: 'remove-row', index: number): void;
}>();

// Helper to compare items
const isItemEqual = (a: FormulaBOMItem, b: FormulaBOMItem) => {
  return a.materialId === b.materialId &&
         a.position === b.position &&
         a.materialCategory === b.materialCategory &&
         a.supplier === b.supplier &&
         a.usage.single === b.usage.single &&
         a.usage.double === b.usage.double &&
         a.usage.paired === b.usage.paired;
};

const diffItems = computed(() => {
  if (!props.publishedBom) return props.bomDraft.map(item => ({ item, status: 'none' as const }));

  return props.bomDraft.map(item => {
    const published = props.publishedBom!.find(p => p.materialId === item.materialId && p.position === item.position);
    
    if (!published) return { item, status: 'added' as const };
    if (!isItemEqual(item, published)) return { item, status: 'modified' as const, original: published };
    return { item, status: 'unchanged' as const };
  });
});

const removedItems = computed(() => {
  if (!props.publishedBom) return [];
  return props.publishedBom.filter(p => !props.bomDraft.some(d => d.materialId === p.materialId && d.position === p.position));
});

const hasDiff = computed(() => props.publishedBom && (diffItems.value.some(d => d.status !== 'unchanged') || removedItems.value.length > 0));
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold tracking-tight">物料清单 (BOM)</span>
        <Badge v-if="hasDiff" variant="outline" class="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
          检测到变更
        </Badge>
      </div>
      <Button size="sm" variant="outline" class="h-8 text-xs" @click="emit('add-row')">+ 新增物料</Button>
    </div>

    <p v-if="validationErrors.bom" class="text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded border border-rose-100">{{ validationErrors.bom }}</p>

    <div class="rounded-lg border shadow-sm overflow-hidden bg-background">
      <table class="w-full text-sm bom-table border-collapse">
        <thead class="bg-muted/50 border-b">
          <tr>
            <th class="p-2.5 text-left font-semibold text-muted-foreground">型号/编码</th>
            <th class="p-2.5 text-left font-semibold text-muted-foreground">位置</th>
            <th class="p-2.5 text-left font-semibold text-muted-foreground">类别</th>
            <th class="p-2.5 text-left font-semibold text-muted-foreground">供应商</th>
            <th class="p-2.5 text-right font-semibold text-muted-foreground">Single</th>
            <th class="p-2.5 text-right font-semibold text-muted-foreground">Double</th>
            <th class="p-2.5 text-right font-semibold text-muted-foreground">Paired</th>
            <th class="p-2.5 text-right font-semibold text-muted-foreground">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <!-- Active Items (Draft) -->
          <tr 
            v-for="(di, idx) in diffItems" 
            :key="`${idx}-${di.item.materialId}`"
            :class="cn(
              'transition-colors',
              di.status === 'added' && 'bg-emerald-50/50',
              di.status === 'modified' && 'bg-amber-50/30'
            )"
          >
            <td class="p-2 relative">
              <div v-if="di.status === 'added'" class="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500" />
              <div v-if="di.status === 'modified'" class="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500" />
              <Input v-model="di.item.materialId" class="h-8 text-xs border-muted-foreground/20 focus:border-primary" @update:model-value="emit('dirty')" />
              <p v-if="validationErrors[`bom.${idx}.materialId`]" class="text-[10px] text-rose-600 mt-1 font-medium">
                {{ validationErrors[`bom.${idx}.materialId`] }}
              </p>
            </td>
            <td class="p-2">
              <Input v-model="di.item.position" class="h-8 text-xs border-muted-foreground/20" @update:model-value="emit('dirty')" />
            </td>
            <td class="p-2">
              <select v-model="di.item.materialCategory" class="h-8 w-full rounded-md border border-muted-foreground/20 bg-background px-2 text-xs" @change="emit('dirty')">
                <option value="">请选择</option>
                <option v-for="cat in materialCategories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </td>
            <td class="p-2 text-xs">
              <Input v-model="di.item.supplier" class="h-8 text-xs border-muted-foreground/20" @update:model-value="emit('dirty')" />
            </td>
            <td class="p-2">
              <Input v-model="di.item.usage.single" type="number" class="h-8 text-xs text-right no-spin border-muted-foreground/20" @update:model-value="emit('dirty')" />
            </td>
            <td class="p-2">
              <Input v-model="di.item.usage.double" type="number" class="h-8 text-xs text-right no-spin border-muted-foreground/20" @update:model-value="emit('dirty')" />
            </td>
            <td class="p-2">
              <Input v-model="di.item.usage.paired" type="number" class="h-8 text-xs text-right no-spin border-muted-foreground/20" @update:model-value="emit('dirty')" />
            </td>
            <td class="p-2 text-right">
              <div class="flex items-center justify-end gap-1">
                <div v-if="di.status === 'modified'" class="group relative">
                  <Info class="w-3.5 h-3.5 text-amber-500 cursor-help" />
                  <div class="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-popover-foreground border rounded shadow-lg text-[10px] hidden group-hover:block z-50">
                    <p class="font-bold border-b pb-1 mb-1">变更前数值:</p>
                    <p>型号: {{ di.original?.materialId }}</p>
                    <p>用量: {{ di.original?.usage.single }}/{{ di.original?.usage.double }}/{{ di.original?.usage.paired }}</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" class="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600" @click="emit('remove-row', idx)">
                  <X class="w-3.5 h-3.5" />
                </Button>
              </div>
            </td>
          </tr>

          <!-- Removed Items (Diff Only) -->
          <tr v-for="ri in removedItems" :key="`rem-${ri.materialId}`" class="bg-rose-50/40 opacity-70 grayscale-[0.5]">
            <td class="p-2.5 text-xs line-through text-rose-800 font-medium relative">
              <div class="absolute left-0 top-0 bottom-0 w-0.5 bg-rose-500" />
              {{ ri.materialId }}
            </td>
            <td class="p-2.5 text-xs line-through">{{ ri.position }}</td>
            <td class="p-2.5 text-xs line-through">{{ ri.materialCategory }}</td>
            <td class="p-2.5 text-xs line-through">{{ ri.supplier }}</td>
            <td class="p-2.5 text-xs text-right line-through">{{ ri.usage.single }}</td>
            <td class="p-2.5 text-xs text-right line-through">{{ ri.usage.double }}</td>
            <td class="p-2.5 text-xs text-right line-through">{{ ri.usage.paired }}</td>
            <td class="p-2.5 text-right">
              <Badge variant="outline" class="text-[9px] bg-rose-100 text-rose-700 border-rose-200">已删除</Badge>
            </td>
          </tr>

          <tr v-if="diffItems.length === 0 && removedItems.length === 0">
            <td colspan="8" class="p-8 text-center text-muted-foreground italic">
              暂无 BOM 明细，请点击上方“新增物料”
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.bom-table th { font-weight: 600; }
.bom-table td { transition: background-color 0.2s ease; }

.no-spin::-webkit-outer-spin-button,
.no-spin::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.no-spin[type='number'] { -moz-appearance: textfield; }

/* Fixed widths to prevent jumping during diff */
.bom-table .col-material-id { width: 18%; }
.bom-table .col-usage { width: 8%; }
</style>
