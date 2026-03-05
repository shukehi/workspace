import {
  CATEGORY_CONFIGS,
  normalizeDateString,
  normalizePrintCategory,
  normalizePrintMode,
  type PrintCategory,
  type PrintMode,
  type ProcurementDocModel,
  type ProcurementDocPage,
  type ProcurementDocRow,
} from '@/features/procurement/docModel';
import { getSheetSchema } from '@/features/procurement/order-sheet.schema';
import { resolveSheetWidths } from '@/features/procurement/sheetWidthResolver';

type AnyRecord = Record<string, any>;

export interface PrintDocBuildInput {
  poNumber?: string;
  category?: string;
  printMode?: string;
  order: AnyRecord;
}

type NormalizedItem = {
  supplier: string;
  internal_name: string;
  external_name: string;
  name: string;
  type: string;
  spec: string;
  mb: string;
  eccentricity: string;
  qtyLeft: number;
  qtyRight: number;
  quantity: number;
  unit: string;
  remark: string;
};

type NormalizedSource = {
  poNumber: string;
  category: PrintCategory;
  printMode: PrintMode;
  customerName: string;
  orderDate: string;
  deliveryDate: string;
  supplier: string;
  internalName: string;
  externalName: string;
  printColumnWidths: Record<string, number>;
  items: AnyRecord[];
};

type GroupedPage = {
  supplier: string;
  internalName: string;
  externalName: string;
  items: NormalizedItem[];
};

function parseQuantityPair(qtyString: unknown) {
  if (qtyString === undefined || qtyString === null) {
    return { left: 0, right: 0 };
  }

  const cleaned = String(qtyString).trim();
  if (!cleaned) {
    return { left: 0, right: 0 };
  }

  const slashIndex = cleaned.indexOf('/');
  if (slashIndex === -1) {
    const val = Number.parseFloat(cleaned) || 0;
    return { left: val, right: val };
  }

  const left = Number.parseFloat(cleaned.substring(0, slashIndex)) || 0;
  const right = Number.parseFloat(cleaned.substring(slashIndex + 1)) || 0;
  return { left, right };
}

function resolveLeftRightQty(item: AnyRecord) {
  if (item?.qty !== undefined && item?.qty !== null && item?.qty !== '') {
    return parseQuantityPair(item.qty);
  }

  const left = Number(item?.quantity_left || 0);
  const right = Number(item?.quantity_right || 0);
  if (left > 0 || right > 0) {
    return { left, right };
  }

  const quantity = Number(item?.quantity || 0);
  return { left: quantity, right: 0 };
}

function normalizeProductNames(rawName: unknown) {
  if (!rawName) return [] as string[];

  const raw = String(rawName).trim();
  if (!raw) return [] as string[];

  const byLine = raw
    .split('\n')
    .map((name) => name.trim())
    .filter(Boolean);

  const source = byLine.length > 1
    ? byLine
    : raw.includes(' / ')
      ? raw.split(/\s+\/\s+/).map((name) => name.trim()).filter(Boolean)
      : [raw];

  return Array.from(new Set(source));
}

function formatProductNameDisplay(rawName: unknown) {
  const names = normalizeProductNames(rawName);
  return names.length > 0 ? names.join('\n') : '-';
}

function normalizePrintColumnWidths(source: unknown) {
  const result: Record<string, number> = {};
  if (!source || typeof source !== 'object') return result;

  Object.entries(source as AnyRecord).forEach(([field, value]) => {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && parsed >= 36) {
      result[field] = parsed;
    }
  });

  return result;
}

function normalizeSource(input: PrintDocBuildInput): NormalizedSource {
  const order = (input?.order || {}) as AnyRecord;
  const metadata = (order?.metadata && typeof order.metadata === 'object')
    ? order.metadata
    : {};
  const list = Array.isArray(order?.list)
    ? order.list
    : (Array.isArray(order?.items) ? order.items : []);

  const category = normalizePrintCategory(input.category || order.category);
  const printMode = normalizePrintMode(input.printMode || order.printMode);
  const today = new Date().toISOString().slice(0, 10);
  const orderDate = normalizeDateString(order.orderDate || order.created_at) || today;
  const deliveryDate = normalizeDateString(order.deliveryDate || order.delivery_date) || orderDate;

  const poNumber = String(input.poNumber || order.order_no || order.code || '').trim();

  const customerName = String(
    order.customerName
    || order.customer_name
    || metadata.customer_name
    || order.supplier
    || ''
  ).trim();

  const supplier = String(
    order.supplier
    || metadata.supplier
    || list?.[0]?.supplier
    || ''
  ).trim();

  const internalName = String(
    order.internalName
    || order.internal_name
    || metadata.internal_name
    || ''
  ).trim();

  const externalName = String(
    order.externalName
    || order.external_name
    || metadata.external_name
    || ''
  ).trim();

  return {
    poNumber,
    category,
    printMode,
    customerName,
    orderDate,
    deliveryDate,
    supplier,
    internalName,
    externalName,
    printColumnWidths: normalizePrintColumnWidths(order.printColumnWidths || metadata.printColumnWidths),
    items: list,
  };
}

