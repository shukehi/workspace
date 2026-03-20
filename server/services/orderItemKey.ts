type OrderItemLike = {
    material_id?: unknown;
    name?: unknown;
    type?: unknown;
    spec?: unknown;
    model?: unknown;
};

export function normalizeKeyPart(value: unknown): string {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

export function buildOrderItemKey(item: OrderItemLike = {}): string {
    return [
        normalizeKeyPart(item.material_id),
        normalizeKeyPart(item.name || item.type),
        normalizeKeyPart(item.spec || item.model)
    ].join('|');
}

export function buildLegacyOrderItemKey(item: OrderItemLike = {}): string {
    return [
        '',
        normalizeKeyPart(item.name || item.type),
        normalizeKeyPart(item.spec || item.model)
    ].join('|');
}

