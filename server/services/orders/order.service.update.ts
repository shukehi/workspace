import type { OrderAttributes, OrderCreateInput, OrderUpdateInput } from '../../models/types';
import AppError from '../../app/errors/AppError';
import ERROR_CODES from '../../app/errors/errorCodes';
import { normalizeMetadata, resolveSourceContractCode } from './order.dedupe';
import { assertValidStatusTransition, normalizeStatus } from './order.policy';
import { sanitizeManualCreateItems, validateLockedManualOrderUpdate, validateManualCreateOrder } from './order-create.validation';
import { normalizeNullableDate, normalizeOrderRemark } from './order.service.helpers';

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

export type UpdateOrderContext = {
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