function normalizeItem(item: AnyRecord, category: PrintCategory, source: NormalizedSource): NormalizedItem {
  if (category === 'packaging') {
    const qty = resolveLeftRightQty(item);
    return {
      supplier: String(item?.supplier || source.supplier || '默认供应商'),
      internal_name: String(item?.internal_name || item?.internalName || item?.bz || source.internalName || item?.name || item?.model || '-'),
      external_name: String(item?.external_name || item?.externalName || source.externalName || item?.name || '-'),
      name: formatProductNameDisplay(item?.name || item?.productModelName || '-'),
      type: String(item?.type || item?.name || '-'),
      spec: String(item?.spec || item?.model || '-'),
      mb: String(item?.mb || item?.orientation || '-'),
      eccentricity: String(item?.eccentricity || '-'),
      qtyLeft: Number(qty.left || 0),
      qtyRight: Number(qty.right || 0),
      quantity: Number(item?.quantity || 0),
      unit: String(item?.unit || '套'),
      remark: String(item?.remark || ''),
    };
  }

  if (category === 'cylinder') {
    return {
      supplier: String(item?.supplier || source.supplier || '未分类'),
      internal_name: '-',
      external_name: '-',
      name: String(item?.name || '-'),
      type: String(item?.type || item?.name || '-'),
      spec: String(item?.spec || item?.model || '-'),
      mb: String(item?.mb || item?.orientation || '-'),
      eccentricity: String(item?.eccentricity || '-'),
      qtyLeft: 0,
      qtyRight: 0,
      quantity: Number(item?.quantity || 0),
      unit: String(item?.unit || '套'),
      remark: String(item?.remark || ''),
    };
  }

  if (category === 'lock') {
    return {
      supplier: String(item?.supplier || source.supplier || '未分类'),
      internal_name: '-',
      external_name: '-',
      name: String(item?.name || '-'),
      type: String(item?.type || item?.name || '-'),
      spec: String(item?.spec || item?.model || '-'),
      mb: String(item?.mb || item?.orientation || '-'),
      eccentricity: String(item?.eccentricity || '-'),
      qtyLeft: 0,
      qtyRight: 0,
      quantity: Number(item?.quantity || 0),
      unit: String(item?.unit || '个'),
      remark: String(item?.remark || ''),
    };
  }

  return {
    supplier: String(item?.supplier || source.supplier || '未分类'),
    internal_name: '-',
    external_name: '-',
    name: String(item?.name || '-'),
    type: String(item?.type || item?.name || '-'),
    spec: String(item?.spec || item?.model || '-'),
    mb: String(item?.mb || item?.orientation || '-'),
    eccentricity: String(item?.eccentricity || '-'),
    qtyLeft: 0,
    qtyRight: 0,
    quantity: Number(item?.quantity || 0),
    unit: String(item?.unit || '个'),
    remark: String(item?.remark || ''),
  };
}

function groupItems(items: NormalizedItem[], source: NormalizedSource): GroupedPage[] {
  const groups = new Map<string, GroupedPage>();
  const category = source.category;
  const groupBy = CATEGORY_CONFIGS[category].groupBy;

  items.forEach((item) => {
    const key = category === 'packaging'
      ? (item.internal_name || '无名称')
      : (String(item[groupBy as keyof NormalizedItem] || '未分类'));

    if (!groups.has(key)) {
      groups.set(key, {
        supplier: item.supplier || source.supplier || (category === 'packaging' ? '默认供应商' : key),
        internalName: category === 'packaging' ? (item.internal_name || source.internalName || '无名称') : '-',
        externalName: category === 'packaging' ? (item.external_name || source.externalName || '-') : '-',
        items: [],
      });
    }

    groups.get(key)!.items.push(item);
  });

  if (groups.size === 0) {
    groups.set('default', {
      supplier: source.supplier || (category === 'packaging' ? '默认供应商' : '未分类'),
      internalName: category === 'packaging' ? (source.internalName || '-') : '-',
      externalName: category === 'packaging' ? (source.externalName || '-') : '-',
      items: [],
    });
  }

  return Array.from(groups.values());
}

