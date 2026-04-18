import type { OrderAttributes, OrderCreateInput, OrderUpdateInput } from '../../models/types';
import AppError from '../../app/errors/AppError';
import ERROR_CODES from '../../app/errors/errorCodes';
import { normalizeMetadata, resolveSourceContractCode, buildOrderDedupeKey } from './order.dedupe';
import { assertEditableOrderFields, assertValidStatusTransition, normalizeStatus } from './order.policy';
import { sanitizeManualCreateItems, validateLockedManualOrderUpdate, validateManualCreateOrder } from './order-create.validation';
import { normalizeNullableDate, normalizeOrderRemark, isUniqueOrderNoError } from './order.service.helpers';
import { sequelize } from '../../models';
import * as orderRepository from './order.repository';
import { normalizeOrderItemForPersistence, serializeOrder } from './order.mapper';
import type { PlainRecord } from '../../shared/types';
import { DuplicateOrderError } from './order.errors';
import type {
    OrderItemPersistenceBindings,
    OrderByIdBinding,
    OrderDuplicateAutoBinding,
    OrderIdempotencyReserveBinding,
    OrderUniqueOrderNoBinding,
    OrderIdempotencyMutationBindings,
    OrderSerializationBindings,
    OrderTransactionFactoryBinding,
} from './order.service.contracts';
import { normalizeTemplateType } from './order.template';

type OrderLike = Pick<
    OrderAttributes,
    | 'order_no'
    | 'supplier'
    | 'source_contract_code'
    | 'category'
    | 'status'
    | 'remark'
    | 'metadata'
    | 'created_at'
    | 'delivery_date'
    | 'arrived_at'
    | 'arrived_by'
    | 'arrived_remark'
    | 'stocked_in_at'
    | 'stocked_in_by'
    | 'stocked_in_remark'
>;

type UpdateOrderContext = {
    nextCategory: OrderAttributes['category'];
    nextMetadata: Record<string, any>;
    nextSourceContractCode: string;
    nextSupplier: string;
    nextOrderNo: string;
    nextStatus: string;
    nextCreatedAt: OrderCreateInput['created_at'];
    nextItems: any[];
};

export function resolveUpdateOrderContext({
    order,
    existing,
    data,
}: {
    order: OrderLike;
    existing: { items?: any[] } | null | undefined;
    data: OrderUpdateInput;
}): UpdateOrderContext {
    const nextCategory = data.category === undefined ? order.category : data.category;
    const nextMetadata = normalizeMetadata(
        data.metadata === undefined ? order.metadata : data.metadata,
        order.metadata || {},
        nextCategory,
    );
    const nextSourceContractCode = resolveSourceContractCode({
        source_contract_code: data.source_contract_code,
        metadata: nextMetadata,
    }, order.source_contract_code || '');
    const mergedItems = Array.isArray(data.items) ? data.items : (existing?.items || []);
    const nextSupplier = data.supplier === undefined ? (order.supplier || '') : (data.supplier || '');
    const nextOrderNo = String(data.order_no === undefined ? order.order_no : data.order_no || '').trim();
    const nextStatus = data.status === undefined
        ? normalizeStatus(order.status)
        : assertValidStatusTransition(order.status, data.status);
    const nextCreatedAt = data.created_at !== undefined ? data.created_at : order.created_at;
    const nextItems = nextMetadata.order_source === 'manual'
        ? (() => {
            const sanitizedItems = sanitizeManualCreateItems(
                mergedItems as any[] | undefined,
                nextCategory,
                nextMetadata.template_type,
            );
            return sanitizedItems.length > 0 ? sanitizedItems : mergedItems;
        })()
        : mergedItems;

    return {
        nextCategory,
        nextMetadata,
        nextSourceContractCode,
        nextSupplier,
        nextOrderNo,
        nextStatus,
        nextCreatedAt,
        nextItems,
    };
}

