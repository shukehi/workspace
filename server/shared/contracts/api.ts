export const API_ERROR_CODES = {
    DUPLICATE_ORDER: 'DUPLICATE_ORDER',
    INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
    ORDER_EDIT_LOCKED: 'ORDER_EDIT_LOCKED',
    MATERIAL_NOT_FOUND: 'MATERIAL_NOT_FOUND',
    STOCK_QUANTITY_IMMUTABLE: 'STOCK_QUANTITY_IMMUTABLE',
    RECEIVED_QUANTITY_EXCEEDED: 'RECEIVED_QUANTITY_EXCEEDED',
    MATERIAL_ID_REQUIRED: 'MATERIAL_ID_REQUIRED',
    INVALID_RECEIPT_QUANTITY: 'INVALID_RECEIPT_QUANTITY',
    ORDER_ITEMS_REQUIRED: 'ORDER_ITEMS_REQUIRED',
    ORDER_ITEM_ID_REQUIRED: 'ORDER_ITEM_ID_REQUIRED',
    RECEIPT_ITEM_KEY_REQUIRED: 'RECEIPT_ITEM_KEY_REQUIRED',
    DUPLICATE_RECEIPT_ITEM: 'DUPLICATE_RECEIPT_ITEM',
    ORDER_ITEM_NOT_FOUND: 'ORDER_ITEM_NOT_FOUND',
    ORDER_ITEM_KEY_MISMATCH: 'ORDER_ITEM_KEY_MISMATCH',
    NOT_FOUND: 'NOT_FOUND',
    INVALID_ID: 'INVALID_ID',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    ERP_PROXY_FAILED: 'ERP_PROXY_FAILED',
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    message?: string;
}

type ApiErrorExtras = Record<string, unknown>;

export interface ApiErrorResponse extends ApiErrorExtras {
    error: ApiErrorCode;
}

export function createApiSuccessResponse<T>(data: T, message?: string): ApiSuccessResponse<T> {
    return {
        success: true,
        data,
        ...(message ? { message } : {}),
    };
}

export function createApiErrorResponse(code: ApiErrorCode, extras: ApiErrorExtras = {}): ApiErrorResponse {
    return {
        error: code,
        ...extras,
    };
}

// 兼容 CommonJS 消费方
