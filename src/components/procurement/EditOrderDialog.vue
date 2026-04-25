<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue';
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
import { cloneOrderDraft } from '@/features/procurement/orderDraft';
import {
  type PrintCategory
} from '@/features/procurement/docModel';
import { syncOrderItemQuantity } from '@/features/procurement/order-sheet.schema';
import {
  PROCUREMENT_TEMPLATE_OPTIONS,
  resolveOrderSchemaPrintCategory,
  resolvePrimaryCategoryForTemplate,
  resolveSchemaPrintCategory,
  resolveTemplateCategories,
  type ProcurementTemplateType,
} from '@/features/procurement/templateType';
import OrderSheetView from '@/components/procurement/OrderSheetView.vue';
import {
  PROCUREMENT_DOCUMENT_CREATE_TITLE,
  PROCUREMENT_DOCUMENT_EDIT_TITLE,
} from '@/features/procurement/documentTitles';
import {
  getDefaultWidths,
  persistLocalCategoryWidths,
} from '@/features/procurement/sheetWidthResolver';
import {
  applyPackagingHeaderNames,
  bootstrapOrderDraft,
  buildManualOrderNo,
  createEmptyItem,
  createEmptyOrderDraftByTemplate,
  nowStamp,
} from '@/features/procurement/editOrderDraft';
import { collectManualOrderValidationIssues, stripBlankManualItems, validateManualOrderDraft } from '@/features/procurement/manualOrderValidation';
import { removeOrderItemByKey, reorderOrderItemsByKey, type OrderItemDropPlacement } from '@/features/procurement/orderItemEditor';
import { isOrderRiskDismissed, resolveOrderRisk } from '@/features/procurement/orderRisk';

type DialogMode = 'edit' | 'create';

const props = withDefaults(defineProps<{
  open: boolean;
  order: Order | null;
  mode?: DialogMode;
  createTemplateType?: ProcurementTemplateType;
  createCategory?: string | null;
}>(), {
  mode: 'edit',
  createTemplateType: 'packaging',
  createCategory: null,
});

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'saved'): void;
  (e: 'draft-change', value: Order): void;
  (e: 'preview', value: Order): void;
}>();

const store = useProcurementStore();
const dialogBodyRef = ref<HTMLElement | null>(null);
const form = ref<Partial<Order>>({});
const saving = ref(false);
const initialSnapshot = ref('');
const columnWidths = ref<Record<string, number>>({ ...getDefaultWidths('packaging') });
const aggregateSideQuantities = ref(false);
const validationErrors = ref<ReturnType<typeof collectManualOrderValidationIssues>>([]);
const validationVisible = ref(false);

const isCreateMode = computed(() => props.mode === 'create');
const isRestrictedDetailEdit = computed(() => !isCreateMode.value && form.value.status === 'arrived');
const currentCategory = computed<PrintCategory>(() => resolveOrderSchemaPrintCategory(form.value));
const currentDefaultWidths = computed(() => getDefaultWidths(currentCategory.value));
const supportsAggregateQuantityToggle = computed(() => {
  return currentCategory.value === 'packaging' || currentCategory.value === 'handle' || currentCategory.value === 'lockset';
});
const detectedRisk = computed(() => {
  if (!form.value || !Array.isArray(form.value.items)) {
    return { level: null, reason: '' };
  }
  return resolveOrderRisk(form.value as Order, { ignoreDismissed: true });
});
const riskWarningDismissed = computed(() => isOrderRiskDismissed(form.value as Order | null));
const canToggleRiskWarning = computed(() => {
  return detectedRisk.value.level !== null;
});
const riskToggleLabel = computed(() => riskWarningDismissed.value ? '恢复 ! 警告' : '人工取消 ! 警告');
const riskToneClass = computed(() => {
  if (riskWarningDismissed.value) return 'text-muted-foreground';
  return detectedRisk.value.level === 'high' ? 'text-red-600' : 'text-amber-600';
});
const riskStatusLabel = computed(() => {
  if (riskWarningDismissed.value) return '已人工取消 ! 警告';
  if (detectedRisk.value.level === 'high') return '当前存在待人工处理明细';
  if (detectedRisk.value.level === 'medium') return '当前存在需人工确认明细';
  return '';
});

const currentTemplateType = computed<ProcurementTemplateType>(() => {
  const raw = String(form.value.metadata?.template_type || '').trim() as ProcurementTemplateType;
  return PROCUREMENT_TEMPLATE_OPTIONS.some((option) => option.value === raw) ? raw : 'packaging';
});
const currentTemplateOption = computed(() => {
  return PROCUREMENT_TEMPLATE_OPTIONS.find((option) => option.value === currentTemplateType.value) || PROCUREMENT_TEMPLATE_OPTIONS[0];
});
const currentTemplateCategoryOptions = computed(() => {
  return resolveTemplateCategories(currentTemplateType.value).map((category) => ({ value: category, label: category }));
});
const requiresBusinessCategoryChoice = computed(() => currentTemplateCategoryOptions.value.length > 1);

