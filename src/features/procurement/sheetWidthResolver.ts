import { normalizePrintCategory, type PrintCategory } from '@/features/procurement/docModel';
import { getSheetSchema } from '@/features/procurement/order-sheet.schema';

export const COLUMN_WIDTH_STORAGE_KEY = 'po_edit_column_widths_by_category_v1';

const CATEGORY_BASELINE_TOTAL_WIDTH: Record<PrintCategory, number> = {
  packaging: 836,
  cylinder: 804,
  lock: 764,
  hardware: 764
};

const COLUMN_BASE_WIDTHS: Record<string, number> = {
  no: 44,
  productModelName: 220,
  type: 240,
  spec: 200,
  eccentricity: 220,
  mb: 74,
  qtyLeft: 72,
  qtyRight: 72,
  quantity: 72,
  unit: 58,
  remark: 160
};

const CATEGORY_COMPACT_OVERRIDES: Partial<Record<PrintCategory, Record<string, number>>> = {
  packaging: {
    spec: 160
  },
  cylinder: {
    eccentricity: 160
  }
};

function buildCategoryDefaultWidths(category: PrintCategory) {
  const schema = getSheetSchema(category);
  const defaults: Record<string, number> = {};

  schema.columns.forEach((column) => {
    const override = CATEGORY_COMPACT_OVERRIDES[category]?.[column.key];
    defaults[column.key] = override ?? COLUMN_BASE_WIDTHS[column.key] ?? 120;
  });

  const baseline = CATEGORY_BASELINE_TOTAL_WIDTH[category];
  const total = Object.values(defaults).reduce((sum, value) => sum + value, 0);
  const extra = baseline - total;

  if (Object.prototype.hasOwnProperty.call(defaults, 'remark')) {
    defaults.remark = Math.max(120, defaults.remark + extra);
  }

  return defaults;
}

export const CATEGORY_DEFAULT_WIDTHS: Record<PrintCategory, Record<string, number>> = {
  packaging: buildCategoryDefaultWidths('packaging'),
  cylinder: buildCategoryDefaultWidths('cylinder'),
  lock: buildCategoryDefaultWidths('lock'),
  hardware: buildCategoryDefaultWidths('hardware')
};

export function sanitizeWidths(widths: any, defaults: Record<string, number>) {
  const merged: Record<string, number> = { ...defaults };
  Object.keys(defaults).forEach((key) => {
    const value = Number(widths?.[key]);
    if (!Number.isNaN(value) && value >= 36) {
      merged[key] = value;
    }
  });
  return merged;
}

export function getDefaultWidths(category: PrintCategory) {
  return CATEGORY_DEFAULT_WIDTHS[category];
}

export function loadLocalCategoryWidths(category: PrintCategory, defaults = getDefaultWidths(category)) {
  if (typeof window === 'undefined') return { ...defaults };
  try {
    const raw = window.localStorage.getItem(COLUMN_WIDTH_STORAGE_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Record<string, Record<string, number>>;
    return sanitizeWidths(parsed?.[category], defaults);
  } catch {
    return { ...defaults };
  }
}

export function persistLocalCategoryWidths(category: PrintCategory, widths: Record<string, number>) {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(COLUMN_WIDTH_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, Record<string, number>> : {};
    parsed[category] = widths;
    window.localStorage.setItem(COLUMN_WIDTH_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage errors
  }
}

export function resolveSheetWidths(
  categoryRaw: string | undefined,
  metadataPrintWidths: any,
  options?: { preferLocalWhenMissing?: boolean }
) {
  const category = normalizePrintCategory(categoryRaw);
  const defaults = getDefaultWidths(category);
  const preferLocalWhenMissing = options?.preferLocalWhenMissing ?? true;
  const hasCustomWidths = !!metadataPrintWidths && typeof metadataPrintWidths === 'object';
  const resolved = hasCustomWidths
    ? sanitizeWidths(metadataPrintWidths, defaults)
    : (preferLocalWhenMissing ? loadLocalCategoryWidths(category, defaults) : { ...defaults });

  return {
    category,
    defaults,
    widths: resolved
  };
}

export function resolveInitialWidths(categoryRaw: string | undefined, metadataPrintWidths: any) {
  return resolveSheetWidths(categoryRaw, metadataPrintWidths, { preferLocalWhenMissing: true });
}
