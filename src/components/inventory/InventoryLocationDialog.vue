<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { InventoryLocationPayload } from '@/features/inventory/inventoryStoreFlows';
import type { InventoryLocation, Warehouse } from '@/types/inventory';

const props = defineProps<{
  open: boolean;
  saving?: boolean;
  warehouses: Warehouse[];
  location?: InventoryLocation | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'submit', payload: InventoryLocationPayload): void;
}>();

const warehouseId = ref('');
const code = ref('');
const name = ref('');
const status = ref<'active' | 'inactive'>('active');
const remark = ref('');
const sortOrder = ref('0');

watch(
  () => [props.open, props.location, props.warehouses] as const,
  ([open, location]) => {
    if (!open) return;
    warehouseId.value = String(location?.warehouse_id || props.warehouses[0]?.id || '');
    code.value = location?.code || '';
    name.value = location?.name || '';
    status.value = location?.status || 'active';
    remark.value = location?.remark || '';
    sortOrder.value = String(location?.sort_order ?? 0);
  },
  { immediate: true, deep: true },
);

const submitDisabled = computed(() => {
  return props.saving
    || !warehouseId.value
    || !code.value.trim()
    || !name.value.trim();
});

const warehouseLocked = computed(() => Boolean(props.location));

function handleSubmit() {
  if (submitDisabled.value) return;
  emit('submit', {
    warehouse_id: Number(warehouseId.value),
    code: code.value.trim(),
    name: name.value.trim(),
    status: status.value,
    remark: remark.value.trim() || undefined,
    sort_order: Number(sortOrder.value || 0),
  });
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-[560px]">
      <DialogHeader>
        <DialogTitle>{{ location ? '编辑库位' : '新建库位' }}</DialogTitle>
        <DialogDescription>
          本期只支持单仓多库位管理，不支持仓间调拨。
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div class="grid gap-3 md:grid-cols-2">
          <label class="space-y-1 text-sm">
            <span class="text-muted-foreground">所属仓库</span>
            <select v-model="warehouseId" :disabled="warehouseLocked" class="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60">
              <option value="">请选择仓库</option>
              <option v-for="warehouse in warehouses" :key="warehouse.id" :value="String(warehouse.id)">
                {{ warehouse.name }}
              </option>
            </select>
            <p v-if="warehouseLocked" class="text-xs text-muted-foreground">
              已建库位不允许更换所属仓库。
            </p>
          </label>
          <label class="space-y-1 text-sm">
            <span class="text-muted-foreground">状态</span>
            <select v-model="status" class="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </label>
          <label class="space-y-1 text-sm">
            <span class="text-muted-foreground">库位编码</span>
            <Input v-model="code" placeholder="例如：A-01" />
          </label>
          <label class="space-y-1 text-sm">
            <span class="text-muted-foreground">库位名称</span>
            <Input v-model="name" placeholder="例如：主通道 A1" />
          </label>
          <label class="space-y-1 text-sm">
            <span class="text-muted-foreground">排序值</span>
            <Input v-model="sortOrder" type="number" min="0" step="1" />
          </label>
        </div>

        <label class="space-y-1 text-sm block">
          <span class="text-muted-foreground">备注</span>
          <Textarea v-model="remark" rows="3" placeholder="可选，记录库位用途或限制" />
        </label>

        <div class="flex items-center justify-end gap-2">
          <Button variant="outline" :disabled="saving" @click="$emit('update:open', false)">取消</Button>
          <Button :disabled="submitDisabled" @click="handleSubmit">
            {{ saving ? '保存中...' : '保存库位' }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
