import ERROR_CODES from '../../app/errors/errorCodes';
import AppError from '../../app/errors/AppError';

/**
 * 基础工厂方法 (兼容旧代码)
 */
export function createReceiptError(code: string, extra: Record<string, unknown> = {}) {
    const error = new Error(code) as Error & Record<string, any>;
    error.code = code;
    Object.assign(error, extra);
    return error;
}

// ... (省略中间的 Error 类定义，保持与之前一致)

export class ReceiptReverseNotAllowedError extends Error {
    code: string = ERROR_CODES.RECEIPT_REVERSE_NOT_ALLOWED;
    receiptId: number | string;
    constructor(receiptId: number | string) {
        super('RECEIPT_REVERSE_NOT_ALLOWED');
        this.receiptId = receiptId;
    }
}

export class ReceiptAlreadyReversedError extends Error {
    code: string = ERROR_CODES.RECEIPT_ALREADY_REVERSED;
    receiptId: number | string;
    constructor(receiptId: number | string) {
        super('RECEIPT_ALREADY_REVERSED');
        this.receiptId = receiptId;
    }
}

export class ReceiptAlreadyFullyReversedError extends Error {
    code: string = ERROR_CODES.RECEIPT_ALREADY_FULLY_REVERSED;
    receiptId: number | string;
    constructor(receiptId: number | string) {
        super('RECEIPT_ALREADY_FULLY_REVERSED');
        this.receiptId = receiptId;
    }
}

export class ReverseQuantityExceededError extends Error {
    code: string = ERROR_CODES.REVERSE_QUANTITY_EXCEEDED;
    receiptId: number | string;
    reversibleQuantity: number;
    requestedQuantity: number;
    constructor(receiptId: number | string, reversibleQuantity: number, requestedQuantity: number) {
        super('REVERSE_QUANTITY_EXCEEDED');
        this.receiptId = receiptId;
        this.reversibleQuantity = reversibleQuantity;
        this.requestedQuantity = requestedQuantity;
    }
}

/**
 * 库存/入库领域错误处理器 (终极稳健版)
 */
export const inventoryErrorResolver = (error: any): AppError | null => {
    if (!error?.code) return null;

    // 辅助函数：安全提取自定义属性，避开 Error 不可枚举属性的陷阱
    const extractDetails = (err: any) => {
        const { message, stack, name, code, ...details } = err;
        return details;
    };

    switch (error.code) {
    case ERROR_CODES.RECEIPT_NOT_FOUND:
        return new AppError({
            code: ERROR_CODES.RECEIPT_NOT_FOUND,
            status: 404,
            originalError: error,
        });
    case ERROR_CODES.RECEIPT_REVERSE_NOT_ALLOWED:
    case ERROR_CODES.RECEIPT_ALREADY_REVERSED:
    case ERROR_CODES.RECEIPT_ALREADY_FULLY_REVERSED:
    case ERROR_CODES.REVERSE_REASON_REQUIRED:
    case ERROR_CODES.INVALID_RECEIPT_DATE:
        return new AppError({
            code: error.code,
            status: 400,
            details: extractDetails(error),
            originalError: error,
        });
    case ERROR_CODES.REVERSE_QUANTITY_EXCEEDED:
        return new AppError({
            code: ERROR_CODES.REVERSE_QUANTITY_EXCEEDED,
            status: 400,
            details: {
                reversibleQuantity: error.reversibleQuantity,
                requestedQuantity: error.requestedQuantity,
            },
            originalError: error,
        });
    case ERROR_CODES.MATERIAL_ID_REQUIRED:
    case ERROR_CODES.INVALID_RECEIPT_QUANTITY:
    case ERROR_CODES.ORDER_ITEMS_REQUIRED:
    case ERROR_CODES.ORDER_ITEM_ID_REQUIRED:
    case ERROR_CODES.RECEIPT_ITEM_KEY_REQUIRED:
    case ERROR_CODES.DUPLICATE_RECEIPT_ITEM:
    case ERROR_CODES.ORDER_ITEM_NOT_FOUND:
    case ERROR_CODES.ORDER_ITEM_KEY_MISMATCH:
        return new AppError({
            code: error.code,
            status: 400,
            details: extractDetails(error),
            originalError: error,
        });
    default:
        return null;
    }
};

module.exports = {
    createReceiptError,
    ReceiptReverseNotAllowedError,
    ReceiptAlreadyReversedError,
    ReceiptAlreadyFullyReversedError,
    ReverseQuantityExceededError,
    inventoryErrorResolver,
};
