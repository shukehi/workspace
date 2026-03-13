<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Printer } from 'lucide-vue-next';
import { useToastStore } from '@/stores/useToastStore';
import type { Order } from '@/types/order';
import OrderSheetView from '@/components/procurement/OrderSheetView.vue';
import { toRef } from 'vue';
import { createProcurementPreview } from '@/features/procurement/useProcurementPreview';
import { PROCUREMENT_DOCUMENT_PREVIEW_TITLE, PROCUREMENT_DOCUMENT_VIEW_TITLE } from '@/features/procurement/documentTitles';
const props = defineProps<{
  open: boolean;
  order: Order | null;
  canEdit?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'edit', order: Order): void;
}>();

const { toast } = useToastStore();
const {
  exportingPdf,
  snapshotLoading,
  printMode,
  modeOptions,
  orderCategoryLabel,
  orderStatusLabel,
  previewDefaultWidths,
  previewColumnWidths,
  handlePrint,
  handleExportPdf,
  handlePrintModeChange,
} = createProcurementPreview({
  order: toRef(props, 'order'),
  open: toRef(props, 'open'),
  toast,
});

const handleClose = () => {
  emit('update:open', false);
};

const handleEdit = () => {
  if (!props.order) return;
  emit('edit', props.order);
};
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-[1100px] max-h-[90vh] flex flex-col p-0 gap-0 bg-background">
      <DialogHeader class="sr-only">
        <DialogTitle>{{ PROCUREMENT_DOCUMENT_VIEW_TITLE }}</DialogTitle>
        <DialogDescription>{{ PROCUREMENT_DOCUMENT_PREVIEW_TITLE }}窗口，可直接打印当前订单。</DialogDescription>
      </DialogHeader>

      <div class="px-6 py-4 bg-background/95 backdrop-blur border-b flex justify-between items-center sticky top-0 z-10 gap-3">
        <div class="min-w-0">
          <DialogTitle class="text-lg font-semibold">{{ PROCUREMENT_DOCUMENT_PREVIEW_TITLE }}</DialogTitle>
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
          <Button size="sm" variant="outline" @click="handlePrint" :disabled="!order || snapshotLoading">
            <Printer class="w-4 h-4 mr-2" />
            立即打印
          </Button>
          <Button size="sm" @click="handleExportPdf" :disabled="!order || exportingPdf || snapshotLoading">
            <Loader2 v-if="exportingPdf" class="w-4 h-4 mr-2 animate-spin" />
            <Download v-else class="w-4 h-4 mr-2" />
            {{ exportingPdf ? '导出中...' : '导出 PDF' }}
          </Button>
          <Button v-if="canEdit" variant="outline" size="sm" :disabled="!order" @click="handleEdit">编辑</Button>
          <Button variant="outline" size="sm" @click="handleClose">关闭</Button>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-6 bg-muted/20">
        <OrderSheetView
          v-if="order"
          :order="order"
          mode="preview"
          :column-widths="previewColumnWidths"
          :default-widths="previewDefaultWidths"
        />
        <div v-else class="h-full flex items-center justify-center text-sm text-muted-foreground">
          暂无可预览的订单数据
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
