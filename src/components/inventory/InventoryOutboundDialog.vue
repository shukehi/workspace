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
import type { InventoryItem, InventoryLocation, Warehouse } from '@/types/inventory';

type DraftItem = {
  material_id: number;
  label: string;
  unit: string;
  totalStock: number;
  availableAtLocation: number;
  quantity: string;
};

const props = defineProps<{
  open: boolean;
  saving?: boolean;
  items: InventoryItem[];
  warehouses: Warehouse[];
  locations: InventoryLocation[];
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'submit', payload: {
    warehouse_id: number;
    location_id: number;
    operator?: string;
    reason: string;
    remark?: string;
    outbound_date: string;
    items: Array<{
      material_id: number;
      item_name: string;
      unit: string;
      quantity: number;
    }>;
  }): void;
}>();

const selectedWarehouseId = ref('');
const selectedLocationId = ref('');
const operator = ref('');
const reason = ref('');
const remark = ref('');
const draftItems = ref<DraftItem[]>([]);

const filteredLocations = computed(() => {
  const warehouseId = Number(selectedWarehouseId.value);
  if (!Number.isInteger(warehouseId) || warehouseId <= 0) return [];
  return props.locations.filter((location) => location.warehouse_id === warehouseId && location.status === 'active');
});

function buildDraftItems(items: InventoryItem[], locationId: number): DraftItem[] {
  return items.map((item) => {
    const match = (item.locations || []).find((entry) => entry.locationId === locationId);
    return {
      material_id: item.id,
      label: item.model || item.name || item.code,
      unit: item.unit,
      totalStock: Number(item.stock_quantity || 0),
      availableAtLocation: Number(match?.quantity || 0),
      quantity: '',
    };
  });
}

function resetForm() {
  const firstWarehouse = props.warehouses[0];
  selectedWarehouseId.value = firstWarehouse ? String(firstWarehouse.id) : '';
  const initialLocation = firstWarehouse
    ? props.locations.find((location) => location.warehouse_id === firstWarehouse.id && location.status === 'active')
    : undefined;
  selectedLocationId.value = initialLocation ? String(initialLocation.id) : '';
  operator.value = '';
  reason.value = '';
  remark.value = '';
  draftItems.value = buildDraftItems(props.items, Number(selectedLocationId.value));
}

watch(
  () => [props.open, props.items, props.warehouses, props.locations] as const,
  ([open]) => {
    if (!open) return;
    resetForm();
  },
  { immediate: true, deep: true },
);

watch(selectedWarehouseId, (warehouseId) => {
  const numericWarehouseId = Number(warehouseId);
  const nextLocation = props.locations.find((location) => location.warehouse_id === numericWarehouseId && location.status === 'active');
  selectedLocationId.value = nextLocation ? String(nextLocation.id) : '';
});

watch(selectedLocationId, (locationId) => {
  draftItems.value = buildDraftItems(props.items, Number(locationId));
});

const submitItems = computed(() => {
  return draftItems.value
    .map((item) => ({
      material_id: item.material_id,
      item_name: item.label,
      unit: item.unit,
      quantity: Number(item.quantity || 0),
    }))
    .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);
});

const hasInvalidQuantity = computed(() => {
  return draftItems.value.some((item) => {
    const quantity = Number(item.quantity || 0);
    return quantity < 0 || quantity > item.availableAtLocation;
  });
});

const submitDisabled = computed(() => {
  return props.saving
    || !selectedWarehouseId.value
    || !selectedLocationId.value
    || !reason.value.trim()
    || submitItems.value.length === 0
    || hasInvalidQuantity.value;
});

function fillAvailable(index: number) {
  const item = draftItems.value[index];
  if (!item) return;
  item.quantity = String(item.availableAtLocation);
}

function clearQuantity(index: number) {
  const item = draftItems.value[index];
  if (!item) return;
  item.quantity = '';
}

