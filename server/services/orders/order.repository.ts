import type {
    OrderAttributes,
    OrderCreationAttributes,
    OrderIdempotencyKeyAttributes,
    OrderIdempotencyKeyCreationAttributes,
    OrderItemAttributes,
    OrderItemCreationAttributes,
    OrderWithItemsAttributes,
} from '../../models/types';

const { Order, OrderItem, OrderIdempotencyKey } = require('../../models');

type LooseTransaction = unknown;
type LooseWhere = Record<string, unknown>;

const ORDER_ITEM_INCLUDE = [{ model: OrderItem, as: 'items' }];

async function createIdempotencyKey(
    values: OrderIdempotencyKeyCreationAttributes,
    transaction?: LooseTransaction,
): Promise<OrderIdempotencyKeyAttributes> {
    return await OrderIdempotencyKey.create(values, { transaction });
}

async function findActiveIdempotencyKey(
    scope: string,
    dedupeKey: string,
    transaction?: LooseTransaction,
): Promise<OrderIdempotencyKeyAttributes | null> {
    return await OrderIdempotencyKey.findOne({
        where: {
            scope,
            dedupe_key: dedupeKey,
            active: true
        },
        transaction
    });
}

async function updateActiveIdempotencyKeysByOrderId(
    orderId: number,
    values: Partial<OrderIdempotencyKeyAttributes>,
    transaction?: LooseTransaction,
): Promise<[number]> {
    return await OrderIdempotencyKey.update(values, {
        where: { order_id: orderId, active: true },
        transaction
    });
}

async function updateScopedIdempotencyKeysByOrderId(
    orderId: number,
    scope: string,
    values: Partial<OrderIdempotencyKeyAttributes>,
    transaction?: LooseTransaction,
): Promise<[number]> {
    return await OrderIdempotencyKey.update(values, {
        where: { order_id: orderId, scope },
        transaction
    });
}

async function destroyIdempotencyKeysByOrderId(
    orderId: number,
    transaction?: LooseTransaction,
): Promise<number> {
    return await OrderIdempotencyKey.destroy({ where: { order_id: orderId }, transaction });
}

async function findAllOrdersWithItems(
    where: LooseWhere = {},
    transaction?: LooseTransaction,
): Promise<OrderWithItemsAttributes[]> {
    return await Order.findAll({
        where,
        include: ORDER_ITEM_INCLUDE,
        order: [['created_at', 'DESC']],
        transaction
    });
}

async function findOrderByIdWithItems(
    id: number | string,
    transaction?: LooseTransaction,
): Promise<OrderWithItemsAttributes | null> {
    return await Order.findByPk(id, {
        include: ORDER_ITEM_INCLUDE,
        transaction
    });
}

async function findOrderById(
    id: number | string,
    transaction?: LooseTransaction,
): Promise<OrderAttributes | null> {
    return await Order.findByPk(id, { transaction });
}

async function createOrder(
    values: OrderCreationAttributes,
    transaction?: LooseTransaction,
): Promise<OrderAttributes> {
    return await Order.create(values, { transaction });
}

async function bulkCreateOrderItems(
    items: OrderItemCreationAttributes[],
    transaction?: LooseTransaction,
): Promise<OrderItemAttributes[]> {
    return await OrderItem.bulkCreate(items, { transaction });
}

async function updateOrderCreatedAt(
    id: number,
    createdAt: Date | string,
    transaction?: LooseTransaction,
): Promise<[number]> {
    return await Order.update(
        { created_at: createdAt },
        { where: { id }, transaction, silent: true }
    );
}

async function replaceOrderItems(
    orderId: number,
    items: OrderItemCreationAttributes[],
    transaction?: LooseTransaction,
): Promise<OrderItemAttributes[]> {
    await OrderItem.destroy({ where: { order_id: orderId }, transaction });
    return await OrderItem.bulkCreate(items, { transaction });
}

async function findOrderItemsByOrderId(
    orderId: number,
    transaction?: LooseTransaction,
): Promise<OrderItemAttributes[]> {
    return await OrderItem.findAll({ where: { order_id: orderId }, transaction });
}

async function destroyOrderItemsByOrderId(
    orderId: number,
    transaction?: LooseTransaction,
): Promise<number> {
    return await OrderItem.destroy({ where: { order_id: orderId }, transaction });
}

async function destroyOrderById(
    orderId: number,
    transaction?: LooseTransaction,
): Promise<number> {
    return await Order.destroy({ where: { id: orderId }, transaction });
}

module.exports = {
    createIdempotencyKey,
    findActiveIdempotencyKey,
    updateActiveIdempotencyKeysByOrderId,
    updateScopedIdempotencyKeysByOrderId,
    destroyIdempotencyKeysByOrderId,
    findAllOrdersWithItems,
    findOrderByIdWithItems,
    findOrderById,
    createOrder,
    bulkCreateOrderItems,
    updateOrderCreatedAt,
    replaceOrderItems,
    findOrderItemsByOrderId,
    destroyOrderItemsByOrderId,
    destroyOrderById,
};