watch(columnWidths, (next) => {
  const category = currentCategory.value;
  persistLocalCategoryWidths(category, next);
  if (!form.value) return;
  if (!form.value.metadata) form.value.metadata = {};
  form.value.metadata.printColumnWidths = { ...next };
}, { deep: true });

watch(supportsAggregateQuantityToggle, (supported) => {
  if (!supported) {
    aggregateSideQuantities.value = false;
    if (form.value?.metadata) form.value.metadata.aggregateSideQuantities = false;
  }
});

const hasUnsavedChanges = computed(() => {
  if (!initialSnapshot.value) return false;
  try {
    return JSON.stringify(form.value) !== initialSnapshot.value;
  } catch {
    return false;
  }
});

function isManualOrder(order: Partial<Order> | null | undefined) {
  return order?.metadata?.order_source === 'manual';
}

function updateValidationErrors(order: Partial<Order> | null | undefined) {
  if (!isManualOrder(order)) {
    validationErrors.value = [];
    return;
  }

  if (isRestrictedDetailEdit.value) {
    const deliveryDate = order?.delivery_date;
    const parsed = deliveryDate ? new Date(String(deliveryDate)) : null;
    validationErrors.value = parsed && !Number.isNaN(parsed.getTime())
      ? []
      : [{ path: 'delivery_date', message: '交货日期不能为空' }];
    return;
  }

  validationErrors.value = collectManualOrderValidationIssues(order as Partial<Order>);
}

async function focusFirstInvalidField() {
  await nextTick();
  const root = dialogBodyRef.value;
  if (!root) return;

  const firstInvalid = root.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (!firstInvalid) return;

  firstInvalid.scrollIntoView({ block: 'center', behavior: 'smooth' });
  if ('focus' in firstInvalid) {
    firstInvalid.focus({ preventScroll: true });
  }
}

const orderSheetValidationState = computed(() => {
  if (!validationVisible.value) {
    return { fields: {}, rows: {}, cells: {} };
  }
  const fields: Record<string, string> = {};
  const rows: Record<number, string[]> = {};
  const cells: Record<string, string> = {};

  validationErrors.value.forEach((issue) => {
    if (issue.rowIndex === undefined) {
      if (!fields[issue.path]) fields[issue.path] = issue.message;
      return;
    }

    if (!rows[issue.rowIndex]) rows[issue.rowIndex] = [];
    rows[issue.rowIndex].push(issue.message);

    if (issue.columnKey) {
      const cellKey = `${issue.rowIndex}:${issue.columnKey}`;
      if (!cells[cellKey]) cells[cellKey] = issue.message;
    }
  });

  return { fields, rows, cells };
});

function bootstrapEditOrder(order: Order) {
  const { draft, widths } = bootstrapOrderDraft({ mode: 'edit', order });
  form.value = draft;
  columnWidths.value = widths;
  aggregateSideQuantities.value = supportsAggregateQuantityToggle.value && Boolean(draft.metadata?.aggregateSideQuantities);
  validationVisible.value = false;
  updateValidationErrors(draft);
  initialSnapshot.value = JSON.stringify(draft);
}

function bootstrapCreateOrder() {
  const { draft, widths } = bootstrapOrderDraft({ mode: 'create' });
  form.value = draft;
  columnWidths.value = widths;
  aggregateSideQuantities.value = false;
  if (!form.value.metadata) form.value.metadata = {};
  form.value.metadata.aggregateSideQuantities = false;
  applyCreateTemplate(props.createTemplateType, props.createCategory || undefined);
  validationVisible.value = false;
  updateValidationErrors(form.value);
  initialSnapshot.value = JSON.stringify(form.value);
}

function applyCreateTemplate(templateType: ProcurementTemplateType, nextCategory?: string) {
  if (!form.value) return;
  const requiresCategoryChoice = resolveTemplateCategories(templateType).length > 1;
  const category = nextCategory || (requiresCategoryChoice ? '' : resolvePrimaryCategoryForTemplate(templateType));
  const schemaCategory = resolveSchemaPrintCategory(templateType, category);
  const defaults = getDefaultWidths(schemaCategory);
  const rebuilt = requiresCategoryChoice && !category
    ? createEmptyOrderDraftByTemplate(templateType)
    : createEmptyOrderDraftByTemplate(templateType);
  const nextItem = createEmptyItem(schemaCategory);
  if (category === '拉手') nextItem.unit = '付';

  form.value.category = category || undefined;
  form.value.supplier = category ? rebuilt.supplier : '';
  form.value.items = [nextItem];
  if (!form.value.metadata) form.value.metadata = {};
  form.value.metadata.template_type = templateType;
  form.value.metadata.aggregateSideQuantities = false;
  form.value.metadata.printColumnWidths = { ...defaults };
  if (templateType !== 'packaging') {
    form.value.metadata.internal_name = '';
    form.value.metadata.external_name = '';
  }
  aggregateSideQuantities.value = false;
  columnWidths.value = { ...defaults };

  applyPackagingHeaderNames(form.value as Order);
}

