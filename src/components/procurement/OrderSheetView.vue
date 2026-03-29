<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Order, OrderItem } from '@/types/order';
import { resolveDisplayCustomerName } from '@/features/procurement/customerName';
import { normalizeDateString, type PrintCategory } from '@/features/procurement/docModel';
import { PROCUREMENT_DOCUMENT_TITLE } from '@/features/procurement/documentTitles';
import { resolveProcurementItems } from '@/features/procurement/itemSort';
import {
  getSheetSchema,
  getDisplayValue,
  getEditableValue,
  setEditableValue,
  isNumericColumn,
  resolveOrderItemQuantity,
  supportsSplitQuantityColumns,
  syncOrderItemQuantity,
  resolveAggregateQuantityDisplayWidth,
  resolveAggregateRemarkColumnWidth,
} from '@/features/procurement/order-sheet.schema';
import { computeItemQuantitySummary } from '@/features/procurement/quantitySummary';
import { resolveOrderSchemaPrintCategory } from '@/features/procurement/templateType';

type Mode = 'edit' | 'preview';
type CustomerNameDisplayMode = 'full' | 'salesDepartment';
type ValidationState = {
  fields?: Record<string, string>;
  rows?: Record<number, string[]>;
  cells?: Record<string, string>;
};

const props = withDefaults(defineProps<{
  order: Partial<Order>;
  mode: Mode;
  columnWidths: Record<string, number>;
  defaultWidths: Record<string, number>;
  hiddenColumns?: string[];
  aggregateSideQuantities?: boolean;
  customerNameDisplay?: CustomerNameDisplayMode;
  restrictDetailEditing?: boolean;
  validationErrors?: ValidationState;
}>(), {
  mode: 'preview',
  hiddenColumns: () => [],
  aggregateSideQuantities: false,
  customerNameDisplay: 'full',
  restrictDetailEditing: false,
  validationErrors: () => ({ fields: {}, rows: {}, cells: {} }),
});

const emit = defineEmits<{
  (e: 'update:columnWidths', value: Record<string, number>): void;
}>();

const isEditMode = computed(() => props.mode === 'edit');
const isRestrictedEditMode = computed(() => isEditMode.value && props.restrictDetailEditing);
const category = computed<PrintCategory>(() => resolveOrderSchemaPrintCategory(props.order));
const isPackaging = computed(() => category.value === 'packaging');
const usesSplitQuantityColumns = computed(() => supportsSplitQuantityColumns(category.value));
const showsAggregatedQuantity = computed(() => props.aggregateSideQuantities && usesSplitQuantityColumns.value);
const items = computed(() => resolveProcurementItems(
  props.order.category,
  (props.order.items || []) as OrderItem[],
  { preserveManualOrder: isEditMode.value }
));
const schema = computed(() => getSheetSchema(category.value, {
  hiddenColumns: props.hiddenColumns,
  aggregateSideQuantities: showsAggregatedQuantity.value,
}));
const quantitySummary = computed(() => {
  return computeItemQuantitySummary(category.value, items.value);
});
const displayCustomerName = computed(() => {
  const rawName = props.order.metadata?.customer_name;
  if (props.customerNameDisplay === 'salesDepartment') {
    return resolveDisplayCustomerName(rawName);
  }
  return String(rawName || '').trim();
});

const formattedOrderDate = computed({
  get: () => normalizeDateString(props.order.created_at),
  set: (val) => {
    if (val) props.order.created_at = new Date(val).toISOString();
  }
});

const formattedDeliveryDate = computed({
  get: () => normalizeDateString(props.order.delivery_date),
  set: (val) => {
    if (val) props.order.delivery_date = new Date(val).toISOString();
  }
});

const resizing = ref<{ key: string; startX: number; startWidth: number } | null>(null);

function getColumnWidth(key: string) {
  if (key === 'quantity' && showsAggregatedQuantity.value) {
    return resolveAggregateQuantityDisplayWidth(props.columnWidths, props.defaultWidths);
  }
  if (key === 'remark' && showsAggregatedQuantity.value) {
    return resolveAggregateRemarkColumnWidth(props.columnWidths, props.defaultWidths);
  }
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
  if (resizing.value.key === 'quantity' && showsAggregatedQuantity.value) {
    emit('update:columnWidths', {
      ...props.columnWidths,
      quantity: width
    });
    return;
  }
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
  if (key === 'quantity' && showsAggregatedQuantity.value) {
    emit('update:columnWidths', {
      ...props.columnWidths,
      quantity: 72
    });
    return;
  }
  emit('update:columnWidths', {
    ...props.columnWidths,
    [key]: props.defaultWidths[key] || 120
  });
}

