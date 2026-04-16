import type { OrderAttributes, OrderListQuery, OrderCreateInput, OrderUpdateInput } from '../../models/types';
import type { Transaction } from 'sequelize';
import AppError from '../../app/errors/AppError';
import ERROR_CODES from '../../app/errors/errorCodes';
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
import { normalizeTemplateType } from './order.template';
import {
    assertUpdateOrderInputValid,
    buildNextOrderValues,
    resolveUpdateOrderContext,
} from './order.service.update';
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
import { sanitizeManualCreateItems, validateManualCreateOrder } from './order-create.validation';
import type { PlainRecord } from '../../shared/types';
import {
    buildAutoOrderNo,
    buildAutoOrderPrefix,
    buildManualOrderNo,
    formatManualOrderDateToken,
    isGeneratedAutoOrderNo,
    isGeneratedManualOrderNo,
    isUniqueOrderNoError,
    normalizeBulkOrderIds,
    normalizeNullableDate,
    normalizeOrderRemark,
    parseAutoOrderSequence,
    serializeBulkArriveError,
} from './order.service.helpers';

class OrderService {
    DuplicateOrderError?: typeof DuplicateOrderError;
    InvalidStatusTransitionError?: typeof InvalidStatusTransitionError;
    MissingMaterialError?: typeof MissingMaterialError;
    OrderEditLockedError?: typeof OrderEditLockedError;
    ReceivedQuantityExceededError?: typeof ReceivedQuantityExceededError;
    buildOrderDedupeKey?: typeof buildOrderDedupeKey;
    toDuplicateOrderSummary?: typeof toDuplicateOrderSummary;

    async allocateNextManualOrderNo(createdAt: unknown, transaction?: Transaction) {
        const dateToken = formatManualOrderDateToken(createdAt);
        const prefix = `PM-${dateToken}-`;
        const latestSequence = await orderRepository.findMaxOrderNoSequenceByPrefix(prefix, transaction);
        const nextSequence = Number.isInteger(latestSequence) && latestSequence >= 1001
            ? latestSequence + 1
            : 1001;
        return buildManualOrderNo(dateToken, nextSequence);
    }

    async allocateNextAutoOrderNo(sourceContractCode: string, transaction?: Transaction) {
        const normalizedSourceContractCode = String(sourceContractCode || '').trim();
        if (!normalizedSourceContractCode) return '';

        const existingOrderNos = await orderRepository.findOrderNosBySourceContractCode(normalizedSourceContractCode, transaction);
        const usedSequences = new Set(
            existingOrderNos
                .map((orderNo) => parseAutoOrderSequence(orderNo, normalizedSourceContractCode))
                .filter((sequence) => Number.isInteger(sequence) && sequence > 0),
        );

        let nextSequence = 1;
        while (usedSequences.has(nextSequence)) {
            nextSequence += 1;
        }

        return buildAutoOrderNo(normalizedSourceContractCode, nextSequence);
    }

    async assertUniqueOrderNo(orderNo: unknown, excludeId?: number | string, transaction?: Transaction) {
        const normalizedOrderNo = String(orderNo || '').trim();
        if (!normalizedOrderNo) return;

        const existing = await orderRepository.findOrderByOrderNo(normalizedOrderNo, transaction);
        if (!existing) return;

        const existingId = Number(existing.id);
        const normalizedExcludeId = Number(excludeId);
        if (Number.isInteger(existingId) && Number.isInteger(normalizedExcludeId) && existingId === normalizedExcludeId) {
            return;
        }

        throw new DuplicateOrderError(existing);
    }

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
        const shouldAutoAssignManualOrderNo = data.metadata?.order_source === 'manual' && isGeneratedManualOrderNo(data.order_no);
        const requestedSourceContractCode = resolveSourceContractCode(data);
        const shouldAutoAssignAutoOrderNo = data.metadata?.order_source === 'auto'
            && Boolean(requestedSourceContractCode)
            && isGeneratedAutoOrderNo(data.order_no, requestedSourceContractCode);
        let lastAttemptedOrderNo = String(data.order_no || '').trim();

