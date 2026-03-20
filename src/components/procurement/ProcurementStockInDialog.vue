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
import type { Order, StockInOrderItemInput } from '@/types/order';
import type { InventoryLocation, Warehouse } from '@/types/inventory';
import {
  buildFullStockInItems,
  buildSelectedStockInItems,
  buildStockInDraftItems,
  normalizeStockInNumber,
  type StockInDraftItem,
} from '@/features/procurement/stockInDraft';

const props = defineProps<{
  open: boolean;
  order: Order | null;
  saving?: boolean;
  queueIndex?: number;
  queueTotal?: number;
  warehouses: Warehouse[];
  locations: InventoryLocation[];
  locationsLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'submit', payload: {
    stocked_in_at?: string;
    operator?: string;
    remark?: string;
    warehouse_id: number;
    location_id: number;
    items: StockInOrderItemInput[];
  }): void;
}>();

const operator = ref('');
const remark = ref('');
const items = ref<StockInDraftItem[]>([]);
const selectedWarehouseId = ref('');
const selectedLocationId = ref('');

watch(
  () => [props.open, props.order, props.warehouses, props.locations] as const,
  ([open, order]) => {
    if (!open) return;
    operator.value = '';
    remark.value = '';
    selectedWarehouseId.value = props.warehouses[0] ? String(props.warehouses[0].id) : '';
    const initialLocation = props.warehouses[0]
      ? props.locations.find((location) => location.warehouse_id === props.warehouses[0].id && location.status === 'active')
      : undefined;
    selectedLocationId.value = initialLocation ? String(initialLocation.id) : '';
    items.value = buildStockInDraftItems(order);
  },
  { immediate: true, deep: true }
);

const filteredLocations = computed(() => {
  const warehouseId = Number(selectedWarehouseId.value);
  if (!Number.isInteger(warehouseId) || warehouseId <= 0) return [];
  return props.locations.filter((location) => location.warehouse_id === warehouseId && location.status === 'active');
});

watch(selectedWarehouseId, (warehouseId) => {
  const nextLocation = filteredLocations.value[0];
  if (!warehouseId) {
    selectedLocationId.value = '';
    return;
  }
  if (!filteredLocations.value.some((location) => location.id === Number(selectedLocationId.value))) {
    selectedLocationId.value = nextLocation ? String(nextLocation.id) : '';
  }
});

const selectedItems = computed<StockInOrderItemInput[]>(() => buildSelectedStockInItems(items.value));
const fullRemainingItems = computed<StockInOrderItemInput[]>(() => buildFullStockInItems(items.value));
const hasNextQueueOrder = computed(() => (props.queueTotal || 0) > 1 && (props.queueIndex || 1) < (props.queueTotal || 0));

const hasInvalidQuantity = computed(() => (
  items.value.some((item) => {
    const quantity = normalizeStockInNumber(item.quantity);
    return quantity < 0 || quantity > item.remaining;
  })
));

const submitDisabled = computed(() => (
  props.saving
  || items.value.length === 0
  || selectedItems.value.length === 0
  || !selectedWarehouseId.value
  || !selectedLocationId.value
  || hasInvalidQuantity.value
));

function fillRemaining(index: number) {
  const item = items.value[index];
  if (!item) return;
  item.quantity = String(item.remaining);
}

function clearQuantity(index: number) {
  const item = items.value[index];
  if (!item) return;
  item.quantity = '';
}

function emitSubmit(itemsPayload: StockInOrderItemInput[]) {
  emit('submit', {
    stocked_in_at: new Date().toISOString(),
    operator: operator.value.trim() || undefined,
    remark: remark.value,
    warehouse_id: Number(selectedWarehouseId.value),
    location_id: Number(selectedLocationId.value),
    items: itemsPayload,
  });
}

function handleSubmit() {
  if (submitDisabled.value) return;
  emitSubmit(selectedItems.value);
}

