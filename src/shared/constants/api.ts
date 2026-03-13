export const API_SUCCESS_FLAG = 'success';
export const API_DATA_FIELD = 'data';

export const API_ERROR_CODES = {
  duplicateOrder: 'DUPLICATE_ORDER',
  invalidStatusTransition: 'INVALID_STATUS_TRANSITION',
  orderEditLocked: 'ORDER_EDIT_LOCKED',
  materialNotFound: 'MATERIAL_NOT_FOUND',
  receivedQuantityExceeded: 'RECEIVED_QUANTITY_EXCEEDED',
  materialIdRequired: 'MATERIAL_ID_REQUIRED',
  invalidReceiptQuantity: 'INVALID_RECEIPT_QUANTITY',
  orderItemsRequired: 'ORDER_ITEMS_REQUIRED',
  orderItemIdRequired: 'ORDER_ITEM_ID_REQUIRED',
  receiptItemKeyRequired: 'RECEIPT_ITEM_KEY_REQUIRED',
  duplicateReceiptItem: 'DUPLICATE_RECEIPT_ITEM',
  orderItemNotFound: 'ORDER_ITEM_NOT_FOUND',
  orderItemKeyMismatch: 'ORDER_ITEM_KEY_MISMATCH',
  notFound: 'NOT_FOUND',
  invalidId: 'INVALID_ID',
  internalError: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
