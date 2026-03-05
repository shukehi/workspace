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
import OrderSheetView from '@/components/procurement/OrderSheetView.vue';

const COLUMN_WIDTH_STORAGE_KEY = 'po_edit_column_widths_by_category_v1';

const CATEGORY_DEFAULT_WIDTHS: Record<PrintCategory, Record<string, number>> = {
  packaging: {
    no: 44,
    productModelName: 220,
    spec: 170,
    mb: 74,
    qtyLeft: 74,
    qtyRight: 74,
    remark: 180
  },
  cylinder: {
    no: 44,
    type: 260,
    eccentricity: 220,
    quantity: 90,
    remark: 190
  },
  lock: {
    no: 44,
    type: 220,
    spec: 180,
    quantity: 90,
    unit: 70,
    remark: 160
  },
  hardware: {
    no: 44,
    type: 240,
    spec: 220,
    quantity: 90,
    remark: 170
  }
};

function sanitizeWidths(widths: any, defaults: Record<string, number>) {
  const merged: Record<string, number> = { ...defaults };
  Object.keys(defaults).forEach((key) => {
    const value = Number(widths?.[key]);
    if (!Number.isNaN(value) && value >= 36) {
      merged[key] = value;
    }
  });
  return merged;
}

function loadLocalCategoryWidths(category: PrintCategory, defaults: Record<string, number>) {
  if (typeof window === 'undefined') return { ...defaults };
  try {
    const raw = window.localStorage.getItem(COLUMN_WIDTH_STORAGE_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Record<string, Record<string, number>>;
    return sanitizeWidths(parsed?.[category], defaults);
  } catch {
    return { ...defaults };
  }
}

function persistLocalCategoryWidths(category: PrintCategory, widths: Record<string, number>) {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(COLUMN_WIDTH_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, Record<string, number>> : {};
    parsed[category] = widths;
    window.localStorage.setItem(COLUMN_WIDTH_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage errors
  }
}

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
const columnWidths = ref<Record<string, number>>({ ...CATEGORY_DEFAULT_WIDTHS.packaging });

const currentCategory = computed<PrintCategory>(() => normalizePrintCategory(form.value.category));
const currentDefaultWidths = computed(() => CATEGORY_DEFAULT_WIDTHS[currentCategory.value]);

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
      if (isPackagingOrder && !copy.metadata.external_name && copy.items && copy.items.length > 0) {
        const firstItem = copy.items[0];
        const matched = packagingMatcher.match(firstItem.model || firstItem.name);

        if (matched) {
          copy.metadata.external_name = matched;
        }

        if (!copy.supplier) {
          const packagingConfig = configLoader.getPackagingMapping();
          copy.supplier = packagingConfig?.supplierName || '默认供应商';
        }
      }

      const normalizedDraft = normalizeOrderDraft(copy);
      form.value = normalizedDraft;

      const category = normalizePrintCategory(normalizedDraft.category);
      const defaults = CATEGORY_DEFAULT_WIDTHS[category];
      const custom = normalizedDraft.metadata?.printColumnWidths;
      const hasCustomWidths = !!custom && typeof custom === 'object';
      const loaded = hasCustomWidths
        ? sanitizeWidths(custom, defaults)
        : loadLocalCategoryWidths(category, defaults);

      columnWidths.value = loaded;
      if (form.value.metadata) {
        form.value.metadata.printColumnWidths = { ...loaded };
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
