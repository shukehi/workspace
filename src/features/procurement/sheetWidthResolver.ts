import { normalizePrintCategory, type PrintCategory } from '@/features/procurement/docModel';

export const COLUMN_WIDTH_STORAGE_KEY = 'po_edit_column_widths_by_category_v1';

export const CATEGORY_DEFAULT_WIDTHS: Record<PrintCategory, Record<string, number>> = {
  packaging: {
    no: 44,
    productModelName: 220,
    spec: 170,
    mb: 74,
    qtyLeft: 74,
    qtyRight: 74,
    remark: 180
  },
  cylinder: {
    no: 44,
    type: 260,
    eccentricity: 220,
    quantity: 90,
    remark: 190
  },
  lock: {
    no: 44,
    type: 220,
    spec: 180,
    quantity: 90,
    unit: 70,
    remark: 160
  },
  hardware: {
    no: 44,
    type: 240,
    spec: 220,
    quantity: 90,
    remark: 170
  }
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

export function resolveInitialWidths(categoryRaw: string | undefined, metadataPrintWidths: any) {
  const category = normalizePrintCategory(categoryRaw);
  const defaults = getDefaultWidths(category);
  const hasCustomWidths = !!metadataPrintWidths && typeof metadataPrintWidths === 'object';
  const resolved = hasCustomWidths
    ? sanitizeWidths(metadataPrintWidths, defaults)
    : loadLocalCategoryWidths(category, defaults);

  return {
    category,
    defaults,
    widths: resolved
  };
}
