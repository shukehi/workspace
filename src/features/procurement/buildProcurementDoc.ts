import { CATEGORY_CONFIGS, isNumericField, normalizeDateString, resolvePrintColumnWidths, type PrintCategory, type PrintMode, type ProcurementDocModel, type ProcurementDocPage, type ProcurementDocRow, type DocValue } from '@/features/procurement/docModel';

interface BuildDocOptions {
  category: PrintCategory;
  mode: PrintMode;
  packagingMapping?: any;
}

type SourceOrder = {
  code?: string;
  order_no?: string;
  customerName?: string;
  supplier?: string;
  orderDate?: string;
  deliveryDate?: string;
  created_at?: string;
  delivery_date?: string;
  metadata?: {
    customer_name?: string;
    [key: string]: any;
  };
  printColumnWidths?: Record<string, number>;
  list?: any[];
  items?: any[];
};

interface NormalizedPrintItem {
  supplier?: string;
  internal_name?: string;
  external_name?: string;
  name?: string;
  type?: string;
  spec?: string;
  model?: string;
  mb?: string;
  eccentricity?: string;
  qtyLeft?: number;
  qtyRight?: number;
  quantity?: number;
  unit?: string;
  remark?: string;
}

function parseQuantityPair(qtyStr: any) {
  if (!qtyStr) return { left: 0, right: 0 };
  const parts = qtyStr.toString().split('/');
  const leftVal = Number.parseFloat(parts[0]) || 0;
  const rightVal = Number.parseFloat(parts[1]) || leftVal;
  return { left: leftVal, right: rightVal };
}

function resolvePackagingInternalName(item: any) {
  return (
    item?.internalName ||
    item?.internal_name ||
    item?.bz ||
    item?.name ||
    item?.model ||
    '无名称'
  );
}

