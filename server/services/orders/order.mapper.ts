export {};

const { buildOrderItemKey } = require('../orderItemKey');

type PlainRecord = Record<string, any>;

function normalizeDateField(value: unknown): string | null {
    if (value === undefined || value === null || value === '') return null;
    if (value instanceof Date) return value.toISOString();

    const parsed = new Date(value as string | number | Date);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
}

function resolveOrderedQuantity(rawOrderedQuantity: unknown, rawQuantity: unknown): number {
    const orderedQuantity = Number(rawOrderedQuantity);
    if (Number.isFinite(orderedQuantity) && orderedQuantity > 0) {
        return orderedQuantity;
    }
    const quantity = Number(rawQuantity);
    if (Number.isFinite(quantity) && quantity > 0) {
        return quantity;
    }
    return 0;
}

function serializeOrderItem(item: any): any {
    if (!item) return item;
    const plain: PlainRecord = typeof item.get === 'function' ? item.get({ plain: true }) : { ...item };
    return {
        ...plain,
        item_key: buildOrderItemKey(plain),
        quantity: Number(plain.quantity || 0),
        ordered_quantity: resolveOrderedQuantity(plain.ordered_quantity, plain.quantity),
        received_quantity: Number(plain.received_quantity || 0)
    };
}

function normalizeOrderItemForPersistence(item: PlainRecord = {}): PlainRecord {
    const quantity = Number(item.quantity || 0);
    return {
        ...item,
        quantity,
        ordered_quantity: quantity,
        received_quantity: 0
    };
}

function serializeOrder(order: any): any {
    if (!order) return null;

    const plain: PlainRecord = typeof order.get === 'function'
        ? order.get({ plain: true })
        : { ...order };

    return {
        ...plain,
        total_amount: Number.isFinite(Number(plain.total_amount)) ? Number(plain.total_amount) : 0,
        created_at: normalizeDateField(plain.created_at) || new Date().toISOString(),
        updated_at: normalizeDateField(plain.updated_at),
        delivery_date: normalizeDateField(plain.delivery_date),
        arrived_at: normalizeDateField(plain.arrived_at),
        stocked_in_at: normalizeDateField(plain.stocked_in_at),
        items: Array.isArray(plain.items) ? plain.items.map(serializeOrderItem) : []
    };
}

function normalizeOrderForLog(order: PlainRecord | null | undefined, index: number): PlainRecord {
    return {
        index,
        id: order?.id,
        order_no: order?.order_no,
        created_at: order?.created_at
    };
}

function toDuplicateOrderSummary(order: PlainRecord | null | undefined): PlainRecord | null {
    if (!order) return null;
    return {
        id: order.id,
        order_no: order.order_no,
        status: order.status,
        category: order.category,
        supplier: order.supplier,
        source_contract_code: order.source_contract_code,
    };
}

module.exports = {
    normalizeDateField,
    resolveOrderedQuantity,
    serializeOrderItem,
    normalizeOrderItemForPersistence,
    serializeOrder,
    normalizeOrderForLog,
    toDuplicateOrderSummary,
};
