import type { OrderAttributes, OrderListQuery, OrderCreateInput, OrderUpdateInput } from '../../models/types';
import type { Transaction } from 'sequelize';
import { createPaginationResponse } from '../../shared/contracts/pagination';
import { Op } from 'sequelize';
import { sequelize } from '../../models';
import { inventoryReceiptService } from '../inventory';
import * as orderRepository from './order.repository';
import {
    assertEditableOrderFields,
    assertValidStatusTransition,
    normalizeStatus,
} from './order.policy';
import {
    buildOrderFacets,
    buildOrderSummary,
} from './order.query-policy';
import {
    normalizeOrderForLog,
    normalizeOrderItemForPersistence,
    resolveOrderedQuantity,
    serializeOrder,
    toDuplicateOrderSummary,
} from './order.mapper';
import {
    buildOrderDedupeKey,
    normalizeDedupeText,
    normalizeMetadata,
    resolveSourceContractCode,
} from './order.dedupe';
import {
    areAllOrderItemsReceived,
    assertOrderReadyForStockIn,
    buildStockInOrderUpdate,
    createReceiptItemsFromOrder,
    syncStockInReceiptItems,
} from './order.stockin';
import {
    DuplicateOrderError,
    InvalidStatusTransitionError,
    MissingMaterialError,
    OrderEditLockedError,
    ReceivedQuantityExceededError,
} from './order.errors';
import type { PlainRecord } from '../../shared/types';

function normalizeOrderRemark(remark: unknown): string {
    if (remark === undefined || remark === null) return '';
    return String(remark);
}

