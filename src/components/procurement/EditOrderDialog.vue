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
import { cloneOrderDraft, normalizeOrderDraft } from '@/features/procurement/orderDraft';
import { normalizePrintCategory, type PrintCategory } from '@/features/procurement/docModel';
import OrderSheetView from '@/components/procurement/OrderSheetView.vue';
import {
  getDefaultWidths,
  persistLocalCategoryWidths,
} from '@/features/procurement/sheetWidthResolver';
import {
  applyPackagingHeaderNames,
  bootstrapOrderDraft,
  buildManualOrderNo,
  createEmptyItem,
  nowStamp,
} from '@/features/procurement/editOrderDraft';

type DialogMode = 'edit' | 'create';

const props = withDefaults(defineProps<{
  open: boolean;
  order: Order | null;
  mode?: DialogMode;
}>(), {
  mode: 'edit',
});

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

const isCreateMode = computed(() => props.mode === 'create');
const currentCategory = computed<PrintCategory>(() => normalizePrintCategory(form.value.category));
const currentDefaultWidths = computed(() => getDefaultWidths(currentCategory.value));

const categoryOptions: Array<{ value: string; label: string }> = [
  { value: '包装', label: '包装' },
  { value: '锁芯', label: '锁芯' },
  { value: '拉手', label: '拉手' },
  { value: '锁叉', label: '锁叉' },
  { value: '配件', label: '五金/配件' },
];

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

function bootstrapEditOrder(order: Order) {
  const { draft, widths } = bootstrapOrderDraft({ mode: 'edit', order });
  form.value = draft;
  columnWidths.value = widths;
  initialSnapshot.value = JSON.stringify(draft);
}

function bootstrapCreateOrder() {
  const { draft, widths } = bootstrapOrderDraft({ mode: 'create' });
  form.value = draft;
  columnWidths.value = widths;
  initialSnapshot.value = JSON.stringify(draft);
}

watch(
  () => ({ open: props.open, mode: props.mode, order: props.order }),
  ({ open, mode, order }) => {
    if (!open) return;

    if (mode === 'create') {
      bootstrapCreateOrder();
      return;
    }

    if (order) {
      bootstrapEditOrder(order);
    }
  },
  { immediate: true, deep: true }
);

watch(
  form,
  (next) => {
    if (!props.open || isCreateMode.value) return;
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

function validateBeforeSave(order: Partial<Order>) {
  if (!order.order_no || !String(order.order_no).trim()) {
    return '订单号不能为空';
  }
  if (!order.supplier || !String(order.supplier).trim()) {
    return '供应商不能为空';
  }
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return '请至少添加一条明细';
  }
  return '';
}

const handleSave = async () => {
  if (!form.value) return;

  const draft = cloneOrderDraft(form.value as Order);
  if (!draft.metadata) draft.metadata = {};
  if (!draft.category) draft.category = '包装';
  if (!draft.created_at) draft.created_at = nowStamp();
  if (!draft.status) draft.status = 'draft';
  if (!draft.order_no) draft.order_no = buildManualOrderNo();

  draft.items = (draft.items || []).map((item) => ({
    ...item,
    supplier: item.supplier || draft.supplier,
  }));
  draft.remark = String(draft.remark || '');

  applyPackagingHeaderNames(draft);

  const validateError = validateBeforeSave(draft);
  if (validateError) {
    alert(validateError);
    return;
  }

  saving.value = true;
  try {
    if (isCreateMode.value) {
      await store.addOrder(draft as Order);
    } else {
      if (!draft.id || !props.order) return;
      await store.updateOrder(draft.id, draft);
    }

    initialSnapshot.value = JSON.stringify(draft);
    emit('saved');
    emit('update:open', false);
  } catch (e) {
    console.error('Save failed', e);
    alert('保存失败');
  } finally {
    saving.value = false;
  }
};

const handlePreview = () => {
  if (isCreateMode.value) return;
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

const addItemRow = () => {
  if (!form.value) return;
  const category = currentCategory.value;
  if (!Array.isArray(form.value.items)) form.value.items = [];
  form.value.items.push(createEmptyItem(category));
};

const removeLastItemRow = () => {
  if (!form.value || !Array.isArray(form.value.items)) return;
  if (form.value.items.length <= 1) return;
  form.value.items.pop();
};

const handleCategoryChange = (event: Event) => {
  if (!isCreateMode.value || !form.value) return;
  const nextCategory = (event.target as HTMLSelectElement).value;
  form.value.category = nextCategory;

  const category = normalizePrintCategory(nextCategory);
  const defaults = getDefaultWidths(category);
  columnWidths.value = { ...defaults };
  if (!form.value.metadata) form.value.metadata = {};
  form.value.metadata.printColumnWidths = { ...defaults };

  if (!Array.isArray(form.value.items) || form.value.items.length === 0) {
    form.value.items = [createEmptyItem(category)];
  } else {
    form.value.items = form.value.items.map(() => createEmptyItem(category));
  }

  const asOrder = form.value as Order;
  applyPackagingHeaderNames(asOrder);
};
</script>

<template>
  <Dialog :open="open" @update:open="handleDialogOpenChange">
    <DialogContent class="max-w-[1100px] max-h-[90vh] flex flex-col p-0 gap-0 bg-background">
      <DialogHeader class="sr-only">
        <DialogTitle>{{ isCreateMode ? '手动录入采购单' : '编辑采购单' }}</DialogTitle>
        <DialogDescription>编辑采购单基础信息和明细项数据。</DialogDescription>
      </DialogHeader>

      <div class="px-6 py-4 bg-background border-b flex justify-between items-center sticky top-0 z-10 gap-2">
        <DialogTitle class="text-lg font-semibold">{{ isCreateMode ? '手动录入采购单' : '编辑采购单' }}</DialogTitle>
        <div class="flex gap-2 items-center">
          <select
            v-if="isCreateMode"
            class="h-8 rounded-md border bg-background px-2 text-xs"
            :value="form.category || '包装'"
            @change="handleCategoryChange"
          >
            <option v-for="option in categoryOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
          <Button v-if="!isCreateMode" variant="outline" size="sm" :disabled="saving" @click="handlePreview">预览</Button>
          <Button variant="outline" size="sm" :disabled="saving" @click="addItemRow">新增明细</Button>
          <Button variant="outline" size="sm" :disabled="saving || !form.items || form.items.length <= 1" @click="removeLastItemRow">删除末行</Button>
          <Button variant="outline" size="sm" :disabled="saving" @click="resetColumnWidths">重置列宽</Button>
          <Button variant="outline" size="sm" :disabled="saving" @click="requestClose">取消</Button>
          <Button size="sm" :disabled="saving" @click="handleSave">{{ saving ? '保存中...' : (isCreateMode ? '创建采购单' : '保存修改') }}</Button>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-6 bg-muted/20">
        <OrderSheetView
          v-if="form"
          :order="form"
          mode="edit"
          :column-widths="columnWidths"
          :default-widths="currentDefaultWidths"
          :hidden-columns="isCreateMode ? ['mb'] : []"
          @update:column-widths="handleColumnWidthsChange"
        />
      </div>
    </DialogContent>
  </Dialog>
</template>
