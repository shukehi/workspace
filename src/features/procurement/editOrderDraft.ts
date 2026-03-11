import { packagingMatcher } from '@/lib/packagingMatcher';
import { getPackagingMapping } from '@/services/packagingConfig';
import { normalizeOrderDraft } from '@/features/procurement/orderDraft';
import { normalizePrintCategory, type PrintCategory } from '@/features/procurement/docModel';
import { resolvePackagingHeaderNames } from '@/features/procurement/packagingNameResolver';
import { prepareOrderDraft } from '@/features/procurement/prepareOrderDraft';
import { getDefaultWidths, resolveSheetWidths } from '@/features/procurement/sheetWidthResolver';
import type { Order, OrderItem } from '@/types/order';

export function nowStamp() {
  return new Date().toISOString();
}

export function buildManualOrderNo() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mi = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `PO-MANUAL-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

export function createEmptyItem(category: PrintCategory): OrderItem {
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
  const categoryMap: Record<PrintCategory, string> = {
    packaging: '包装',
    cylinder: '锁芯',
    handle: '拉手',
    lockset: '锁具',
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
    applyPackagingHeaderNames(draft);
  }

  return normalizeOrderDraft(draft);
}

export function bootstrapOrderDraft(options: {
  mode: 'edit' | 'create';
  order?: Order | null;
}) {
  const draft = options.mode === 'create'
    ? createEmptyOrderDraft('包装')
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
