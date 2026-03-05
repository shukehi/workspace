<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Order } from '@/types/order';
import {
  type ColumnKey,
  defaultColumnWidths,
  minColumnWidths
} from '@/features/procurement/printColumnSchema';

type Mode = 'edit' | 'preview';

const props = withDefaults(defineProps<{
  order: Partial<Order>;
  mode: Mode;
  columnWidths: Record<ColumnKey, number>;
}>(), {
  mode: 'preview'
});

const emit = defineEmits<{
  (e: 'update:columnWidths', value: Record<ColumnKey, number>): void;
}>();

const isEditMode = computed(() => props.mode === 'edit');

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

const resizing = ref<{ key: ColumnKey; startX: number; startWidth: number } | null>(null);

function resolveDisplaySpec(item: Record<string, any>) {
  return item?.spec || item?.model || '-';
}

function resolveDisplayMb(item: Record<string, any>) {
  return item?.mb || item?.orientation || '-';
}

function onResizeMove(event: MouseEvent) {
  if (!resizing.value) return;
  const deltaX = event.clientX - resizing.value.startX;
  const width = Math.max(minColumnWidths[resizing.value.key], resizing.value.startWidth + deltaX);
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

function startResize(key: ColumnKey, event: MouseEvent) {
  if (!isEditMode.value) return;
  event.preventDefault();
  resizing.value = {
    key,
    startX: event.clientX,
    startWidth: props.columnWidths[key]
  };
  document.body.style.userSelect = 'none';
  window.addEventListener('mousemove', onResizeMove);
  window.addEventListener('mouseup', stopResizing);
}

function resetSingleColumnWidth(key: ColumnKey) {
  if (!isEditMode.value) return;
  emit('update:columnWidths', {
    ...props.columnWidths,
    [key]: defaultColumnWidths[key]
  });
}

onBeforeUnmount(() => {
  stopResizing();
});
</script>

<template>
  <div class="bg-card border rounded-lg p-6 max-w-[210mm] mx-auto min-h-[500px]">
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
            <Input v-if="isEditMode" v-model="order.metadata!.internal_name" class="h-8 text-xs" />
            <span v-else class="text-xs">{{ order.metadata?.internal_name || '-' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <Label class="min-w-16">外协名称:</Label>
            <Input v-if="isEditMode" v-model="order.metadata!.external_name" class="h-8 text-xs" />
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
          <col :style="{ width: `${columnWidths.index}px` }" />
          <col :style="{ width: `${columnWidths.name}px` }" />
          <col :style="{ width: `${columnWidths.spec}px` }" />
          <col :style="{ width: `${columnWidths.mb}px` }" />
          <col :style="{ width: `${columnWidths.left}px` }" />
          <col :style="{ width: `${columnWidths.right}px` }" />
          <col :style="{ width: `${columnWidths.remark}px` }" />
        </colgroup>
        <thead class="bg-muted/40 border-b">
          <tr>
            <th class="border-r p-2 text-center relative resizable-th">序号<div class="col-resize-handle" :class="!isEditMode ? 'disabled' : ''" @mousedown.stop.prevent="startResize('index', $event)" @dblclick.stop.prevent="resetSingleColumnWidth('index')" /></th>
            <th class="border-r p-2 text-left relative resizable-th">产品名称<div class="col-resize-handle" :class="!isEditMode ? 'disabled' : ''" @mousedown.stop.prevent="startResize('name', $event)" @dblclick.stop.prevent="resetSingleColumnWidth('name')" /></th>
            <th class="border-r p-2 text-left relative resizable-th">规格尺寸<div class="col-resize-handle" :class="!isEditMode ? 'disabled' : ''" @mousedown.stop.prevent="startResize('spec', $event)" @dblclick.stop.prevent="resetSingleColumnWidth('spec')" /></th>
            <th class="border-r p-2 text-center relative resizable-th">门边<div class="col-resize-handle" :class="!isEditMode ? 'disabled' : ''" @mousedown.stop.prevent="startResize('mb', $event)" @dblclick.stop.prevent="resetSingleColumnWidth('mb')" /></th>
            <th class="border-r p-2 text-center relative resizable-th">左数量<div class="col-resize-handle" :class="!isEditMode ? 'disabled' : ''" @mousedown.stop.prevent="startResize('left', $event)" @dblclick.stop.prevent="resetSingleColumnWidth('left')" /></th>
            <th class="border-r p-2 text-center relative resizable-th">右数量<div class="col-resize-handle" :class="!isEditMode ? 'disabled' : ''" @mousedown.stop.prevent="startResize('right', $event)" @dblclick.stop.prevent="resetSingleColumnWidth('right')" /></th>
            <th class="p-2 text-left relative resizable-th">备注<div class="col-resize-handle" :class="!isEditMode ? 'disabled' : ''" @mousedown.stop.prevent="startResize('remark', $event)" @dblclick.stop.prevent="resetSingleColumnWidth('remark')" /></th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-for="(item, idx) in order.items || []" :key="idx" class="hover:bg-muted/30">
            <td class="border-r p-1 text-center text-muted-foreground">{{ idx + 1 }}</td>
            <td class="border-r p-0">
              <input v-if="isEditMode" v-model="item.name" class="w-full h-full p-2 bg-transparent outline-none focus:bg-muted/40" />
              <div v-else class="w-full h-full p-2">{{ item.name || '-' }}</div>
            </td>
            <td class="border-r p-0">
              <input v-if="isEditMode" v-model="item.spec" class="w-full h-full p-2 bg-transparent outline-none focus:bg-muted/40" />
              <div v-else class="w-full h-full p-2">{{ resolveDisplaySpec(item) }}</div>
            </td>
            <td class="border-r p-0">
              <input v-if="isEditMode" v-model="item.mb" class="w-full h-full p-2 text-center bg-transparent outline-none focus:bg-muted/40" />
              <div v-else class="w-full h-full p-2 text-center">{{ resolveDisplayMb(item) }}</div>
            </td>
            <td class="border-r p-0">
              <input v-if="isEditMode" v-model.number="item.quantity_left" type="number" class="w-full h-full p-2 text-center bg-transparent outline-none focus:bg-muted/40" placeholder="-" />
              <div v-else class="w-full h-full p-2 text-center">{{ item.quantity_left ?? '-' }}</div>
            </td>
            <td class="border-r p-0">
              <input v-if="isEditMode" v-model.number="item.quantity_right" type="number" class="w-full h-full p-2 text-center bg-transparent outline-none focus:bg-muted/40" placeholder="-" />
              <div v-else class="w-full h-full p-2 text-center">{{ item.quantity_right ?? '-' }}</div>
            </td>
            <td class="p-0">
              <input v-if="isEditMode" v-model="item.remark" class="w-full h-full p-2 bg-transparent outline-none focus:bg-muted/40" />
              <div v-else class="w-full h-full p-2">{{ item.remark || '-' }}</div>
            </td>
          </tr>
          <tr v-if="((order.items?.length || 0) < 5)" v-for="i in (5 - (order.items?.length || 0))" :key="`empty-${i}`">
            <td class="border-r p-2">&nbsp;</td>
            <td class="border-r">&nbsp;</td>
            <td class="border-r">&nbsp;</td>
            <td class="border-r">&nbsp;</td>
            <td class="border-r">&nbsp;</td>
            <td class="border-r">&nbsp;</td>
            <td>&nbsp;</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex justify-between mt-10 pt-5 border-t text-sm">
      <div class="flex items-center gap-2">
        <span>制单人:</span>
        <div class="w-24 border-b"></div>
      </div>
      <div class="flex items-center gap-2">
        <span>审核人:</span>
        <div class="w-24 border-b"></div>
      </div>
      <div class="flex items-center gap-2">
        <span>供应商签字:</span>
        <div class="w-24 border-b"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.resizable-th {
  overflow: visible;
}

.col-resize-handle {
  position: absolute;
  top: 0;
  right: -4px;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  z-index: 2;
}

.col-resize-handle.disabled {
  cursor: default;
  opacity: 0.4;
}
</style>