function normalizeNullableDate(value: unknown, fallback: Date | null | undefined): Date | null | undefined {
    if (value === undefined) return fallback;
    if (value === null || value === '') return null;
    if (value instanceof Date) return value;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function normalizeBulkOrderIds(idsInput: unknown): number[] {
    if (!Array.isArray(idsInput)) return [];

    const seen = new Set<number>();
    const ids: number[] = [];
    for (const value of idsInput) {
        const numeric = Number(String(value || '').trim());
        if (!Number.isInteger(numeric) || numeric <= 0 || seen.has(numeric)) continue;
        seen.add(numeric);
        ids.push(numeric);
    }

    return ids;
}

function serializeBulkArriveError(error: unknown): { code: string; message: string } {
    const record = (error || {}) as PlainRecord;
    const code = typeof record.code === 'string'
        ? record.code
        : (String(record.message || '').trim() === 'Order not found' ? 'ORDER_NOT_FOUND' : 'UNKNOWN_ERROR');

    return {
        code,
        message: typeof record.message === 'string' && record.message.trim()
            ? record.message
            : code,
    };
}

class OrderService {
    DuplicateOrderError?: typeof DuplicateOrderError;
    InvalidStatusTransitionError?: typeof InvalidStatusTransitionError;
    MissingMaterialError?: typeof MissingMaterialError;
    OrderEditLockedError?: typeof OrderEditLockedError;
    ReceivedQuantityExceededError?: typeof ReceivedQuantityExceededError;
    buildOrderDedupeKey?: typeof buildOrderDedupeKey;
    toDuplicateOrderSummary?: typeof toDuplicateOrderSummary;

    async reserveIdempotencyKey({ sourceContractCode, dedupeKey, orderId }: { sourceContractCode?: string; dedupeKey?: string; orderId?: number }, transaction: Transaction | undefined) {
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

    async releaseIdempotencyKeys(orderId: number, transaction: Transaction | undefined) {
        await orderRepository.updateActiveIdempotencyKeysByOrderId(
            orderId,
            { active: false },
            transaction
        );
    }

    async syncActiveIdempotencyKey({ sourceContractCode, dedupeKey, orderId }: { sourceContractCode?: string; dedupeKey?: string; orderId?: number }, transaction: Transaction | undefined) {
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
            .map(({ order }: { order: PlainRecord; index: number }) => normalizeOrderForLog(order));

        if (invalidOrders.length > 0) {
            console.warn('[OrderService] getAllOrders found records with missing created_at:', invalidOrders);
        }

        return orders.map(serializeOrder);
    }

    async getPaginatedOrders(query: OrderListQuery = {}) {
        const page = Math.max(1, Number(query.page) || 1);
        const pageSize = Math.min(200, Math.max(10, Number(query.pageSize) || 50));
        const aggregates = await orderRepository.getPaginatedOrderAggregates(query);
        if (aggregates.total === 0) {
            return createPaginationResponse({
                rows: [],
                total: 0,
                page,
                pageSize,
                summary: buildOrderSummary([]),
                facets: buildOrderFacets([]),
            });
        }

        const pagedIds = await orderRepository.findPaginatedOrderIds(query, page, pageSize);
        const orders = await orderRepository.findOrdersWithItemsByIds(pagedIds);
        const serializedOrders = orders.map(serializeOrder);
        const rowsById = new Map<number, PlainRecord>();
        serializedOrders.forEach((order) => {
            if (order && Number.isInteger(order.id)) {
                rowsById.set(Number(order.id), order);
            }
        });
        const rows = pagedIds
            .map((id) => rowsById.get(id))
            .filter((order): order is PlainRecord => Boolean(order));

        return createPaginationResponse({
            rows,
            total: aggregates.total,
            page,
            pageSize,
            summary: aggregates.summary,
            facets: aggregates.facets,
        });
    }

    async getOrderById(id: number | string) {
        const order = await orderRepository.findOrderByIdWithItems(id);
        return serializeOrder(order);
    }

    async findDuplicateAutoOrder(data: PlainRecord, transaction: Transaction | undefined, options: PlainRecord = {}) {
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
            assertEditableOrderFields(order, data as Record<string, unknown>);

            const existing = await this.getOrderById(id);
            const nextMetadata = normalizeMetadata(
                data.metadata === undefined ? order.metadata : data.metadata,
                order.metadata || {}
            );
            const nextSourceContractCode = resolveSourceContractCode({
                source_contract_code: data.source_contract_code,
                metadata: nextMetadata
            }, order.source_contract_code || '');
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

            const nextOrderValues: Partial<OrderAttributes> = {
                supplier: nextSupplier,
                source_contract_code: nextSourceContractCode || null,
                dedupe_key: nextDedupeKey || null,
                category: nextCategory,
                status: nextStatus,
                remark: data.remark === undefined ? order.remark : normalizeOrderRemark(data.remark),
                metadata: nextMetadata,
                delivery_date: normalizeNullableDate(data.delivery_date, order.delivery_date),
                arrived_at: normalizeNullableDate(data.arrived_at, order.arrived_at),
                arrived_by: data.arrived_by === undefined ? order.arrived_by : data.arrived_by,
                arrived_remark: data.arrived_remark === undefined ? order.arrived_remark : normalizeOrderRemark(data.arrived_remark),
                stocked_in_at: normalizeNullableDate(data.stocked_in_at, order.stocked_in_at),
                stocked_in_by: data.stocked_in_by === undefined ? order.stocked_in_by : data.stocked_in_by,
                stocked_in_remark: data.stocked_in_remark === undefined ? order.stocked_in_remark : normalizeOrderRemark(data.stocked_in_remark)
            };
            await order.update(nextOrderValues, { transaction });

            if (data.created_at !== undefined) {
                await orderRepository.updateOrderCreatedAt(Number(id), nextCreatedAt, transaction);
            }

            if (data.items) {
                const items = data.items.map((item: PlainRecord) => ({
                    ...normalizeOrderItemForPersistence(item),
                    id: undefined,
                    order_id: id
                }));
                await orderRepository.replaceOrderItems(Number(id), items, transaction);
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
                items: Array.isArray(data.items) ? data.items : await orderRepository.findOrderItemsByOrderId(Number(id))
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

    async bulkMarkArrived(idsInput: unknown, data: PlainRecord = {}) {
        const ids = normalizeBulkOrderIds(idsInput);
        const payload = {
            arrived_at: data.arrived_at,
            arrived_by: data.arrived_by,
            arrived_remark: data.arrived_remark,
        };
        const succeededIds: number[] = [];
        const failed: Array<{ id: number; code: string; message: string }> = [];

        for (const id of ids) {
            try {
                await this.markArrived(id, payload);
                succeededIds.push(id);
            } catch (error) {
                failed.push({
                    id,
                    ...serializeBulkArriveError(error),
                });
            }
        }

        return {
            total: ids.length,
            successCount: succeededIds.length,
            failureCount: failed.length,
            succeededIds,
            failed,
        };
    }

    async stockInOrder(id: number | string, data: PlainRecord = {}) {
        const transaction = await sequelize.transaction();
        try {
            const order = await orderRepository.findOrderByIdWithItems(id, transaction);
            if (!order) throw new Error('Order not found');

            assertOrderReadyForStockIn(order, normalizeStatus, InvalidStatusTransitionError);

            const receiptItems = await createReceiptItemsFromOrder(order, data, transaction, {
                inventoryReceiptService: inventoryReceiptService,
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

export default orderService;
