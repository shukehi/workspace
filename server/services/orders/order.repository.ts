import type { Transaction } from 'sequelize';
import type {
    OrderAttributes,
    OrderCreationAttributes,
    OrderIdempotencyKeyAttributes,
    OrderIdempotencyKeyCreationAttributes,
    OrderItemAttributes,
    OrderItemCreationAttributes,
    OrderWithItemsAttributes,
} from '../../models/types';

import { Op } from 'sequelize';
import { Order, OrderItem, OrderIdempotencyKey } from '../../models';
import { ORDER_PENDING_STATUSES } from '../../shared/constants/order';

type LooseTransaction = Transaction | undefined;
type LooseWhere = Record<string, unknown>;

const ORDER_ITEM_INCLUDE = [{ model: OrderItem, as: 'items' }];

export async function createIdempotencyKey(
    values: OrderIdempotencyKeyCreationAttributes,
    transaction?: LooseTransaction,
): Promise<any> {
    return await OrderIdempotencyKey.create(values, { transaction });
}

export async function findActiveIdempotencyKey(
    scope: string,
    dedupeKey: string,
    transaction?: LooseTransaction,
): Promise<any> {
    return await OrderIdempotencyKey.findOne({
        where: {
            scope,
            dedupe_key: dedupeKey,
            active: true
        },
        transaction
    });
}

export async function updateActiveIdempotencyKeysByOrderId(
    orderId: number,
    values: Partial<OrderIdempotencyKeyAttributes>,
    transaction?: LooseTransaction,
): Promise<any> {
    return await OrderIdempotencyKey.update(values, {
        where: { order_id: orderId, active: true },
        transaction
    });
}

export async function updateScopedIdempotencyKeysByOrderId(
    orderId: number,
    scope: string,
    values: Partial<OrderIdempotencyKeyAttributes>,
    transaction?: LooseTransaction,
): Promise<any> {
    return await OrderIdempotencyKey.update(values, {
        where: { order_id: orderId, scope },
        transaction
    });
}

export async function destroyIdempotencyKeysByOrderId(
    orderId: number,
    transaction?: LooseTransaction,
): Promise<number> {
    return await OrderIdempotencyKey.destroy({ where: { order_id: orderId }, transaction });
}

export async function findAllOrdersWithItems(
    where: LooseWhere = {},
    transaction?: LooseTransaction,
): Promise<any[]> {
    return await Order.findAll({
        where,
        include: ORDER_ITEM_INCLUDE,
        order: [['created_at', 'DESC']],
        transaction
    });
}

export async function findOrdersPaginated(
    where: LooseWhere,
    page: number,
    pageSize: number,
    transaction?: LooseTransaction,
): Promise<any> {
    const { count, rows } = await Order.findAndCountAll({
        where,
        include: ORDER_ITEM_INCLUDE,
        order: [['created_at', 'DESC']],
        limit: pageSize,
        offset: (page - 1) * pageSize,
        distinct: true,
        transaction,
    });
    return { rows, count };
}

export async function findOrderByIdWithItems(
    id: number | string,
    transaction?: LooseTransaction,
): Promise<any> {
    return await Order.findByPk(id, {
        include: ORDER_ITEM_INCLUDE,
        transaction
    });
}

export async function findOrderById(
    id: number | string,
    transaction?: LooseTransaction,
): Promise<any> {
    return await Order.findByPk(id, { transaction });
}

export async function createOrder(
    values: OrderCreationAttributes,
    transaction?: LooseTransaction,
): Promise<any> {
    return await Order.create(values, { transaction });
}

export async function bulkCreateOrderItems(
    items: OrderItemCreationAttributes[],
    transaction?: LooseTransaction,
): Promise<any[]> {
    return await OrderItem.bulkCreate(items, { transaction });
}

export async function updateOrderCreatedAt(
    id: number,
    createdAt: Date | string,
    transaction?: LooseTransaction,
): Promise<any> {
    return await Order.update(
        { created_at: new Date(createdAt) },
        { where: { id }, transaction: transaction ?? undefined, silent: true }
    );
}

export async function replaceOrderItems(
    orderId: number,
    items: OrderItemCreationAttributes[],
    transaction?: LooseTransaction,
): Promise<any[]> {
    await OrderItem.destroy({ where: { order_id: orderId }, transaction });
    return await OrderItem.bulkCreate(items, { transaction });
}

export async function findOrderItemsByOrderId(
    orderId: number,
    transaction?: LooseTransaction,
): Promise<any[]> {
    return await OrderItem.findAll({ where: { order_id: orderId }, transaction });
}

export async function destroyOrderItemsByOrderId(
    orderId: number,
    transaction?: LooseTransaction,
): Promise<number> {
    return await OrderItem.destroy({ where: { order_id: orderId }, transaction });
}

export async function destroyOrderById(
    orderId: number,
    transaction?: LooseTransaction,
): Promise<number> {
    return await Order.destroy({ where: { id: orderId }, transaction });
}

/**
 * 将请求查询参数转换为可直接传入 Sequelize where 子句的对象。
 * 只处理可以安全推到数据库的简单条件。
 * 复杂条件（risk、keyword 含 item 内容）保留在内存过滤层处理。
 */
export function buildSimpleWhereFromQuery(query: Record<string, unknown>): LooseWhere {
    const where: LooseWhere = {};

    const status = query.status ? String(query.status).trim() : '';
    if (status && status !== 'ALL') {
        if (status === 'PENDING') {
            where.status = { [Op.in]: ORDER_PENDING_STATUSES };
        } else {
            where.status = status;
        }
    }

    // category requires Chinese↔English normalization (handled by filterOrders in memory)

    const supplier = query.supplier ? String(query.supplier).trim() : '';
    if (supplier) {
        where.supplier = { [Op.like]: `%${supplier}%` };
    }

    const createdDate = query.createdDate ? String(query.createdDate).trim() : '';
    if (createdDate && /^\d{4}-\d{2}-\d{2}$/.test(createdDate)) {
        where.created_at = { [Op.like]: `${createdDate}%` };
    }

    const startDate = query.startDate ? String(query.startDate).trim() : '';
    const endDate = query.endDate ? String(query.endDate).trim() : '';
    if (startDate && endDate) {
        where.created_at = { [Op.between]: [`${startDate} 00:00:00`, `${endDate} 23:59:59`] };
    } else if (startDate) {
        where.created_at = { [Op.gte]: `${startDate} 00:00:00` };
    } else if (endDate) {
        where.created_at = { [Op.lte]: `${endDate} 23:59:59` };
    }

    const orderNo = query.orderNo ? String(query.orderNo).trim() : '';
    if (orderNo) {
        where.order_no = { [Op.like]: `%${orderNo}%` };
    }

    return where;
}

