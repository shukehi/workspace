import { API_ERROR_CODES } from '../../shared/contracts/api';
import ERROR_CODES from '../../app/errors/errorCodes';
import AppError from '../../app/errors/AppError';
import { toDuplicateOrderSummary } from './order.mapper';

/**
 * 辅助函数：安全提取错误对象中的业务细节属性
 * 避开原生 Error 对象不可枚举属性(message, stack等)的干扰
 */
const extractErrorDetails = (err: any) => {
    const { message, stack, name, code, ...details } = err;
    return details;
};

export class DuplicateOrderError extends Error {
    code: string = API_ERROR_CODES.DUPLICATE_ORDER;
    existingOrder: any;
    constructor(existingOrder: any) {
        super(API_ERROR_CODES.DUPLICATE_ORDER);
        this.name = 'DuplicateOrderError';
        this.existingOrder = existingOrder;
    }
}

export class MissingMaterialError extends Error {
    code: string = API_ERROR_CODES.MATERIAL_NOT_FOUND;
    materialId?: string;
    constructor(materialId?: string) {
        super(API_ERROR_CODES.MATERIAL_NOT_FOUND);
        this.name = 'MissingMaterialError';
        this.materialId = materialId;
    }
}

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

/**
 * 订单领域错误处理器 (加固版)
 */
export const orderErrorResolver = (error: any): AppError | null => {
    if (!error?.code) return null;

    switch (error.code) {
    case ERROR_CODES.DUPLICATE_ORDER:
        return new AppError({
            code: ERROR_CODES.DUPLICATE_ORDER,
            status: 409,
            details: { existingOrder: toDuplicateOrderSummary(error.existingOrder) },
            originalError: error,
        });
    case ERROR_CODES.INVALID_STATUS_TRANSITION:
        return new AppError({
            code: ERROR_CODES.INVALID_STATUS_TRANSITION,
            status: 400,
            details: extractErrorDetails(error),
            originalError: error,
        });
    case ERROR_CODES.ORDER_EDIT_LOCKED:
        return new AppError({
            code: ERROR_CODES.ORDER_EDIT_LOCKED,
            status: 400,
            details: extractErrorDetails(error),
            originalError: error,
        });
    case ERROR_CODES.MATERIAL_NOT_FOUND:
        return new AppError({
            code: ERROR_CODES.MATERIAL_NOT_FOUND,
            status: 400,
            details: { materialId: error.materialId },
            originalError: error,
        });
    case ERROR_CODES.RECEIVED_QUANTITY_EXCEEDED:
        return new AppError({
            code: ERROR_CODES.RECEIVED_QUANTITY_EXCEEDED,
            status: 400,
            details: extractErrorDetails(error),
            originalError: error,
        });
    case ERROR_CODES.ORDER_NOT_FOUND:
        return new AppError({
            code: ERROR_CODES.ORDER_NOT_FOUND,
            status: 404,
            originalError: error,
        });
    default:
        return null;
    }
};

module.exports = {
    DuplicateOrderError,
    MissingMaterialError,
    ReceivedQuantityExceededError,
    orderErrorResolver,
};