function handleSubmit() {
  if (submitDisabled.value) return;
  emit('submit', {
    warehouse_id: Number(selectedWarehouseId.value),
    location_id: Number(selectedLocationId.value),
    operator: operator.value.trim() || undefined,
    reason: reason.value.trim(),
    remark: remark.value.trim() || undefined,
    outbound_date: new Date().toISOString(),
    items: submitItems.value,
  });
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-[920px]">
      <DialogHeader>
        <DialogTitle>登记出库</DialogTitle>
        <DialogDescription>
          选择单一库位执行本次手工出库，当前批次不支持自动跨库位拆分。
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div class="grid gap-3 md:grid-cols-2">
          <label class="space-y-1 text-sm">
            <span class="text-muted-foreground">仓库</span>
            <select v-model="selectedWarehouseId" class="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">请选择仓库</option>
              <option v-for="warehouse in warehouses" :key="warehouse.id" :value="String(warehouse.id)">
                {{ warehouse.name }}
              </option>
            </select>
          </label>
          <label class="space-y-1 text-sm">
            <span class="text-muted-foreground">库位</span>
            <select v-model="selectedLocationId" class="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">请选择库位</option>
              <option v-for="location in filteredLocations" :key="location.id" :value="String(location.id)">
                {{ location.name }} ({{ location.code }})
              </option>
            </select>
          </label>
          <label class="space-y-1 text-sm">
            <span class="text-muted-foreground">操作人</span>
            <Input v-model="operator" placeholder="例如：仓管A" />
          </label>
          <label class="space-y-1 text-sm">
            <span class="text-muted-foreground">用途 / 原因</span>
            <Input v-model="reason" placeholder="例如：样品领用 / 维修补件" />
          </label>
        </div>

        <label class="space-y-1 text-sm block">
          <span class="text-muted-foreground">备注</span>
          <Textarea v-model="remark" rows="2" placeholder="可选，记录出库去向或补充说明" />
        </label>

        <div class="rounded-md border overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-muted/50">
              <tr class="text-left">
                <th class="px-3 py-2 font-medium">物料</th>
                <th class="px-3 py-2 font-medium">总库存</th>
                <th class="px-3 py-2 font-medium">当前库位可出</th>
                <th class="px-3 py-2 font-medium min-w-[180px]">本次出库</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in draftItems" :key="item.material_id" class="border-t">
                <td class="px-3 py-2">
                  <div class="font-medium">{{ item.label }}</div>
                  <div class="text-xs text-muted-foreground">{{ item.unit || '-' }}</div>
                </td>
                <td class="px-3 py-2">{{ item.totalStock }}</td>
                <td class="px-3 py-2">{{ item.availableAtLocation }}</td>
                <td class="px-3 py-2">
                  <div class="flex items-center gap-2">
                    <Input
                      v-model="item.quantity"
                      type="number"
                      min="0"
                      :max="String(item.availableAtLocation)"
                      step="0.01"
                      class="h-9"
                    />
                    <Button variant="outline" size="sm" type="button" @click="fillAvailable(index)">全出</Button>
                    <Button variant="ghost" size="sm" type="button" @click="clearQuantity(index)">清空</Button>
                  </div>
                  <p v-if="Number(item.quantity || 0) > item.availableAtLocation" class="mt-1 text-xs text-rose-600">
                    出库数量不能超过当前库位可用数量
                  </p>
                </td>
              </tr>
              <tr v-if="draftItems.length === 0">
                <td colspan="4" class="px-3 py-8 text-center text-sm text-muted-foreground">
                  请先在库存列表勾选要出库的物料
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between gap-3">
          <p class="text-xs text-muted-foreground">
            每条明细只能从一个库位扣减，若同一物料需要跨库位出库，请分多次登记。
          </p>
          <div class="flex items-center gap-2">
            <Button variant="outline" :disabled="saving" @click="$emit('update:open', false)">取消</Button>
            <Button :disabled="submitDisabled" @click="handleSubmit">
              {{ saving ? '提交中...' : '确认出库' }}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
