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
import type { Order, OrderItem } from '@/types/order';
import { packagingMatcher } from '@/lib/packagingMatcher';
import { getPackagingMapping } from '@/services/packagingConfig';
import { cloneOrderDraft, normalizeOrderDraft } from '@/features/procurement/orderDraft';
import { normalizePrintCategory, type PrintCategory } from '@/features/procurement/docModel';
import { resolvePackagingHeaderNames } from '@/features/procurement/packagingNameResolver';
import { prepareOrderDraft } from '@/features/procurement/prepareOrderDraft';
import OrderSheetView from '@/components/procurement/OrderSheetView.vue';
import {
  getDefaultWidths,
  persistLocalCategoryWidths,
  resolveSheetWidths,
} from '@/features/procurement/sheetWidthResolver';

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

function nowStamp() {
  return new Date().toISOString();
}

function buildManualOrderNo() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mi = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `PO-MANUAL-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function createEmptyItem(category: PrintCategory): OrderItem {
  const base: OrderItem = {
    id: 0,
    material_id: '',
    supplier: '',
    name: '',
    model: '',
    quantity: 0,
    unit: '个',
    remark: '',
  };

  if (category === 'packaging') {
    return {
      ...base,
      internal_name: '',
      external_name: '',
      spec: '',
      mb: '',
      quantity_left: 0,
      quantity_right: 0,
      unit: '套',
    };
  }

  if (category === 'cylinder') {
    return {
      ...base,
      type: '',
      eccentricity: '',
      spec: '',
      unit: '套',
    };
  }

  if (category === 'lock') {
    return {
      ...base,
      type: '',
      spec: '',
      unit: '个',
    };
  }

  if (category === 'handle') {
    return {
      ...base,
      type: '',
      spec: '',
      unit: '付',
    };
  }

  return {
    ...base,
    type: '',
    spec: '',
    unit: '个',
  };
}

function createEmptyOrderDraft(categoryRaw = '包装'): Order {
  const category = normalizePrintCategory(categoryRaw);
  const packagingMapping = getPackagingMapping();
  const categoryMap: Record<PrintCategory, string> = {
    packaging: '包装',
    cylinder: '锁芯',
    handle: '拉手',
    lock: '锁叉',
    hardware: '配件',
  };

  const draft: Order = {
    id: 0,
    order_no: buildManualOrderNo(),
    supplier: category === 'packaging' ? (packagingMapping?.supplierName || '') : '',
    category: categoryMap[category],
    items: [createEmptyItem(category)],
    total_amount: 0,
    created_at: nowStamp(),
    delivery_date: nowStamp(),
    status: 'draft',
    remark: '',
    metadata: {
      customer_name: '',
      internal_name: '',
      external_name: '',
      printColumnWidths: { ...getDefaultWidths(category) },
    },
  };

  if (category === 'packaging') {
    const names = resolvePackagingHeaderNames(draft, packagingMapping, packagingMatcher);
    draft.metadata!.internal_name = names.internalName;
    draft.metadata!.external_name = names.externalName;
  }

  return normalizeOrderDraft(draft);
}

function applyPackagingHeaderNames(target: Order) {
  const isPackagingOrder = target.category && String(target.category).includes('包装');
  if (!isPackagingOrder) return;
  if (!target.metadata) target.metadata = {};
  const packagingMapping = getPackagingMapping();

  const names = resolvePackagingHeaderNames(
    target,
    packagingMapping,
    packagingMatcher
  );
  target.metadata.internal_name = names.internalName;
  target.metadata.external_name = names.externalName;

  if (!target.supplier) {
    target.supplier = packagingMapping?.supplierName || '默认供应商';
  }
}

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
  const normalizedDraft = prepareOrderDraft(order);
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

function bootstrapCreateOrder() {
  const draft = createEmptyOrderDraft('包装');
  form.value = draft;
  const resolved = resolveSheetWidths(
    draft.category,
    draft.metadata?.printColumnWidths,
    { preferLocalWhenMissing: true }
  );
  columnWidths.value = resolved.widths;
  if (form.value.metadata) {
    form.value.metadata.printColumnWidths = { ...resolved.widths };
  }
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
