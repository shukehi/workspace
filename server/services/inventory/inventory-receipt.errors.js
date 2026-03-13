function createReceiptError(code, extra = {}) {
  const error = new Error(code);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

class ReceiptReverseNotAllowedError extends Error {
  constructor(receiptId) {
    super('RECEIPT_REVERSE_NOT_ALLOWED');
    this.code = 'RECEIPT_REVERSE_NOT_ALLOWED';
    this.receiptId = receiptId;
  }
}

class ReceiptAlreadyReversedError extends Error {
  constructor(receiptId) {
    super('RECEIPT_ALREADY_REVERSED');
    this.code = 'RECEIPT_ALREADY_REVERSED';
    this.receiptId = receiptId;
  }
}

class ReceiptAlreadyFullyReversedError extends Error {
  constructor(receiptId) {
    super('RECEIPT_ALREADY_FULLY_REVERSED');
    this.code = 'RECEIPT_ALREADY_FULLY_REVERSED';
    this.receiptId = receiptId;
  }
}

class ReverseQuantityExceededError extends Error {
  constructor(receiptId, reversibleQuantity, requestedQuantity) {
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
