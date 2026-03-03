<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-vue-next';
import type { Order } from '@/types/order';

const props = defineProps<{
  open: boolean;
  order: Order | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();

const iframeRef = ref<HTMLIFrameElement | null>(null);
const previewUrl = ref('');

// --- Sync Data to LocalStorage (Bridge to Print Preview Route) ---
const preparePreviewData = (order: Order) => {
    const orderForPrint = {
        customerName: order.supplier,
        code: order.order_no,
        list: order.items || []
    };

    // Print preview route reads the same keys.
    localStorage.setItem('_order_preview_data', JSON.stringify(orderForPrint));
    localStorage.setItem('_order_preview_po_number', order.order_no);
    localStorage.setItem('_order_preview_category', order.category || '采购单');
    localStorage.removeItem('_order_preview_auto_print');

    // Set URL with timestamp to prevent caching
    previewUrl.value = `/print-preview?embedded=1&t=${Date.now()}`;
};

watch(() => props.open, (isOpen) => {
    if (isOpen && props.order) {
        preparePreviewData(props.order);
    }
});

const handlePrint = () => {
    if (iframeRef.value?.contentWindow) {
        iframeRef.value.contentWindow.print();
    }
};

const handleClose = () => {
    emit('update:open', false);
};
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-[1000px] max-h-[90vh] flex flex-col p-0 gap-0 bg-neutral-100">
      <!-- Toolbar -->
      <div class="px-6 py-4 bg-white border-b flex justify-between items-center sticky top-0 z-10">
        <div>
          <DialogTitle class="text-lg font-bold">查看采购单</DialogTitle>
          <p class="text-xs text-slate-500 font-mono" v-if="order">{{ order.order_no }}</p>
        </div>

        <div class="flex gap-2">
          <Button size="sm" class="bg-emerald-600 hover:bg-emerald-700 text-white" @click="handlePrint">
            <Printer class="w-4 h-4 mr-2" />
            立即打印
          </Button>
          <Button variant="outline" size="sm" @click="handleClose">关闭</Button>
        </div>
      </div>

      <!-- Preview Body -->
      <div class="flex-1 overflow-auto p-6">
        <div class="bg-white shadow-sm border border-neutral-200 p-0 max-w-[210mm] mx-auto min-h-[500px] overflow-hidden">
          <iframe
            ref="iframeRef"
            :src="previewUrl"
            class="w-full h-[1200px] border-none"
            title="Order Preview"
          ></iframe>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
