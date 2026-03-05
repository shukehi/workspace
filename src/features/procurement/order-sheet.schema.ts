import type { OrderItem } from '@/types/order';
import type { PrintCategory } from '@/features/procurement/docModel';
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
    title: category.title,
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
  lock: toSheetSchema(sharedCategories.lock),
  hardware: toSheetSchema(sharedCategories.hardware)
};

export function getSheetSchema(category: PrintCategory): SheetSchema {
  return CATEGORY_SCHEMAS[category];
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
