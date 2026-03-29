import { packagingMatcher } from '@/lib/packagingMatcher';
import { getPackagingMapping } from '@/services/packagingConfig';
import { createDraftItemKey, normalizeOrderDraft } from '@/features/procurement/orderDraft';
import {
  normalizePrintCategory,
  resolveProcurementOrderCategory,
  type PrintCategory
} from '@/features/procurement/docModel';
import { resolvePackagingHeaderNames } from '@/features/procurement/packagingNameResolver';
import { prepareOrderDraft } from '@/features/procurement/prepareOrderDraft';
import { getDefaultWidths, resolveSheetWidths } from '@/features/procurement/sheetWidthResolver';
import {
  resolvePrimaryCategoryForTemplate,
  resolveTemplateTypeFromPrintCategory,
  type ProcurementTemplateType,
} from '@/features/procurement/templateType';
import type { Order, OrderItem } from '@/types/order';

export function nowStamp() {
  return new Date().toISOString();
}

export function buildManualOrderNo(date = new Date(), sequence = 1001) {
  const pad = (value: number) => String(value).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  return `PM-${yy}${mm}${dd}-${String(sequence).padStart(4, '0')}`;
}

export function createEmptyItem(category: PrintCategory): OrderItem {
  const base: OrderItem = {
    id: 0,
    item_key: createDraftItemKey(),
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

  if (category === 'lockset') {
    return {
      ...base,
      type: '',
      spec: '',
      quantity_left: 0,
      quantity_right: 0,
      unit: '套',
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

export function applyPackagingHeaderNames(target: Order) {
  const isPackagingOrder = target.category && String(target.category).includes('包装');
  if (!isPackagingOrder) return;
  if (!target.metadata) target.metadata = {};

  const packagingMapping = getPackagingMapping();
  const names = resolvePackagingHeaderNames(target, packagingMapping, packagingMatcher);
  target.metadata.internal_name = names.internalName;
  target.metadata.external_name = names.externalName;

  if (!target.supplier) {
    target.supplier = packagingMapping?.supplierName || '默认供应商';
  }
}

export function createEmptyOrderDraft(categoryRaw = '包装'): Order {
  const category = normalizePrintCategory(categoryRaw);
  const packagingMapping = getPackagingMapping();

  const draft: Order = {
    id: 0,
    order_no: buildManualOrderNo(),
    supplier: category === 'packaging' ? (packagingMapping?.supplierName || '') : '',
    category: resolveProcurementOrderCategory(category),
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
      order_source: 'manual',
      template_type: resolveTemplateTypeFromPrintCategory(category),
      aggregateSideQuantities: false,
      printColumnWidths: { ...getDefaultWidths(category) },
    },
  };

  if (category === 'packaging') {
    applyPackagingHeaderNames(draft);
  }

  return normalizeOrderDraft(draft);
}

export function createEmptyOrderDraftByTemplate(templateType: ProcurementTemplateType): Order {
  return createEmptyOrderDraft(resolvePrimaryCategoryForTemplate(templateType));
}

export function bootstrapOrderDraft(options: {
  mode: 'edit' | 'create';
  order?: Order | null;
}) {
  const draft = options.mode === 'create'
    ? createEmptyOrderDraftByTemplate('packaging')
    : prepareOrderDraft(options.order as Order);

  const resolved = resolveSheetWidths(
    draft.category,
    draft.metadata?.printColumnWidths,
    { preferLocalWhenMissing: true }
  );

  if (!draft.metadata) draft.metadata = {};
  draft.metadata.printColumnWidths = { ...resolved.widths };

  return {
    draft,
    widths: resolved.widths,
  };
}
