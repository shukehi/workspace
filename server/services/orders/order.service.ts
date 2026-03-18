export {};

import type { OrderListQuery, OrderCreateInput, OrderUpdateInput } from '../../models/types';

const { createPaginationResponse } = require('../../shared/contracts/pagination');
const { Op } = require('sequelize');
const { sequelize } = require('../../models');
const { inventoryReceiptService } = require('../inventory');
const orderRepository = require('./order.repository');
const {
    assertEditableOrderFields,
    assertValidStatusTransition,
    normalizeStatus,
} = require('./order.policy');
const {
    buildOrderFacets,
    buildOrderSummary,
    filterOrders,
} = require('./order.query-policy');
const {
    normalizeOrderForLog,
    normalizeOrderItemForPersistence,
    resolveOrderedQuantity,
    serializeOrder,
    toDuplicateOrderSummary,
} = require('./order.mapper');
const {
    buildOrderDedupeKey,
    normalizeDedupeText,
    normalizeMetadata,
    resolveSourceContractCode,
} = require('./order.dedupe');
const {
    areAllOrderItemsReceived,
    assertOrderReadyForStockIn,
    buildStockInOrderUpdate,
    createReceiptItemsFromOrder,
    syncStockInReceiptItems,
} = require('./order.stockin');
const {
    DuplicateOrderError,
    InvalidStatusTransitionError,
    MissingMaterialError,
    OrderEditLockedError,
    ReceivedQuantityExceededError,
} = require('./order.errors');

type PlainRecord = Record<string, any>;

function normalizeOrderRemark(remark: unknown): string {
    if (remark === undefined || remark === null) return '';
    return String(remark);
}

class OrderService {
    DuplicateOrderError?: typeof DuplicateOrderError;
    InvalidStatusTransitionError?: typeof InvalidStatusTransitionError;
    MissingMaterialError?: typeof MissingMaterialError;
    OrderEditLockedError?: typeof OrderEditLockedError;
    ReceivedQuantityExceededError?: typeof ReceivedQuantityExceededError;
    buildOrderDedupeKey?: typeof buildOrderDedupeKey;
    toDuplicateOrderSummary?: typeof toDuplicateOrderSummary;

    async reserveIdempotencyKey({ sourceContractCode, dedupeKey, orderId }: { sourceContractCode?: string; dedupeKey?: string; orderId?: number }, transaction: unknown) {
        if (!sourceContractCode || !dedupeKey || !orderId) return null;
        try {
            return await orderRepository.createIdempotencyKey({
                scope: 'auto_po',
                source_contract_code: sourceContractCode,
                dedupe_key: dedupeKey,
                order_id: orderId,
                active: true,
            }, transaction);
        } catch (error: any) {
            const message = String(error?.message || '');
            const isUnique = error?.name === 'SequelizeUniqueConstraintError'
                || message.includes('UNIQUE constraint failed')
                || message.includes('idx_order_idempotency_active');
            if (!isUnique) throw error;

            const existingKey = await orderRepository.findActiveIdempotencyKey('auto_po', dedupeKey, transaction);
            const existingOrder = existingKey
                ? await this.getOrderById(existingKey.order_id)
                : await this.findDuplicateAutoOrder({ source_contract_code: sourceContractCode, dedupe_key: dedupeKey }, transaction);
            throw new DuplicateOrderError(existingOrder);
        }
    }

    async releaseIdempotencyKeys(orderId: number, transaction: unknown) {
        await orderRepository.updateActiveIdempotencyKeysByOrderId(
            orderId,
            { active: false },
            transaction
        );
    }

    async syncActiveIdempotencyKey({ sourceContractCode, dedupeKey, orderId }: { sourceContractCode?: string; dedupeKey?: string; orderId?: number }, transaction: unknown) {
        if (!sourceContractCode || !dedupeKey || !orderId) return 0;
        const [updated] = await orderRepository.updateScopedIdempotencyKeysByOrderId(
            orderId,
            'auto_po',
            {
                source_contract_code: sourceContractCode,
                dedupe_key: dedupeKey,
                active: true
            },
            transaction
        );

        if (updated > 0) return updated;

        await this.reserveIdempotencyKey({ sourceContractCode, dedupeKey, orderId }, transaction);
        return 1;
    }

