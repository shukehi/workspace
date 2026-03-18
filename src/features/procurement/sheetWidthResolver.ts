import { normalizePrintCategory, type PrintCategory } from '@/features/procurement/docModel';
import { getSheetSchema, type SheetColumnSemantic } from '@/features/procurement/order-sheet.schema';
import sharedSchema from '@/features/procurement/procurement-schema.shared.json';
import { STORAGE_KEYS } from '@/shared/constants/storage';

export const COLUMN_WIDTH_STORAGE_KEY = STORAGE_KEYS.COLUMN_WIDTHS;

const SEMANTIC_BASE_WIDTHS = sharedSchema.semanticWidths as Record<SheetColumnSemantic, number>;
const CATEGORY_BASELINE_TOTAL_WIDTH = sharedSchema.categoryBaselineTotalWidth as Record<PrintCategory, number>;
const COLUMN_FALLBACK_WIDTH = 120;

/**
 * 打印模式下的最大表格宽度（像素）
 */
export const PRINT_TABLE_MAX_WIDTH = 680;

function buildCategoryDefaultWidths(category: PrintCategory) {
  const schema = getSheetSchema(category);
  const defaults: Record<string, number> = {};

  schema.columns.forEach((column) => {
    defaults[column.key] = SEMANTIC_BASE_WIDTHS[column.semantic] ?? COLUMN_FALLBACK_WIDTH;
  });

  const baseline = CATEGORY_BASELINE_TOTAL_WIDTH[category];
  const total = Object.values(defaults).reduce((sum, value) => sum + value, 0);
  const extra = baseline - total;

  if (Object.prototype.hasOwnProperty.call(defaults, 'remark')) {
    defaults.remark = Math.max(160, defaults.remark + extra);
  }

  return defaults;
}

export const CATEGORY_DEFAULT_WIDTHS: Record<PrintCategory, Record<string, number>> = {
  packaging: buildCategoryDefaultWidths('packaging'),
  cylinder: buildCategoryDefaultWidths('cylinder'),
  handle: buildCategoryDefaultWidths('handle'),
  lockset: buildCategoryDefaultWidths('lockset'),
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

/**
 * 获取特定列的最小宽度约束
 */
function getColumnMinWidth(key: string) {
  if (key === 'no') return 36;
  if (key === 'quantity' || key === 'qtyLeft' || key === 'qtyRight') return 62;
  if (key === 'unit') return 50;
  if (key === 'remark') return 120;
  return 82;
}

/**
 * 将列宽等比例缩放以适配打印宽度
 */
export function fitPrintColumnWidths(widths: Record<string, number>, maxWidth = PRINT_TABLE_MAX_WIDTH) {
  const entries = Object.entries(widths);
  const total = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  
  if (total <= maxWidth || total <= 0) return widths;

  const scale = maxWidth / total;
  const next: Record<string, number> = {};
  
  entries.forEach(([key, value]) => {
    const scaled = Math.floor(Number(value || 0) * scale);
    next[key] = Math.max(getColumnMinWidth(key), scaled);
  });
  
  return next;
}
