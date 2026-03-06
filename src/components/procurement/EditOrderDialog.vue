<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useProcurementStore } from '@/stores/useProcurementStore';
import type { Order } from '@/types/order';
import { packagingMatcher } from '@/lib/packagingMatcher';
import { configLoader } from '@/services/configLoader';
import { cloneOrderDraft, normalizeOrderDraft } from '@/features/procurement/orderDraft';
import { normalizePrintCategory, type PrintCategory } from '@/features/procurement/docModel';
import { resolvePackagingHeaderNames } from '@/features/procurement/packagingNameResolver';
import OrderSheetView from '@/components/procurement/OrderSheetView.vue';
import {
  getDefaultWidths,
  persistLocalCategoryWidths,
  resolveSheetWidths,
} from '@/features/procurement/sheetWidthResolver';

const props = defineProps<{
  open: boolean;
  order: Order | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'saved'): void;
  (e: 'draft-change', value: Order): void;
  (e: 'preview', value: Order): void;
}>();

const store = useProcurementStore();
const form = ref<Partial<Order>>({});
const saving = ref(false);
const initialSnapshot = ref('');
const columnWidths = ref<Record<string, number>>({ ...getDefaultWidths('packaging') });

const currentCategory = computed<PrintCategory>(() => normalizePrintCategory(form.value.category));
const currentDefaultWidths = computed(() => getDefaultWidths(currentCategory.value));

watch(columnWidths, (next) => {
  const category = currentCategory.value;
  persistLocalCategoryWidths(category, next);
  if (!form.value) return;
  if (!form.value.metadata) form.value.metadata = {};
  form.value.metadata.printColumnWidths = { ...next };
}, { deep: true });

const hasUnsavedChanges = computed(() => {
  if (!initialSnapshot.value) return false;
  try {
    return JSON.stringify(form.value) !== initialSnapshot.value;
  } catch {
    return false;
  }
});

watch(
  () => props.order,
  (newOrder) => {
    if (newOrder) {
      const copy = cloneOrderDraft(newOrder);
      if (!copy.metadata) copy.metadata = {};

      const isPackagingOrder = copy.category && String(copy.category).includes('包装');
      if (isPackagingOrder) {
        const names = resolvePackagingHeaderNames(
          copy,
          configLoader.getPackagingMapping(),
          packagingMatcher
        );
        copy.metadata.internal_name = names.internalName;
        copy.metadata.external_name = names.externalName;

        if (!copy.supplier) {
          const packagingConfig = configLoader.getPackagingMapping();
          copy.supplier = packagingConfig?.supplierName || '默认供应商';
        }
      }

      const normalizedDraft = normalizeOrderDraft(copy);
      form.value = normalizedDraft;

      const resolved = resolveSheetWidths(
        normalizedDraft.category,
        normalizedDraft.metadata?.printColumnWidths,
        { preferLocalWhenMissing: true }
      );
      columnWidths.value = resolved.widths;
      if (form.value.metadata) {
        form.value.metadata.printColumnWidths = { ...resolved.widths };
      }
      initialSnapshot.value = JSON.stringify(normalizedDraft);
    }
  },
  { immediate: true }
);

watch(
  form,
  (next) => {
    if (!props.open) return;
    if (!next || !next.id || !next.order_no || !next.created_at || !next.status || !Array.isArray(next.items)) return;
    emit('draft-change', cloneOrderDraft(next as Order));
  },
  { deep: true }
);

const requestClose = () => {
  if (saving.value) return;
  if (hasUnsavedChanges.value) {
    const shouldClose = window.confirm('当前有未保存修改，确定要关闭吗？');
    if (!shouldClose) return;
  }
  emit('update:open', false);
};

const handleDialogOpenChange = (value: boolean) => {
  if (value) {
    emit('update:open', true);
    return;
  }
  requestClose();
};

const handleSave = async () => {
  if (!form.value.id || !props.order) return;

  saving.value = true;
  try {
    await store.updateOrder(form.value.id, form.value);
    initialSnapshot.value = JSON.stringify(form.value);
    emit('saved');
    emit('update:open', false);
  } catch (e) {
    console.error('Update failed', e);
    alert('保存失败');
  } finally {
    saving.value = false;
  }
};

const handlePreview = () => {
  if (!form.value || !form.value.id || !form.value.order_no || !form.value.created_at || !form.value.status || !Array.isArray(form.value.items)) {
    return;
  }
  emit('preview', cloneOrderDraft(form.value as Order));
};

const resetColumnWidths = () => {
  const defaults = currentDefaultWidths.value;
  columnWidths.value = { ...defaults };
};

const handleColumnWidthsChange = (next: Record<string, number>) => {
  columnWidths.value = next;
};
</script>

<template>
  <Dialog :open="open" @update:open="handleDialogOpenChange">
    <DialogContent class="max-w-[1100px] max-h-[90vh] flex flex-col p-0 gap-0 bg-background">
      <DialogHeader class="sr-only">
        <DialogTitle>编辑采购单</DialogTitle>
        <DialogDescription>编辑采购单基础信息和明细项数据。</DialogDescription>
      </DialogHeader>

      <div class="px-6 py-4 bg-background border-b flex justify-between items-center sticky top-0 z-10">
        <DialogTitle class="text-lg font-semibold">编辑采购单</DialogTitle>
        <div class="flex gap-2">
          <Button variant="outline" size="sm" :disabled="saving" @click="handlePreview">预览</Button>
          <Button variant="outline" size="sm" :disabled="saving" @click="resetColumnWidths">重置列宽</Button>
          <Button variant="outline" size="sm" :disabled="saving" @click="requestClose">取消</Button>
          <Button size="sm" :disabled="saving" @click="handleSave">{{ saving ? '保存中...' : '保存修改' }}</Button>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-6 bg-muted/20">
        <OrderSheetView
          v-if="form"
          :order="form"
          mode="edit"
          :column-widths="columnWidths"
          :default-widths="currentDefaultWidths"
          @update:column-widths="handleColumnWidthsChange"
        />
      </div>
    </DialogContent>
  </Dialog>
</template>
