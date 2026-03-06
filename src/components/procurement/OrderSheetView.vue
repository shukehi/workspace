<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Order, OrderItem } from '@/types/order';
import { normalizePrintCategory, type PrintCategory } from '@/features/procurement/docModel';
import { getSheetSchema, getDisplayValue, getEditableValue, setEditableValue, isNumericColumn } from '@/features/procurement/order-sheet.schema';

type Mode = 'edit' | 'preview';

const props = withDefaults(defineProps<{
  order: Partial<Order>;
  mode: Mode;
  columnWidths: Record<string, number>;
  defaultWidths: Record<string, number>;
}>(), {
  mode: 'preview'
});

const emit = defineEmits<{
  (e: 'update:columnWidths', value: Record<string, number>): void;
}>();

const isEditMode = computed(() => props.mode === 'edit');
const category = computed<PrintCategory>(() => normalizePrintCategory(props.order.category));
const isPackaging = computed(() => category.value === 'packaging');
const items = computed(() => (props.order.items || []) as OrderItem[]);
const schema = computed(() => getSheetSchema(category.value));

const formattedOrderDate = computed({
  get: () => props.order.created_at ? new Date(props.order.created_at).toISOString().split('T')[0] : '',
  set: (val) => {
    if (val) props.order.created_at = new Date(val).toISOString();
  }
});

const formattedDeliveryDate = computed({
  get: () => props.order.delivery_date ? new Date(props.order.delivery_date).toISOString().split('T')[0] : '',
  set: (val) => {
    if (val) props.order.delivery_date = new Date(val).toISOString();
  }
});

const resizing = ref<{ key: string; startX: number; startWidth: number } | null>(null);

function getColumnWidth(key: string) {
  return props.columnWidths[key] || props.defaultWidths[key] || 120;
}

function getColumnMinWidth(key: string) {
  if (key === 'no') return 36;
  if (key === 'quantity' || key === 'qtyLeft' || key === 'qtyRight') return 62;
  if (key === 'unit') return 50;
  if (key === 'remark') return 160;
  return 90;
}

