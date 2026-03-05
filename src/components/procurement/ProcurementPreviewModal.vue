<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Printer } from 'lucide-vue-next';
import { api } from '@/lib/api';
import { useToastStore } from '@/stores/useToastStore';
import type { Order } from '@/types/order';
import {
  type ColumnKey,
  defaultColumnWidths,
  readPrintWidthsFromOrder
} from '@/features/procurement/printColumnSchema';
import { buildPdfRequestPayload, buildPrintPayloadFromOrder } from '@/features/procurement/orderDraft';
import OrderSheetView from '@/components/procurement/OrderSheetView.vue';

type PrintMode = 'signature' | 'compact';

const props = defineProps<{
  open: boolean;
  order: Order | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'edit', order: Order): void;
}>();

const { toast } = useToastStore();
const exportingPdf = ref(false);
const printMode = ref<PrintMode>('signature');
const columnWidths = ref<Record<ColumnKey, number>>({ ...defaultColumnWidths });
const modeOptions: Array<{ value: PrintMode; label: string }> = [
  { value: 'signature', label: '签字版' },
  { value: 'compact', label: '简洁版' }
];

const categoryLabels: Record<string, string> = {
  packaging: '包装',
  cylinder: '锁芯',
  hardware: '五金',
  lock: '锁叉'
};

const statusLabels: Record<Order['status'], string> = {
  draft: '草稿',
  submitted: '已提交',
  processing: '处理中',
  completed: '已完成',
  cancelled: '已取消'
};

const orderCategoryLabel = computed(() => {
  if (!props.order?.category) return '未分类';
  const raw = String(props.order.category).toLowerCase();
  if (raw.includes('包装') || raw === 'packaging') return categoryLabels.packaging;
  if (raw.includes('锁芯') || raw === 'cylinder') return categoryLabels.cylinder;
  if (raw.includes('锁叉') || raw === 'lock') return categoryLabels.lock;
  if (raw.includes('五金') || raw.includes('配件') || raw === 'hardware') return categoryLabels.hardware;
  return props.order.category;
});

const orderStatusLabel = computed(() => {
  if (!props.order) return '-';
  return statusLabels[props.order.status] || props.order.status;
});

watch(
  () => props.order,
  (order) => {
    if (!order) {
      columnWidths.value = { ...defaultColumnWidths };
      return;
    }
    columnWidths.value = readPrintWidthsFromOrder(order);
  },
  { immediate: true }
);

const openPrintWindow = (autoPrint: boolean) => {
  if (!props.order) return;

  const orderForPrint = buildPrintPayloadFromOrder(props.order);
  localStorage.setItem('_order_preview_data', JSON.stringify(orderForPrint));
  localStorage.setItem('_order_preview_po_number', props.order.order_no);
  localStorage.setItem('_order_preview_category', props.order.category || '采购单');
  localStorage.setItem('_order_preview_print_mode', printMode.value);

  if (autoPrint) {
    localStorage.setItem('_order_preview_auto_print', 'true');
  } else {
    localStorage.removeItem('_order_preview_auto_print');
  }

  window.open(`/print-preview?printMode=${printMode.value}&t=${Date.now()}`, '_blank', 'noopener,noreferrer');
};

const handlePrint = () => {
  openPrintWindow(true);
};

const handleExportPdf = async () => {
  if (!props.order) return;

  exportingPdf.value = true;
  try {
    const payload = buildPdfRequestPayload(props.order, printMode.value);

    await api.downloadPDF('/pdf/generate', payload, `${props.order.order_no}.pdf`);
    toast({
      title: '导出成功',
      description: `已导出 ${props.order.order_no}.pdf`,
      variant: 'success'
    });
  } catch (error) {
    console.error('Export PDF failed', error);
    toast({
      title: '导出失败',
      description: '请稍后重试',
      variant: 'destructive'
    });
  } finally {
    exportingPdf.value = false;
  }
};

const handlePrintModeChange = (mode: PrintMode) => {
  if (printMode.value === mode) return;
  printMode.value = mode;
};

const handleClose = () => {
  emit('update:open', false);
};

const handleEdit = () => {
  if (!props.order) return;
  emit('edit', props.order);
};

const handleColumnWidthsChange = (next: Record<ColumnKey, number>) => {
  columnWidths.value = next;
};
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-[1060px] max-h-[90vh] flex flex-col p-0 gap-0 bg-background">
      <DialogHeader class="sr-only">
        <DialogTitle>查看采购单</DialogTitle>
        <DialogDescription>采购单预览窗口，可直接打印当前订单。</DialogDescription>
      </DialogHeader>

      <div class="px-6 py-4 bg-background/95 backdrop-blur border-b flex justify-between items-center sticky top-0 z-10 gap-3">
        <div class="min-w-0">
          <DialogTitle class="text-lg font-semibold">采购订单预览</DialogTitle>
          <p class="text-xs text-muted-foreground truncate" v-if="order">
            {{ order.order_no }}
          </p>
          <div v-if="order" class="mt-2 flex items-center gap-2 text-[11px]">
            <span class="px-2 py-0.5 rounded bg-muted text-muted-foreground border">{{ orderCategoryLabel }}</span>
            <span class="px-2 py-0.5 rounded bg-muted text-muted-foreground border">{{ orderStatusLabel }}</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2">
          <div class="inline-flex rounded-md border bg-background p-0.5">
            <button
              v-for="mode in modeOptions"
              :key="mode.value"
              class="px-2.5 py-1 text-xs rounded-sm transition-colors"
              :class="printMode === mode.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
              @click="handlePrintModeChange(mode.value)"
            >
              {{ mode.label }}
            </button>
          </div>
          <Button size="sm" variant="outline" @click="handlePrint" :disabled="!order">
            <Printer class="w-4 h-4 mr-2" />
            立即打印
          </Button>
          <Button size="sm" @click="handleExportPdf" :disabled="!order || exportingPdf">
            <Loader2 v-if="exportingPdf" class="w-4 h-4 mr-2 animate-spin" />
            <Download v-else class="w-4 h-4 mr-2" />
            {{ exportingPdf ? '导出中...' : '导出 PDF' }}
          </Button>
          <Button variant="outline" size="sm" :disabled="!order" @click="handleEdit">编辑</Button>
          <Button variant="outline" size="sm" @click="handleClose">关闭</Button>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-6 bg-muted/20">
        <OrderSheetView
          v-if="order"
          :order="order"
          mode="preview"
          :column-widths="columnWidths"
          @update:column-widths="handleColumnWidthsChange"
        />
      </div>
    </DialogContent>
  </Dialog>
</template>
