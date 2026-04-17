import type { OrderAttributes, OrderListQuery, OrderCreateInput, OrderUpdateInput } from '../../models/types';
import type { Transaction } from 'sequelize';
import AppError from '../../app/errors/AppError';
import ERROR_CODES from '../../app/errors/errorCodes';
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
import { getPaginatedOrdersResult } from './order.service.query';
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
    assertCreateOrderInputValid,
    buildCreateOrderFallback,
    buildCreateOrderItems,
    buildCreateOrderValues,
    createOrderLifecycle,
    resolveCreateOrderContext,
} from './order.service.create';
import {
    updateOrderLifecycle,
} from './order.service.update';
import {
    stockInOrderLifecycle,
} from './order.stockin';
import {
    DuplicateOrderError,
    InvalidStatusTransitionError,
    MissingMaterialError,
    OrderEditLockedError,
    ReceivedQuantityExceededError,
} from './order.errors';
import { deleteOrderWithRetry } from './order.service.delete';
import { buildMarkArrivedPayload, bulkMarkArrivedWithResult } from './order.service.arrive';
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
        return await getPaginatedOrdersResult(query, {
            serializeOrder,
            buildOrderSummary,
            buildOrderFacets,
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

        if (!data.created_at) {
            console.warn('[OrderService] createOrder payload missing created_at, falling back to current timestamp', {
                order_no: data.order_no,
                category: data.category,
                supplier: data.supplier
            });
        }

        return await createOrderLifecycle(data, {
            transactionFactory: () => sequelize.transaction(),
            allocateNextManualOrderNo: (createdAt, transaction) => this.allocateNextManualOrderNo(createdAt, transaction),
            allocateNextAutoOrderNo: (sourceContractCode, transaction) => this.allocateNextAutoOrderNo(sourceContractCode, transaction),
            shouldAutoAssignManualOrderNo,
            shouldAutoAssignAutoOrderNo,
            requestedSourceContractCode,
            assertUniqueOrderNo: (orderNo, excludeId, transaction) => this.assertUniqueOrderNo(orderNo, excludeId, transaction),
            findDuplicateAutoOrder: (createData, transaction) => this.findDuplicateAutoOrder(createData, transaction),
            createOrder: (values, transaction) => orderRepository.createOrder(values, transaction),
            bulkCreateOrderItems: (items, transaction) => orderRepository.bulkCreateOrderItems(items as any, transaction),
            reserveIdempotencyKey: (args, transaction) => this.reserveIdempotencyKey(args, transaction),
            getOrderById: (id) => this.getOrderById(id),
            isUniqueOrderNoError,
        });
    }

    async updateOrder(id: number | string, data: OrderUpdateInput) {
        return await updateOrderLifecycle(id, data, {
            transactionFactory: () => sequelize.transaction(),
            findOrderById: (orderId, transaction) => orderRepository.findOrderById(orderId, transaction),
            getOrderById: (orderId) => this.getOrderById(orderId),
            assertEditableOrderFields,
            findDuplicateAutoOrder: (updateData, transaction, options) => this.findDuplicateAutoOrder(updateData as PlainRecord, transaction, options as PlainRecord),
            buildOrderDedupeKey: (value) => buildOrderDedupeKey(value as PlainRecord),
            assertUniqueOrderNo: (orderNo, excludeId, transaction) => this.assertUniqueOrderNo(orderNo, excludeId, transaction),
            reserveIdempotencyKey: (args, transaction) => this.reserveIdempotencyKey(args, transaction),
            releaseIdempotencyKeys: (orderId, transaction) => this.releaseIdempotencyKeys(orderId, transaction),
            syncActiveIdempotencyKey: (args, transaction) => this.syncActiveIdempotencyKey(args, transaction),
            updateOrderCreatedAt: (orderId, createdAt, transaction) => orderRepository.updateOrderCreatedAt(orderId, createdAt, transaction),
            replaceOrderItems: (orderId, items, transaction) => orderRepository.replaceOrderItems(orderId, items, transaction),
            findOrderItemsByOrderId: (orderId) => orderRepository.findOrderItemsByOrderId(orderId),
            normalizeOrderItemForPersistence,
            serializeOrder,
        });
    }

    async deleteOrder(id: number | string) {
        const parsedId = Number(id);
        if (!Number.isInteger(parsedId) || parsedId <= 0) {
            throw new Error('INVALID_ID');
        }

        return await deleteOrderWithRetry(parsedId);
    }

    async markArrived(id: number | string, data: PlainRecord = {}) {
        return await this.updateOrder(id, buildMarkArrivedPayload(data));
    }

    async bulkMarkArrived(idsInput: unknown, data: PlainRecord = {}) {
        return await bulkMarkArrivedWithResult(idsInput, data, {
            normalizeBulkOrderIds,
            serializeBulkArriveError,
            markArrived: (id, payload) => this.markArrived(id, payload),
        });
    }

    async stockInOrder(id: number | string, data: PlainRecord = {}) {
        return await stockInOrderLifecycle(id, data, {
            transactionFactory: () => sequelize.transaction(),
            findOrderByIdWithItems: (orderId, transaction) => orderRepository.findOrderByIdWithItems(orderId, transaction),
            normalizeStatus,
            InvalidStatusTransitionError,
            inventoryReceiptService,
            MissingMaterialError,
            resolveOrderedQuantity,
            ReceivedQuantityExceededError,
            normalizeOrderRemark,
            getOrderById: (orderId) => this.getOrderById(orderId),
        });
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
