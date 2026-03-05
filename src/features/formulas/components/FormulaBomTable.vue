<script setup lang="ts">
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { FormulaBOMItem } from '@/types/formula';
import type { BomMaterialCategory, FormulaValidationErrors } from '@/features/formulas/types';

defineProps<{
  bomDraft: FormulaBOMItem[];
  validationErrors: FormulaValidationErrors;
  materialCategories: readonly BomMaterialCategory[];
}>();

const emit = defineEmits<{
  (e: 'dirty'): void;
  (e: 'add-row'): void;
  (e: 'remove-row', index: number): void;
}>();
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <div class="text-sm font-medium">BOM 明细</div>
      <Button size="sm" variant="outline" @click="emit('add-row')">+ 新增行</Button>
    </div>

    <p v-if="validationErrors.bom" class="text-xs text-rose-600">{{ validationErrors.bom }}</p>

    <div class="rounded-md border overflow-auto">
      <table class="w-full text-sm bom-table">
        <colgroup>
          <col class="col-material-id" />
          <col class="col-position" />
          <col class="col-category" />
          <col class="col-supplier" />
          <col class="col-usage" />
          <col class="col-usage" />
          <col class="col-usage" />
          <col class="col-action" />
        </colgroup>
        <thead class="bg-muted/40">
          <tr>
            <th class="p-2 text-left">型号</th>
            <th class="p-2 text-left">Position</th>
            <th class="p-2 text-left">类别</th>
            <th class="p-2 text-left">供应商</th>
            <th class="p-2 text-right">Single</th>
            <th class="p-2 text-right">Double</th>
            <th class="p-2 text-right">Paired</th>
            <th class="p-2 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in bomDraft" :key="`${idx}-${row.materialId}-${row.position}`" class="border-t">
            <td class="p-2">
              <Input v-model="row.materialId" @update:model-value="emit('dirty')" />
              <p v-if="validationErrors[`bom.${idx}.materialId`]" class="text-xs text-rose-600 mt-1">
                {{ validationErrors[`bom.${idx}.materialId`] }}
              </p>
            </td>
            <td class="p-2">
              <Input v-model="row.position" @update:model-value="emit('dirty')" />
              <p v-if="validationErrors[`bom.${idx}.position`]" class="text-xs text-rose-600 mt-1">
                {{ validationErrors[`bom.${idx}.position`] }}
              </p>
            </td>
            <td class="p-2">
              <select v-model="row.materialCategory" class="h-9 w-full rounded-md border bg-background px-2 text-sm" @change="emit('dirty')">
                <option value="">请选择</option>
                <option v-for="cat in materialCategories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
              <p v-if="validationErrors[`bom.${idx}.materialCategory`]" class="text-xs text-rose-600 mt-1">
                {{ validationErrors[`bom.${idx}.materialCategory`] }}
              </p>
            </td>
            <td class="p-2">
              <Input v-model="row.supplier" @update:model-value="emit('dirty')" />
              <p v-if="validationErrors[`bom.${idx}.supplier`]" class="text-xs text-rose-600 mt-1">
                {{ validationErrors[`bom.${idx}.supplier`] }}
              </p>
            </td>
            <td class="p-2">
              <Input v-model="row.usage.single" type="number" min="0" class="no-spin text-right" @update:model-value="emit('dirty')" />
            </td>
            <td class="p-2">
              <Input v-model="row.usage.double" type="number" min="0" class="no-spin text-right" @update:model-value="emit('dirty')" />
            </td>
            <td class="p-2">
              <Input v-model="row.usage.paired" type="number" min="0" class="no-spin text-right" @update:model-value="emit('dirty')" />
            </td>
            <td class="p-2 text-right">
              <Button size="sm" variant="ghost" @click="emit('remove-row', idx)">删除</Button>
              <p v-if="validationErrors[`bom.${idx}.dup`]" class="text-xs text-rose-600 mt-1">
                {{ validationErrors[`bom.${idx}.dup`] }}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.bom-table .col-material-id {
  width: 18%;
}

.bom-table .col-position {
  width: 14%;
}

.bom-table .col-category {
  width: 16%;
}

.bom-table .col-supplier {
  width: 20%;
}

.bom-table .col-usage {
  width: 8%;
}

.bom-table .col-action {
  width: 10%;
}

.no-spin::-webkit-outer-spin-button,
.no-spin::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.no-spin[type='number'] {
  -moz-appearance: textfield;
}
</style>
