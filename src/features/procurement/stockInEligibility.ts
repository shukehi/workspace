import type { Order } from '@/types/order';

function normalizeQuantity(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return parsed;
}

export function hasRemainingStockInItems(order: Order | null | undefined): boolean {
    if (!order?.items?.length) return false;

    return order.items.some((item) => {
        const ordered = normalizeQuantity(item.ordered_quantity ?? item.quantity);
        const received = normalizeQuantity(item.received_quantity);
        return ordered - received > 0;
    });
}
