const crypto = require('crypto');
const { Op } = require('sequelize');
const { Order, OrderItem, OrderIdempotencyKey, sequelize } = require('../models');

function normalizeOrderRemark(remark) {
    if (remark === undefined || remark === null) return '';
    return String(remark);
}

function resolveSourceContractCode(data, fallback = '') {
    return normalizeDedupeText(data?.source_contract_code || data?.metadata?.source_contract_code || fallback);
}

function normalizeMetadata(data, fallback = {}) {
    const next = data && typeof data === 'object' ? { ...data } : { ...fallback };
    const sourceContractCode = resolveSourceContractCode({ source_contract_code: next.source_contract_code, metadata: next });
    if (sourceContractCode) {
        next.source_contract_code = sourceContractCode;
    } else {
        delete next.source_contract_code;
    }
    return next;
}

function normalizeDedupeText(value) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

function normalizeDedupeNumber(value) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return 0;
    return Number(parsed.toFixed(4));
}

function serializeItemFingerprint(item) {
    return {
        supplier: normalizeDedupeText(item?.supplier),
        internal_name: normalizeDedupeText(item?.internal_name),
        external_name: normalizeDedupeText(item?.external_name),
        type: normalizeDedupeText(item?.type || item?.name),
        spec: normalizeDedupeText(item?.spec || item?.model),
        mb: normalizeDedupeText(item?.mb),
        eccentricity: normalizeDedupeText(item?.eccentricity),
        quantity: normalizeDedupeNumber(item?.quantity),
        quantity_left: normalizeDedupeNumber(item?.quantity_left),
        quantity_right: normalizeDedupeNumber(item?.quantity_right),
        unit: normalizeDedupeText(item?.unit),
        remark: normalizeDedupeText(item?.remark)
    };
}

function buildOrderDedupePayload(data) {
    const sourceContractCode = resolveSourceContractCode(data);
    const category = normalizeDedupeText(data?.category);
    const supplier = normalizeDedupeText(data?.supplier);
    const items = Array.isArray(data?.items)
        ? data.items.map(serializeItemFingerprint).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
        : [];

    return {
        sourceContractCode,
        category,
        supplier,
        items,
    };
}

function buildOrderDedupeKey(data) {
    const payload = buildOrderDedupePayload(data);
    if (!payload.sourceContractCode || !payload.category || !payload.supplier || payload.items.length === 0) {
        return '';
    }

    return crypto
        .createHash('sha1')
        .update(JSON.stringify(payload))
        .digest('hex');
}

