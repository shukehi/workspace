import { API_ERROR_CODES } from '../../shared/contracts/api';
import ERROR_CODES from '../../app/errors/errorCodes';
import AppError from '../../app/errors/AppError';
import { toDuplicateOrderSummary } from './order.mapper';
import type { OrderInstance } from '../../models';

/**
 * 重复订单错误
 */
export class DuplicateOrderError extends Error {
    code: string = API_ERROR_CODES.DUPLICATE_ORDER;
    existingOrder: OrderInstance;
    constructor(existingOrder: OrderInstance) {
        super(API_ERROR_CODES.DUPLICATE_ORDER);
        this.name = 'DuplicateOrderError';
        this.existingOrder = existingOrder;
    }
}

/**
 * 物料缺失错误
 */
export class MissingMaterialError extends Error {
    code: string = API_ERROR_CODES.MATERIAL_NOT_FOUND;
    materialId?: string;
    constructor(materialId?: string) {
        super(API_ERROR_CODES.MATERIAL_NOT_FOUND);
        this.name = 'MissingMaterialError';
        this.materialId = materialId;
    }
}

/**
 * 状态流转非法错误
 */
export class InvalidStatusTransitionError extends Error {
    code: string = API_ERROR_CODES.INVALID_STATUS_TRANSITION;
    fromStatus: string;
    toStatus: string;
    constructor(fromStatus: string, toStatus: string) {
        super(API_ERROR_CODES.INVALID_STATUS_TRANSITION);
        this.name = 'InvalidStatusTransitionError';
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
    }
}

/**
 * 订单编辑锁定错误
 */
export class OrderEditLockedError extends Error {
    code: string = API_ERROR_CODES.ORDER_EDIT_LOCKED;
    status?: string;
    fields?: string[];
    constructor(status?: string, fields?: string[]) {
        super(API_ERROR_CODES.ORDER_EDIT_LOCKED);
        this.name = 'OrderEditLockedError';
        this.status = status;
        this.fields = fields;
    }
}

/**
 * 入库数量超限错误
 */
export class ReceivedQuantityExceededError extends Error {
    code: string = API_ERROR_CODES.RECEIVED_QUANTITY_EXCEEDED;
    orderItemId: number;
    orderedQuantity: number;
    nextReceivedQuantity: number;
    constructor(orderItemId: number, orderedQuantity: number, nextReceivedQuantity: number) {
        super(API_ERROR_CODES.RECEIVED_QUANTITY_EXCEEDED);
        this.name = 'ReceivedQuantityExceededError';
        this.orderItemId = orderItemId;
        this.orderedQuantity = orderedQuantity;
        this.nextReceivedQuantity = nextReceivedQuantity;
    }
}

/** 所有订单领域错误的联合类型 */
export type OrderDomainError =
    | DuplicateOrderError
    | MissingMaterialError
    | InvalidStatusTransitionError
    | OrderEditLockedError
    | ReceivedQuantityExceededError;

/**
 * 订单领域错误处理器 (最高标准显式映射版)
 */
export const orderErrorResolver = (error: OrderDomainError | Error | unknown): AppError | null => {
    if (!error || typeof error !== 'object' || !('code' in error)) return null;
    const e = error as OrderDomainError;

    switch (e.code) {
    case ERROR_CODES.DUPLICATE_ORDER:
        return new AppError({
            code: ERROR_CODES.DUPLICATE_ORDER,
            status: 409,
            details: { existingOrder: toDuplicateOrderSummary((e as DuplicateOrderError).existingOrder) },
            originalError: e,
        });
    case ERROR_CODES.INVALID_STATUS_TRANSITION:
        return new AppError({
            code: ERROR_CODES.INVALID_STATUS_TRANSITION,
            status: 400,
            details: {
                fromStatus: (e as InvalidStatusTransitionError).fromStatus,
                toStatus: (e as InvalidStatusTransitionError).toStatus,
            },
            originalError: e,
        });
    case ERROR_CODES.ORDER_EDIT_LOCKED:
        return new AppError({
            code: ERROR_CODES.ORDER_EDIT_LOCKED,
            status: 400,
            details: {
                status: (e as OrderEditLockedError).status,
                fields: (e as OrderEditLockedError).fields,
            },
            originalError: e,
        });
    case ERROR_CODES.MATERIAL_NOT_FOUND:
        return new AppError({
            code: ERROR_CODES.MATERIAL_NOT_FOUND,
            status: 400,
            details: { materialId: (e as MissingMaterialError).materialId },
            originalError: e,
        });
    case ERROR_CODES.RECEIVED_QUANTITY_EXCEEDED:
        return new AppError({
            code: ERROR_CODES.RECEIVED_QUANTITY_EXCEEDED,
            status: 400,
            details: {
                orderItemId: (e as ReceivedQuantityExceededError).orderItemId,
                orderedQuantity: (e as ReceivedQuantityExceededError).orderedQuantity,
                nextReceivedQuantity: (e as ReceivedQuantityExceededError).nextReceivedQuantity,
            },
            originalError: e,
        });
    case ERROR_CODES.ORDER_NOT_FOUND:
        return new AppError({
            code: ERROR_CODES.ORDER_NOT_FOUND,
            status: 404,
            originalError: e,
        });
    default:
        return null;
    }
};