    async getAllOrders(category?: string) {
        const where: PlainRecord = {};
        if (typeof category === 'string' && category.trim()) {
            where.category = category.trim();
        }

        const orders = await orderRepository.findAllOrdersWithItems(where);

        const invalidOrders = orders
            .map((order: PlainRecord, index: number) => ({ order, index }))
            .filter(({ order }: { order: PlainRecord }) => !order || !order.created_at)
            .map(({ order, index }: { order: PlainRecord; index: number }) => normalizeOrderForLog(order, index));

        if (invalidOrders.length > 0) {
            console.warn('[OrderService] getAllOrders found records with missing created_at:', invalidOrders);
        }

        return orders.map(serializeOrder);
    }

    async getPaginatedOrders(query: OrderListQuery = {}) {
        const page = Math.max(1, Number(query.page) || 1);
        const pageSize = Math.min(200, Math.max(10, Number(query.pageSize) || 50));

        // 将简单条件（status、createdDate、orderNo）推到数据库层过滤，
        // 大幅减少从 DB 返回的记录数。复杂条件（risk、keyword 含 item 搜索、
        // category 归一化）保留由 filterOrders 在内存中处理。
        const dbWhere = orderRepository.buildSimpleWhereFromQuery(query);
        const dbOrders = await orderRepository.findAllOrdersWithItems(dbWhere);
        const serialized = dbOrders.map(serializeOrder);

        const filteredOrders = filterOrders(serialized, query);
        const start = (page - 1) * pageSize;
        const rows = filteredOrders.slice(start, start + pageSize);

        return createPaginationResponse({
            rows,
            total: filteredOrders.length,
            page,
            pageSize,
            summary: buildOrderSummary(filteredOrders),
            facets: buildOrderFacets(filteredOrders),
        });
    }

    async getOrderById(id: number | string) {
        const order = await orderRepository.findOrderByIdWithItems(id);
        return serializeOrder(order);
    }

    async findDuplicateAutoOrder(data: PlainRecord, transaction: unknown, options: PlainRecord = {}) {
        const sourceContractCode = resolveSourceContractCode(data);
        const dedupeKey = normalizeDedupeText(data?.dedupe_key) || buildOrderDedupeKey(data);
        const excludeId = Number(options.excludeId);

        if (!sourceContractCode || !dedupeKey) return null;

        const where: PlainRecord = {
            source_contract_code: sourceContractCode,
            status: { [Op.ne]: 'cancelled' }
        };
        if (Number.isInteger(excludeId) && excludeId > 0) {
            where.id = { [Op.ne]: excludeId };
        }

        const candidates = await orderRepository.findAllOrdersWithItems(where, transaction);

        const matched = candidates.find((candidate: PlainRecord) => {
            const persisted = serializeOrder(candidate);
            const candidateKey = normalizeDedupeText(candidate.dedupe_key) || buildOrderDedupeKey(persisted);
            return candidateKey === dedupeKey;
        });

        return matched ? serializeOrder(matched) : null;
    }

