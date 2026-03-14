export {};

const AppError = require('./AppError');
const ERROR_CODES = require('./errorCodes');
const { toDuplicateOrderSummary } = require('../../services/orders/order.mapper');

type PlainRecord = Record<string, any>;

function fromKnownCode(error: PlainRecord) {
    switch (error?.code) {
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
            details: {
                fromStatus: error.fromStatus,
                toStatus: error.toStatus,
            },
            originalError: error,
        });
    case ERROR_CODES.ORDER_EDIT_LOCKED:
        return new AppError({
            code: ERROR_CODES.ORDER_EDIT_LOCKED,
            status: 400,
            details: {
                status: error.status,
                fields: error.fields,
            },
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
            details: {
                orderItemId: error.orderItemId,
                orderedQuantity: error.orderedQuantity,
                nextReceivedQuantity: error.nextReceivedQuantity,
            },
            originalError: error,
        });
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
    case ERROR_CODES.ORDER_NOT_FOUND:
        return new AppError({
            code: error.code,
            status: 400,
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
            originalError: error,
        });
    case ERROR_CODES.INVALID_ID:
        return new AppError({
            code: ERROR_CODES.INVALID_ID,
            status: 400,
            message: 'Invalid order id',
            details: { message: 'Invalid order id' },
            originalError: error,
        });
    case ERROR_CODES.NOT_FOUND:
        return new AppError({
            code: ERROR_CODES.NOT_FOUND,
            status: 404,
            message: error.message || 'Not found',
            details: { message: error.message || 'Not found' },
            originalError: error,
        });
    default:
        return null;
    }
}

function normalizeError(error: unknown) {
    if (error instanceof AppError) return error;

    const known = fromKnownCode((error || {}) as PlainRecord);
    if (known) return known;

    if ((error as PlainRecord)?.name === 'SequelizeValidationError') {
        return new AppError({
            code: ERROR_CODES.VALIDATION_ERROR,
            status: 400,
            details: {
                issues: Array.isArray((error as PlainRecord).errors)
                    ? (error as PlainRecord).errors.map((item: PlainRecord) => ({
                        message: item.message,
                        path: item.path,
                    }))
                    : [],
            },
            originalError: error,
        });
    }

    return new AppError({
        code: ERROR_CODES.INTERNAL_ERROR,
        status: 500,
        message: (error as PlainRecord)?.message || ERROR_CODES.INTERNAL_ERROR,
        expose: false,
        originalError: error,
    });
}

module.exports = normalizeError;
