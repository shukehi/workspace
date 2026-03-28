import type { OrderItem } from '@/types/order';
import type { PrintCategory } from '@/features/procurement/docModel';
import { PROCUREMENT_DOCUMENT_TITLE } from '@/features/procurement/documentTitles';
import sharedSchema from '@/features/procurement/procurement-schema.shared.json';

export type SheetColumnAlign = 'left' | 'center' | 'right';
export type SheetColumnSemantic = 'index' | 'name' | 'specLike' | 'edge' | 'quantity' | 'unit' | 'remark';

export interface SheetColumn {
  key: string;
  label: string;
  align: SheetColumnAlign;
  inputType: 'text' | 'number';
  semantic: SheetColumnSemantic;
}

export type SheetSchema = {
  title: string;
  columns: SheetColumn[];
};

type SheetSchemaOptions = {
  aggregateSideQuantities?: boolean;
  hiddenColumns?: string[];
};

type WidthMap = Record<string, number>;

type SharedColumn = {
  key: string;
  label: string;
  align: SheetColumnAlign;
  inputType: 'text' | 'number';
  semantic: SheetColumnSemantic;
};

type SharedCategory = {
  title: string;
  groupBy: string;
  columns: SharedColumn[];
};

function resolveLabelBySemantic(semantic: SheetColumnSemantic, fallbackLabel: string) {
  if (semantic === 'specLike') return '规格';
  return fallbackLabel;
}

function toSheetSchema(category: SharedCategory): SheetSchema {
  return {
    title: PROCUREMENT_DOCUMENT_TITLE,
    columns: category.columns.map((column) => ({
      ...column,
      label: resolveLabelBySemantic(column.semantic, column.label)
    }))
  };
}

const sharedCategories = sharedSchema.categories as Record<PrintCategory, SharedCategory>;

export const CATEGORY_SCHEMAS: Record<PrintCategory, SheetSchema> = {
  packaging: toSheetSchema(sharedCategories.packaging),
  cylinder: toSheetSchema(sharedCategories.cylinder),
  handle: toSheetSchema(sharedCategories.handle),
  lockset: toSheetSchema(sharedCategories.lockset),
  lock: toSheetSchema(sharedCategories.lock),
  hardware: toSheetSchema(sharedCategories.hardware)
};

export function supportsSplitQuantityColumns(category: PrintCategory): boolean {
  return category === 'packaging' || category === 'handle' || category === 'lockset';
}

export function resolveOrderItemQuantity(item: Partial<OrderItem>, category: PrintCategory): number {
  if (supportsSplitQuantityColumns(category)) {
    return Number(item.quantity_left || 0) + Number(item.quantity_right || 0);
  }
  return Number(item.quantity || 0);
}

export function syncOrderItemQuantity<T extends Partial<OrderItem>>(item: T, category: PrintCategory): T {
  if (supportsSplitQuantityColumns(category)) {
    item.quantity = resolveOrderItemQuantity(item, category);
    return item;
  }

  item.quantity = Number(item.quantity || 0);
  return item;
}

function resolveWidthValue(widths: WidthMap, defaults: WidthMap, key: string, fallback: number) {
  return Number(widths[key] || defaults[key] || fallback);
}

export function resolveAggregateQuantityColumnWidth(widths: WidthMap, defaults: WidthMap): number {
  const left = resolveWidthValue(widths, defaults, 'qtyLeft', 72);
  const right = resolveWidthValue(widths, defaults, 'qtyRight', 72);
  return left + right;
}

export function resolveAggregateQuantityDisplayWidth(widths: WidthMap, defaults: WidthMap): number {
  return Math.max(62, resolveWidthValue(widths, defaults, 'quantity', 72));
}

export function resolveAggregateRemarkColumnWidth(widths: WidthMap, defaults: WidthMap): number {
  const baseRemarkWidth = Math.max(160, resolveWidthValue(widths, defaults, 'remark', 160));
  const releasedWidth = Math.max(
    0,
    resolveAggregateQuantityColumnWidth(widths, defaults) - resolveAggregateQuantityDisplayWidth(widths, defaults),
  );
  return baseRemarkWidth + releasedWidth;
}

function replaceSideQuantityColumns(columns: SheetColumn[]) {
  const next: SheetColumn[] = [];

  columns.forEach((column) => {
    if (column.key === 'qtyRight') return;
    if (column.key === 'qtyLeft') {
      next.push({
        key: 'quantity',
        label: '总数量',
        align: 'center',
        inputType: 'number',
        semantic: 'quantity',
      });
      return;
    }
    next.push(column);
  });

  return next;
}

export function getSheetSchema(category: PrintCategory, options: SheetSchemaOptions = {}): SheetSchema {
  const base = CATEGORY_SCHEMAS[category];
  const hiddenSet = new Set(options.hiddenColumns || []);
  let columns = base.columns;

  if (options.aggregateSideQuantities && supportsSplitQuantityColumns(category)) {
    columns = replaceSideQuantityColumns(columns);
  }

  if (hiddenSet.size > 0) {
    columns = columns.filter((column) => !hiddenSet.has(column.key));
  }

  return {
    ...base,
    columns,
  };
}

export function getDisplayValue(item: Partial<OrderItem>, key: string, rowIndex: number): string | number {
  if (key === 'no') return rowIndex + 1;
  if (key === 'productModelName') return item.name || '-';
  if (key === 'type') return item.type || item.name || '-';
  if (key === 'spec') return item.spec || item.model || '-';
  if (key === 'mb') return item.mb || item.orientation || '-';
  if (key === 'qtyLeft') return item.quantity_left ?? '-';
  if (key === 'qtyRight') return item.quantity_right ?? '-';
  if (key === 'quantity') return item.quantity ?? 0;
  if (key === 'eccentricity') return item.eccentricity || '-';
  if (key === 'unit') return item.unit || '-';
  if (key === 'remark') return item.remark || '-';
  return '-';
}

export function getEditableValue(item: Partial<OrderItem>, key: string): string | number {
  if (key === 'productModelName') return item.name || '';
  if (key === 'type') return item.type || '';
  if (key === 'spec') return item.spec || '';
  if (key === 'mb') return item.mb || '';
  if (key === 'qtyLeft') return item.quantity_left ?? '';
  if (key === 'qtyRight') return item.quantity_right ?? '';
  if (key === 'quantity') return item.quantity ?? '';
  if (key === 'eccentricity') return item.eccentricity || '';
  if (key === 'unit') return item.unit || '';
  if (key === 'remark') return item.remark || '';
  return '';
}

export function setEditableValue(item: Partial<OrderItem>, key: string, value: string | number | null) {
  if (key === 'productModelName') item.name = String(value ?? '');
  else if (key === 'type') item.type = String(value ?? '');
  else if (key === 'spec') item.spec = String(value ?? '');
  else if (key === 'mb') item.mb = String(value ?? '');
  else if (key === 'qtyLeft') item.quantity_left = value === null || value === '' ? null as any : Number(value);
  else if (key === 'qtyRight') item.quantity_right = value === null || value === '' ? null as any : Number(value);
  else if (key === 'quantity') item.quantity = value === null || value === '' ? 0 : Number(value);
  else if (key === 'eccentricity') item.eccentricity = String(value ?? '');
  else if (key === 'unit') item.unit = String(value ?? '');
  else if (key === 'remark') item.remark = String(value ?? '');
}

export function isNumericColumn(key: string) {
  return key === 'quantity' || key === 'qtyLeft' || key === 'qtyRight' || key === 'no';
}