function handleCellInput(item: Partial<OrderItem>, key: string, value: string) {
  if (isNumericColumn(key)) {
    const nextValue = value === '' ? null : Number(value);
    setEditableValue(item, key, nextValue);
    syncOrderItemQuantity(item, category.value);
    return;
  }
  setEditableValue(item, key, value);
  syncOrderItemQuantity(item, category.value);
}

function resolveCellDisplayValue(item: Partial<OrderItem>, key: string, rowIndex: number) {
  if (key === 'quantity' && showsAggregatedQuantity.value) {
    return resolveOrderItemQuantity(item, category.value);
  }
  return getDisplayValue(item, key, rowIndex);
}

function isComputedQuantityColumn(key: string) {
  return key === 'quantity' && showsAggregatedQuantity.value;
}

function getRowKey(item: Partial<OrderItem>, idx: number) {
  const itemKey = String(item.item_key || '').trim();
  if (itemKey) return itemKey;

  const numericId = Number(item.id || 0);
  if (Number.isInteger(numericId) && numericId > 0) {
    return `order-item-${numericId}`;
  }

  return `draft-row-${idx}`;
}

function getFieldError(path: string) {
  return props.validationErrors?.fields?.[path] || '';
}

function getCellError(rowIndex: number, columnKey: string) {
  return props.validationErrors?.cells?.[`${rowIndex}:${columnKey}`] || '';
}

function getRowErrors(rowIndex: number) {
  return props.validationErrors?.rows?.[rowIndex] || [];
}

onBeforeUnmount(() => {
  stopResizing();
});
</script>