watch(
  () => ({
    open: props.open,
    mode: props.mode,
    order: props.order,
    createTemplateType: props.createTemplateType,
    createCategory: props.createCategory,
  }),
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
    updateValidationErrors(next);
    if (hasUnsavedChanges.value) {
      validationVisible.value = true;
    }
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
  if (isManualOrder(order)) {
    if (isRestrictedDetailEdit.value) {
      if (!order.delivery_date || Number.isNaN(new Date(String(order.delivery_date)).getTime())) {
        return '交货日期不能为空';
      }
      return '';
    }
    const issues = validateManualOrderDraft(order);
    if (issues.length > 0) {
      return issues[0];
    }
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

  draft.items = (draft.items || []).map((item) => syncOrderItemQuantity({
    ...item,
    supplier: item.supplier || draft.supplier,
  }, currentCategory.value));
  if (isManualOrder(draft)) {
    draft.items = stripBlankManualItems(draft.items, draft.category) as Order['items'];
  }
  draft.remark = String(draft.remark || '');
  if (resolveOrderRisk(draft, { ignoreDismissed: true }).level === null && draft.metadata?.riskWarningDismissed) {
    draft.metadata.riskWarningDismissed = false;
  }

  applyPackagingHeaderNames(draft);

  const validateError = validateBeforeSave(draft);
  if (validateError) {
    validationVisible.value = true;
    updateValidationErrors(draft);
    void focusFirstInvalidField();
    return;
  }

  saving.value = true;
  try {
    if (isCreateMode.value) {
      await store.addOrder(draft as Order);
    } else {
      if (!draft.id || !props.order) return;
      const payload = isRestrictedDetailEdit.value
        ? {
            remark: draft.remark,
            delivery_date: draft.delivery_date,
            metadata: draft.metadata,
          }
        : draft;
      await store.updateOrder(draft.id, payload as Partial<Order>);
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

const toggleAggregateSideQuantities = () => {
  if (!supportsAggregateQuantityToggle.value) return;
  aggregateSideQuantities.value = !aggregateSideQuantities.value;
  if (!form.value) return;
  if (!form.value.metadata) form.value.metadata = {};
  form.value.metadata.aggregateSideQuantities = aggregateSideQuantities.value;
};

const toggleRiskWarningDismissed = () => {
  if (!form.value) return;
  if (!form.value.metadata) form.value.metadata = {};
  form.value.metadata.riskWarningDismissed = !riskWarningDismissed.value;
};

const addItemRow = () => {
  if (!form.value) return;
  const category = currentCategory.value;
  if (!Array.isArray(form.value.items)) form.value.items = [];
  form.value.items.push(createEmptyItem(category));
};

const removeItemRow = (itemKey: string) => {
  if (!form.value || !Array.isArray(form.value.items)) return;
  form.value.items = removeOrderItemByKey(form.value.items, itemKey) as Order['items'];
};

const removeLastItemRow = () => {
  if (!form.value || !Array.isArray(form.value.items)) return;
  if (form.value.items.length <= 1) return;
  form.value.items.pop();
};

const reorderItemRow = (payload: { sourceItemKey: string; targetItemKey: string; placement: OrderItemDropPlacement }) => {
  if (!form.value || !Array.isArray(form.value.items)) return;
  form.value.items = reorderOrderItemsByKey(form.value.items, payload) as Order['items'];
};

const handleTemplateChange = (event: Event) => {
  if (!isCreateMode.value || !form.value) return;
  const templateType = (event.target as HTMLSelectElement).value as ProcurementTemplateType;
  applyCreateTemplate(templateType);
};

const handleBusinessCategoryChange = (event: Event) => {
  if (!isCreateMode.value || !form.value) return;
  const nextCategory = (event.target as HTMLSelectElement).value;
  applyCreateTemplate(currentTemplateType.value, nextCategory);
};
</script>

<template>
  <Dialog :open="open" @update:open="handleDialogOpenChange">
    <DialogContent class="max-w-[1100px] max-h-[90vh] flex flex-col p-0 gap-0 bg-background">
      <DialogHeader class="sr-only">
        <DialogTitle>{{ isCreateMode ? PROCUREMENT_DOCUMENT_CREATE_TITLE : PROCUREMENT_DOCUMENT_EDIT_TITLE }}</DialogTitle>
        <DialogDescription>{{ isCreateMode ? PROCUREMENT_DOCUMENT_CREATE_TITLE : PROCUREMENT_DOCUMENT_EDIT_TITLE }}基础信息和明细项数据。</DialogDescription>
      </DialogHeader>

      <div class="px-6 py-4 bg-background border-b flex justify-between items-center sticky top-0 z-10 gap-2">
        <DialogTitle class="text-lg font-semibold">{{ isCreateMode ? PROCUREMENT_DOCUMENT_CREATE_TITLE : PROCUREMENT_DOCUMENT_EDIT_TITLE }}</DialogTitle>
        <div class="flex gap-2 items-center">
          <div
            v-if="canToggleRiskWarning"
            class="mr-2 inline-flex items-center gap-2 rounded-full border bg-muted/30 px-2 py-1 text-xs"
            :class="riskToneClass"
            :title="detectedRisk.reason || (riskWarningDismissed ? '已人工取消警告' : '')"
          >
            <span>{{ riskStatusLabel }}</span>
            <Button variant="ghost" size="sm" class="h-6 px-2 text-[11px]" :disabled="saving" @click="toggleRiskWarningDismissed">
              {{ riskToggleLabel }}
            </Button>
          </div>
          <div
            v-if="supportsAggregateQuantityToggle"
            class="mr-2 inline-flex items-center gap-2 rounded-full border bg-muted/30 px-2 py-1 text-xs text-muted-foreground"
          >
            <span :class="!aggregateSideQuantities ? 'text-foreground font-medium' : ''">分左右数量</span>
            <button
              type="button"
              class="relative h-6 w-11 rounded-full transition-colors"
              :class="aggregateSideQuantities ? 'bg-primary' : 'bg-slate-300'"
              :aria-pressed="aggregateSideQuantities"
              @click="toggleAggregateSideQuantities"
            >
              <span
                class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="aggregateSideQuantities ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
            <span :class="aggregateSideQuantities ? 'text-foreground font-medium' : ''">总数量</span>
          </div>
          <div v-if="isCreateMode" class="flex items-center gap-2">
            <select
              class="h-8 rounded-md border bg-background px-2 text-xs"
              :value="currentTemplateType"
              @change="handleTemplateChange"
            >
              <option v-for="option in PROCUREMENT_TEMPLATE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <select
              v-if="requiresBusinessCategoryChoice"
              class="h-8 rounded-md border bg-background px-2 text-xs"
              :value="form.category || ''"
              @change="handleBusinessCategoryChange"
            >
              <option value="">请选择业务类别</option>
              <option v-for="option in currentTemplateCategoryOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <span v-else class="inline-flex h-8 items-center rounded-md border bg-muted/40 px-2 text-xs text-muted-foreground">
              {{ currentTemplateOption.label }}
            </span>
          </div>
          <Button v-if="!isCreateMode" variant="outline" size="sm" :disabled="saving" @click="handlePreview">预览</Button>
          <Button variant="outline" size="sm" :disabled="saving || isRestrictedDetailEdit" @click="addItemRow">新增明细</Button>
          <Button variant="outline" size="sm" :disabled="saving || isRestrictedDetailEdit || !form.items || form.items.length <= 1" @click="removeLastItemRow">删除末行</Button>
          <Button variant="outline" size="sm" :disabled="saving" @click="resetColumnWidths">重置列宽</Button>
          <Button variant="outline" size="sm" :disabled="saving" @click="requestClose">取消</Button>
          <Button size="sm" :disabled="saving" @click="handleSave">{{ saving ? '保存中...' : (isCreateMode ? '创建采购单' : '保存修改') }}</Button>
        </div>
      </div>

      <div v-if="isRestrictedDetailEdit" class="px-6 py-3 border-b bg-amber-50 text-amber-800 text-xs">
        已到货订单仅允许修改交货日期和整单备注，明细内容已冻结。
      </div>

      <div
        v-else-if="validationVisible && validationErrors.length > 0"
        class="px-6 py-3 border-b bg-red-50 text-red-700 text-xs"
      >
        <div class="font-medium">录入信息未通过校验</div>
        <div class="mt-1">{{ validationErrors[0]?.message }}</div>
      </div>

      <div ref="dialogBodyRef" class="flex-1 overflow-auto p-6 bg-muted/20">
        <OrderSheetView
          v-if="form"
          :order="form"
          mode="edit"
          :restrict-detail-editing="isRestrictedDetailEdit"
          :column-widths="columnWidths"
          :default-widths="currentDefaultWidths"
          :aggregate-side-quantities="aggregateSideQuantities"
          :validation-errors="orderSheetValidationState"
          :hidden-columns="isCreateMode ? ['mb'] : []"
          @update:column-widths="handleColumnWidthsChange"
          @remove:item="removeItemRow"
          @reorder:item="reorderItemRow"
        />
      </div>
    </DialogContent>
  </Dialog>
</template>
