import type { OrderItem } from '@/types/order';
import type { PrintCategory, ProcurementDocPage } from '@/features/procurement/docModel';

export type QuantitySummary = {
  leftTotal: number;
  rightTotal: number;
  total: number;
};

const EMPTY_SUMMARY: QuantitySummary = {
  leftTotal: 0,
  rightTotal: 0,
  total: 0,
};

export function computeItemQuantitySummary(category: PrintCategory, items: Partial<OrderItem>[]): QuantitySummary {
  if (!Array.isArray(items) || items.length === 0) return { ...EMPTY_SUMMARY };

  if (category === 'packaging' || category === 'handle' || category === 'lockset') {
    const leftTotal = items.reduce((sum, item) => sum + Number(item.quantity_left || 0), 0);
    const rightTotal = items.reduce((sum, item) => sum + Number(item.quantity_right || 0), 0);
    return {
      leftTotal,
      rightTotal,
      total: leftTotal + rightTotal,
    };
  }

  const total = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  return {
    leftTotal: 0,
    rightTotal: 0,
    total,
  };
}

export function computeDocPageQuantitySummary(page: ProcurementDocPage): QuantitySummary {
  if (!page?.rows || page.rows.length === 0) return { ...EMPTY_SUMMARY };

  const itemRows = page.rows.filter((row) => row.rowType === 'item');
  if (page.category === 'packaging' || page.category === 'handle' || page.category === 'lockset') {
    const leftTotal = itemRows.reduce((sum, row) => sum + Number(row.values.qtyLeft || 0), 0);
    const rightTotal = itemRows.reduce((sum, row) => sum + Number(row.values.qtyRight || 0), 0);
    return {
      leftTotal,
      rightTotal,
      total: leftTotal + rightTotal,
    };
  }

  const total = itemRows.reduce((sum, row) => sum + Number(row.values.quantity || 0), 0);
  return {
    leftTotal: 0,
    rightTotal: 0,
    total,
  };
}