    async createOrder(data: OrderCreateInput) {
        const transaction = await sequelize.transaction();
        try {
            const sourceContractCode = resolveSourceContractCode(data);
            const metadata = normalizeMetadata(data.metadata);
            const normalizedStatus = normalizeStatus(data.status, 'draft');
            const normalizedData: PlainRecord = {
                ...data,
                source_contract_code: sourceContractCode,
                metadata,
                status: normalizedStatus,
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

            const order = await orderRepository.createOrder({
                order_no: normalizedData.order_no,
                supplier: normalizedData.supplier,
                source_contract_code: sourceContractCode || null,
                dedupe_key: dedupeKey || null,
                category: normalizedData.category || null,
                status: normalizedStatus,
                remark: normalizeOrderRemark(normalizedData.remark),
                metadata,
                created_at: normalizedData.created_at || new Date().toISOString(),
                delivery_date: normalizedData.delivery_date,
                arrived_at: normalizedData.arrived_at || null,
                arrived_by: normalizedData.arrived_by || null,
                arrived_remark: normalizeOrderRemark(normalizedData.arrived_remark),
                stocked_in_at: normalizedData.stocked_in_at || null,
                stocked_in_by: normalizedData.stocked_in_by || null,
                stocked_in_remark: normalizeOrderRemark(normalizedData.stocked_in_remark)
            }, transaction);

            if (normalizedData.items && normalizedData.items.length > 0) {
                const items = normalizedData.items.map((item: PlainRecord) => ({
                    ...normalizeOrderItemForPersistence(item),
                    id: undefined,
                    order_id: order.id
                }));
                await orderRepository.bulkCreateOrderItems(items, transaction);
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

    async updateOrder(id: number | string, data: OrderUpdateInput) {
        const transaction = await sequelize.transaction();
        try {
            const order = await orderRepository.findOrderById(id, transaction);
            if (!order) throw new Error('Order not found');
            assertEditableOrderFields(order, data);

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
            const nextStatus = data.status === undefined
                ? normalizeStatus(order.status)
                : assertValidStatusTransition(order.status, data.status);
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
                    orderId: Number(id)
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
                delivery_date: data.delivery_date === undefined ? order.delivery_date : data.delivery_date,
                arrived_at: data.arrived_at === undefined ? order.arrived_at : data.arrived_at,
                arrived_by: data.arrived_by === undefined ? order.arrived_by : data.arrived_by,
                arrived_remark: data.arrived_remark === undefined ? order.arrived_remark : normalizeOrderRemark(data.arrived_remark),
                stocked_in_at: data.stocked_in_at === undefined ? order.stocked_in_at : data.stocked_in_at,
                stocked_in_by: data.stocked_in_by === undefined ? order.stocked_in_by : data.stocked_in_by,
                stocked_in_remark: data.stocked_in_remark === undefined ? order.stocked_in_remark : normalizeOrderRemark(data.stocked_in_remark)
            }, { transaction });

            if (data.created_at !== undefined) {
                await orderRepository.updateOrderCreatedAt(id, nextCreatedAt, transaction);
            }

            if (data.items) {
                const items = data.items.map((item: PlainRecord) => ({
                    ...normalizeOrderItemForPersistence(item),
                    id: undefined,
                    order_id: id
                }));
                await orderRepository.replaceOrderItems(id, items, transaction);
            }

            if (isAutoOrder) {
                if (nextStatus === 'cancelled') {
                    await this.releaseIdempotencyKeys(Number(id), transaction);
                } else if (!statusTransition.startsWith('cancelled->')) {
                    await this.syncActiveIdempotencyKey({
                        sourceContractCode: nextSourceContractCode,
                        dedupeKey: nextDedupeKey,
                        orderId: Number(id)
                    }, transaction);
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
                items: Array.isArray(data.items) ? data.items : await orderRepository.findOrderItemsByOrderId(id)
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async deleteOrder(id: number | string) {
        const parsedId = Number(id);
        if (!Number.isInteger(parsedId) || parsedId <= 0) {
            throw new Error('INVALID_ID');
        }

        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const transaction = await sequelize.transaction();
            try {
                await orderRepository.destroyIdempotencyKeysByOrderId(parsedId, transaction);
                await orderRepository.destroyOrderItemsByOrderId(parsedId, transaction);
                const deleted = await orderRepository.destroyOrderById(parsedId, transaction);
                await transaction.commit();
                return deleted;
            } catch (error: any) {
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

    async markArrived(id: number | string, data: PlainRecord = {}) {
        const payload = {
            ...data,
            status: 'arrived',
            arrived_at: data.arrived_at || new Date().toISOString(),
        };
        return await this.updateOrder(id, payload);
    }

    async stockInOrder(id: number | string, data: PlainRecord = {}) {
        const transaction = await sequelize.transaction();
        try {
            const order = await orderRepository.findOrderByIdWithItems(id, transaction);
            if (!order) throw new Error('Order not found');

            assertOrderReadyForStockIn(order, normalizeStatus, InvalidStatusTransitionError);

            const receiptItems = await createReceiptItemsFromOrder(order, data, transaction, {
                inventoryReceiptService,
                MissingMaterialError,
            });

            const updatesByOrderItemId = await syncStockInReceiptItems(order, receiptItems, transaction, {
                resolveOrderedQuantity,
                ReceivedQuantityExceededError,
            });

            const allReceived = areAllOrderItemsReceived(
                order.items,
                updatesByOrderItemId,
                resolveOrderedQuantity
            );

            await order.update(
                buildStockInOrderUpdate(order, data, allReceived, normalizeOrderRemark),
                { transaction }
            );

            await transaction.commit();
            return await this.getOrderById(id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

const orderService = new OrderService();
orderService.DuplicateOrderError = DuplicateOrderError;
orderService.InvalidStatusTransitionError = InvalidStatusTransitionError;
orderService.MissingMaterialError = MissingMaterialError;
orderService.OrderEditLockedError = OrderEditLockedError;
orderService.ReceivedQuantityExceededError = ReceivedQuantityExceededError;
orderService.buildOrderDedupeKey = buildOrderDedupeKey;
orderService.toDuplicateOrderSummary = toDuplicateOrderSummary;

module.exports = orderService;
