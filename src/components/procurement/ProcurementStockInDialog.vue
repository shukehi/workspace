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

type StockInDraftItem = {
  order_item_id: number;
  item_key: string;
  label: string;
  ordered: number;
  received: number;
  remaining: number;
  quantity: string;
  unit: string;
};

const props = defineProps<{
  open: boolean;
  order: Order | null;
  saving?: boolean;
  queueIndex?: number;
  queueTotal?: number;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'submit', payload: {
    stocked_in_at?: string;
    operator?: string;
    remark?: string;
    items: StockInOrderItemInput[];
  }): void;
}>();

const operator = ref('');
const remark = ref('');
const items = ref<StockInDraftItem[]>([]);

function normalizeNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function resolveOrderedQuantity(rawOrdered: unknown, rawQuantity: unknown): number {
  const ordered = normalizeNumber(rawOrdered);
  if (ordered > 0) return ordered;
  return normalizeNumber(rawQuantity);
}

function buildDraftItems(order: Order | null): StockInDraftItem[] {
  if (!order?.items?.length) return [];
  return order.items
    .map((item) => {
      const ordered = resolveOrderedQuantity(item.ordered_quantity, item.quantity);
      const received = normalizeNumber(item.received_quantity);
      const remaining = Math.max(ordered - received, 0);
      return {
        order_item_id: item.id,
        item_key: item.item_key || '',
        label: String(item.name || item.type || item.model || '-'),
        ordered,
        received,
        remaining,
        quantity: '',
        unit: item.unit || '',
      };
    })
    .filter((item) => item.remaining > 0);
}

watch(
  () => [props.open, props.order] as const,
  ([open, order]) => {
    if (!open) return;
    operator.value = '';
    remark.value = '';
    items.value = buildDraftItems(order);
  },
  { immediate: true, deep: true }
);

const selectedItems = computed<StockInOrderItemInput[]>(() => (
  items.value
    .map((item) => ({
      order_item_id: item.order_item_id,
      item_key: item.item_key,
      quantity: normalizeNumber(item.quantity),
      remaining: item.remaining,
    }))
    .filter((item) => item.quantity > 0)
    .map(({ remaining, ...item }) => item)
));

const hasInvalidQuantity = computed(() => (
  items.value.some((item) => {
    const quantity = normalizeNumber(item.quantity);
    return quantity < 0 || quantity > item.remaining;
  })
));

const submitDisabled = computed(() => (
  props.saving
  || items.value.length === 0
  || selectedItems.value.length === 0
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

function handleSubmit() {
  if (submitDisabled.value) return;
  emit('submit', {
    stocked_in_at: new Date().toISOString(),
    operator: operator.value.trim() || undefined,
    remark: remark.value,
    items: selectedItems.value,
  });
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
            <span class="text-muted-foreground">操作人</span>
            <Input v-model="operator" placeholder="例如：仓管A" />
          </label>
          <label class="space-y-1 text-sm">
            <span class="text-muted-foreground">备注</span>
            <Textarea v-model="remark" rows="2" placeholder="例如：首批到货" />
          </label>
        </div>

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
            <Button :disabled="submitDisabled" @click="handleSubmit">
              {{ saving ? '入库中...' : '确认入库' }}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
