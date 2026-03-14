export {};

function createReceiptError(code: string, extra: Record<string, unknown> = {}) {
    const error = new Error(code) as Error & Record<string, unknown>;
    error.code = code;
    Object.assign(error, extra);
    return error;
}

class ReceiptReverseNotAllowedError extends Error {
    code: string;
    receiptId: number | string;

    constructor(receiptId: number | string) {
        super('RECEIPT_REVERSE_NOT_ALLOWED');
        this.code = 'RECEIPT_REVERSE_NOT_ALLOWED';
        this.receiptId = receiptId;
    }
}

class ReceiptAlreadyReversedError extends Error {
    code: string;
    receiptId: number | string;

    constructor(receiptId: number | string) {
        super('RECEIPT_ALREADY_REVERSED');
        this.code = 'RECEIPT_ALREADY_REVERSED';
        this.receiptId = receiptId;
    }
}

class ReceiptAlreadyFullyReversedError extends Error {
    code: string;
    receiptId: number | string;

    constructor(receiptId: number | string) {
        super('RECEIPT_ALREADY_FULLY_REVERSED');
        this.code = 'RECEIPT_ALREADY_FULLY_REVERSED';
        this.receiptId = receiptId;
    }
}

class ReverseQuantityExceededError extends Error {
    code: string;
    receiptId: number | string;
    reversibleQuantity: number;
    requestedQuantity: number;

    constructor(receiptId: number | string, reversibleQuantity: number, requestedQuantity: number) {
        super('REVERSE_QUANTITY_EXCEEDED');
        this.code = 'REVERSE_QUANTITY_EXCEEDED';
        this.receiptId = receiptId;
        this.reversibleQuantity = reversibleQuantity;
        this.requestedQuantity = requestedQuantity;
    }
}

module.exports = {
    createReceiptError,
    ReceiptReverseNotAllowedError,
    ReceiptAlreadyReversedError,
    ReceiptAlreadyFullyReversedError,
    ReverseQuantityExceededError,
};
