import sharedSchema from '@/features/procurement/procurement-schema.shared.json';
import { PROCUREMENT_DOCUMENT_TITLE } from '@/features/procurement/documentTitles';

export type PrintCategory = 'packaging' | 'cylinder' | 'hardware' | 'lock' | 'lockset' | 'handle';
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
  orderRemark: string;
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

export type ProcurementCategoryMeta = {
  key: PrintCategory;
  orderCategory: string;
  shortLabel: string;
  filterLabel: string;
  badgeClass: string;
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
    title: PROCUREMENT_DOCUMENT_TITLE,
    fields: rawCategories.packaging.columns.map((column) => column.key),
    headers: rawCategories.packaging.columns.map((column) => resolveLabelBySemantic(column.semantic, column.label)),
    groupBy: rawCategories.packaging.groupBy
  },
  cylinder: {
    title: PROCUREMENT_DOCUMENT_TITLE,
    fields: rawCategories.cylinder.columns.map((column) => column.key),
    headers: rawCategories.cylinder.columns.map((column) => resolveLabelBySemantic(column.semantic, column.label)),
    groupBy: rawCategories.cylinder.groupBy
  },
  handle: {
    title: PROCUREMENT_DOCUMENT_TITLE,
    fields: rawCategories.handle.columns.map((column) => column.key),
    headers: rawCategories.handle.columns.map((column) => resolveLabelBySemantic(column.semantic, column.label)),
    groupBy: rawCategories.handle.groupBy
  },
  lockset: {
    title: PROCUREMENT_DOCUMENT_TITLE,
    fields: rawCategories.lockset.columns.map((column) => column.key),
    headers: rawCategories.lockset.columns.map((column) => resolveLabelBySemantic(column.semantic, column.label)),
    groupBy: rawCategories.lockset.groupBy
  },
  hardware: {
    title: PROCUREMENT_DOCUMENT_TITLE,
    fields: rawCategories.hardware.columns.map((column) => column.key),
    headers: rawCategories.hardware.columns.map((column) => resolveLabelBySemantic(column.semantic, column.label)),
    groupBy: rawCategories.hardware.groupBy
  },
  lock: {
    title: PROCUREMENT_DOCUMENT_TITLE,
    fields: rawCategories.lock.columns.map((column) => column.key),
    headers: rawCategories.lock.columns.map((column) => resolveLabelBySemantic(column.semantic, column.label)),
    groupBy: rawCategories.lock.groupBy
  }
};

export const PROCUREMENT_CATEGORY_META: Record<PrintCategory, ProcurementCategoryMeta> = {
  packaging: {
    key: 'packaging',
    orderCategory: '包装',
    shortLabel: '包装',
    filterLabel: '包装材料',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  cylinder: {
    key: 'cylinder',
    orderCategory: '锁芯',
    shortLabel: '锁芯',
    filterLabel: '锁芯',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200'
  },
  lockset: {
    key: 'lockset',
    orderCategory: '锁具',
    shortLabel: '锁具',
    filterLabel: '锁具',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200'
  },
  handle: {
    key: 'handle',
    orderCategory: '拉手',
    shortLabel: '拉手',
    filterLabel: '拉手',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200'
  },
  lock: {
    key: 'lock',
    orderCategory: '锁叉',
    shortLabel: '锁叉',
    filterLabel: '锁叉',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  hardware: {
    key: 'hardware',
    orderCategory: '配件',
    shortLabel: '五金',
    filterLabel: '五金/配件',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300'
  }
};

export const PROCUREMENT_CATEGORY_ORDER: PrintCategory[] = [
  'packaging',
  'cylinder',
  'lockset',
  'handle',
  'lock',
  'hardware'
];

export function isNumericField(field: string) {
  return field === 'qtyLeft' || field === 'qtyRight' || field === 'quantity';
}

export function normalizePrintCategory(category: string | undefined): PrintCategory {
  const raw = (category || '').toLowerCase();
  if (raw === 'packaging' || raw.includes('包装')) return 'packaging';
  if (raw === 'cylinder' || raw.includes('锁芯')) return 'cylinder';
  if (raw === 'lockset' || raw.includes('锁具')) return 'lockset';
  if (raw === 'handle' || raw.includes('拉手')) return 'handle';
  if (raw === 'lock' || raw.includes('锁叉')) return 'lock';
  if (raw === 'hardware' || raw.includes('五金') || raw.includes('配件')) return 'hardware';
  return 'packaging';
}

export function resolveProcurementCategoryLabel(category: string | undefined): string {
  if (!category) return '未分类';
  return PROCUREMENT_CATEGORY_META[normalizePrintCategory(category)].shortLabel;
}

export function resolveProcurementCategoryFilterLabel(category: PrintCategory): string {
  return PROCUREMENT_CATEGORY_META[category].filterLabel;
}

export function resolveProcurementOrderCategory(category: PrintCategory): string {
  return PROCUREMENT_CATEGORY_META[category].orderCategory;
}

export function resolveProcurementCategoryBadgeClass(category: string | undefined): string {
  if (!category) return 'bg-muted/40 text-muted-foreground border-border';
  return PROCUREMENT_CATEGORY_META[normalizePrintCategory(category)].badgeClass;
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
