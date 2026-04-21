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
import type { SupplierMasterEntry } from '@/services/mappingConfigApi';

type EditableSupplier = Partial<SupplierMasterEntry>;

const props = defineProps<{
  open: boolean
  modelValue: EditableSupplier
  title: string
  saving?: boolean
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'update:modelValue', value: EditableSupplier): void
  (e: 'save'): void
}>();

function updateField<K extends keyof EditableSupplier>(key: K, value: EditableSupplier[K]) {
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
          维护供应商主数据条目。
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">供应商</Label>
          <Input :model-value="modelValue.supplierName" class="col-span-3" @update:model-value="updateField('supplierName', String($event))" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">状态</Label>
          <select
            :value="modelValue.status || 'active'"
            class="col-span-3 h-9 rounded-md border bg-background px-3 text-sm"
            @change="updateField('status', ($event.target as HTMLSelectElement).value as 'active' | 'inactive')"
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">备注</Label>
          <Input :model-value="modelValue.sourceNote" class="col-span-3" @update:model-value="updateField('sourceNote', String($event))" />
        </div>
      </div>
      <DialogFooter>
        <Button :disabled="saving" @click="emit('save')">保存</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