export function assertUpdateOrderInputValid({
    order,
    data,
    context,
}: {
    order: OrderLike;
    data: OrderUpdateInput;
    context: UpdateOrderContext;
}): void {
    const mergedOrderForValidation: OrderCreateInput = {
        order_no: context.nextOrderNo,
        supplier: context.nextSupplier || '',
        category: context.nextCategory || '',
        status: context.nextStatus,
        remark: data.remark === undefined ? order.remark : normalizeOrderRemark(data.remark),
        metadata: context.nextMetadata,
        created_at: context.nextCreatedAt,
        delivery_date: data.delivery_date === undefined ? order.delivery_date : data.delivery_date,
        arrived_at: data.arrived_at === undefined ? order.arrived_at : data.arrived_at,
        arrived_by: data.arrived_by === undefined ? order.arrived_by : data.arrived_by,
        arrived_remark: data.arrived_remark === undefined ? order.arrived_remark : normalizeOrderRemark(data.arrived_remark),
        stocked_in_at: data.stocked_in_at === undefined ? order.stocked_in_at : data.stocked_in_at,
        stocked_in_by: data.stocked_in_by === undefined ? order.stocked_in_by : data.stocked_in_by,
        stocked_in_remark: data.stocked_in_remark === undefined ? order.stocked_in_remark : normalizeOrderRemark(data.stocked_in_remark),
        items: context.nextItems as any[],
    };
    const lockedStatus = ['arrived', 'completed'].includes(normalizeStatus(order.status));
    const updateIssues = lockedStatus
        ? validateLockedManualOrderUpdate(data, context.nextMetadata)
        : validateManualCreateOrder(mergedOrderForValidation);

    if (updateIssues.length > 0) {
        throw new AppError({
            code: ERROR_CODES.VALIDATION_ERROR,
            status: 400,
            details: {
                issues: updateIssues.map((issue) => ({
                    target: 'body',
                    field: issue.field,
                    message: issue.message,
                })),
            },
        });
    }
}

export function buildNextOrderValues({
    order,
    data,
    context,
    nextDedupeKey,
}: {
    order: OrderLike;
    data: OrderUpdateInput;
    context: UpdateOrderContext;
    nextDedupeKey: string;
}): Partial<OrderAttributes> {
    return {
        supplier: context.nextSupplier,
        source_contract_code: context.nextSourceContractCode || null,
        dedupe_key: nextDedupeKey || null,
        category: context.nextCategory,
        status: context.nextStatus,
        remark: data.remark === undefined ? order.remark : normalizeOrderRemark(data.remark),
        metadata: context.nextMetadata,
        delivery_date: normalizeNullableDate(data.delivery_date, order.delivery_date),
        arrived_at: normalizeNullableDate(data.arrived_at, order.arrived_at),
        arrived_by: data.arrived_by === undefined ? order.arrived_by : data.arrived_by,
        arrived_remark: data.arrived_remark === undefined ? order.arrived_remark : normalizeOrderRemark(data.arrived_remark),
        stocked_in_at: normalizeNullableDate(data.stocked_in_at, order.stocked_in_at),
        stocked_in_by: data.stocked_in_by === undefined ? order.stocked_in_by : data.stocked_in_by,
        stocked_in_remark: data.stocked_in_remark === undefined ? order.stocked_in_remark : normalizeOrderRemark(data.stocked_in_remark),
    };
}


export function buildUpdateOrderLifecycleDeps(bindings: OrderByIdBinding & OrderUniqueOrderNoBinding & OrderDuplicateAutoBinding & OrderIdempotencyReserveBinding & OrderIdempotencyMutationBindings) {
    return {
        transactionFactory: () => sequelize.transaction(),
        findOrderById: (orderId: number | string, transaction?: any) => orderRepository.findOrderById(orderId, transaction),
        getOrderById: bindings.getOrderById,
        assertEditableOrderFields,
        findDuplicateAutoOrder: (updateData: Record<string, unknown>, transaction?: any, options?: Record<string, unknown>) => bindings.findDuplicateAutoOrder(updateData as PlainRecord, transaction, options as PlainRecord),
        buildOrderDedupeKey: (value: Record<string, unknown>) => buildOrderDedupeKey(value as PlainRecord),
        assertUniqueOrderNo: bindings.assertUniqueOrderNo,
        reserveIdempotencyKey: bindings.reserveIdempotencyKey,
        releaseIdempotencyKeys: bindings.releaseIdempotencyKeys,
        syncActiveIdempotencyKey: bindings.syncActiveIdempotencyKey,
        updateOrderCreatedAt: (orderId: number, createdAt: Date | string, transaction?: any) => orderRepository.updateOrderCreatedAt(orderId, createdAt, transaction),
        replaceOrderItems: (orderId: number, items: any[], transaction?: any) => orderRepository.replaceOrderItems(orderId, items, transaction),
        findOrderItemsByOrderId: (orderId: number) => orderRepository.findOrderItemsByOrderId(orderId),
        normalizeOrderItemForPersistence,
        serializeOrder,
    };
}

