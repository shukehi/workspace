const { Order, OrderItem, OrderIdempotencyKey } = require('../../models');

const ORDER_ITEM_INCLUDE = [{ model: OrderItem, as: 'items' }];

async function createIdempotencyKey(values, transaction) {
    return await OrderIdempotencyKey.create(values, { transaction });
}

async function findActiveIdempotencyKey(scope, dedupeKey, transaction) {
    return await OrderIdempotencyKey.findOne({
        where: {
            scope,
            dedupe_key: dedupeKey,
            active: true
        },
        transaction
    });
}

async function updateActiveIdempotencyKeysByOrderId(orderId, values, transaction) {
    return await OrderIdempotencyKey.update(values, {
        where: { order_id: orderId, active: true },
        transaction
    });
}

async function updateScopedIdempotencyKeysByOrderId(orderId, scope, values, transaction) {
    return await OrderIdempotencyKey.update(values, {
        where: { order_id: orderId, scope },
        transaction
    });
}

async function destroyIdempotencyKeysByOrderId(orderId, transaction) {
    return await OrderIdempotencyKey.destroy({ where: { order_id: orderId }, transaction });
}

async function findAllOrdersWithItems(where = {}, transaction) {
    return await Order.findAll({
        where,
        include: ORDER_ITEM_INCLUDE,
        order: [['created_at', 'DESC']],
        transaction
    });
}

async function findOrderByIdWithItems(id, transaction) {
    return await Order.findByPk(id, {
        include: ORDER_ITEM_INCLUDE,
        transaction
    });
}

async function findOrderById(id, transaction) {
    return await Order.findByPk(id, { transaction });
}

async function createOrder(values, transaction) {
    return await Order.create(values, { transaction });
}

async function bulkCreateOrderItems(items, transaction) {
    return await OrderItem.bulkCreate(items, { transaction });
}

async function updateOrderCreatedAt(id, createdAt, transaction) {
    return await Order.update(
        { created_at: createdAt },
        { where: { id }, transaction, silent: true }
    );
}

async function replaceOrderItems(orderId, items, transaction) {
    await OrderItem.destroy({ where: { order_id: orderId }, transaction });
    return await OrderItem.bulkCreate(items, { transaction });
}

async function findOrderItemsByOrderId(orderId, transaction) {
    return await OrderItem.findAll({ where: { order_id: orderId }, transaction });
}

async function destroyOrderItemsByOrderId(orderId, transaction) {
    return await OrderItem.destroy({ where: { order_id: orderId }, transaction });
}

async function destroyOrderById(orderId, transaction) {
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
