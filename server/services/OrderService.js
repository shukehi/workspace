const { Order, OrderItem, sequelize } = require('../models');

function normalizeOrderRemark(remark) {
    if (remark === undefined || remark === null) return '';
    return String(remark);
}

function normalizeDateField(value) {
    if (value === undefined || value === null || value === '') return null;
    if (value instanceof Date) return value.toISOString();

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
}

function serializeOrderItem(item) {
    if (!item) return item;
    return typeof item.get === 'function' ? item.get({ plain: true }) : { ...item };
}

function serializeOrder(order) {
    if (!order) return null;

    const plain = typeof order.get === 'function'
        ? order.get({ plain: true })
        : { ...order };

    return {
        ...plain,
        total_amount: Number.isFinite(Number(plain.total_amount)) ? Number(plain.total_amount) : 0,
        created_at: normalizeDateField(plain.created_at) || new Date().toISOString(),
        updated_at: normalizeDateField(plain.updated_at),
        delivery_date: normalizeDateField(plain.delivery_date),
        items: Array.isArray(plain.items) ? plain.items.map(serializeOrderItem) : []
    };
}

function normalizeOrderForLog(order, index) {
    return {
        index,
        id: order?.id,
        order_no: order?.order_no,
        created_at: order?.created_at
    };
}

class OrderService {
    async getAllOrders(category) {
        const where = {};
        if (typeof category === 'string' && category.trim()) {
            where.category = category.trim();
        }

        const orders = await Order.findAll({
            where,
            include: [{ model: OrderItem, as: 'items' }],
            order: [['created_at', 'DESC']]
        });

        const invalidOrders = orders
            .map((order, index) => ({ order, index }))
            .filter(({ order }) => !order || !order.created_at)
            .map(({ order, index }) => normalizeOrderForLog(order, index));

        if (invalidOrders.length > 0) {
            console.warn('[OrderService] getAllOrders found records with missing created_at:', invalidOrders);
        }

        return orders.map(serializeOrder);
    }

    async getOrderById(id) {
        const order = await Order.findByPk(id, {
            include: [{ model: OrderItem, as: 'items' }]
        });
        return serializeOrder(order);
    }

    async createOrder(data) {
        const transaction = await sequelize.transaction();
        try {
            if (!data.created_at) {
                console.warn('[OrderService] createOrder payload missing created_at, falling back to current timestamp', {
                    order_no: data.order_no,
                    category: data.category,
                    supplier: data.supplier
                });
            }

            const order = await Order.create({
                order_no: data.order_no,
                supplier: data.supplier,
                category: data.category || null,
                status: data.status || 'draft',
                remark: normalizeOrderRemark(data.remark),
                metadata: data.metadata || {},
                created_at: data.created_at || new Date().toISOString(),
                delivery_date: data.delivery_date
            }, { transaction });

            if (data.items && data.items.length > 0) {
                const items = data.items.map(item => ({
                    ...item,
                    id: undefined, // ❌ 重要：剥离前端的字符串 ID，允许数据库自增
                    order_id: order.id
                }));
                await OrderItem.bulkCreate(items, { transaction });
            }

            await transaction.commit();
            const persisted = await this.getOrderById(order.id);
            if (persisted) return persisted;

            console.warn('[OrderService] createOrder fallback: persisted order not found after commit', {
                id: order.id,
                order_no: data.order_no
            });

            return serializeOrder({
                ...order.get({ plain: true }),
                items: Array.isArray(data.items) ? data.items : []
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async updateOrder(id, data) {
        const transaction = await sequelize.transaction();
        try {
            const order = await Order.findByPk(id, { transaction });
            if (!order) throw new Error('Order not found');

            await order.update({
                supplier: data.supplier,
                category: data.category === undefined ? order.category : data.category,
                status: data.status,
                remark: data.remark === undefined ? order.remark : normalizeOrderRemark(data.remark),
                metadata: data.metadata,
                delivery_date: data.delivery_date
            }, { transaction });

            if (data.created_at !== undefined) {
                await Order.update(
                    { created_at: data.created_at },
                    { where: { id }, transaction, silent: true }
                );
            }

            if (data.items) {
                // simple strategy: delete all and recreate (easiest for full replace)
                // for more efficiency, we could diff, but for now this is safe
                await OrderItem.destroy({ where: { order_id: id }, transaction });

                const items = data.items.map(item => ({
                    ...item,
                    id: undefined, // ❌ 重要：剥离 ID 以便重新插入时生成新的整数 ID
                    order_id: id
                }));
                await OrderItem.bulkCreate(items, { transaction });
            }

            await transaction.commit();
            const persisted = await this.getOrderById(id);
            if (persisted) return persisted;

            console.warn('[OrderService] updateOrder fallback: persisted order not found after commit', {
                id,
                order_no: order.order_no
            });

            return serializeOrder({
                ...order.get({ plain: true }),
                created_at: data.created_at !== undefined ? data.created_at : order.created_at,
                items: Array.isArray(data.items) ? data.items : await OrderItem.findAll({ where: { order_id: id } })
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async deleteOrder(id) {
        const parsedId = Number(id);
        if (!Number.isInteger(parsedId) || parsedId <= 0) {
            throw new Error('INVALID_ID');
        }

        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const transaction = await sequelize.transaction();
            try {
                // SQLite environments may not always enforce ON DELETE CASCADE consistently.
                // Delete children explicitly to keep behavior deterministic.
                await OrderItem.destroy({ where: { order_id: parsedId }, transaction });
                const deleted = await Order.destroy({ where: { id: parsedId }, transaction });
                await transaction.commit();
                return deleted;
            } catch (error) {
                await transaction.rollback();
                const isBusy = error && (error.name === 'SequelizeTimeoutError' || String(error.message || '').includes('SQLITE_BUSY'));
                if (isBusy && attempt < maxAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, 80 * attempt));
                    continue;
                }
                throw error;
            }
        }
    }
}

module.exports = new OrderService();
