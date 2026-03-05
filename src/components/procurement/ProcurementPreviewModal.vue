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

type PrintMode = 'signature' | 'compact';

const props = defineProps<{
  open: boolean;
  order: Order | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();

const { toast } = useToastStore();
const iframeRef = ref<HTMLIFrameElement | null>(null);
const previewUrl = ref('');
const previewLoading = ref(false);
const previewError = ref('');
const exportingPdf = ref(false);
const printMode = ref<PrintMode>('signature');
const modeOptions: Array<{ value: PrintMode; label: string }> = [
  { value: 'signature', label: '签字版' },
  { value: 'compact', label: '简洁版' }
];

function toPrintDate(value?: string) {
  if (!value) return '';
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

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

const preparePreviewData = (order: Order) => {
  previewLoading.value = true;
  previewError.value = '';

  const orderForPrint = {
    customerName: order.metadata?.customer_name || order.supplier,
    code: order.order_no,
    orderDate: toPrintDate(order.created_at),
    deliveryDate: toPrintDate(order.delivery_date),
    list: order.items || []
  };

  localStorage.setItem('_order_preview_data', JSON.stringify(orderForPrint));
  localStorage.setItem('_order_preview_po_number', order.order_no);
  localStorage.setItem('_order_preview_category', order.category || '采购单');
  localStorage.setItem('_order_preview_print_mode', printMode.value);
  localStorage.removeItem('_order_preview_auto_print');

  previewUrl.value = `/print-preview?embedded=1&printMode=${printMode.value}&t=${Date.now()}`;
};

watch(() => props.open, (isOpen) => {
  if (isOpen && props.order) {
    preparePreviewData(props.order);
  }
});

watch(() => props.order, (order) => {
  if (props.open && order) {
    preparePreviewData(order);
  }
});

const handlePrint = () => {
  if (previewLoading.value || previewError.value) return;
  if (iframeRef.value?.contentWindow) {
    iframeRef.value.contentWindow.print();
  }
};

const handleIframeLoad = () => {
  previewLoading.value = false;
};

const handleIframeError = () => {
  previewLoading.value = false;
  previewError.value = '预览加载失败，请关闭后重试。';
};

const handleExportPdf = async () => {
  if (!props.order) return;

  exportingPdf.value = true;
  try {
    const payload = {
      poNumber: props.order.order_no,
      category: props.order.category || '',
      printMode: printMode.value,
      order: {
        customerName: props.order.metadata?.customer_name || props.order.supplier,
        code: props.order.order_no,
        orderDate: toPrintDate(props.order.created_at),
        deliveryDate: toPrintDate(props.order.delivery_date),
        list: props.order.items || []
      }
    };

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
  if (props.open && props.order) {
    preparePreviewData(props.order);
  }
};

const handleClose = () => {
  emit('update:open', false);
};
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-[1060px] max-h-[90vh] flex flex-col p-0 gap-0 bg-background">
      <DialogHeader class="sr-only">
        <DialogTitle>查看采购单</DialogTitle>
        <DialogDescription>采购单打印预览窗口，可直接打印当前订单。</DialogDescription>
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
          <Button size="sm" variant="outline" @click="handlePrint" :disabled="previewLoading || !!previewError">
            <Printer class="w-4 h-4 mr-2" />
            立即打印
          </Button>
          <Button size="sm" @click="handleExportPdf" :disabled="!order || exportingPdf">
            <Loader2 v-if="exportingPdf" class="w-4 h-4 mr-2 animate-spin" />
            <Download v-else class="w-4 h-4 mr-2" />
            {{ exportingPdf ? '导出中...' : '导出 PDF' }}
          </Button>
          <Button variant="outline" size="sm" @click="handleClose">关闭</Button>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-6 bg-muted/20">
        <div class="relative bg-background border rounded-lg p-0 max-w-[210mm] mx-auto min-h-[500px] overflow-hidden">
          <div v-if="previewLoading" class="absolute inset-0 z-10 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 class="h-5 w-5 animate-spin" />
            <p class="text-xs">正在生成预览...</p>
          </div>

          <div v-if="previewError" class="absolute inset-0 z-10 bg-background/95 flex items-center justify-center p-6">
            <p class="text-sm text-destructive">{{ previewError }}</p>
          </div>

          <iframe
            ref="iframeRef"
            :src="previewUrl"
            class="w-full h-[1200px] border-none"
            title="Order Preview"
            @load="handleIframeLoad"
            @error="handleIframeError"
          ></iframe>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