type UpdateOrderLifecycleDeps =
    OrderTransactionFactoryBinding
    & OrderByIdBinding
    & OrderUniqueOrderNoBinding
    & OrderDuplicateAutoBinding
    & OrderIdempotencyReserveBinding
    & OrderIdempotencyMutationBindings
    & OrderItemPersistenceBindings
    & OrderSerializationBindings
    & {
        findOrderById: (id: number | string, transaction?: any) => Promise<any>;
        assertEditableOrderFields: (order: any, data: Record<string, unknown>) => void;
        buildOrderDedupeKey: (data: Record<string, unknown>) => string;
        updateOrderCreatedAt: (id: number, createdAt: Date | string, transaction?: any) => Promise<unknown>;
        replaceOrderItems: (orderId: number, items: any[], transaction?: any) => Promise<unknown>;
        findOrderItemsByOrderId: (orderId: number) => Promise<any[]>;
    };

export async function updateOrderLifecycle(
    id: number | string,
    data: OrderUpdateInput,
    deps: UpdateOrderLifecycleDeps,
): Promise<any> {
    const transaction = await deps.transactionFactory();
    try {
        const order = await deps.findOrderById(id, transaction);
        if (!order) throw new Error('Order not found');
        deps.assertEditableOrderFields(order, data as Record<string, unknown>);

        const existing = await deps.getOrderById(id);
        const context = resolveUpdateOrderContext({ order, existing, data });
        const {
            nextCategory,
            nextMetadata,
            nextSourceContractCode,
            nextSupplier,
            nextOrderNo,
            nextStatus,
            nextItems,
        } = context;

        assertUpdateOrderInputValid({ order, data, context });
        const nextDedupeKey = deps.buildOrderDedupeKey({
            source_contract_code: nextSourceContractCode,
            category: nextCategory,
            supplier: nextSupplier,
            items: nextItems,
            metadata: nextMetadata,
        });

        const duplicate = nextStatus === 'cancelled'
            ? null
            : await deps.findDuplicateAutoOrder({
                source_contract_code: nextSourceContractCode,
                category: nextCategory,
                supplier: nextSupplier,
                items: nextItems,
                metadata: nextMetadata,
            }, transaction, { excludeId: id });
        if (duplicate) {
            throw new DuplicateOrderError(duplicate as any);
        }
        await deps.assertUniqueOrderNo(nextOrderNo, id, transaction);

        const isAutoOrder = Boolean(nextSourceContractCode && nextDedupeKey);
        const statusTransition = `${order.status}->${nextStatus}`;
        if (order.status === 'cancelled' && nextStatus !== 'cancelled' && isAutoOrder) {
            await deps.reserveIdempotencyKey({
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
            await deps.updateOrderCreatedAt(Number(id), data.created_at, transaction);
        }

        if (data.items) {
            const items = nextItems.map((item: Record<string, unknown>) => ({
                ...deps.normalizeOrderItemForPersistence(item),
                id: undefined,
                order_id: id
            }));
            await deps.replaceOrderItems(Number(id), items, transaction);
        }

        if (isAutoOrder) {
            if (nextStatus === 'cancelled') {
                await deps.releaseIdempotencyKeys(Number(id), transaction);
            } else if (!statusTransition.startsWith('cancelled->')) {
                await deps.syncActiveIdempotencyKey({
                    sourceContractCode: nextSourceContractCode,
                    dedupeKey: nextDedupeKey,
                    orderId: Number(id)
                }, transaction);
            }
        }

        await transaction.commit();
        const persisted = await deps.getOrderById(id);
        if (persisted) return persisted;

        console.warn('[OrderService] updateOrder fallback: persisted order not found after commit', {
            id,
            order_no: order.order_no
        });

        return deps.serializeOrder({
            ...order.get({ plain: true }),
            created_at: data.created_at !== undefined ? data.created_at : order.created_at,
            category: nextCategory,
            metadata: {
                ...(order.metadata || {}),
                ...nextMetadata,
                template_type: normalizeTemplateType(nextMetadata.template_type, nextCategory),
            },
            items: Array.isArray(data.items) ? data.items : await deps.findOrderItemsByOrderId(Number(id))
        });
    } catch (error) {
        await transaction.rollback();
        if (isUniqueOrderNoError(error)) {
            await deps.assertUniqueOrderNo(data.order_no === undefined ? undefined : data.order_no, id);
        }
        throw error;
    }
}
