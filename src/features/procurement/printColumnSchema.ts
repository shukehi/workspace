import type { Order } from '@/types/order';

export type ColumnKey = 'index' | 'name' | 'spec' | 'mb' | 'left' | 'right' | 'remark';

export const COLUMN_WIDTH_STORAGE_KEY = 'po_edit_column_widths_v1';

export const defaultColumnWidths: Record<ColumnKey, number> = {
  index: 44,
  name: 220,
  spec: 170,
  mb: 74,
  left: 74,
  right: 74,
  remark: 180
};

export const minColumnWidths: Record<ColumnKey, number> = {
  index: 36,
  name: 120,
  spec: 120,
  mb: 56,
  left: 56,
  right: 56,
  remark: 100
};

export function fromStoredColumnWidths(parsed: any): Record<ColumnKey, number> {
  const merged = { ...defaultColumnWidths };
  (Object.keys(defaultColumnWidths) as ColumnKey[]).forEach((key) => {
    const value = Number(parsed?.[key]);
    if (!Number.isNaN(value) && value >= minColumnWidths[key]) {
      merged[key] = value;
    }
  });
  return merged;
}

export function printWidthsToColumns(printColumnWidths: any): Record<ColumnKey, number> {
  if (!printColumnWidths || typeof printColumnWidths !== 'object') {
    return { ...defaultColumnWidths };
  }
  return fromStoredColumnWidths({
    index: printColumnWidths.no,
    name: printColumnWidths.productModelName,
    spec: printColumnWidths.spec,
    mb: printColumnWidths.mb,
    left: printColumnWidths.qtyLeft,
    right: printColumnWidths.qtyRight,
    remark: printColumnWidths.remark
  });
}

export function columnsToPrintWidths(widths: Record<ColumnKey, number>) {
  return {
    no: widths.index,
    productModelName: widths.name,
    spec: widths.spec,
    mb: widths.mb,
    qtyLeft: widths.left,
    qtyRight: widths.right,
    remark: widths.remark
  };
}

export function loadColumnWidthsFromLocal(): Record<ColumnKey, number> {
  if (typeof window === 'undefined') return { ...defaultColumnWidths };
  try {
    const raw = window.localStorage.getItem(COLUMN_WIDTH_STORAGE_KEY);
    if (!raw) return { ...defaultColumnWidths };
    const parsed = JSON.parse(raw) as Partial<Record<ColumnKey, number>>;
    return fromStoredColumnWidths(parsed);
  } catch {
    return { ...defaultColumnWidths };
  }
}

export function persistColumnWidthsToLocal(widths: Record<ColumnKey, number>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COLUMN_WIDTH_STORAGE_KEY, JSON.stringify(widths));
}

export function readPrintWidthsFromOrder(order: Partial<Order> | null | undefined): Record<ColumnKey, number> {
  const printColumnWidths = order?.metadata?.printColumnWidths;
  return printWidthsToColumns(printColumnWidths);
}