function resolveLeftRightQty(item: any) {
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

function normalizeProductNames(rawName: string | undefined) {
  if (!rawName) return [];

  const raw = String(rawName).trim();
  if (!raw) return [];

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

function formatProductNameDisplay(rawName: string | undefined) {
  const names = normalizeProductNames(rawName);
  return names.length > 0 ? names.join('\n') : '-';
}

function normalizeItemForCategory(item: any, category: PrintCategory): NormalizedPrintItem {
  if (category === 'packaging') {
    const qty = resolveLeftRightQty(item);
    return {
      supplier: item?.supplier,
      internal_name: resolvePackagingInternalName(item),
      external_name: item?.external_name || item?.name,
      name: formatProductNameDisplay(item?.name || item?.productModelName),
      spec: item?.spec || item?.model || '-',
      mb: item?.mb || item?.orientation || '-',
      qtyLeft: qty.left,
      qtyRight: qty.right,
      quantity: Number(item?.quantity || 0),
      unit: item?.unit || '套',
      remark: item?.remark || ''
    };
  }

  if (category === 'cylinder') {
    return {
      supplier: item?.supplier,
      type: item?.type || item?.name || '-',
      eccentricity: item?.eccentricity || '-',
      quantity: Number(item?.quantity || 0),
      remark: item?.remark || ''
    };
  }

  if (category === 'lock') {
    return {
      supplier: item?.supplier,
      type: item?.type || item?.name || '-',
      spec: item?.spec || item?.model || '-',
      quantity: Number(item?.quantity || 0),
      unit: item?.unit || '个',
      remark: item?.remark || ''
    };
  }

  return {
    supplier: item?.supplier,
    type: item?.type || item?.name || '-',
    spec: item?.spec || item?.model || '-',
    quantity: Number(item?.quantity || 0),
    remark: item?.remark || ''
  };
}

function normalizeItemsForCategory(items: any[], category: PrintCategory): NormalizedPrintItem[] {
  return (items || []).map((item) => normalizeItemForCategory(item, category));
}

function groupItemsByPackaging(items: NormalizedPrintItem[], packagingMapping: any) {
  const groups: Record<string, { internalName: string; externalName: string; items: NormalizedPrintItem[] }> = {};
  const mappings = packagingMapping?.mappings || packagingMapping || {};

  (items || []).forEach((item) => {
    const internalName = item.internal_name || '无名称';
    const externalName = item.external_name || mappings[internalName] || item.name || '未匹配';

    if (!groups[internalName]) {
      groups[internalName] = {
        internalName,
        externalName,
        items: []
      };
    }
    groups[internalName].items.push(item);
  });

  return groups;
}

function groupItemsByCategory(items: NormalizedPrintItem[], category: PrintCategory, packagingMapping: any) {
  if (category === 'packaging') {
    return groupItemsByPackaging(items, packagingMapping);
  }

  const config = CATEGORY_CONFIGS[category];
  const groups: Record<string, { supplier: string; items: NormalizedPrintItem[] }> = {};

  (items || []).forEach((item) => {
    const key = (item as any)[config.groupBy] || '未分类';
    if (!groups[key]) {
      groups[key] = {
        supplier: item.supplier || key,
        items: []
      };
    }
    groups[key].items.push(item);
  });

  return groups;
}

function getFieldValue(field: string, item: NormalizedPrintItem, index: number, category: PrintCategory): DocValue {
  if (field === 'no') return index + 1;
  if (field === 'productModelName') return item.name || '-';
  if (field === 'spec') return item.spec || item.model || '-';
  if (field === 'mb') return item.mb || '-';
  if (field === 'qtyLeft') return Number(item.qtyLeft || 0);
  if (field === 'qtyRight') return Number(item.qtyRight || 0);
  if (field === 'type') return item.type || item.name || '-';
  if (field === 'eccentricity') return item.eccentricity || '-';
  if (field === 'quantity') return Number(item.quantity || 0);
  if (field === 'unit') return item.unit || '个';
  if (field === 'remark') return category === 'packaging' ? '' : (item.remark || '');
  return '-';
}

export function buildProcurementDoc(source: SourceOrder, options: BuildDocOptions): ProcurementDocModel {
  const category = options.category;
  const mode = options.mode;
  const config = CATEGORY_CONFIGS[category];
  const rawItems = source.list || source.items || [];
  const normalizedItems = normalizeItemsForCategory(rawItems, category);
  const groups = groupItemsByCategory(normalizedItems, category, options.packagingMapping);

  const today = new Date().toISOString().split('T')[0];
  const orderDate = normalizeDateString(source.orderDate || source.created_at) || today;
  const deliveryDate = normalizeDateString(source.deliveryDate || source.delivery_date) || orderDate;
  const customerName = source.customerName || source.metadata?.customer_name || source.supplier || '-';
  const code = source.code || source.order_no || '-';

  const rawWidths = resolvePrintColumnWidths(source.printColumnWidths || source.metadata?.printColumnWidths);

  const columns = config.fields.map((field, index) => ({
    key: field,
    label: config.headers[index],
    width: rawWidths[field],
    numeric: isNumericField(field)
  }));

  const pages: ProcurementDocPage[] = Object.keys(groups).map((groupKey) => {
    const group = groups[groupKey] as any;
    const items: NormalizedPrintItem[] = group.items || [];

    const rows: ProcurementDocRow[] = items.map((item, index) => {
      const values: Record<string, DocValue> = {};
      config.fields.forEach((field) => {
        values[field] = getFieldValue(field, item, index, category);
      });
      return { rowType: 'item' as const, values };
    });

    const totalValues: Record<string, DocValue> = {};
    if (category === 'packaging') {
      const totalLeft = items.reduce((sum, item) => sum + Number(item.qtyLeft || 0), 0);
      const totalRight = items.reduce((sum, item) => sum + Number(item.qtyRight || 0), 0);
      totalValues.qtyLeft = totalLeft;
      totalValues.qtyRight = totalRight;
    } else {
      const total = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      totalValues.quantity = total;
    }
    rows.push({ rowType: 'total', values: totalValues });

    const supplier = category === 'packaging'
      ? (items[0]?.supplier || options.packagingMapping?.supplierName || '默认供应商')
      : (group.supplier || groupKey || '-');

    const internalName = category === 'packaging' ? (group.internalName || groupKey || '-') : '-';
    const externalName = category === 'packaging' ? (group.externalName || groupKey || '-') : '-';

    return {
      pageKey: `${category}-${groupKey}`,
      title: config.title,
      category,
      mode,
      customerName,
      code,
      orderDate,
      deliveryDate,
      supplier,
      internalName,
      externalName,
      columns,
      rows
    };
  });

  return {
    category,
    mode,
    title: config.title,
    poNumber: code,
    pages
  };
}