function handleSubmitAllRemaining() {
  if (props.saving || fullRemainingItems.value.length === 0) return;
  emitSubmit(fullRemainingItems.value);
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-[920px]">
        <DialogHeader>
          <DialogTitle>执行入库</DialogTitle>
          <DialogDescription>
            <span v-if="(queueTotal || 0) > 1" class="mr-2">批量入库第 {{ queueIndex || 1 }} / {{ queueTotal }} 单</span>
            <span v-if="order">订单 {{ order.order_no }}</span>
            <span v-else>按明细填写本次入库数量</span>
          </DialogDescription>
        </DialogHeader>

      <div class="space-y-4">
        <div class="grid gap-3 md:grid-cols-[180px_1fr]">
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
            <span class="text-muted-foreground">入库库位</span>
            <select v-model="selectedLocationId" class="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">请选择库位</option>
              <option v-for="location in filteredLocations" :key="location.id" :value="String(location.id)">
                {{ location.name }} ({{ location.code }})
              </option>
            </select>
          </label>
        </div>

        <div class="grid gap-3 md:grid-cols-[180px_1fr]">
          <label class="space-y-1 text-sm">
            <span class="text-muted-foreground">操作人</span>
            <Input v-model="operator" placeholder="例如：仓管A" />
          </label>
          <label class="space-y-1 text-sm">
            <span class="text-muted-foreground">备注</span>
            <Textarea v-model="remark" rows="2" placeholder="例如：首批到货" />
          </label>
        </div>

        <p v-if="locationsLoading" class="text-xs text-muted-foreground">
          正在加载库位配置...
        </p>

        <div class="rounded-md border overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-muted/50">
              <tr class="text-left">
                <th class="px-3 py-2 font-medium">明细</th>
                <th class="px-3 py-2 font-medium">采购数量</th>
                <th class="px-3 py-2 font-medium">已入库</th>
                <th class="px-3 py-2 font-medium">剩余待入库</th>
                <th class="px-3 py-2 font-medium min-w-[160px]">本次入库</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in items" :key="item.order_item_id" class="border-t">
                <td class="px-3 py-2">
                  <div class="font-medium">{{ item.label }}</div>
                  <div class="text-xs text-muted-foreground">{{ item.unit || '-' }}</div>
                </td>
                <td class="px-3 py-2">{{ item.ordered }}</td>
                <td class="px-3 py-2">{{ item.received }}</td>
                <td class="px-3 py-2">{{ item.remaining }}</td>
                <td class="px-3 py-2">
                  <div class="flex items-center gap-2">
                    <Input
                      v-model="item.quantity"
                      type="number"
                      min="0"
                      :max="String(item.remaining)"
                      step="0.01"
                      class="h-9"
                    />
                    <Button variant="outline" size="sm" type="button" @click="fillRemaining(index)">全入</Button>
                    <Button variant="ghost" size="sm" type="button" @click="clearQuantity(index)">清空</Button>
                  </div>
                  <p
                    v-if="Number(item.quantity || 0) > item.remaining"
                    class="mt-1 text-xs text-rose-600"
                  >
                    本次入库不能超过剩余待入库数量
                  </p>
                </td>
              </tr>
              <tr v-if="items.length === 0">
                <td colspan="5" class="px-3 py-8 text-center text-sm text-muted-foreground">
                  当前订单没有可继续入库的明细
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between gap-3">
          <p class="text-xs text-muted-foreground">
            订单级“入库日期”只会在全部明细完成入库后写入；部分入库明细请从入库记录查看。
          </p>
          <div class="flex items-center gap-2">
            <Button variant="outline" :disabled="saving" @click="$emit('update:open', false)">取消</Button>
            <Button
              v-if="hasNextQueueOrder"
              variant="secondary"
              :disabled="saving || fullRemainingItems.length === 0"
              @click="handleSubmitAllRemaining"
            >
              {{ saving ? '入库中...' : '全入当前单并下一单' }}
            </Button>
            <Button :disabled="submitDisabled" @click="handleSubmit">
              {{ saving ? '入库中...' : '确认入库' }}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
