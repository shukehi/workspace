import type { Order } from '@/types/order';

function normalizeQuantity(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return parsed;
}

function resolveOrderedQuantity(rawOrdered: unknown, rawQuantity: unknown): number {
    const ordered = normalizeQuantity(rawOrdered);
    if (ordered > 0) return ordered;
    return normalizeQuantity(rawQuantity);
}

export function hasRemainingStockInItems(order: Order | null | undefined): boolean {
    if (!order?.items?.length) return false;

    return order.items.some((item) => {
        const ordered = resolveOrderedQuantity(item.ordered_quantity, item.quantity);
        const received = normalizeQuantity(item.received_quantity);
        return ordered - received > 0;
    });
}