class DuplicateOrderError extends Error {
    constructor(existingOrder) {
        super('DUPLICATE_ORDER');
        this.name = 'DuplicateOrderError';
        this.code = 'DUPLICATE_ORDER';
        this.existingOrder = existingOrder;
    }
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

function toDuplicateOrderSummary(order) {
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

class OrderService {
    async reserveIdempotencyKey({ sourceContractCode, dedupeKey, orderId }, transaction) {
        if (!sourceContractCode || !dedupeKey || !orderId) return null;
        try {
            return await OrderIdempotencyKey.create({
                scope: 'auto_po',
                source_contract_code: sourceContractCode,
                dedupe_key: dedupeKey,
                order_id: orderId,
                active: true,
            }, { transaction });
        } catch (error) {
            const message = String(error?.message || '');
            const isUnique = error?.name === 'SequelizeUniqueConstraintError'
                || message.includes('UNIQUE constraint failed')
                || message.includes('idx_order_idempotency_active');
            if (!isUnique) throw error;

            const existingKey = await OrderIdempotencyKey.findOne({
                where: {
                    scope: 'auto_po',
                    dedupe_key: dedupeKey,
                    active: true
                },
                transaction
            });
            const existingOrder = existingKey
                ? await this.getOrderById(existingKey.order_id)
                : await this.findDuplicateAutoOrder({ source_contract_code: sourceContractCode, dedupe_key: dedupeKey }, transaction);
            throw new DuplicateOrderError(existingOrder);
        }
    }

    async releaseIdempotencyKeys(orderId, transaction) {
        await OrderIdempotencyKey.update(
            { active: false },
            {
                where: { order_id: orderId, active: true },
                transaction
            }
        );
    }

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

    async findDuplicateAutoOrder(data, transaction, options = {}) {
        const sourceContractCode = resolveSourceContractCode(data);
        const dedupeKey = normalizeDedupeText(data?.dedupe_key) || buildOrderDedupeKey(data);
        const excludeId = Number(options.excludeId);

        if (!sourceContractCode || !dedupeKey) return null;

        const where = {
            source_contract_code: sourceContractCode,
            status: { [Op.ne]: 'cancelled' }
        };
        if (Number.isInteger(excludeId) && excludeId > 0) {
            where.id = { [Op.ne]: excludeId };
        }

        const candidates = await Order.findAll({
            where,
            include: [{ model: OrderItem, as: 'items' }],
            transaction
        });

        const matched = candidates.find((candidate) => {
            const persisted = serializeOrder(candidate);
            const candidateKey = normalizeDedupeText(candidate.dedupe_key) || buildOrderDedupeKey(persisted);
            return candidateKey === dedupeKey;
        });

        return matched ? serializeOrder(matched) : null;
    }

    async createOrder(data) {
        const transaction = await sequelize.transaction();
        try {
            const sourceContractCode = resolveSourceContractCode(data);
            const metadata = normalizeMetadata(data.metadata);
            const normalizedData = {
                ...data,
                source_contract_code: sourceContractCode,
                metadata,
            };
            const dedupeKey = buildOrderDedupeKey(normalizedData);
            const duplicate = await this.findDuplicateAutoOrder(normalizedData, transaction);
            if (duplicate) {
                throw new DuplicateOrderError(duplicate);
            }

            if (!data.created_at) {
                console.warn('[OrderService] createOrder payload missing created_at, falling back to current timestamp', {
                    order_no: data.order_no,
                    category: data.category,
                    supplier: data.supplier
                });
            }

            const order = await Order.create({
                order_no: normalizedData.order_no,
                supplier: normalizedData.supplier,
                source_contract_code: sourceContractCode || null,
                dedupe_key: dedupeKey || null,
                category: normalizedData.category || null,
                status: normalizedData.status || 'draft',
                remark: normalizeOrderRemark(normalizedData.remark),
                metadata,
                created_at: normalizedData.created_at || new Date().toISOString(),
                delivery_date: normalizedData.delivery_date
            }, { transaction });

            if (normalizedData.items && normalizedData.items.length > 0) {
                const items = normalizedData.items.map(item => ({
                    ...item,
                    id: undefined, // ❌ 重要：剥离前端的字符串 ID，允许数据库自增
                    order_id: order.id
                }));
                await OrderItem.bulkCreate(items, { transaction });
            }

            await this.reserveIdempotencyKey({
                sourceContractCode,
                dedupeKey,
                orderId: order.id
            }, transaction);

            await transaction.commit();
            const persisted = await this.getOrderById(order.id);
            if (persisted) return persisted;

            console.warn('[OrderService] createOrder fallback: persisted order not found after commit', {
                id: order.id,
                order_no: data.order_no
            });

            return serializeOrder({
                ...order.get({ plain: true }),
                items: Array.isArray(normalizedData.items) ? normalizedData.items : []
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

            const existing = await this.getOrderById(id);
            const nextMetadata = normalizeMetadata(
                data.metadata === undefined ? order.metadata : data.metadata,
                order.metadata || {}
            );
            const nextSourceContractCode = resolveSourceContractCode({
                source_contract_code: data.source_contract_code,
                metadata: nextMetadata
            }, order.source_contract_code);
            const nextItems = Array.isArray(data.items) ? data.items : (existing?.items || []);
            const nextSupplier = data.supplier === undefined ? order.supplier : data.supplier;
            const nextCategory = data.category === undefined ? order.category : data.category;
            const nextStatus = data.status === undefined ? order.status : data.status;
            const nextCreatedAt = data.created_at !== undefined ? data.created_at : order.created_at;
            const nextDedupeKey = buildOrderDedupeKey({
                source_contract_code: nextSourceContractCode,
                category: nextCategory,
                supplier: nextSupplier,
                items: nextItems,
                metadata: nextMetadata,
            });

            const duplicate = nextStatus === 'cancelled'
                ? null
                : await this.findDuplicateAutoOrder({
                    source_contract_code: nextSourceContractCode,
                    category: nextCategory,
                    supplier: nextSupplier,
                    items: nextItems,
                    metadata: nextMetadata,
                }, transaction, { excludeId: id });
            if (duplicate) {
                throw new DuplicateOrderError(duplicate);
            }

            const isAutoOrder = Boolean(nextSourceContractCode && nextDedupeKey);
            const statusTransition = `${order.status}->${nextStatus}`;
            if (order.status === 'cancelled' && nextStatus !== 'cancelled' && isAutoOrder) {
                await this.reserveIdempotencyKey({
                    sourceContractCode: nextSourceContractCode,
                    dedupeKey: nextDedupeKey,
                    orderId: id
                }, transaction);
            }

            await order.update({
                supplier: nextSupplier,
                source_contract_code: nextSourceContractCode || null,
                dedupe_key: nextDedupeKey || null,
                category: nextCategory,
                status: nextStatus,
                remark: data.remark === undefined ? order.remark : normalizeOrderRemark(data.remark),
                metadata: nextMetadata,
                delivery_date: data.delivery_date
            }, { transaction });

            if (data.created_at !== undefined) {
                await Order.update(
                    { created_at: nextCreatedAt },
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

            if (isAutoOrder) {
                if (nextStatus === 'cancelled') {
                    await this.releaseIdempotencyKeys(id, transaction);
                } else if (statusTransition !== 'cancelled->draft' && statusTransition !== 'cancelled->submitted' && statusTransition !== 'cancelled->processing' && statusTransition !== 'cancelled->completed') {
                    await OrderIdempotencyKey.update(
                        {
                            source_contract_code: nextSourceContractCode,
                            dedupe_key: nextDedupeKey,
                            active: true
                        },
                        {
                            where: { order_id: id, scope: 'auto_po' },
                            transaction
                        }
                    );
                }
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
                await OrderIdempotencyKey.destroy({ where: { order_id: parsedId }, transaction });
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

const orderService = new OrderService();
orderService.DuplicateOrderError = DuplicateOrderError;
orderService.buildOrderDedupeKey = buildOrderDedupeKey;
orderService.toDuplicateOrderSummary = toDuplicateOrderSummary;

module.exports = orderService;