<template>
  <div class="order-sheet bg-card border rounded-lg p-6 max-w-[210mm] mx-auto min-h-[500px]">
    <div class="mb-6 border rounded-lg p-4">
      <h1 class="text-xl font-semibold text-center mb-5">{{ PROCUREMENT_DOCUMENT_TITLE }}</h1>

      <div
        class="grid grid-cols-1 gap-5 text-sm order-sheet-info-grid"
        :class="isPackaging ? 'md:grid-cols-3 order-sheet-info-grid-packaging' : 'md:grid-cols-2 order-sheet-info-grid-default'"
      >
        <div class="space-y-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <Label class="min-w-16">客户名称:</Label>
              <Input
                v-if="isEditMode && !isRestrictedEditMode"
                v-model="order.metadata!.customer_name"
                placeholder="内部"
                :aria-invalid="!!getFieldError('metadata.customer_name')"
                :class="['h-8 text-xs', getFieldError('metadata.customer_name') ? 'border-red-500 bg-red-50' : '']"
              />
              <span v-else class="text-xs">{{ displayCustomerName || '-' }}</span>
            </div>
            <div v-if="getFieldError('metadata.customer_name')" class="pl-[4.5rem] text-[11px] text-red-600">
              {{ getFieldError('metadata.customer_name') }}
            </div>
          </div>
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <Label class="min-w-16">订单号:</Label>
              <span class="font-medium">{{ order.order_no || '-' }}</span>
            </div>
            <div v-if="getFieldError('order_no')" class="pl-[4.5rem] text-[11px] text-red-600">
              {{ getFieldError('order_no') }}
            </div>
          </div>
        </div>

        <div v-if="isPackaging" class="space-y-3">
          <div class="flex items-center gap-2">
            <Label class="min-w-16">内部名称:</Label>
            <Input v-if="isEditMode && !isRestrictedEditMode && isPackaging" v-model="order.metadata!.internal_name" class="h-8 text-xs" />
            <span v-else class="text-xs">{{ order.metadata?.internal_name || '-' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <Label class="min-w-16">外协名称:</Label>
            <Input v-if="isEditMode && !isRestrictedEditMode && isPackaging" v-model="order.metadata!.external_name" class="h-8 text-xs" />
            <span v-else class="text-xs">{{ order.metadata?.external_name || '-' }}</span>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <Label class="min-w-16">制单日期:</Label>
            <Input v-if="isEditMode && !isRestrictedEditMode" type="date" v-model="formattedOrderDate" class="h-8 text-xs w-36" />
            <span v-else class="text-xs">{{ formattedOrderDate || '-' }}</span>
          </div>
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <Label class="min-w-16">交货日期:</Label>
              <Input
                v-if="isEditMode"
                type="date"
                v-model="formattedDeliveryDate"
                :aria-invalid="!!getFieldError('delivery_date')"
                :class="['h-8 text-xs w-36', getFieldError('delivery_date') ? 'border-red-500 bg-red-50' : '']"
              />
              <span v-else class="text-xs">{{ formattedDeliveryDate || '-' }}</span>
            </div>
            <div v-if="getFieldError('delivery_date')" class="pl-[4.5rem] text-[11px] text-red-600">
              {{ getFieldError('delivery_date') }}
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 pt-4 border-t border-dashed">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <Label class="min-w-16">供应商:</Label>
            <Input
              v-if="isEditMode && !isRestrictedEditMode"
              v-model="order.supplier"
              :aria-invalid="!!getFieldError('supplier')"
              :class="['h-8 text-xs w-64', getFieldError('supplier') ? 'border-red-500 bg-red-50' : '']"
            />
            <span v-else class="text-xs">{{ order.supplier || '-' }}</span>
          </div>
          <div v-if="getFieldError('supplier')" class="pl-[4.5rem] text-[11px] text-red-600">
            {{ getFieldError('supplier') }}
          </div>
        </div>
        <div class="mt-3 flex items-start gap-2">
          <Label class="min-w-16 pt-2">整单备注:</Label>
          <Textarea
            v-if="isEditMode"
            v-model="order.remark"
            class="min-h-[56px] text-xs"
            placeholder="填写整张订单备注（不会影响明细行备注）"
          />
          <span v-else class="text-xs whitespace-pre-line">{{ order.remark || '-' }}</span>
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
              class="border-r last:border-r-0 p-2 relative resizable-th"
              :class="getAlignClass(column.align)"
            >
              {{ column.label }}
              <div
                v-if="isEditMode"
                class="col-resize-handle"
                @mousedown.stop.prevent="startResize(column.key, $event)"
                @dblclick.stop.prevent="resetSingleColumnWidth(column.key)"
              />
            </th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <template v-for="(item, idx) in items" :key="getRowKey(item, idx)">
          <tr class="hover:bg-muted/30">
            <td
              v-for="column in schema.columns"
              :key="`cell-${idx}-${column.key}`"
              class="border-r last:border-r-0 p-0"
              :class="getAlignClass(column.align)"
            >
              <template v-if="column.key === 'no'">
                <div class="w-full h-full p-2 text-muted-foreground text-center">{{ idx + 1 }}</div>
              </template>
              <template v-else-if="isComputedQuantityColumn(column.key)">
                <div class="w-full h-full p-2 text-center text-foreground">
                  {{ resolveCellDisplayValue(item, column.key, idx) }}
                </div>
              </template>
              <template v-else-if="isEditMode && !isRestrictedEditMode">
                <input
                  :value="getEditableValue(item, column.key)"
                  :type="column.inputType"
                  class="w-full h-full p-2 bg-transparent outline-none focus:bg-muted/40"
                  :aria-invalid="!!getCellError(idx, column.key)"
                  :class="[
                    column.align === 'center' ? 'text-center' : '',
                    getCellError(idx, column.key) ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-500' : '',
                  ]"
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
                  {{ resolveCellDisplayValue(item, column.key, idx) }}
                </div>
              </template>
            </td>
          </tr>
          <tr v-if="getRowErrors(idx).length > 0" class="bg-red-50/80">
            <td :colspan="schema.columns.length" class="px-3 py-2 text-[11px] text-red-700">
              {{ getRowErrors(idx).join('；') }}
            </td>
          </tr>
          </template>
          <tr v-if="isPackaging && items.length < 5" v-for="i in (5 - items.length)" :key="`empty-${i}`">
            <td v-for="column in schema.columns" :key="`empty-cell-${i}-${column.key}`" class="border-r last:border-r-0 p-2">&nbsp;</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-3 flex justify-end text-xs text-foreground">
      <div v-if="isPackaging" class="inline-flex items-center gap-4 rounded-md border bg-muted/20 px-3 py-1.5">
        <span>左数量合计: {{ quantitySummary.leftTotal }}</span>
        <span>右数量合计: {{ quantitySummary.rightTotal }}</span>
        <span class="font-medium">总数量: {{ quantitySummary.total }}</span>
      </div>
      <div v-else class="inline-flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-1.5">
        <span class="font-medium">数量合计: {{ quantitySummary.total }}</span>
      </div>
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
