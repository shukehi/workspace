import type { OrderAttributes, OrderListQuery, OrderCreateInput, OrderUpdateInput } from '../../models/types';
import AppError from '../../app/errors/AppError';
import ERROR_CODES from '../../app/errors/errorCodes';
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
import { getAllOrdersResult, getOrderByIdResult } from './order.service.read';
import {
    normalizeOrderForLog,
    normalizeOrderItemForPersistence,
    resolveOrderedQuantity,
    serializeOrder,
    toDuplicateOrderSummary,
} from './order.mapper';
import {
    allocateNextAutoOrderNo,
    allocateNextManualOrderNo,
    assertUniqueOrderNo,
    findDuplicateAutoOrder,
    releaseIdempotencyKeys,
    reserveIdempotencyKey,
    syncActiveIdempotencyKey,
    buildOrderLifecycleBindings,
} from './order.service.support';
import {
    buildOrderDedupeKey,
    resolveSourceContractCode,
} from './order.dedupe';
import { normalizeTemplateType } from './order.template';
import {
    buildCreateOrderLifecycleDeps,
    createOrderLifecycle,
} from './order.service.create';
import {
    buildUpdateOrderLifecycleDeps,
    updateOrderLifecycle,
} from './order.service.update';
import {
    buildStockInOrderLifecycleDeps,
    stockInOrderResult,
} from './order.stockin';
import {
    DuplicateOrderError,
    InvalidStatusTransitionError,
    MissingMaterialError,
    OrderEditLockedError,
    ReceivedQuantityExceededError,
} from './order.errors';
import { deleteOrderWithRetry } from './order.service.delete';
import { bulkMarkArrivedResult, markArrivedResult } from './order.service.arrive';
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
    allocateNextAutoOrderNo = allocateNextAutoOrderNo;
    allocateNextManualOrderNo = allocateNextManualOrderNo;
    assertUniqueOrderNo = assertUniqueOrderNo;
    findDuplicateAutoOrder = findDuplicateAutoOrder;
    releaseIdempotencyKeys = releaseIdempotencyKeys;
    reserveIdempotencyKey = (
        args: { sourceContractCode?: string; dedupeKey?: string; orderId?: number },
        transaction: unknown,
    ) => reserveIdempotencyKey(args, {
        getOrderById: (id) => this.getOrderById(id),
        findDuplicateAutoOrder: this.findDuplicateAutoOrder,
    }, transaction as any);
    syncActiveIdempotencyKey = (
        args: { sourceContractCode?: string; dedupeKey?: string; orderId?: number },
        transaction: unknown,
    ) => syncActiveIdempotencyKey(args, {
        reserveIdempotencyKey: (reserveArgs, reserveTransaction) => this.reserveIdempotencyKey(reserveArgs, reserveTransaction),
    }, transaction as any);

    private buildLifecycleBindings() {
        return buildOrderLifecycleBindings({
            getOrderById: (id) => this.getOrderById(id),
            allocateNextManualOrderNo: this.allocateNextManualOrderNo,
            allocateNextAutoOrderNo: this.allocateNextAutoOrderNo,
            assertUniqueOrderNo: this.assertUniqueOrderNo,
            findDuplicateAutoOrder: this.findDuplicateAutoOrder,
            reserveIdempotencyKey: (args, transaction) => this.reserveIdempotencyKey(args, transaction),
            releaseIdempotencyKeys: this.releaseIdempotencyKeys,
            syncActiveIdempotencyKey: (args, transaction) => this.syncActiveIdempotencyKey(args, transaction),
        });
    }

    async getAllOrders(category?: string) {
        return await getAllOrdersResult(category, {
            findAllOrdersWithItems: (where) => orderRepository.findAllOrdersWithItems(where),
            normalizeOrderForLog,
            serializeOrder,
        });
    }

    async getPaginatedOrders(query: OrderListQuery = {}) {
        return await getPaginatedOrdersResult(query, {
            serializeOrder,
            buildOrderSummary,
            buildOrderFacets,
        });
    }

    async getOrderById(id: number | string) {
        return await getOrderByIdResult(id, {
            findOrderByIdWithItems: (orderId) => orderRepository.findOrderByIdWithItems(orderId),
            serializeOrder,
        });
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

        return await createOrderLifecycle(data, buildCreateOrderLifecycleDeps({
            data,
            shouldAutoAssignManualOrderNo,
            shouldAutoAssignAutoOrderNo,
            requestedSourceContractCode,
            bindings: this.buildLifecycleBindings(),
        }));
    }

    async updateOrder(id: number | string, data: OrderUpdateInput) {
        return await updateOrderLifecycle(id, data, buildUpdateOrderLifecycleDeps(this.buildLifecycleBindings()));
    }

    async deleteOrder(id: number | string) {
        const parsedId = Number(id);
        if (!Number.isInteger(parsedId) || parsedId <= 0) {
            throw new Error('INVALID_ID');
        }

        return await deleteOrderWithRetry(parsedId);
    }

    async markArrived(id: number | string, data: PlainRecord = {}) {
        return await markArrivedResult(id, data, {
            updateOrder: (orderId, payload) => this.updateOrder(orderId, payload),
        });
    }

    async bulkMarkArrived(idsInput: unknown, data: PlainRecord = {}) {
        return await bulkMarkArrivedResult(idsInput, data, {
            normalizeBulkOrderIds,
            serializeBulkArriveError,
            markArrivedResult: (id, payload) => this.markArrived(id, payload),
        });
    }

    async stockInOrder(id: number | string, data: PlainRecord = {}) {
        return await stockInOrderResult(id, data, buildStockInOrderLifecycleDeps({
            getOrderById: (orderId) => this.getOrderById(orderId),
        }, {
            normalizeStatus,
            InvalidStatusTransitionError,
            inventoryReceiptService,
            MissingMaterialError,
            resolveOrderedQuantity,
            ReceivedQuantityExceededError,
            normalizeOrderRemark,
        }));
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