function getAlignClass(align: 'left' | 'center' | 'right') {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

function onResizeMove(event: MouseEvent) {
  if (!resizing.value) return;
  const deltaX = event.clientX - resizing.value.startX;
  const width = Math.max(getColumnMinWidth(resizing.value.key), resizing.value.startWidth + deltaX);
  emit('update:columnWidths', {
    ...props.columnWidths,
    [resizing.value.key]: width
  });
}

function stopResizing() {
  resizing.value = null;
  document.body.style.userSelect = '';
  window.removeEventListener('mousemove', onResizeMove);
  window.removeEventListener('mouseup', stopResizing);
}

function startResize(key: string, event: MouseEvent) {
  if (!isEditMode.value) return;
  event.preventDefault();
  resizing.value = {
    key,
    startX: event.clientX,
    startWidth: getColumnWidth(key)
  };
  document.body.style.userSelect = 'none';
  window.addEventListener('mousemove', onResizeMove);
  window.addEventListener('mouseup', stopResizing);
}

function resetSingleColumnWidth(key: string) {
  if (!isEditMode.value) return;
  emit('update:columnWidths', {
    ...props.columnWidths,
    [key]: props.defaultWidths[key] || 120
  });
}

function handleCellInput(item: Partial<OrderItem>, key: string, value: string) {
  if (isNumericColumn(key)) {
    const nextValue = value === '' ? null : Number(value);
    setEditableValue(item, key, nextValue);
    return;
  }
  setEditableValue(item, key, value);
}

onBeforeUnmount(() => {
  stopResizing();
});
</script>

<template>
  <div class="order-sheet bg-card border rounded-lg p-6 max-w-[210mm] mx-auto min-h-[500px]">
    <div class="mb-6 border rounded-lg p-4">
      <h1 class="text-xl font-semibold text-center mb-5">采购订单</h1>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <Label class="min-w-16">客户名称:</Label>
            <Input v-if="isEditMode" v-model="order.metadata!.customer_name" placeholder="内部" class="h-8 text-xs" />
            <span v-else class="text-xs">{{ order.metadata?.customer_name || '-' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <Label class="min-w-16">订单号:</Label>
            <span class="font-medium">{{ order.order_no || '-' }}</span>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <Label class="min-w-16">内部名称:</Label>
            <Input v-if="isEditMode && isPackaging" v-model="order.metadata!.internal_name" class="h-8 text-xs" />
            <span v-else class="text-xs">{{ order.metadata?.internal_name || '-' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <Label class="min-w-16">外协名称:</Label>
            <Input v-if="isEditMode && isPackaging" v-model="order.metadata!.external_name" class="h-8 text-xs" />
            <span v-else class="text-xs">{{ order.metadata?.external_name || '-' }}</span>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <Label class="min-w-16">制单日期:</Label>
            <Input v-if="isEditMode" type="date" v-model="formattedOrderDate" class="h-8 text-xs w-36" />
            <span v-else class="text-xs">{{ formattedOrderDate || '-' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <Label class="min-w-16">交货日期:</Label>
            <Input v-if="isEditMode" type="date" v-model="formattedDeliveryDate" class="h-8 text-xs w-36" />
            <span v-else class="text-xs">{{ formattedDeliveryDate || '-' }}</span>
          </div>
        </div>
      </div>

      <div class="mt-4 pt-4 border-t border-dashed">
        <div class="flex items-center gap-2">
          <Label class="min-w-16">供应商:</Label>
          <Input v-if="isEditMode" v-model="order.supplier" class="h-8 text-xs w-64" />
          <span v-else class="text-xs">{{ order.supplier || '-' }}</span>
        </div>
      </div>
    </div>

    <div class="border rounded-lg overflow-hidden">
      <table class="w-full text-xs table-fixed">
        <colgroup>
          <col
            v-for="column in schema.columns"
            :key="`col-${column.key}`"
            :style="{ width: `${getColumnWidth(column.key)}px` }"
          />
        </colgroup>
        <thead class="bg-muted/40 border-b">
          <tr>
            <th
              v-for="column in schema.columns"
              :key="`head-${column.key}`"
              class="border-r p-2 relative resizable-th"
              :class="getAlignClass(column.align)"
            >
              {{ column.label }}
              <div
                class="col-resize-handle"
                :class="!isEditMode ? 'disabled' : ''"
                @mousedown.stop.prevent="startResize(column.key, $event)"
                @dblclick.stop.prevent="resetSingleColumnWidth(column.key)"
              />
            </th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-for="(item, idx) in items" :key="idx" class="hover:bg-muted/30">
            <td
              v-for="column in schema.columns"
              :key="`cell-${idx}-${column.key}`"
              class="border-r p-0"
              :class="getAlignClass(column.align)"
            >
              <template v-if="column.key === 'no'">
                <div class="w-full h-full p-2 text-muted-foreground text-center">{{ idx + 1 }}</div>
              </template>
              <template v-else-if="isEditMode">
                <input
                  :value="getEditableValue(item, column.key)"
                  :type="column.inputType"
                  class="w-full h-full p-2 bg-transparent outline-none focus:bg-muted/40"
                  :class="column.align === 'center' ? 'text-center' : ''"
                  @input="handleCellInput(item, column.key, ($event.target as HTMLInputElement).value)"
                />
              </template>
              <template v-else>
                <div
                  class="w-full h-full p-2"
                  :class="[
                    column.align === 'center' ? 'text-center' : '',
                    column.key === 'productModelName' ? 'whitespace-pre-line text-left' : ''
                  ]"
                >
                  {{ getDisplayValue(item, column.key, idx) }}
                </div>
              </template>
            </td>
          </tr>
          <tr v-if="schema.columns.length === 7 && items.length < 5" v-for="i in (5 - items.length)" :key="`empty-${i}`">
            <td v-for="column in schema.columns" :key="`empty-cell-${i}-${column.key}`" class="border-r p-2">&nbsp;</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex justify-between mt-10 pt-5 border-t text-sm">
      <div class="flex items-end gap-2">
        <span>制单人:</span>
        <div class="w-24 border-b mb-[1px]"></div>
      </div>
      <div class="flex items-end gap-2">
        <span>审核人:</span>
        <div class="w-24 border-b mb-[1px]"></div>
      </div>
      <div class="flex items-end gap-2">
        <span>供应商签字:</span>
        <div class="w-24 border-b mb-[1px]"></div>
      </div>
    </div>
  </div>
</template>

<style scoped src="@/features/procurement/order-sheet.css"></style>
