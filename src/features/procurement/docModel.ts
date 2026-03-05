import sharedSchema from '@/features/procurement/procurement-schema.shared.json';

export type PrintCategory = 'packaging' | 'cylinder' | 'hardware' | 'lock';
export type PrintMode = 'signature' | 'compact';

export type DocValue = string | number;

export interface ProcurementDocColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  width?: number;
  numeric?: boolean;
}

export interface ProcurementDocRow {
  rowType: 'item' | 'total';
  values: Record<string, DocValue>;
}

export interface ProcurementDocPage {
  pageKey: string;
  title: string;
  category: PrintCategory;
  mode: PrintMode;
  customerName: string;
  code: string;
  orderDate: string;
  deliveryDate: string;
  supplier: string;
  internalName: string;
  externalName: string;
  columns: ProcurementDocColumn[];
  rows: ProcurementDocRow[];
}

export interface ProcurementDocModel {
  category: PrintCategory;
  mode: PrintMode;
  title: string;
  poNumber: string;
  pages: ProcurementDocPage[];
}

export type CategoryConfig = {
  title: string;
  headers: string[];
  fields: string[];
  groupBy: string;
};

type SharedColumn = {
  key: string;
  label: string;
  semantic: string;
};

type SharedCategory = {
  title: string;
  groupBy: string;
  columns: SharedColumn[];
};

function resolveLabelBySemantic(semantic: string, fallbackLabel: string) {
  if (semantic === 'specLike') return '规格';
  return fallbackLabel;
}

const rawCategories = sharedSchema.categories as Record<PrintCategory, SharedCategory>;

export const CATEGORY_CONFIGS: Record<PrintCategory, CategoryConfig> = {
  packaging: {
    title: rawCategories.packaging.title,
    fields: rawCategories.packaging.columns.map((column) => column.key),
    headers: rawCategories.packaging.columns.map((column) => resolveLabelBySemantic(column.semantic, column.label)),
    groupBy: rawCategories.packaging.groupBy
  },
  cylinder: {
    title: rawCategories.cylinder.title,
    fields: rawCategories.cylinder.columns.map((column) => column.key),
    headers: rawCategories.cylinder.columns.map((column) => resolveLabelBySemantic(column.semantic, column.label)),
    groupBy: rawCategories.cylinder.groupBy
  },
  hardware: {
    title: rawCategories.hardware.title,
    fields: rawCategories.hardware.columns.map((column) => column.key),
    headers: rawCategories.hardware.columns.map((column) => resolveLabelBySemantic(column.semantic, column.label)),
    groupBy: rawCategories.hardware.groupBy
  },
  lock: {
    title: rawCategories.lock.title,
    fields: rawCategories.lock.columns.map((column) => column.key),
    headers: rawCategories.lock.columns.map((column) => resolveLabelBySemantic(column.semantic, column.label)),
    groupBy: rawCategories.lock.groupBy
  }
};

export function isNumericField(field: string) {
  return field === 'qtyLeft' || field === 'qtyRight' || field === 'quantity';
}

export function normalizePrintCategory(category: string | undefined): PrintCategory {
  const raw = (category || '').toLowerCase();
  if (raw === 'packaging' || raw.includes('包装')) return 'packaging';
  if (raw === 'cylinder' || raw.includes('锁芯')) return 'cylinder';
  if (raw === 'lock' || raw.includes('锁叉')) return 'lock';
  if (raw === 'hardware' || raw.includes('五金') || raw.includes('配件')) return 'hardware';
  return 'packaging';
}

export function normalizePrintMode(mode: string | undefined): PrintMode {
  const raw = (mode || '').toLowerCase();
  return raw === 'compact' ? 'compact' : 'signature';
}

export function normalizeDateString(value: unknown): string {
  if (!value) return '';
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

export function resolvePrintColumnWidths(source: any) {
  const result: Record<string, number> = {};
  if (!source || typeof source !== 'object') return result;

  Object.entries(source).forEach(([field, value]) => {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && parsed >= 36) {
      result[field] = parsed;
    }
  });

  return result;
}
