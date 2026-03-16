export { };

const { buildOrderItemKey } = require('../orderItemKey');

type PlainRecord = Record<string, any>;

/**
 * 标准化日期字段
 */
export function normalizeDateField(value: unknown): string | null {
    if (value === undefined || value === null || value === '') return null;
    if (value instanceof Date) return value.toISOString();

    const parsed = new Date(value as string | number | Date);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
}

/**
 * 解析订单项数量
 */
export function resolveOrderedQuantity(item: any): number {
    return Number(item.ordered_quantity || item.quantity || 0);
}

/**
 * 序列化订单项
 */
export function serializeOrderItem(item: any): any {
    return {
        id: item.id,
        order_item_key: item.order_item_key || buildOrderItemKey(item),
        category: item.category,
        model: item.model,
        code: item.code,
        specification: item.specification,
        ordered_quantity: resolveOrderedQuantity(item),
        received_quantity: Number(item.received_quantity || 0),
        status: item.status,
    };
}

/**
 * 标准化订单项持久化数据
 */
export function normalizeOrderItemForPersistence(item: any): any {
    return {
        material_id: item.material_id ?? null,
        name: item.name || item.type || item.model || item.internal_name || '',
        supplier: item.supplier ?? null,
        internal_name: item.internal_name ?? null,
        external_name: item.external_name ?? null,
        type: item.type ?? null,
        spec: item.spec ?? null,
        mb: item.mb ?? null,
        eccentricity: item.eccentricity ?? null,
        model: item.model ?? null,
        quantity: Number(item.quantity ?? 0),
        ordered_quantity: resolveOrderedQuantity(item),
        quantity_left: item.quantity_left != null ? Number(item.quantity_left) : null,
        quantity_right: item.quantity_right != null ? Number(item.quantity_right) : null,
        unit: item.unit ?? null,
        price: item.price != null ? Number(item.price) : 0,
        remark: item.remark ?? null,
    };
}

/**
 * 序列化订单主表
 */
export function serializeOrder(order: any): any {
    return {
        id: order.id,
        order_no: order.order_no,
        status: order.status,
        category: order.category,
        supplier: order.supplier,
        source_contract_code: order.source_contract_code,
        items: Array.isArray(order.items) ? order.items.map(serializeOrderItem) : [],
        created_at: normalizeDateField(order.created_at),
        updated_at: normalizeDateField(order.updated_at),
    };
}

/**
 * 标准化用于日志的订单简报
 */
export function normalizeOrderForLog(order: any): any {
    return {
        id: order.id,
        order_no: order.order_no,
        status: order.status,
    };
}

/**
 * 转换为重复订单摘要
 */
export function toDuplicateOrderSummary(order: any): any {
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