        for (let attempt = 0; attempt < 5; attempt += 1) {
            const transaction = await sequelize.transaction();
            try {
                const createInput = shouldAutoAssignManualOrderNo
                    ? { ...data, order_no: await this.allocateNextManualOrderNo(data.created_at, transaction) }
                    : shouldAutoAssignAutoOrderNo
                        ? { ...data, order_no: await this.allocateNextAutoOrderNo(requestedSourceContractCode, transaction) }
                        : data;
                lastAttemptedOrderNo = String(createInput.order_no || '').trim() || lastAttemptedOrderNo;
                const normalizedCategory = createInput.category || data.category;
                const createIssues = validateManualCreateOrder(createInput);
                if (createIssues.length > 0) {
                    throw new AppError({
                        code: ERROR_CODES.VALIDATION_ERROR,
                        status: 400,
                        details: {
                            issues: createIssues.map((issue) => ({
                                target: 'body',
                                field: issue.field,
                                message: issue.message,
                            })),
                        },
                    });
                }

                const sourceContractCode = resolveSourceContractCode(createInput);
                const metadata = normalizeMetadata(createInput.metadata, {}, normalizedCategory);
                const normalizedStatus = normalizeStatus(createInput.status, 'draft');
                const sanitizedItems = metadata.order_source === 'manual'
                    ? sanitizeManualCreateItems(
                        createInput.items as any[] | undefined,
                        createInput.category,
                        metadata.template_type,
                    )
                    : (createInput.items as any[] | undefined);
                const normalizedData: PlainRecord = {
                    ...createInput,
                    category: normalizedCategory,
                    source_contract_code: sourceContractCode,
                    metadata,
                    status: normalizedStatus,
                    items: sanitizedItems,
                };
                const dedupeKey = buildOrderDedupeKey(normalizedData);
                const duplicate = await this.findDuplicateAutoOrder(normalizedData, transaction);
                if (duplicate) {
                    throw new DuplicateOrderError(duplicate);
                }
                await this.assertUniqueOrderNo(normalizedData.order_no, undefined, transaction);

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
                    order_no: createInput.order_no
                });

                return serializeOrder({
                    ...order.get({ plain: true }),
                    items: Array.isArray(normalizedData.items) ? normalizedData.items : []
                });
            } catch (error) {
                await transaction.rollback();
                if ((shouldAutoAssignManualOrderNo || shouldAutoAssignAutoOrderNo) && isUniqueOrderNoError(error) && attempt < 4) {
                    continue;
                }
                if (isUniqueOrderNoError(error)) {
                    await this.assertUniqueOrderNo(lastAttemptedOrderNo || data.order_no);
                }
                throw error;
            }
        }

        throw new Error('Failed to allocate unique order number');
    }

    async updateOrder(id: number | string, data: OrderUpdateInput) {
        const transaction = await sequelize.transaction();
        try {
            const order = await orderRepository.findOrderById(id, transaction);
            if (!order) throw new Error('Order not found');
            assertEditableOrderFields(order, data as Record<string, unknown>);

            const existing = await this.getOrderById(id);
            const context = resolveUpdateOrderContext({ order, existing, data });
            const {
                nextCategory,
                nextMetadata,
                nextSourceContractCode,
                nextSupplier,
                nextOrderNo,
                nextStatus,
                nextCreatedAt,
                nextItems,
            } = context;

            assertUpdateOrderInputValid({ order, data, context });
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
            await this.assertUniqueOrderNo(nextOrderNo, id, transaction);

            const isAutoOrder = Boolean(nextSourceContractCode && nextDedupeKey);
            const statusTransition = `${order.status}->${nextStatus}`;
            if (order.status === 'cancelled' && nextStatus !== 'cancelled' && isAutoOrder) {
                await this.reserveIdempotencyKey({
                    sourceContractCode: nextSourceContractCode,
                    dedupeKey: nextDedupeKey,
                    orderId: Number(id)
                }, transaction);
            }

            const nextOrderValues = buildNextOrderValues({
                order,
                data,
                context,
                nextDedupeKey,
            });
            await order.update(nextOrderValues, { transaction });

            if (data.created_at !== undefined) {
                await orderRepository.updateOrderCreatedAt(Number(id), nextCreatedAt, transaction);
            }

            if (data.items) {
                const items = nextItems.map((item: PlainRecord) => ({
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
                category: nextCategory,
                metadata: {
                    ...(order.metadata || {}),
                    ...nextMetadata,
                    template_type: normalizeTemplateType(nextMetadata.template_type, nextCategory),
                },
                items: Array.isArray(data.items) ? data.items : await orderRepository.findOrderItemsByOrderId(Number(id))
            });
        } catch (error) {
            await transaction.rollback();
            if (isUniqueOrderNoError(error)) {
                await this.assertUniqueOrderNo(data.order_no === undefined ? undefined : data.order_no, id);
            }
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
