<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MaterialRecord } from '@/features/materials/composables/useMaterialManagementPageState';

type EditableMaterial = Partial<MaterialRecord>;

const props = defineProps<{
  open: boolean
  modelValue: EditableMaterial
  title: string
  supplierMasterOptions: Array<{ id: number; supplierName: string }>
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'update:modelValue', value: EditableMaterial): void
  (e: 'save'): void
}>();

function updateField<K extends keyof EditableMaterial>(key: K, value: EditableMaterial[K]) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  });
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>
          请完善物料的基础信息。
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="code" class="text-right">编码</Label>
          <Input id="code" :model-value="modelValue.code" class="col-span-3" @update:model-value="updateField('code', String($event))" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="name" class="text-right">名称</Label>
          <Input id="name" :model-value="modelValue.name" class="col-span-3" @update:model-value="updateField('name', String($event))" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="model" class="text-right">型号</Label>
          <Input id="model" :model-value="modelValue.model" class="col-span-3" @update:model-value="updateField('model', String($event))" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="supplier" class="text-right">供应商</Label>
          <Input id="supplier" :model-value="modelValue.supplier" class="col-span-3" @update:model-value="updateField('supplier', String($event))" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">主数据链接</Label>
          <div class="col-span-3 text-sm text-muted-foreground">
            <template v-if="modelValue.supplier_master_id">
              已关联 supplier_master #{{ modelValue.supplier_master_id }}
              <span v-if="modelValue.supplierMaster">（{{ modelValue.supplierMaster.supplier_name }}）</span>
            </template>
            <template v-else>
              保存后按供应商名称自动尝试关联
            </template>
          </div>
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">手动关联</Label>
          <select
            :value="modelValue.supplier_master_id ?? ''"
            class="col-span-3 h-9 rounded-md border bg-background px-3 text-sm"
            @change="updateField('supplier_master_id', ($event.target as HTMLSelectElement).value === '' ? null : Number(($event.target as HTMLSelectElement).value))"
          >
            <option value="">自动匹配 / 不指定</option>
            <option v-for="supplier in supplierMasterOptions" :key="supplier.id" :value="supplier.id">
              {{ supplier.supplierName }} (#{{ supplier.id }})
            </option>
          </select>
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="price" class="text-right">单价</Label>
          <Input
            id="price"
            type="number"
            :model-value="modelValue.price ?? 0"
            class="col-span-3"
            @update:model-value="updateField('price', Number($event))"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" @click="emit('save')">保存</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
