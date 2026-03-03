<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, Maximize2 } from 'lucide-vue-next';
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

// --- Sync Data to LocalStorage (Bridge to Legacy Template) ---
const preparePreviewData = (order: Order) => {
    const orderForPrint = {
        customerName: order.supplier,
        code: order.order_no,
        list: order.items || []
    };

    // Legacy expectations from public/order-preview.html
    localStorage.setItem('_order_preview_data', JSON.stringify(orderForPrint));
    localStorage.setItem('_order_preview_po_number', order.order_no);
    localStorage.setItem('_order_preview_category', order.category || '采购单');
    localStorage.removeItem('_order_preview_auto_print');

    // Set URL with timestamp to prevent caching
    previewUrl.value = `/order-preview.html?t=${Date.now()}`;
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
    <DialogContent class="sm:max-w-[95vw] h-[95vh] flex flex-col p-0 overflow-hidden border-none bg-slate-900/10 backdrop-blur-xl">
      <!-- Custom Header for Preview -->
      <div class="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0 shadow-sm">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Printer class="w-5 h-5" />
            </div>
            <div>
                <DialogTitle class="text-lg font-bold text-slate-900">采购单预览</DialogTitle>
                <p class="text-xs text-slate-500 font-mono" v-if="order">{{ order.order_no }}</p>
            </div>
        </div>
        
        <div class="flex items-center gap-2">
          <Button variant="default" size="sm" class="bg-emerald-600 hover:bg-emerald-700 text-white" @click="handlePrint">
            <Printer class="w-4 h-4 mr-2" />
            立即打印
          </Button>
          <Button variant="ghost" size="icon" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100" @click="handleClose">
            <X class="w-5 h-5" />
          </Button>
        </div>
      </div>

      <!-- Preview Body (Iframe) -->
      <div class="flex-1 bg-slate-100/50 p-4 md:p-8 overflow-auto flex justify-center">
        <div class="w-full max-w-4xl h-full bg-white shadow-2xl rounded-sm border border-slate-200 relative overflow-hidden group">
            <iframe 
                ref="iframeRef"
                :src="previewUrl" 
                class="w-full h-full border-none pointer-events-auto"
                title="Order Preview"
            ></iframe>
            
            <!-- Floating hint -->
            <div class="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur px-3 py-1 rounded text-white text-[10px] uppercase font-mono tracking-widest pointer-events-none">
                A4 Portrait Layout
            </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
/* Ensure the dialog content takes full height as specified */
:deep([data-radix-popper-content-wrapper]) {
    height: 100%;
}
</style>
