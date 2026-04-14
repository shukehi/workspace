import { buildOrderItemKey } from '../orderItemKey';
import type { PlainRecord } from '../../shared/types';
import { ensureOrderTemplateType } from './order.template';

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
 * 解析订单项数量。
 * 支持两种调用形式：
 *   resolveOrderedQuantity(item)                  — 传整个 item 对象
 *   resolveOrderedQuantity(orderedQty, quantity)   — 传两个数值（StockInDeps 签名）
 */
export function resolveOrderedQuantity(itemOrOrderedQty: any, rawQuantity?: unknown): number {
    if (rawQuantity !== undefined) {
        const orderedQty = Number(itemOrOrderedQty);
        if (Number.isFinite(orderedQty) && orderedQty > 0) return orderedQty;
        const qty = Number(rawQuantity);
        if (Number.isFinite(qty) && qty > 0) return qty;
        return 0;
    }
    return Number(itemOrOrderedQty.ordered_quantity || itemOrOrderedQty.quantity || 0);
}

function resolvePersistedQuantity(item: any): number {
    const hasSplitQuantity = item?.quantity_left != null || item?.quantity_right != null;
    if (hasSplitQuantity) {
        return Number(item?.quantity_left ?? 0) + Number(item?.quantity_right ?? 0);
    }
    return Number(item?.quantity ?? 0);
}

/**
 * 序列化订单项
 */
export function serializeOrderItem(item: any): any {
    const itemKey = item.order_item_key || buildOrderItemKey(item);
    return {
        id: item.id,
        order_item_key: itemKey,
        item_key: itemKey,
        // --- 完整物料信息 ---
        material_id: item.material_id ?? null,
        name: item.name ?? null,
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
        received_quantity: Number(item.received_quantity ?? 0),
        quantity_left: item.quantity_left != null ? Number(item.quantity_left) : null,
        quantity_right: item.quantity_right != null ? Number(item.quantity_right) : null,
        unit: item.unit ?? null,
        price: item.price != null ? Number(item.price) : 0,
        remark: item.remark ?? null,
    };
}

/**
 * 标准化订单项持久化数据
 */
export function normalizeOrderItemForPersistence(item: any): any {
    const persistedQuantity = resolvePersistedQuantity(item);

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
        quantity: persistedQuantity,
        ordered_quantity: persistedQuantity,  // enforce = quantity on creation; ignore client-supplied value
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
    if (!order) return null;
    const metadata = ensureOrderTemplateType(order.metadata, order.category);
    return {
        id: order.id,
        order_no: order.order_no,
        status: order.status,
        category: order.category,
        supplier: order.supplier,
        source_contract_code: order.source_contract_code,
        remark: order.remark ?? '',
        metadata,
        items: Array.isArray(order.items) ? order.items.map(serializeOrderItem) : [],
        total_amount: Array.isArray(order.items)
            ? order.items.reduce((sum: number, item: any) => sum + Number(item.price ?? 0) * Number(item.quantity ?? 0), 0)
            : 0,
        created_at: normalizeDateField(order.created_at),
        updated_at: normalizeDateField(order.updated_at),
        delivery_date: normalizeDateField(order.delivery_date),
        arrived_at: normalizeDateField(order.arrived_at),
        arrived_by: order.arrived_by ?? null,
        arrived_remark: order.arrived_remark ?? '',
        stocked_in_at: normalizeDateField(order.stocked_in_at),
        stocked_in_by: order.stocked_in_by ?? null,
        stocked_in_remark: order.stocked_in_remark ?? '',
        dedupe_key: order.dedupe_key ?? null,
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
