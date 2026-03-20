import type { Order, StockInOrderItemInput } from '@/types/order';

export type StockInDraftItem = {
  order_item_id: number;
  item_key: string;
  label: string;
  ordered: number;
  received: number;
  remaining: number;
  quantity: string;
  unit: string;
};

export function normalizeStockInNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

export function resolveStockInOrderedQuantity(rawOrdered: unknown, rawQuantity: unknown): number {
  const ordered = normalizeStockInNumber(rawOrdered);
  if (ordered > 0) return ordered;
  return normalizeStockInNumber(rawQuantity);
}

export function buildStockInDraftItems(order: Order | null): StockInDraftItem[] {
  if (!order?.items?.length) return [];

  return order.items
    .map((item) => {
      const ordered = resolveStockInOrderedQuantity(item.ordered_quantity, item.quantity);
      const received = normalizeStockInNumber(item.received_quantity);
      const remaining = Math.max(ordered - received, 0);

      return {
        order_item_id: item.id,
        item_key: item.item_key || '',
        label: String(item.name || item.type || item.model || '-'),
        ordered,
        received,
        remaining,
        quantity: '',
        unit: item.unit || '',
      };
    })
    .filter((item) => item.remaining > 0);
}

export function buildSelectedStockInItems(items: StockInDraftItem[]): StockInOrderItemInput[] {
  return items
    .map((item) => ({
      order_item_id: item.order_item_id,
      item_key: item.item_key,
      quantity: normalizeStockInNumber(item.quantity),
      remaining: item.remaining,
    }))
    .filter((item) => item.quantity > 0)
    .map(({ remaining, ...item }) => item);
}

export function buildFullStockInItems(items: StockInDraftItem[]): StockInOrderItemInput[] {
  return items
    .filter((item) => item.remaining > 0)
    .map((item) => ({
      order_item_id: item.order_item_id,
      item_key: item.item_key,
      quantity: item.remaining,
    }));
}
