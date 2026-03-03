const { Order, OrderItem, sequelize } = require('../models');

class OrderService {
    async getAllOrders(category) {
        const where = {};
        if (typeof category === 'string' && category.trim()) {
            where.category = category.trim();
        }

        return await Order.findAll({
            where,
            include: [{ model: OrderItem, as: 'items' }],
            order: [['created_at', 'DESC']]
        });
    }

    async getOrderById(id) {
        return await Order.findByPk(id, {
            include: [{ model: OrderItem, as: 'items' }]
        });
    }

    async createOrder(data) {
        const transaction = await sequelize.transaction();
        try {
            const order = await Order.create({
                order_no: data.order_no,
                supplier: data.supplier,
                category: data.category || null,
                status: data.status || 'draft',
                metadata: data.metadata || {},
                created_at: data.created_at,
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
            return await this.getOrderById(order.id);
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
                metadata: data.metadata,
                delivery_date: data.delivery_date
            }, { transaction });

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
            return await this.getOrderById(id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async deleteOrder(id) {
        const transaction = await sequelize.transaction();
        try {
            // SQLite environments may not always enforce ON DELETE CASCADE consistently.
            // Delete children explicitly to keep behavior deterministic.
            await OrderItem.destroy({ where: { order_id: id }, transaction });
            const deleted = await Order.destroy({ where: { id }, transaction });
            await transaction.commit();
            return deleted;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = new OrderService();