function getCellValue(item: NormalizedItem, field: string, rowNumber: number, category: PrintCategory) {
  if (field === 'no') return rowNumber;
  if (field === 'productModelName') return item.name || '-';
  if (field === 'spec') return item.spec || '-';
  if (field === 'mb') return item.mb || '-';
  if (field === 'qtyLeft') return Number(item.qtyLeft || 0);
  if (field === 'qtyRight') return Number(item.qtyRight || 0);
  if (field === 'type') return item.type || item.name || '-';
  if (field === 'eccentricity') return item.eccentricity || '-';
  if (field === 'quantity') return Number(item.quantity || 0);
  if (field === 'unit') return item.unit || (category === 'cylinder' ? '套' : '个');
  if (field === 'remark') return category === 'packaging' ? '' : (item.remark || '');
  return '-';
}

function buildTotalRow(category: PrintCategory, fields: string[], items: NormalizedItem[]): ProcurementDocRow {
  if (category === 'packaging') {
    const totalLeft = items.reduce((sum, item) => sum + Number(item.qtyLeft || 0), 0);
    const totalRight = items.reduce((sum, item) => sum + Number(item.qtyRight || 0), 0);
    const values: Record<string, string | number> = {
      __label: '合计',
      __labelColspan: 4,
      qtyLeft: totalLeft,
      qtyRight: totalRight,
    };
    return { rowType: 'total', values };
  }

  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const quantityIndex = fields.indexOf('quantity');
  const labelColspan = quantityIndex > 0 ? quantityIndex : Math.max(fields.length - 2, 1);
  const values: Record<string, string | number> = {
    __label: '合计',
    __labelColspan: labelColspan,
    quantity: totalQuantity,
  };
  return { rowType: 'total', values };
}

function buildRows(category: PrintCategory, fields: string[], items: NormalizedItem[]): ProcurementDocRow[] {
  const itemRows = items.map((item, index) => {
    const values: Record<string, string | number> = {};
    fields.forEach((field) => {
      values[field] = getCellValue(item, field, index + 1, category);
    });
    return {
      rowType: 'item' as const,
      values,
    };
  });

  return [...itemRows, buildTotalRow(category, fields, items)];
}

function buildPage(
  group: GroupedPage,
  source: NormalizedSource,
  pageIndex: number,
  fields: string[],
  headers: string[],
  aligns: Array<'left' | 'center' | 'right'>
): ProcurementDocPage {
  const widthState = resolveSheetWidths(
    source.category,
    source.printColumnWidths,
    { preferLocalWhenMissing: false }
  );

  return {
    pageKey: `${source.poNumber || 'order'}-${pageIndex}`,
    title: CATEGORY_CONFIGS[source.category].title,
    category: source.category,
    mode: source.printMode,
    customerName: source.customerName,
    code: source.poNumber,
    orderDate: source.orderDate,
    deliveryDate: source.deliveryDate,
    supplier: group.supplier,
    internalName: source.category === 'packaging' ? group.internalName : '-',
    externalName: source.category === 'packaging' ? group.externalName : '-',
    columns: fields.map((field, index) => ({
      key: field,
      label: headers[index] || field,
      align: aligns[index] || 'center',
      width: widthState.widths[field],
      numeric: field === 'qtyLeft' || field === 'qtyRight' || field === 'quantity',
    })),
    rows: buildRows(source.category, fields, group.items),
  };
}

export function buildProcurementDocModel(input: PrintDocBuildInput): ProcurementDocModel {
  const source = normalizeSource(input);
  const schema = getSheetSchema(source.category);
  const normalizedItems = source.items.map((item) => normalizeItem(item, source.category, source));
  const grouped = groupItems(normalizedItems, source);

  const fields = schema.columns.map((column) => column.key);
  const headers = schema.columns.map((column) => column.label);
  const aligns = schema.columns.map((column) => column.align);
  const pages = grouped.map((group, index) => buildPage(group, source, index, fields, headers, aligns));

  const title = `${CATEGORY_CONFIGS[source.category].title} ${source.poNumber || ''}`.trim();

  return {
    category: source.category,
    mode: source.printMode,
    title,
    poNumber: source.poNumber,
    pages,
  };
}
